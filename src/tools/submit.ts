import { defineTool } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { submitWork } from "../studio.ts";

/**
 * submit_page: sends the finished page to the studio, which checks it and saves it, or
 * answers with the problems to fix. `state` tells the runner what happened.
 *
 * Instagram examples whose URL no search returned (`found`) are dropped before sending:
 * Instagram is the one platform the studio can't check, so a made-up link would get
 * through. Other platforms' links go as they are; the studio checks them and drops fakes.
 * Dropping instead of refusing saves the model from resending the whole page.
 */

export type SubmitState = { submissions: number; savedUrl: string | null; lastProblems: string[] };

const isInstagram = (url: string) => /^https?:\/\/(www\.)?instagram\.com\//.test(url);

/** Removes every `example` (however deep) whose URL is an Instagram link no search returned; returns those URLs. */
function dropUnfoundInstagram(value: unknown, found: Set<string>): string[] {
  if (Array.isArray(value)) return value.flatMap((v) => dropUnfoundInstagram(v, found));
  if (!value || typeof value !== "object") return [];
  const obj = value as Record<string, unknown>;
  const dropped: string[] = [];
  const url = (obj.example as { url?: unknown } | undefined)?.url;
  if (typeof url === "string" && isInstagram(url) && !found.has(url)) {
    delete obj.example;
    dropped.push(url);
  }
  return [...dropped, ...Object.values(obj).flatMap((v) => dropUnfoundInstagram(v, found))];
}

export function submitPageTool(opts: {
  campaign: string;
  topicId: string;
  model: string;
  maxSubmissions: number;
  found: Set<string>;
  state: SubmitState;
}) {
  const { state } = opts;
  const reply = (t: string) => ({ content: [{ type: "text" as const, text: t }], details: {} });

  return defineTool({
    name: "submit_page",
    label: "Submit page",
    description:
      "Send the finished page (the JSON object from your instructions) to be checked and saved. Answers 'saved' with the URL, or the problems to fix.",
    parameters: Type.Object({ page: Type.Unknown({ description: "The page JSON object" }) }),
    execute: async (_id, { page }) => {
      if (state.savedUrl) return reply(`Already saved: ${state.savedUrl}. You're done.`);
      if (state.submissions >= opts.maxSubmissions) return reply("No submissions left. Stop.");

      // Models sometimes send the JSON as a string.
      let content = page;
      if (typeof content === "string") {
        try {
          content = JSON.parse(content);
        } catch {
          return reply("page must be a JSON object, and this isn't valid JSON. Fix it and submit again.");
        }
      }

      const dropped = dropUnfoundInstagram(content, opts.found);

      state.submissions++;
      const result = await submitWork(opts.campaign, opts.topicId, content, opts.model);
      if (result.ok) {
        state.savedUrl = result.url ?? "(saved)";
        return reply(`saved: ${state.savedUrl}`);
      }
      state.lastProblems = result.problems.length ? result.problems : [result.error];
      if (dropped.length) state.lastProblems.push(`dropped Instagram examples no search returned: ${dropped.join(", ")}`);
      const left = opts.maxSubmissions - state.submissions;
      return reply(
        `Not saved. Fix every problem and submit again (${left} submission${left === 1 ? "" : "s"} left):\n- ${state.lastProblems.join("\n- ")}`,
      );
    },
  });
}
