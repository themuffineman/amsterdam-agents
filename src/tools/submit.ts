import { readFileSync } from "node:fs";
import { join } from "node:path";

import { defineTool } from "@earendil-works/pi-coding-agent";
import { jsonrepair } from "jsonrepair";
import { Type } from "typebox";

import { submitWork } from "../studio.ts";
import { searchCost } from "./search.ts";
import type { WatchedMap } from "./watch.ts";
import { normalUrl, type Seen } from "./web.ts";

/**
 * submit_page: sends the page to the studio, which checks it and saves it, or answers
 * with the problems to fix. `state` tells the runner what happened.
 *
 * The page isn't passed to the tool: the agent writes it to page.json in its folder (Pi's
 * write tool) and calls submit_page with no arguments. To fix problems it edits only the
 * lines that need it (Pi's edit tool) and submits again, instead of writing the whole page
 * out again, which is most of the cost of a fix. Small JSON mistakes in the file are
 * repaired here (jsonrepair) rather than sent back.
 *
 * Instagram and Facebook examples whose URL no search returned (`found`) are dropped
 * before sending: they're the platforms the studio can't check, so a made-up link would
 * get through. Other platforms' links go as they are; the studio checks them and drops fakes.
 * Dropping instead of refusing saves the model from resending the whole page.
 *
 * Campaigns that write long prose (blog posts) keep it in a Markdown file (`bodyFile`, e.g.
 * post.md) next to page.json, because a long article is easier to write and fix as a file
 * than as one JSON string; it's sent as the page's `body`. With `checkLinks`, every link in
 * the body and every source must be a URL the agent saw (a search result or a page it read),
 * or the submission goes back unsent, without using up one of its submissions.
 *
 * The directory collector (`watched`, config attachWatched) sends `posts`, each a video it
 * filed under an idea. A post it didn't watch, or one watch_video couldn't reach, goes back
 * unsent the same way; the rest get what watch_video read (`video`: creator, date, views,
 * caption, transcript), which is the studio's proof the video exists and the writer's evidence.
 * `research` says how many searches and videos the agent went through.
 */

export type SubmitState = { submissions: number; savedUrl: string | null; lastProblems: string[] };

/** Our own site: the studio checks those links against the pages it gave the agent. */
const isOwnSite = (url: string) => /^https?:\/\/(www\.)?sycamore\.to(\/|$)/.test(url) || url.startsWith("/") || url.startsWith("#");

/** Links in Markdown ([text](url)) and the page's sources that no search or read turned up. */
function unseenLinks(page: Record<string, unknown>, seen: Seen): string[] {
  const body = typeof page.body === "string" ? page.body.replace(/```[\s\S]*?```/g, " ") : "";
  const inBody = [...body.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)].map((m) => m[1]);
  const sources = Array.isArray(page.sources) ? page.sources.map((s) => (s as { url?: unknown })?.url).filter((u): u is string => typeof u === "string") : [];
  return [...new Set([...inBody, ...sources])].filter((u) => !isOwnSite(u) && !seen.has(normalUrl(u)));
}

/** Platforms the studio can't check a post on. */
const isUncheckable = (url: string) => /^https?:\/\/(www\.|m\.)?(instagram|facebook)\.com\//.test(url);

/** Removes every `example` (however deep) whose URL is an Instagram/Facebook link no search returned; returns those URLs. */
function dropUnfound(value: unknown, found: Set<string>): string[] {
  if (Array.isArray(value)) return value.flatMap((v) => dropUnfound(v, found));
  if (!value || typeof value !== "object") return [];
  const obj = value as Record<string, unknown>;
  const dropped: string[] = [];
  const url = (obj.example as { url?: unknown } | undefined)?.url;
  if (typeof url === "string" && isUncheckable(url) && !found.has(url)) {
    delete obj.example;
    dropped.push(url);
  }
  return [...dropped, ...Object.values(obj).flatMap((v) => dropUnfound(v, found))];
}

export function submitPageTool(opts: {
  campaign: string;
  topicId: string;
  model: string;
  maxSubmissions: number;
  /** The agent's folder, where it writes page.json. */
  cwd: string;
  found: Set<string>;
  state: SubmitState;
  /** URLs the agent has seen (for checkLinks). */
  seen: Seen;
  /** A Markdown file in cwd sent as the page's `body` (blog posts: post.md). */
  bodyFile?: string;
  /** Refuse links the agent never saw (see the top of this file). */
  checkLinks?: boolean;
  /** The videos watch_video read this topic: posts must be among them (see the top of this file). */
  watched?: WatchedMap;
}) {
  const { state } = opts;
  const reply = (t: string) => ({ content: [{ type: "text" as const, text: t }], details: {} });

  return defineTool({
    name: "submit_page",
    label: "Submit page",
    description:
      opts.bodyFile
      ? `Check and save the post you wrote to ${opts.bodyFile} and page.json (no arguments). Answers 'saved' with the URL, or the problems to fix: fix them by editing the files, then call submit_page again.`
      : "Check and save the page you wrote to page.json (no arguments). Answers 'saved' with the URL, or the problems to fix: fix them by editing page.json, then call submit_page again.",
    parameters: Type.Object({}),
    execute: async () => {
      if (state.savedUrl) return reply(`Already saved: ${state.savedUrl}. You're done.`);
      if (state.submissions >= opts.maxSubmissions) return reply("No submissions left. Stop.");

      let text: string;
      try {
        text = readFileSync(join(opts.cwd, "page.json"), "utf8");
      } catch {
        return reply("There's no page.json yet. Write the page to page.json with the write tool, then call submit_page.");
      }
      let content: unknown;
      try {
        content = JSON.parse(jsonrepair(text));
      } catch (e) {
        return reply(`page.json isn't valid JSON and couldn't be repaired (${(e as Error).message}). Fix that spot with the edit tool and submit again.`);
      }

      if (opts.bodyFile) {
        let body: string;
        try {
          body = readFileSync(join(opts.cwd, opts.bodyFile), "utf8");
        } catch {
          return reply(`There's no ${opts.bodyFile} yet. Write the article to ${opts.bodyFile} with the write tool, then call submit_page.`);
        }
        if (content && typeof content === "object") (content as Record<string, unknown>).body = body;
      }

      if (opts.checkLinks && content && typeof content === "object") {
        const unseen = unseenLinks(content as Record<string, unknown>, opts.seen);
        if (unseen.length) {
          return reply(
            `Not sent (this didn't use a submission). These links weren't in any search result or page you read, so they may not exist. Replace each with the exact URL of a page you found, or read_page it first if it's a real page (then it counts), or remove it:\n- ${unseen.join("\n- ")}`,
          );
        }
      }

      if (opts.watched && content && typeof content === "object") {
        const page = content as Record<string, unknown>;
        const posts = Array.isArray(page.posts) ? (page.posts as Record<string, unknown>[]) : [];
        const unwatched: string[] = [];
        const missing: string[] = [];
        for (const p of posts) {
          const url = typeof p?.url === "string" ? p.url : "";
          const w = opts.watched.get(url) ?? [...opts.watched].find(([k]) => normalUrl(k) === normalUrl(url))?.[1];
          if (!w) unwatched.push(url || "(a post with no url)");
          else if (!w.exists) missing.push(url);
          else p.video = w;
        }
        if (unwatched.length || missing.length) {
          return reply(
            `Not sent (this didn't use a submission).${unwatched.length ? `\nYou didn't watch these with watch_video (use the URL exactly as you watched it), so they can't be filed. Watch them first, or remove them:\n- ${unwatched.join("\n- ")}` : ""}${missing.length ? `\nwatch_video couldn't reach these videos, so they may be gone or private. Remove them:\n- ${missing.join("\n- ")}` : ""}`,
          );
        }
        page.research = { searches: searchCost.count, watched: opts.watched.size };
      }

      const dropped = dropUnfound(content, opts.found);

      state.submissions++;
      const result = await submitWork(opts.campaign, opts.topicId, content, opts.model);
      if (result.ok) {
        state.savedUrl = result.url ?? "(saved)";
        return reply(`saved: ${state.savedUrl}`);
      }
      state.lastProblems = result.problems.length ? result.problems : [result.error];
      if (dropped.length) state.lastProblems.push(`dropped Instagram/Facebook examples no search returned: ${dropped.join(", ")}`);
      const left = opts.maxSubmissions - state.submissions;
      return reply(
        `Not saved. Fix every problem and submit again (${left} submission${left === 1 ? "" : "s"} left):\n- ${state.lastProblems.join("\n- ")}`,
      );
    },
  });
}
