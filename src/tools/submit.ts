import { readFileSync } from "node:fs";
import { join } from "node:path";

import { defineTool } from "@earendil-works/pi-coding-agent";
import { jsonrepair } from "jsonrepair";
import { Type } from "typebox";

import { submitWork } from "../studio.ts";

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
 */

export type SubmitState = { submissions: number; savedUrl: string | null; lastProblems: string[] };

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
}) {
  const { state } = opts;
  const reply = (t: string) => ({ content: [{ type: "text" as const, text: t }], details: {} });

  return defineTool({
    name: "submit_page",
    label: "Submit page",
    description:
      "Check and save the page you wrote to page.json (no arguments). Answers 'saved' with the URL, or the problems to fix: fix them by editing page.json, then call submit_page again.",
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
