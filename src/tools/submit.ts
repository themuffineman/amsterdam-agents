import { defineTool } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { submitWork } from "../studio.ts";

/**
 * submit_page: sends the finished page to the studio, which checks it and saves it, or
 * answers with the problems to fix. Before sending, example post URLs are checked against
 * the ones find_examples returned (`found`). `state` tells the runner what happened.
 */

export type SubmitState = { submissions: number; savedUrl: string | null; lastProblems: string[] };

/** Every example post URL in the page: the `url` of any `example` object, however deep. */
function exampleUrls(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(exampleUrls);
  if (!value || typeof value !== "object") return [];
  const obj = value as Record<string, unknown>;
  const own = obj.example && typeof (obj.example as { url?: unknown }).url === "string" ? [(obj.example as { url: string }).url] : [];
  return [...own, ...Object.values(obj).flatMap(exampleUrls)];
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

      const invented = exampleUrls(content).filter((u) => !opts.found.has(u));
      if (invented.length) {
        return reply(
          `These example URLs weren't returned by find_examples, so they can't be used (copy URLs exactly as find_examples gives them, or drop the example):\n${invented.join("\n")}\nNothing was submitted.`,
        );
      }

      state.submissions++;
      const result = await submitWork(opts.campaign, opts.topicId, content, opts.model);
      if (result.ok) {
        state.savedUrl = result.url ?? "(saved)";
        return reply(`saved: ${state.savedUrl}`);
      }
      state.lastProblems = result.problems.length ? result.problems : [result.error];
      const left = opts.maxSubmissions - state.submissions;
      return reply(
        `Not saved. Fix every problem and submit again (${left} submission${left === 1 ? "" : "s"} left):\n- ${state.lastProblems.join("\n- ")}`,
      );
    },
  });
}
