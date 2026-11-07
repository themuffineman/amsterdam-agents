/**
 * The task worker: `node src/task.ts <claude|haiku>`, run by tasks.yml (Claude on Opus) and tasks-haiku.yml
 * (Claude on Haiku). The studio's task board (/tasks) gives each card to one of the two.
 *
 *   1. Claim the top To do card for this worker (POST /api/agent/tasks/next { worker }).
 *   2. Clone the card's repo, check out its branch (task/<slug>-<id>; a sent-back card
 *      continues on the branch it already has).
 *   3. The agent does the task in the clone and ends by writing .task-result.json
 *      (summary, needsYou, prTitle):
 *        engine "claude-code" (default)  Claude Code on the subscription (CLAUDE_CODE_OAUTH_TOKEN)
 *        engine "pi"  Pi on an OpenRouter model (OPENROUTER_API_KEY); config: agents/tasks[-haiku].json
 *   4. This runner commits, pushes and opens the pull request (or finds the open one).
 *   5. Report to the studio (PATCH /api/agent/tasks/<id>): "review" with the pull request,
 *      "needs_you" with the agent's question, or "failed" with the reason.
 *
 * Keys: the runner reads its keys once and removes them (and GitHub's own runner tokens) from
 * the environment before any agent starts, so a shell command the agent runs can't see them.
 * TASKS_GITHUB_TOKEN goes to git as a one-off header, never into the clone's config. Nothing
 * here merges: the owner merges on /tasks.
 *
 * Needs STUDIO_URL, AGENT_API_KEY, TASKS_GITHUB_TOKEN, and CLAUDE_CODE_OAUTH_TOKEN (engine claude-code)
 * or OPENROUTER_API_KEY (engine pi).
 */
import { spawn, spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
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

import { RUN_URL, log, short } from "./agent.ts";

type Worker = "claude" | "haiku";
const worker = (process.argv[2] ?? "claude") as Worker;
if (worker !== "claude" && worker !== "haiku") {
  console.error("Usage: node src/task.ts <claude|haiku>");
  process.exit(1);
}

/**
 * agents/tasks.json (claude) or agents/tasks-haiku.json (haiku). `engine` picks the agent:
 * "claude-code" (default; Claude Code on the subscription with `claudeModel`) or "pi" (Pi with the
 * OpenRouter `model`, capped by `maxCostUsd`; needs OPENROUTER_API_KEY in the workflow).
 */
type TaskConfig = {
  engine?: "claude-code" | "pi";
  claudeModel: string;
  model: string;
  thinking: "off" | "minimal" | "low" | "medium" | "high";
  maxTurns: number;
  maxCostUsd: number;
  timeoutMinutes: number;
};
const configFile = worker === "claude" ? "tasks.json" : `tasks-${worker}.json`;
const config = JSON.parse(readFileSync(new URL(`../agents/${configFile}`, import.meta.url), "utf8")) as TaskConfig;
const ENGINE = config.engine ?? "claude-code";
const MODEL = ENGINE === "claude-code" ? config.claudeModel : config.model;

// ---------------------------------------------------------------- keys

/** Read once, then gone from process.env (so from every shell the agent starts). */
const KEYS = {
  studioUrl: process.env.STUDIO_URL?.replace(/\/$/, ""),
  agentKey: process.env.AGENT_API_KEY,
  github: process.env.TASKS_GITHUB_TOKEN,
  openrouter: process.env.OPENROUTER_API_KEY,
};
for (const k of Object.keys(process.env)) {
  if (["STUDIO_URL", "AGENT_API_KEY", "TASKS_GITHUB_TOKEN", "OPENROUTER_API_KEY", "GITHUB_TOKEN", "GH_TOKEN"].includes(k) || k.startsWith("ACTIONS_")) {
    delete process.env[k];
  }
}
// Pi's own shell must not see Claude's token either.
if (ENGINE === "pi") delete process.env.CLAUDE_CODE_OAUTH_TOKEN;

// ---------------------------------------------------------------- studio + GitHub

const studio = (path: string, init: { method: string; body?: unknown }) => {
  if (!KEYS.studioUrl || !KEYS.agentKey) throw new Error("STUDIO_URL and AGENT_API_KEY must be set");
  return fetch(`${KEYS.studioUrl}/api/agent/tasks${path}`, {
    method: init.method,
    headers: { Authorization: `Bearer ${KEYS.agentKey}`, "Content-Type": "application/json" },
    body: init.body ? JSON.stringify(init.body) : undefined,
  }).then(async (res) => {
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`studio ${init.method} ${path} failed (${res.status}): ${body.error ?? "no details"}`);
    return body;
  });
};

function token(): string {
  if (!KEYS.github) throw new Error("TASKS_GITHUB_TOKEN isn't set (a fine-grained token for the target repos: Contents + Pull requests read/write)");
  return KEYS.github;
}

async function github<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token()}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`GitHub ${init.method ?? "GET"} ${path} failed (${res.status}): ${data?.message ?? "no details"}`);
  return data as T;
}

type ClaimedTask = {
  id: string;
  title: string;
  brief: string | null;
  repo: string;
  baseBranch: string;
  branch: string;
  prUrl: string | null;
  notes: string | null;
};
type Claim = { task: ClaimedTask | null; prompt?: string; resultFile?: string };
type TaskResult = { summary?: string; needsYou?: string | null; prTitle?: string };
type AgentRun = { why: string | null; lastText: string };

// ---------------------------------------------------------------- helpers

/** Never let the token reach a log or an error message. */
const clean = (s: string) => (KEYS.github ? s.split(KEYS.github).join("***") : s);

function sh(cmd: string, args: string[], cwd: string, env: NodeJS.ProcessEnv = process.env): string {
  const r = spawnSync(cmd, args, { cwd, env, encoding: "utf8", shell: process.platform === "win32", maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  if (r.status !== 0) throw new Error(clean(`${cmd} ${args.filter((a) => !a.startsWith("http.extraHeader")).join(" ")} failed (${r.status}): ${short(out.trim(), 1500)}`));
  return out;
}

const authHeader = () => `Authorization: Basic ${Buffer.from(`x-access-token:${token()}`).toString("base64")}`;

/** git with the token as a one-off header (nothing is stored in the clone's config). */
function git(args: string[], cwd: string): string {
  return sh("git", ["-c", `http.extraHeader=${authHeader()}`, ...args], cwd);
}

/** Errors that mean the model provider (not the task) is the problem. */
const LIMIT_ERROR = /usage limit|hit your limit|limit reached|rate.?limit|429|overloaded|529|insufficient credits|402/i;

// ---------------------------------------------------------------- Claude Code engine

/** What Claude Code may do without asking. Everything else is refused (--permission-prompts none). */
const ALLOWED_TOOLS = [
  "Read",
  "Write",
  "Edit",
  "Glob",
  "Grep",
  "WebSearch",
  "WebFetch",
  "TodoWrite",
  "Bash(npm *)",
  "Bash(npx tsc *)",
  "Bash(npx eslint *)",
  "Bash(npx prettier *)",
  "Bash(npx vitest *)",
  "Bash(npx jest *)",
  "Bash(node *)",
  "Bash(git status*)",
  "Bash(git diff*)",
  "Bash(git log*)",
  "Bash(git show*)",
  "Bash(ls *)",
  "Bash(mkdir *)",
  "Bash(cp *)",
  "Bash(mv *)",
  "Bash(rm *)",
  "Bash(cat *)",
  "Bash(head *)",
  "Bash(tail *)",
  "Bash(wc *)",
  "Bash(grep *)",
  "Bash(find *)",
];

/** Claude Code's environment: its own token and the basics. */
function claudeEnv(): NodeJS.ProcessEnv {
  const keep = ["PATH", "HOME", "USER", "LANG", "TMPDIR", "TEMP", "TMP", "USERPROFILE", "SYSTEMROOT", "APPDATA", "LOCALAPPDATA", "CLAUDE_CODE_OAUTH_TOKEN"];
  const env: NodeJS.ProcessEnv = {};
  for (const k of keep) if (process.env[k]) env[k] = process.env[k];
  return env;
}

async function runClaude(prompt: string, cwd: string): Promise<AgentRun> {
  const [bin, ...pre] = (process.env.CLAUDE_BIN ?? "claude").split(" ");
  const args = [
    ...pre,
    "-p",
    "--output-format", "stream-json",
    "--verbose",
    "--model", config.claudeModel,
    "--max-turns", String(config.maxTurns),
    "--allowedTools", ALLOWED_TOOLS.join(","),
    "--permission-prompts", "none",
    "--no-session-persistence",
  ];
  const child = spawn(bin, args, { cwd, env: claudeEnv(), shell: process.platform === "win32", stdio: ["pipe", "pipe", "pipe"] });
  child.stdin.end(prompt);

  let stopReason: string | null = null;
  const timer = setTimeout(() => {
    stopReason = `over ${config.timeoutMinutes} minutes`;
    log(`stopping: ${stopReason}`);
    child.kill();
  }, config.timeoutMinutes * 60_000);

  let stderr = "";
  child.stderr.on("data", (d) => (stderr = (stderr + d).slice(-4000)));
  let lastText = "";
  let resultError: string | null = null;
  let buffer = "";
  const onLine = (line: string) => {
    let ev: any;
    try {
      ev = JSON.parse(line);
    } catch {
      return;
    }
    if (ev.type === "system" && ev.subtype === "init") log(`claude code ${ev.claude_code_version ?? ""} · ${ev.model}`);
    if (ev.type === "assistant") {
      for (const c of ev.message?.content ?? []) {
        if (c.type === "tool_use") {
          const what = c.input?.command ?? c.input?.file_path ?? c.input?.url ?? c.input?.query ?? c.input?.pattern ?? "";
          log(`→ ${c.name} ${short(what, 200)}`);
        }
        if (c.type === "text" && c.text?.trim()) log(`  ${short(c.text.trim().replace(/\s+/g, " "), 300)}`);
      }
    }
    if (ev.type === "result") {
      if (typeof ev.result === "string") lastText = ev.result;
      if (ev.is_error || ev.subtype !== "success") resultError = `${ev.subtype}: ${short(ev.result ?? "", 400)}`;
      const u = ev.usage ?? {};
      log(`claude code done: ${ev.num_turns ?? 0} turns, tokens in ${u.input_tokens ?? 0}, out ${u.output_tokens ?? 0}`);
    }
  };
  child.stdout.on("data", (d) => {
    buffer += d;
    let i: number;
    while ((i = buffer.indexOf("\n")) >= 0) {
      onLine(buffer.slice(0, i));
      buffer = buffer.slice(i + 1);
    }
  });
  const code = await new Promise<number | null>((resolve) => {
    child.on("close", resolve);
    child.on("error", (e) => {
      stderr += String(e);
      resolve(-1);
    });
  });
  clearTimeout(timer);
  onLine(buffer);
  return { why: stopReason ?? resultError ?? (code !== 0 ? `exit ${code}: ${short(stderr.trim(), 400)}` : null), lastText };
}

// ---------------------------------------------------------------- Pi engine

const PI_SYSTEM_PROMPT = `You are a careful software engineer working in a git repository on a disposable CI machine.
You have tools to read, search, write and edit files and to run shell commands in the repository.
Work step by step: read the project's instructions and the files involved before changing anything,
make the smallest change that does the task, then check it (typecheck, lint or tests when the
project has them). Never invent APIs, files or facts: look them up in the code. When you are done,
write the result file the task asks for. If you can't do the task properly, say so in that file
instead of guessing.`;

async function runPi(prompt: string, cwd: string): Promise<AgentRun> {
  if (!KEYS.openrouter) throw new Error("OPENROUTER_API_KEY isn't set");
  const runtime = await ModelRuntime.create({ authPath: join(mkdtempSync(join(tmpdir(), "pi-runtime-")), "auth.json"), modelsPath: null, refreshOnCreate: false });
  await runtime.setRuntimeApiKey("openrouter", KEYS.openrouter);
  const model = runtime.getModel("openrouter", config.model);
  if (!model) throw new Error(`Pi doesn't know the model openrouter/${config.model}`);

  // No discovery: no AGENTS.md, skills or extensions from the machine (the prompt sends it to the repo's own docs).
  const resourceLoader: ResourceLoader = {
    getExtensions: () => ({ extensions: [], errors: [], runtime: createExtensionRuntime() }),
    getSkills: () => ({ skills: [], diagnostics: [] }),
    getPrompts: () => ({ prompts: [], diagnostics: [] }),
    getThemes: () => ({ themes: [], diagnostics: [] }),
    getAgentsFiles: () => ({ agentsFiles: [] }),
    getSystemPrompt: () => PI_SYSTEM_PROMPT,
    getSystemPromptSource: () => undefined,
    getAppendSystemPrompt: () => [],
    getAppendSystemPromptSources: () => [],
    extendResources: () => {},
    reload: async () => {},
  };
  const agentDir = mkdtempSync(join(tmpdir(), "pi-agent-"));
  const { session } = await createAgentSession({
    cwd,
    agentDir,
    model,
    thinkingLevel: config.thinking,
    modelRuntime: runtime,
    resourceLoader,
    tools: ["read", "write", "edit", "bash", "grep", "find", "ls"],
    customTools: [],
    sessionManager: SessionManager.inMemory(cwd),
    settingsManager: SettingsManager.inMemory({ compaction: { enabled: true }, retry: { enabled: true, maxRetries: 3 } }),
  });

  let turns = 0;
  let stopReason: string | null = null;
  const stop = (reason: string) => {
    if (stopReason) return;
    stopReason = reason;
    log(`stopping: ${reason}`);
    void session.abort();
  };
  const timer = setTimeout(() => stop(`over ${config.timeoutMinutes} minutes`), config.timeoutMinutes * 60_000);
  session.subscribe((event) => {
    if (event.type === "tool_execution_start") log(`→ ${event.toolName} ${short(event.args, 200)}`);
    if (event.type === "turn_end") {
      turns++;
      const cost = session.getSessionStats().cost;
      if (turns >= config.maxTurns) stop(`${turns} turns (max ${config.maxTurns})`);
      else if (cost > config.maxCostUsd) stop(`cost $${cost.toFixed(3)} (max $${config.maxCostUsd})`);
    }
  });

  try {
    await session.prompt(prompt);
  } catch (e) {
    if (!stopReason) stopReason = `error: ${(e as Error).message}`;
  } finally {
    clearTimeout(timer);
  }
  const stats = session.getSessionStats();
  log(`pi done: ${turns} turns, ${stats.toolCalls} tool calls, tokens in ${stats.tokens.input}, out ${stats.tokens.output}, cost $${stats.cost.toFixed(4)}`);
  const lastText = session.getLastAssistantText() ?? "";
  const lastReply = [...session.messages].reverse().find((m) => m.role === "assistant") as { stopReason?: string; errorMessage?: string } | undefined;
  const modelError =
    lastReply && lastReply.stopReason !== "stop" && lastReply.stopReason !== "toolUse"
      ? `model reply ended with "${lastReply.stopReason}"${lastReply.errorMessage ? `: ${lastReply.errorMessage}` : ""}`
      : null;
  session.dispose();
  rmSync(agentDir, { recursive: true, force: true });
  return { why: stopReason ?? modelError, lastText };
}

// ---------------------------------------------------------------- one task

/** The open pull request for this branch, or a new one. */
async function ensurePullRequest(task: ClaimedTask, title: string, body: string): Promise<{ url: string; number: number }> {
  const [owner] = task.repo.split("/");
  const open = await github<{ html_url: string; number: number }[]>(
    `/repos/${task.repo}/pulls?state=open&head=${encodeURIComponent(`${owner}:${task.branch}`)}`,
  );
  if (open[0]) {
    await github(`/repos/${task.repo}/issues/${open[0].number}/comments`, { method: "POST", body: { body } }).catch(() => undefined);
    return { url: open[0].html_url, number: open[0].number };
  }
  const pr = await github<{ html_url: string; number: number }>(`/repos/${task.repo}/pulls`, {
    method: "POST",
    body: { title, head: task.branch, base: task.baseBranch, body },
  });
  return { url: pr.html_url, number: pr.number };
}

async function doTask(claim: Required<Claim>) {
  const task = claim.task!;
  const dir = mkdtempSync(join(tmpdir(), "task-"));
  const repoDir = join(dir, "repo");
  let pushed = false;
  const who = `${ENGINE === "claude-code" ? "Claude Code" : "Pi"} (${MODEL})`;

  const commitAndPush = (message: string): boolean => {
    sh("git", ["add", "-A"], repoDir);
    const staged = spawnSync("git", ["diff", "--cached", "--quiet"], { cwd: repoDir }).status !== 0;
    if (staged) sh("git", ["commit", "-q", "-m", message], repoDir);
    const ahead = sh("git", ["rev-list", "--count", `origin/${task.baseBranch}..HEAD`], repoDir).trim();
    if (ahead === "0") return false;
    git(["push", "-q", "-u", "origin", `HEAD:refs/heads/${task.branch}`], repoDir);
    pushed = true;
    return true;
  };

  try {
    // 2. the repo and the task's branch
    log(`cloning ${task.repo}`);
    git(["clone", "-q", "--branch", task.baseBranch, `https://github.com/${task.repo}.git`, repoDir], dir);
    sh("git", ["config", "user.name", "task agent"], repoDir);
    sh("git", ["config", "user.email", "task-agent@users.noreply.github.com"], repoDir);
    const remote = spawnSync("git", ["-c", `http.extraHeader=${authHeader()}`, "ls-remote", "--exit-code", "--heads", "origin", task.branch], { cwd: repoDir });
    if (remote.status === 0) {
      git(["fetch", "-q", "origin", task.branch], repoDir);
      sh("git", ["checkout", "-q", "-b", task.branch, "FETCH_HEAD"], repoDir);
      log(`continuing on ${task.branch}`);
    } else {
      sh("git", ["checkout", "-q", "-b", task.branch], repoDir);
      log(`new branch ${task.branch}`);
    }
    if (ENGINE === "claude-code" && process.env.GITHUB_ACTIONS && spawnSync("claude", ["--version"]).status !== 0) {
      log("installing Claude Code");
      sh("npm", ["install", "-g", "@anthropic-ai/claude-code", "--no-audit", "--no-fund"], dir);
    }

    // 3. the agent does the task
    const resultPath = join(repoDir, claim.resultFile);
    const run = ENGINE === "claude-code" ? await runClaude(claim.prompt, repoDir) : await runPi(claim.prompt, repoDir);
    if (run.why && LIMIT_ERROR.test(run.why)) throw new Error(`Model limit: ${run.why}. It goes back to To do and is tried again later.`);
    let result: TaskResult | null = null;
    try {
      result = JSON.parse(readFileSync(resultPath, "utf8"));
    } catch {
      // handled below
    }
    if (existsSync(resultPath)) rmSync(resultPath);

    // 4. commit, push, pull request
    const summary = result?.summary?.trim() || "";
    const changed = commitAndPush(`${task.title}\n\nTask agent: ${who}, card ${task.id}.\n${RUN_URL ?? ""}`);
    if (!result) {
      throw new Error(
        `The agent ended without writing ${claim.resultFile}${run.why ? ` (${run.why})` : ""}. Last message: ${short(run.lastText, 400) || "(none)"}${changed ? ` Its changes are on ${task.branch}.` : ""}`,
      );
    }
    let pr: { url: string; number: number } | null = null;
    if (changed) {
      const body = `${summary || "(no summary)"}\n\n---\nTask card: ${task.title}${task.notes ? `\n\nSent back with: ${task.notes}` : ""}\nMade by the task agent, ${who}${RUN_URL ? `: ${RUN_URL}` : "."} Review and merge on the studio's /tasks.`;
      pr = await ensurePullRequest(task, result.prTitle?.trim() || task.title, body);
      log(`pull request: ${pr.url}`);
    }

    // 5. report
    if (result.needsYou?.trim()) {
      await studio(`/${task.id}`, {
        method: "PATCH",
        body: { status: "needs_you", question: result.needsYou.trim(), summary: summary || null, branch: changed ? task.branch : null, prUrl: pr?.url ?? null, runUrl: RUN_URL },
      });
      log("needs you");
    } else if (!pr) {
      throw new Error(`The agent finished but changed nothing.${summary ? ` It said: ${short(summary, 400)}` : ""}`);
    } else {
      await studio(`/${task.id}`, {
        method: "PATCH",
        body: { status: "review", summary: summary || "(no summary)", branch: task.branch, prUrl: pr.url, prNumber: pr.number, runUrl: RUN_URL },
      });
      log(`ready for review: ${task.title}`);
    }
  } catch (e) {
    const error = clean((e as Error).message);
    log(`failed: ${error}`);
    if (!pushed && existsSync(repoDir)) {
      try {
        commitAndPush(`${task.title} (unfinished)\n\n${short(error, 500)}`);
      } catch (pushError) {
        log(`couldn't push the partial work: ${clean((pushError as Error).message)}`);
      }
    }
    await studio(`/${task.id}`, { method: "PATCH", body: { status: "failed", error, runUrl: RUN_URL, branch: pushed ? task.branch : null } });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function main() {
  const claim = (await studio("/next", { method: "POST", body: { worker } })) as Claim;
  if (!claim.task || !claim.prompt) {
    log(`no task for ${worker}`);
    return;
  }
  log(`${worker} claimed "${claim.task.title}" (${claim.task.repo}${claim.task.notes ? ", sent back" : ""}, ${claim.task.id})`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, "claimed=true\n");
  await doTask({ resultFile: ".task-result.json", ...claim } as Required<Claim>);
}

main().catch((e) => {
  console.error(clean(String(e?.stack ?? e)));
  process.exit(1);
});
