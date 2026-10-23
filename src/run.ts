/**
 * Runs one agent: `node src/run.ts <agent>` (config in agents/<agent>.json).
 *
 * For each topic (up to topicsPerRun): claim it from the studio, let an engine research,
 * write and submit it, then give the topic back as failed if it never got saved. Limits on
 * turns, cost and time stop a run that goes wrong. Everything is logged to stdout (the GitHub
 * Actions log).
 *
 * Two engines, chosen per campaign on the studio's /agents screen (sent with each claim), or
 * for one manual run with ENGINE=pi|claude-code:
 *   pi           Pi with an OpenRouter model, in this process (below).
 *   claude-code  the Claude Code CLI on the Claude subscription (claude.ts). If it hits a
 *                usage limit or can't start, the topic is done with Pi instead.
 *
 * Needs STUDIO_URL, AGENT_API_KEY and OPENROUTER_API_KEY (Pi's model, and web search on both
 * engines); CLAUDE_CODE_OAUTH_TOKEN for claude-code.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createAgentSession,
  createExtensionRuntime,
  ModelRuntime,
  SessionManager,
  SettingsManager,
  type ResourceLoader,
} from "@earendil-works/pi-coding-agent";

import { RUN_URL, SYSTEM_PROMPT, buildTools, loadConfig, log, newTopicState, short, toolNamesFor, type Engine } from "./agent.ts";
import { runTopicClaude } from "./claude.ts";
import { problems, resetProblems, sendProblems, type Problem } from "./problems.ts";
import { claimTopic, failTopic, reportRun, type Claimed, type RunReport } from "./studio.ts";
import { searchCost } from "./tools/search.ts";
import type { SubmitState } from "./tools/submit.ts";

const name = process.argv[2];
if (!name) {
  console.error("Usage: node src/run.ts <agent>   (an agents/<agent>.json file)");
  process.exit(1);
}
const config = loadConfig(name);
// A manual run can ask for more or fewer topics (the workflow's "topics" input).
if (Number(process.env.TOPICS_PER_RUN) > 0) config.topicsPerRun = Number(process.env.TOPICS_PER_RUN);
// ...or force an engine for this run (the workflow's "engine" input).
const ENGINE_OVERRIDE = (["pi", "claude-code"] as const).find((e) => e === process.env.ENGINE);

/** What a topic's run did, whichever engine ran it. */
type Outcome = {
  submit: SubmitState;
  /** Why it stopped, when it didn't save. */
  why: string | null;
  report: Omit<RunReport, "outcome" | "pageUrl" | "error" | "runUrl">;
};

// ---------------------------------------------------------------- Pi engine

let modelRuntime: ModelRuntime | null = null;

async function piRuntime(): Promise<ModelRuntime> {
  if (modelRuntime) return modelRuntime;
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not set");
  const dir = mkdtempSync(join(tmpdir(), "pi-runtime-"));
  modelRuntime = await ModelRuntime.create({ authPath: join(dir, "auth.json"), modelsPath: null, refreshOnCreate: false });
  await modelRuntime.setRuntimeApiKey("openrouter", key);
  return modelRuntime;
}

async function runTopicPi(topic: Claimed): Promise<Outcome> {
  const runtime = await piRuntime();
  const s = newTopicState();
  const cwd = mkdtempSync(join(tmpdir(), `agent-${name}-`));
  const toolNames = toolNamesFor(config);
  const customTools = buildTools(config, topic.id, cwd, config.model, s);

  const model = runtime.getModel("openrouter", config.model);
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
    modelRuntime: runtime,
    resourceLoader,
    tools: toolNames,
    customTools,
    sessionManager: SessionManager.inMemory(cwd),
    settingsManager: SettingsManager.inMemory({ compaction: { enabled: true }, retry: { enabled: true, maxRetries: 3 } }),
  });

  // Stop the run if it goes past its turn, cost or time limit.
  let turns = 0;
  searchCost.total = 0;
  searchCost.count = 0;
  searchCost.free = 0;
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
    // Research tools that failed (a site that blocks screenshots, a video with no transcript).
    if (event.type === "tool_execution_end" && ["screenshot", "find_logo", "watch_video", "read_page"].includes(event.toolName)) {
      const reply = (event.result?.content ?? []).map((c: { text?: string }) => c.text ?? "").join("");
      if (/^(Couldn't|No logo|Screenshots aren't)/.test(reply)) log(`← ${event.toolName}: ${short(reply, 300)}`);
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
      if (s.submit.savedUrl) stop("page saved");
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
  log(`cost $${cost.toFixed(4)} = model $${stats.cost.toFixed(4)} + ${searchCost.count} searches $${searchCost.total.toFixed(4)} (${searchCost.free} free, SearXNG)`);
  const lastText = session.getLastAssistantText() ?? "";
  // Why the model's last reply ended, when it wasn't a normal stop (a provider error, a
  // timeout): otherwise a run that died quietly says only "stopped without submitting".
  const lastReply = [...session.messages].reverse().find((m) => m.role === "assistant") as
    | { stopReason?: string; errorMessage?: string }
    | undefined;
  const modelError =
    lastReply && lastReply.stopReason !== "stop" && lastReply.stopReason !== "toolUse"
      ? `model reply ended with "${lastReply.stopReason}"${lastReply.errorMessage ? `: ${lastReply.errorMessage}` : ""}`
      : null;
  session.dispose();

  const why = s.submit.savedUrl
    ? null
    : s.submit.lastProblems.length > 0
      ? `not saved after ${s.submit.submissions} submission(s); last problems: ${s.submit.lastProblems.join("; ")}`
      : `not saved: ${stopReason ?? modelError ?? "the agent stopped without submitting"}. Last message: ${short(lastText, 300) || "(none)"}`;
  return {
    submit: s.submit,
    why,
    report: {
      model: config.model,
      costUsd: cost,
      modelCostUsd: stats.cost,
      searchCostUsd: searchCost.total,
      searches: searchCost.count,
      tokensIn: t.input,
      tokensOut: t.output,
      cacheRead: t.cacheRead,
      cacheWrite: t.cacheWrite,
      turns,
      submissions: s.submit.submissions,
    },
  };
}

// ---------------------------------------------------------------- one topic, either engine

async function runTopic(topic: Claimed): Promise<{ saved: boolean; cost: number }> {
  const engine: Engine = ENGINE_OVERRIDE ?? topic.engine;
  let outcome: Outcome;
  // Problems the tools run into (problems.ts): Pi's tools add to `problems` here; Claude
  // Code's run in the MCP server's process and come back in its outcome.
  resetProblems();
  let claudeProblems: Problem[] = [];
  if (engine === "claude-code") {
    log(`engine: claude-code (${config.claudeModel ?? "haiku"}, subscription)`);
    const c = await runTopicClaude(name, config, topic);
    claudeProblems = c.problems;
    if (c.fallback) {
      log(`claude code couldn't do it (${c.why}); doing this topic with Pi instead`);
      outcome = await runTopicPi(topic);
      // The searches Claude Code already paid for count too.
      outcome.report.costUsd += c.searchCostUsd;
      outcome.report.searchCostUsd += c.searchCostUsd;
      outcome.report.searches += c.searches;
      outcome.report.model = `${outcome.report.model} (after claude-code hit: ${short(c.why ?? "", 80)})`;
    } else {
      outcome = {
        submit: c.submit,
        why: c.why,
        report: {
          model: c.model,
          costUsd: c.searchCostUsd,
          modelCostUsd: 0,
          searchCostUsd: c.searchCostUsd,
          searches: c.searches,
          tokensIn: c.tokensIn,
          tokensOut: c.tokensOut,
          cacheRead: c.cacheRead,
          cacheWrite: c.cacheWrite,
          turns: c.turns,
          submissions: c.submit.submissions,
        },
      };
    }
  } else {
    log(`engine: pi (${config.model})`);
    outcome = await runTopicPi(topic);
  }

  // What the run did and cost, for the studio's /agents screen.
  const savedUrl = outcome.submit.savedUrl;
  const report: RunReport = { ...outcome.report, outcome: savedUrl ? "saved" : "failed", pageUrl: savedUrl, error: null, runUrl: RUN_URL };
  const found = [...claudeProblems, ...problems];
  if (savedUrl) {
    log(`saved ${topic.label}: ${savedUrl}`);
    await reportRun(config.campaign, topic.runId, report);
    await sendProblems(config.campaign, topic.runId, found, RUN_URL);
    return { saved: true, cost: report.costUsd };
  }
  const why = outcome.why ?? "not saved";
  const status = await failTopic(config.campaign, topic.id, why);
  log(`gave back ${topic.label} (${status}): ${why}`);
  await reportRun(config.campaign, topic.runId, { ...report, error: why });
  await sendProblems(config.campaign, topic.runId, found, RUN_URL);
  return { saved: false, cost: report.costUsd };
}

async function main() {
  let saved = 0;
  let cost = 0;
  // The studio decides how many pages are due (pages per day on /agents); topicsPerRun is
  // only a safety cap on one run.
  for (let i = 0; i < config.topicsPerRun; i++) {
    const claim = await claimTopic(config.campaign);
    if (!claim.topic) {
      log(`no ${config.campaign} page now: ${claim.reason}${claim.nextAt ? ` (next around ${claim.nextAt})` : ""}`);
      break;
    }
    const topic = claim.topic;
    log(`claimed ${topic.label} (${topic.id})`);
    const result = await runTopic(topic);
    if (result.saved) saved++;
    cost += result.cost;
  }
  log(`done: ${saved} saved, total cost $${cost.toFixed(4)}`);
}

main().catch(async (e) => {
  console.error(e);
  // A crash (the studio unreachable, a bad config...) goes to /agents too.
  await sendProblems(config.campaign, null, [{ source: "runner", message: `crashed: ${(e as Error).message}`, at: new Date().toISOString() }], RUN_URL);
  process.exit(1);
});
