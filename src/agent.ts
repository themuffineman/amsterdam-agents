/**
 * What both engines share: the agent's config, its system prompt, and the tools built for one
 * topic. Pi (run.ts) uses the tools in-process; Claude Code gets the same tools from the MCP
 * server in mcp.ts. Keeping them here means a tool behaves the same whichever engine runs it.
 */
import { readFileSync } from "node:fs";

import type { ToolDefinition } from "@earendil-works/pi-coding-agent";

import { findExamplesTool } from "./tools/examples.ts";
import { findLogoTool } from "./tools/logo.ts";
import { screenshotTool } from "./tools/screenshot.ts";
import { submitPageTool, type SubmitState } from "./tools/submit.ts";
import { watchVideoTool } from "./tools/watch.ts";
import { readPageTool, webSearchTool, type Seen } from "./tools/web.ts";

/**
 * Who does the thinking. "pi": Pi with a model on OpenRouter (paid per token). "claude-code":
 * the Claude Code CLI on the Claude subscription (CLAUDE_CODE_OAUTH_TOKEN), no per-token bill.
 * Set per campaign on the studio's /agents screen; the studio sends it with each claim.
 */
export type Engine = "pi" | "claude-code";

export type AgentConfig = {
  /** The studio campaign (/api/agent/<campaign>). */
  campaign: string;
  /** OpenRouter model id (the Pi engine). */
  model: string;
  /** Claude Code model alias or id (the claude-code engine). Default "haiku". */
  claudeModel?: string;
  thinking: "off" | "minimal" | "low" | "medium" | "high";
  tools: string[];
  topicsPerRun: number;
  maxTurns: number;
  maxCostUsd: number;
  timeoutMinutes: number;
  maxSubmissions: number;
  /** A Markdown file the agent writes the long text to, sent as the page's `body` (blog posts: "post.md"). */
  bodyFile?: string;
  /** Refuse submissions whose links no search or read turned up (made-up URLs). */
  checkLinks?: boolean;
};

export function loadConfig(name: string): AgentConfig {
  return JSON.parse(readFileSync(new URL(`../agents/${name}.json`, import.meta.url), "utf8"));
}

export const SYSTEM_PROMPT = `You are an autonomous research and writing agent running unattended in a scheduled job.
Nobody will read your messages or answer questions: never ask, decide and keep going.
Use only the tools you have. Follow the task's instructions exactly, and finish by getting your work saved with submit_page.`;

/**
 * Research tools every agent gets, whatever its config lists: search and read the web, watch
 * videos, take screenshots, find logos. A new campaign can use them without asking; its
 * config adds the rest (find_examples, the file tools, submit_page). The studio's prompt
 * says which ones a campaign should use and how.
 */
export const STANDARD_TOOLS = ["web_search", "read_page", "watch_video", "screenshot", "find_logo"];

/**
 * File tools: Pi's built-in read/write/edit, or Claude Code's Read/Write/Edit. Both work only
 * inside the topic's own temporary folder, where the agent keeps its draft (page.json).
 */
export const FILE_TOOLS = new Set(["read", "write", "edit"]);

/** Every tool name this agent may use: the standard ones plus its config's list. */
export const toolNamesFor = (config: AgentConfig) => [...new Set([...STANDARD_TOOLS, ...config.tools])];

/** What one topic's tools remember: links seen and found, and how submitting went. */
export type TopicState = { found: Set<string>; seen: Seen; submit: SubmitState };

export const newTopicState = (): TopicState => ({
  found: new Set<string>(),
  seen: new Set<string>(),
  submit: { submissions: 0, savedUrl: null, lastProblems: [] },
});

/**
 * Our own tools this agent asked for (not the file tools), built fresh for one topic.
 * `model` is what the saved page records as its author (e.g. "anthropic/claude-haiku-5.5").
 */
export function buildTools(
  config: AgentConfig,
  topicId: string,
  cwd: string,
  model: string,
  s: TopicState,
): ToolDefinition[] {
  const all: Record<string, ToolDefinition> = {
    web_search: webSearchTool(s.found, s.seen),
    read_page: readPageTool(s.seen),
    find_examples: findExamplesTool(s.found),
    watch_video: watchVideoTool(s.found, s.seen),
    screenshot: screenshotTool({ campaign: config.campaign, topicId, seen: s.seen }),
    find_logo: findLogoTool({ campaign: config.campaign, topicId, seen: s.seen }),
    submit_page: submitPageTool({
      campaign: config.campaign,
      topicId,
      model,
      maxSubmissions: config.maxSubmissions,
      cwd,
      found: s.found,
      state: s.submit,
      seen: s.seen,
      bodyFile: config.bodyFile,
      checkLinks: config.checkLinks,
    }),
  } as Record<string, ToolDefinition>;
  return toolNamesFor(config)
    .filter((t) => !FILE_TOOLS.has(t))
    .map((t) => {
      if (!all[t]) throw new Error(`agents/${config.campaign}.json asks for an unknown tool "${t}"`);
      return all[t];
    });
}

export const log = (msg: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);

export const short = (v: unknown, n = 160) => {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > n ? `${s.slice(0, n)}…` : s;
};

/** This GitHub Actions run's page (the log), when running there. */
export const RUN_URL =
  process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null;
