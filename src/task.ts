/**
 * The task worker: `node src/task.ts` (config in agents/tasks.json), run by the tasks workflow.
 * Claude's half of the studio's task board (/tasks); Muse is the other worker and calls the
 * same API itself.
 *
 *   1. Claim the top To do card set to Claude (POST /api/agent/tasks/next); none -> exit.
 *   2. Clone the card's repo, check out its branch (task/<slug>-<id>; a sent-back card
 *      continues on the branch it already has).
 *   3. Claude Code (subscription, CLAUDE_CODE_OAUTH_TOKEN) does the task in the repo and ends
 *      by writing .task-result.json (summary, needsYou, prTitle).
 *   4. This runner commits, pushes and opens the pull request (or finds the open one).
 *   5. Report to the studio (PATCH /api/agent/tasks/<id>): "review" with the pull request,
 *      "needs_you" with Claude's question, or "failed" with the reason.
 *
 * TASKS_GITHUB_TOKEN (fine-grained: the target repos, Contents + Pull requests read/write) stays
 * in this process: git gets it as a one-off header, so it's never written into the clone, and
 * Claude Code's environment has only its own token. Claude can't run git beyond reading, and
 * nothing here merges: the owner merges on /tasks.
 *
 * Needs STUDIO_URL, AGENT_API_KEY, CLAUDE_CODE_OAUTH_TOKEN, TASKS_GITHUB_TOKEN.
 */
import { spawn, spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { RUN_URL, log, short } from "./agent.ts";

type TaskConfig = { claudeModel: string; maxTurns: number; timeoutMinutes: number };
const config: TaskConfig = JSON.parse(readFileSync(new URL("../agents/tasks.json", import.meta.url), "utf8"));

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

// ---------------------------------------------------------------- studio + GitHub

const studio = (path: string, init: { method: string; body?: unknown }) => {
  const url = process.env.STUDIO_URL?.replace(/\/$/, "");
  const key = process.env.AGENT_API_KEY;
  if (!url || !key) throw new Error("STUDIO_URL and AGENT_API_KEY must be set");
  return fetch(`${url}/api/agent/tasks${path}`, {
    method: init.method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: init.body ? JSON.stringify(init.body) : undefined,
  }).then(async (res) => {
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`studio ${init.method} ${path} failed (${res.status}): ${body.error ?? "no details"}`);
    return body;
  });
};

function token(): string {
  const t = process.env.TASKS_GITHUB_TOKEN;
  if (!t) throw new Error("TASKS_GITHUB_TOKEN isn't set (a fine-grained token for the target repos: Contents + Pull requests read/write)");
  return t;
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

// ---------------------------------------------------------------- helpers

function sh(cmd: string, args: string[], cwd: string, env: NodeJS.ProcessEnv = process.env): string {
  const r = spawnSync(cmd, args, { cwd, env, encoding: "utf8", shell: process.platform === "win32", maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  // Never let the token reach a log or an error message.
  const clean = (s: string) => (process.env.TASKS_GITHUB_TOKEN ? s.split(process.env.TASKS_GITHUB_TOKEN).join("***") : s);
  if (r.status !== 0) throw new Error(clean(`${cmd} ${args.filter((a) => !a.startsWith("http.extraHeader")).join(" ")} failed (${r.status}): ${short(out.trim(), 1500)}`));
  return out;
}

/** git with the token as a one-off header (nothing is stored in the clone's config). */
function git(args: string[], cwd: string): string {
  const basic = Buffer.from(`x-access-token:${token()}`).toString("base64");
  return sh("git", ["-c", `http.extraHeader=Authorization: Basic ${basic}`, ...args], cwd);
}

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

/** Claude Code's environment: its own token and the basics, none of the runner's keys. */
function agentEnv(): NodeJS.ProcessEnv {
  const keep = ["PATH", "HOME", "USER", "LANG", "TMPDIR", "TEMP", "TMP", "USERPROFILE", "SYSTEMROOT", "APPDATA", "LOCALAPPDATA", "CLAUDE_CODE_OAUTH_TOKEN"];
  const env: NodeJS.ProcessEnv = {};
  for (const k of keep) if (process.env[k]) env[k] = process.env[k];
  return env;
}

/** Errors that mean the subscription (not the task) is the problem. */
const LIMIT_ERROR = /usage limit|hit your limit|limit reached|rate.?limit|429|overloaded|529/i;

async function runClaude(prompt: string, cwd: string): Promise<{ why: string | null; lastText: string }> {
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
  const child = spawn(bin, args, { cwd, env: agentEnv(), shell: process.platform === "win32", stdio: ["pipe", "pipe", "pipe"] });
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

// ---------------------------------------------------------------- one task

async function doTask(claim: Required<Claim>) {
  const task = claim.task!;
  const dir = mkdtempSync(join(tmpdir(), "task-"));
  const repoDir = join(dir, "repo");
  let pushed = false;

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
    const remote = spawnSync("git", ["ls-remote", "--exit-code", "--heads", "origin", task.branch], {
      cwd: repoDir,
      env: { ...process.env, GIT_CONFIG_COUNT: "1", GIT_CONFIG_KEY_0: "http.extraHeader", GIT_CONFIG_VALUE_0: `Authorization: Basic ${Buffer.from(`x-access-token:${token()}`).toString("base64")}` },
    });
    if (remote.status === 0) {
      git(["fetch", "-q", "origin", task.branch], repoDir);
      sh("git", ["checkout", "-q", "-b", task.branch, "FETCH_HEAD"], repoDir);
      log(`continuing on ${task.branch}`);
    } else {
      sh("git", ["checkout", "-q", "-b", task.branch], repoDir);
      log(`new branch ${task.branch}`);
    }
    if (process.env.GITHUB_ACTIONS && spawnSync("claude", ["--version"]).status !== 0) {
      log("installing Claude Code");
      sh("npm", ["install", "-g", "@anthropic-ai/claude-code", "--no-audit", "--no-fund"], dir);
    }

    // 3. Claude Code does the task
    const resultPath = join(repoDir, claim.resultFile);
    const c = await runClaude(claim.prompt, repoDir);
    if (c.why && LIMIT_ERROR.test(c.why)) throw new Error(`Claude subscription limit: ${c.why}. It goes back to To do and is tried again later.`);
    let result: TaskResult | null = null;
    try {
      result = JSON.parse(readFileSync(resultPath, "utf8"));
    } catch {
      // handled below
    }
    if (existsSync(resultPath)) rmSync(resultPath);

    // 4. commit, push, pull request
    const summary = result?.summary?.trim() || "";
    const changed = commitAndPush(`${task.title}\n\nTask agent (${config.claudeModel}), card ${task.id}.\n${RUN_URL ?? ""}`);
    if (!result) {
      throw new Error(
        `Claude ended without writing ${claim.resultFile}${c.why ? ` (${c.why})` : ""}. Last message: ${short(c.lastText, 400) || "(none)"}${changed ? ` Its changes are on ${task.branch}.` : ""}`,
      );
    }
    let pr: { url: string; number: number } | null = null;
    if (changed) {
      const body = `${summary || "(no summary)"}\n\n---\nTask card: ${task.title}${task.notes ? `\n\nSent back with: ${task.notes}` : ""}\nMade by the task agent${RUN_URL ? `: ${RUN_URL}` : "."} Review and merge on the studio's /tasks.`;
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
      throw new Error(`Claude finished but changed nothing.${summary ? ` It said: ${short(summary, 400)}` : ""}`);
    } else {
      await studio(`/${task.id}`, {
        method: "PATCH",
        body: { status: "review", summary: summary || "(no summary)", branch: task.branch, prUrl: pr.url, prNumber: pr.number, runUrl: RUN_URL },
      });
      log(`ready for review: ${task.title}`);
    }
  } catch (e) {
    const error = (e as Error).message;
    log(`failed: ${error}`);
    if (!pushed && existsSync(repoDir)) {
      try {
        commitAndPush(`${task.title} (unfinished)\n\n${short(error, 500)}`);
      } catch (pushError) {
        log(`couldn't push the partial work: ${(pushError as Error).message}`);
      }
    }
    await studio(`/${task.id}`, { method: "PATCH", body: { status: "failed", error, runUrl: RUN_URL, branch: pushed ? task.branch : null } });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function main() {
  const claim = (await studio("/next", { method: "POST" })) as Claim;
  if (!claim.task || !claim.prompt) {
    log("no task for Claude");
    return;
  }
  log(`claimed "${claim.task.title}" (${claim.task.repo}${claim.task.notes ? ", sent back" : ""}, ${claim.task.id})`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, "claimed=true\n");
  await doTask({ resultFile: ".task-result.json", ...claim } as Required<Claim>);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
