/**
 * Runs one agent: `node src/run.ts <agent>` (config in agents/<agent>.json).
 *
 * For each topic (up to topicsPerRun): claim it from the studio, start a Pi agent session
 * with the studio's prompt and this agent's tools, let it research, write and submit, then
 * give the topic back as failed if it never got saved. Limits on turns, cost and time stop
 * a run that goes wrong. Everything is logged to stdout (the GitHub Actions log).
 *
 * Needs STUDIO_URL, AGENT_API_KEY and OPENROUTER_API_KEY.
 */
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createAgentSession,
  createExtensionRuntime,
  ModelRuntime,
  SessionManager,
  SettingsManager,
  type ResourceLoader,
  type ToolDefinition,
} from "@earendil-works/pi-coding-agent";

import { claimTopic, failTopic, type Claimed } from "./studio.ts";
import { findExamplesTool } from "./tools/examples.ts";
import { searchCost } from "./tools/search.ts";
import { submitPageTool, type SubmitState } from "./tools/submit.ts";
import { readPage, webSearchTool } from "./tools/web.ts";

type AgentConfig = {
  /** The studio campaign (/api/agent/<campaign>). */
  campaign: string;
  /** OpenRouter model id. */
  model: string;
  thinking: "off" | "minimal" | "low" | "medium" | "high";
  tools: string[];
  topicsPerRun: number;
  maxTurns: number;
  maxCostUsd: number;
  timeoutMinutes: number;
  maxSubmissions: number;
};

const SYSTEM_PROMPT = `You are an autonomous research and writing agent running unattended in a scheduled job.
Nobody will read your messages or answer questions: never ask, decide and keep going.
Use only the tools you have. Follow the task's instructions exactly, and finish by getting your work saved with submit_page.`;

const name = process.argv[2];
if (!name) {
  console.error("Usage: node src/run.ts <agent>   (an agents/<agent>.json file)");
  process.exit(1);
}
const config: AgentConfig = JSON.parse(readFileSync(new URL(`../agents/${name}.json`, import.meta.url), "utf8"));
// A manual run can ask for more or fewer topics (the workflow's "topics" input).
if (Number(process.env.TOPICS_PER_RUN) > 0) config.topicsPerRun = Number(process.env.TOPICS_PER_RUN);

const log = (msg: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
const short = (v: unknown, n = 160) => {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > n ? `${s.slice(0, n)}…` : s;
};

/**
 * Our own tools an agent config can ask for, built fresh per topic. A config may also list
 * Pi's built-in file tools (read, write, edit): they work inside the topic's own temporary
 * folder, where the agent keeps its draft (page.json).
 */
const PI_FILE_TOOLS = new Set(["read", "write", "edit"]);

function buildTools(topic: Claimed, cwd: string, found: Set<string>, state: SubmitState): Record<string, ToolDefinition> {
  return {
    web_search: webSearchTool(found),
    read_page: readPage,
    find_examples: findExamplesTool(found),
    submit_page: submitPageTool({
      campaign: config.campaign,
      topicId: topic.id,
      model: config.model,
      maxSubmissions: config.maxSubmissions,
      cwd,
      found,
      state,
    }),
  } as Record<string, ToolDefinition>;
}

async function runTopic(topic: Claimed, modelRuntime: ModelRuntime): Promise<{ saved: boolean; cost: number }> {
  const found = new Set<string>();
  const state: SubmitState = { submissions: 0, savedUrl: null, lastProblems: [] };
  const cwd = mkdtempSync(join(tmpdir(), `agent-${name}-`));
  const all = buildTools(topic, cwd, found, state);
  const customTools = config.tools
    .filter((t) => !PI_FILE_TOOLS.has(t))
    .map((t) => {
      if (!all[t]) throw new Error(`agents/${name}.json asks for an unknown tool "${t}"`);
      return all[t];
    });

  const model = modelRuntime.getModel("openrouter", config.model);
  if (!model) throw new Error(`Pi doesn't know the model openrouter/${config.model}`);

  // No discovery: no AGENTS.md, skills or extensions from the machine, only what's here.
  const resourceLoader: ResourceLoader = {
    getExtensions: () => ({ extensions: [], errors: [], runtime: createExtensionRuntime() }),
    getSkills: () => ({ skills: [], diagnostics: [] }),
    getPrompts: () => ({ prompts: [], diagnostics: [] }),
    getThemes: () => ({ themes: [], diagnostics: [] }),
    getAgentsFiles: () => ({ agentsFiles: [] }),
    getSystemPrompt: () => SYSTEM_PROMPT,
    getSystemPromptSource: () => undefined,
    getAppendSystemPrompt: () => [],
    getAppendSystemPromptSources: () => [],
    extendResources: () => {},
    reload: async () => {},
  };

  const { session } = await createAgentSession({
    cwd,
    agentDir: cwd,
    model,
    thinkingLevel: config.thinking,
    modelRuntime,
    resourceLoader,
    tools: config.tools,
    customTools,
    sessionManager: SessionManager.inMemory(cwd),
    settingsManager: SettingsManager.inMemory({ compaction: { enabled: true }, retry: { enabled: true, maxRetries: 3 } }),
  });

  // Stop the run if it goes past its turn, cost or time limit.
  let turns = 0;
  searchCost.total = 0;
  searchCost.count = 0;
  let stopReason: string | null = null;
  const stop = (reason: string) => {
    if (stopReason) return;
    stopReason = reason;
    log(`stopping: ${reason}`);
    void session.abort();
  };
  const timer = setTimeout(() => stop(`over ${config.timeoutMinutes} minutes`), config.timeoutMinutes * 60_000);

  session.subscribe((event) => {
    if (event.type === "tool_execution_start") {
      log(`→ ${event.toolName} ${short(event.args)}`);
    }
    // The studio's answer to a submission (problems to fix, or saved) goes in the log too.
    if (event.type === "tool_execution_end" && event.toolName === "submit_page") {
      const reply = (event.result?.content ?? []).map((c: { text?: string }) => c.text ?? "").join("");
      log(`← submit_page: ${short(reply, 2000)}`);
    }
    if (event.type === "turn_end") {
      turns++;
      const cost = session.getSessionStats().cost + searchCost.total;
      if (turns >= config.maxTurns) stop(`${turns} turns (max ${config.maxTurns})`);
      else if (cost > config.maxCostUsd) stop(`cost $${cost.toFixed(3)} (max $${config.maxCostUsd})`);
      if (state.savedUrl) stop("page saved");
    }
  });

  try {
    await session.prompt(topic.prompt);
  } catch (e) {
    if (!stopReason) stopReason = `error: ${(e as Error).message}`;
  } finally {
    clearTimeout(timer);
  }

  const stats = session.getSessionStats();
  const cost = stats.cost + searchCost.total;
  const t = stats.tokens;
  log(
    `turns ${turns}, tool calls ${stats.toolCalls}, tokens: in ${t.input}, out ${t.output}, cache read ${t.cacheRead}, cache write ${t.cacheWrite}`,
  );
  log(`cost $${cost.toFixed(4)} = model $${stats.cost.toFixed(4)} + ${searchCost.count} searches $${searchCost.total.toFixed(4)}`);
  const lastText = session.getLastAssistantText() ?? "";
  session.dispose();

  if (state.savedUrl) {
    log(`saved ${topic.label}: ${state.savedUrl}`);
    return { saved: true, cost };
  }
  const why =
    state.lastProblems.length > 0
      ? `not saved after ${state.submissions} submission(s); last problems: ${state.lastProblems.join("; ")}`
      : `not saved: ${stopReason ?? "the agent stopped without submitting"}. Last message: ${short(lastText, 300)}`;
  const status = await failTopic(config.campaign, topic.id, why);
  log(`gave back ${topic.label} (${status}): ${why}`);
  return { saved: false, cost };
}

async function main() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not set");
  const dir = mkdtempSync(join(tmpdir(), "pi-runtime-"));
  const modelRuntime = await ModelRuntime.create({ authPath: join(dir, "auth.json"), modelsPath: null, refreshOnCreate: false });
  await modelRuntime.setRuntimeApiKey("openrouter", key);

  let saved = 0;
  let cost = 0;
  for (let i = 0; i < config.topicsPerRun; i++) {
    const topic = await claimTopic(config.campaign);
    if (!topic) {
      log(`the ${config.campaign} queue is empty`);
      break;
    }
    log(`claimed ${topic.label} (${topic.id})`);
    const result = await runTopic(topic, modelRuntime);
    if (result.saved) saved++;
    cost += result.cost;
  }
  log(`done: ${saved} saved, total cost $${cost.toFixed(4)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
