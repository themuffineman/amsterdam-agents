/**
 * The claude-code engine: one topic, done by the Claude Code CLI on the Claude subscription
 * (CLAUDE_CODE_OAUTH_TOKEN from `claude setup-token`), so the model costs nothing per token.
 * Searches still go through OpenRouter (web_search), so the "no made-up links" check sees
 * every result.
 *
 * Claude Code runs `claude -p` in the topic's folder with:
 *   - our tools from mcp.ts (the same ones Pi gets), and its own Read/Write/Edit for the draft;
 *   - --restricted: no shell, no web fetch, file tools only inside the topic folder, none of
 *     the machine's settings, CLAUDE.md or MCP servers;
 *   - our system prompt (not Claude Code's coding one), the studio's prompt on stdin;
 *   - --max-turns and a timeout from agents/<name>.json.
 * Its stream-json output is logged the same way as a Pi run (→ tool calls, ← submit_page).
 *
 * The subscription has usage limits (shared with whoever owns it). When Claude Code stops on
 * a limit, or can't start at all, the result says `fallback` and run.ts does the topic with Pi.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { FILE_TOOLS, SYSTEM_PROMPT, log, short, toolNamesFor, type AgentConfig } from "./agent.ts";
import type { Claimed } from "./studio.ts";
import type { SubmitState } from "./tools/submit.ts";

export type ClaudeOutcome = {
  saved: boolean;
  savedUrl: string | null;
  submit: SubmitState;
  /** Claude Code hit a usage limit or never started: do this topic with Pi instead. */
  fallback: boolean;
  /** Why it stopped, when it didn't save. */
  why: string | null;
  model: string;
  searchCostUsd: number;
  searches: number;
  /** Of those, how many SearXNG answered for free. */
  freeSearches: number;
  tokensIn: number;
  tokensOut: number;
  cacheRead: number;
  cacheWrite: number;
  turns: number;
};

/** Errors that mean "try Pi": the subscription's limits, overload, or no usable login. */
const FALLBACK_ERROR = /usage limit|hit your limit|limit reached|rate.?limit|429|overloaded|529|not logged in|invalid api key|oauth|authentication|ENOENT|not found|cannot find|not recognized/i;

/** Variables our tools need; passed to the MCP server explicitly. */
const TOOL_ENV = ["STUDIO_URL", "AGENT_API_KEY", "OPENROUTER_API_KEY", "SEARXNG_URL", "SUPADATA_API_KEY", "CHROME_PATH", "PATH", "HOME", "USERPROFILE", "TEMP", "TMP", "SYSTEMROOT"];

export async function runTopicClaude(name: string, config: AgentConfig, topic: Claimed): Promise<ClaudeOutcome> {
  const claudeModel = config.claudeModel ?? "haiku";
  const model = `claude-code/${claudeModel}`;
  // The topic's folder (the only place Claude Code's file tools reach) and, outside it, our
  // own files: the MCP config holds keys, so the agent mustn't be able to read it.
  const cwd = mkdtempSync(join(tmpdir(), `agent-${name}-`));
  const own = mkdtempSync(join(tmpdir(), `claude-run-`));
  const stateFile = join(own, "state.json");
  const mcpFile = join(own, "mcp.json");
  const promptFile = join(own, "system.txt");

  const toolEnv: Record<string, string> = {
    AGENT_NAME: name,
    AGENT_TOPIC_ID: topic.id,
    AGENT_CWD: cwd,
    AGENT_MODEL: model,
    AGENT_STATE_FILE: stateFile,
  };
  for (const k of TOOL_ENV) if (process.env[k]) toolEnv[k] = process.env[k]!;
  const mcpScript = fileURLToPath(new URL("./mcp.ts", import.meta.url));
  writeFileSync(mcpFile, JSON.stringify({ mcpServers: { agent: { type: "stdio", command: process.execPath, args: [mcpScript], env: toolEnv } } }));
  writeFileSync(
    promptFile,
    `${SYSTEM_PROMPT}
Your working folder is ${cwd}: keep your draft files there. Read, Write and Edit are your file tools (Read a file before you Edit or overwrite it).`,
  );

  const fileTools = toolNamesFor(config)
    .filter((t) => FILE_TOOLS.has(t))
    .map((t) => t[0].toUpperCase() + t.slice(1));
  const args = [
    "-p",
    "--output-format", "stream-json",
    "--verbose",
    "--model", claudeModel,
    "--max-turns", String(config.maxTurns),
    "--restricted",
    "--tools", fileTools.join(","),
    "--strict-mcp-config",
    "--mcp-config", mcpFile,
    "--allowedTools", [...fileTools, "mcp__agent"].join(","),
    "--permission-mode", "acceptEdits",
    "--permission-prompts", "none",
    "--system-prompt-file", promptFile,
    "--no-session-persistence",
  ];

  // The subscription token, never an API key (an API key would win and bill per token).
  const childEnv = { ...process.env };
  delete childEnv.ANTHROPIC_API_KEY;
  delete childEnv.ANTHROPIC_AUTH_TOKEN;

  const out: ClaudeOutcome = {
    saved: false,
    savedUrl: null,
    submit: { submissions: 0, savedUrl: null, lastProblems: [] },
    fallback: false,
    why: null,
    model,
    searchCostUsd: 0,
    searches: 0,
    freeSearches: 0,
    tokensIn: 0,
    tokensOut: 0,
    cacheRead: 0,
    cacheWrite: 0,
    turns: 0,
  };
  const readState = () => {
    if (!existsSync(stateFile)) return;
    try {
      const s = JSON.parse(readFileSync(stateFile, "utf8"));
      out.submit = s.submit;
      out.savedUrl = s.submit.savedUrl;
      out.searchCostUsd = s.searchCost;
      out.searches = s.searches;
      out.freeSearches = s.freeSearches ?? 0;
    } catch {
      // Being rewritten right now; the next read gets it.
    }
  };

  // CLAUDE_BIN lets a local run use e.g. "npx -y @anthropic-ai/claude-code"; GitHub installs `claude`.
  const [bin, ...pre] = (process.env.CLAUDE_BIN ?? "claude").split(" ");
  const child = spawn(bin, [...pre, ...args], { cwd, env: childEnv, shell: process.platform === "win32", stdio: ["pipe", "pipe", "pipe"] });
  child.stdin.end(topic.prompt);

  let stopReason: string | null = null;
  const stop = (reason: string) => {
    if (stopReason) return;
    stopReason = reason;
    log(`stopping: ${reason}`);
    child.kill();
  };
  const timer = setTimeout(() => stop(`over ${config.timeoutMinutes} minutes`), config.timeoutMinutes * 60_000);

  let stderr = "";
  child.stderr.on("data", (d) => (stderr = (stderr + d).slice(-4000)));

  const toolNames = new Map<string, string>();
  let resultError: string | null = null;
  let lastText = "";
  let buffer = "";
  const onLine = (line: string) => {
    if (!line.trim()) return;
    let ev: any;
    try {
      ev = JSON.parse(line);
    } catch {
      return;
    }
    if (ev.type === "system" && ev.subtype === "init") {
      const agent = (ev.mcp_servers ?? []).find((s: { name: string }) => s.name === "agent");
      log(`claude code ${ev.claude_code_version ?? ""} · ${ev.model} · tools server: ${agent?.status ?? "missing"}`);
      if (agent?.status !== "connected") stop(`the tools server didn't start (${agent?.status ?? "missing"})`);
    }
    if (ev.type === "assistant") {
      for (const c of ev.message?.content ?? []) {
        if (c.type !== "tool_use") continue;
        const tool = String(c.name).replace(/^mcp__agent__/, "");
        toolNames.set(c.id, tool);
        log(`→ ${tool} ${short(c.input)}`);
      }
    }
    if (ev.type === "user") {
      for (const c of ev.message?.content ?? []) {
        if (c.type !== "tool_result") continue;
        const tool = toolNames.get(c.tool_use_id);
        const text = (Array.isArray(c.content) ? c.content : [{ text: c.content }]).map((x: { text?: string }) => x.text ?? "").join("");
        if (tool === "submit_page") {
          log(`← submit_page: ${short(text, 2000)}`);
          readState();
          if (out.savedUrl) stop("page saved");
        } else if (tool && /^(Couldn't|No logo|Screenshots aren't)/.test(text)) {
          log(`← ${tool}: ${short(text, 300)}`);
        }
      }
    }
    if (ev.type === "result") {
      out.turns = ev.num_turns ?? 0;
      if (typeof ev.result === "string") lastText = ev.result;
      const u = ev.usage ?? {};
      out.tokensIn = u.input_tokens ?? 0;
      out.tokensOut = u.output_tokens ?? 0;
      out.cacheRead = u.cache_read_input_tokens ?? 0;
      out.cacheWrite = u.cache_creation_input_tokens ?? 0;
      if (ev.is_error || ev.subtype !== "success") resultError = `${ev.subtype}: ${short(ev.result ?? ev.errors ?? "", 400)}`;
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
  readState();

  out.saved = Boolean(out.savedUrl);
  log(`claude code: turns ${out.turns}, tokens in ${out.tokensIn}, out ${out.tokensOut}, cache read ${out.cacheRead}, cache write ${out.cacheWrite}`);
  log(`cost $${out.searchCostUsd.toFixed(4)} = model $0 (subscription) + ${out.searches} searches (${out.freeSearches} free, SearXNG)`);
  if (out.saved) return out;

  const problem = resultError ?? (code !== 0 && !stopReason ? `exit ${code}: ${short(stderr.trim(), 400)}` : null);
  if (problem && FALLBACK_ERROR.test(`${problem} ${stderr}`)) out.fallback = true;
  out.why =
    out.submit.lastProblems.length > 0
      ? `not saved after ${out.submit.submissions} submission(s); last problems: ${out.submit.lastProblems.join("; ")}`
      : `not saved: ${stopReason ?? problem ?? "the agent stopped without submitting"}. Last message: ${short(lastText, 300) || "(none)"}`;
  return out;
}
