import { defineTool } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { formatResults, search } from "./search.ts";

/**
 * find_examples: searches one platform for real posts and returns only links that are a
 * single post (not a profile or a search page). Every link it returns is remembered in
 * `found`, and submit_page refuses example URLs that aren't in it, so the model can't make
 * up a post. (The studio also checks each post exists, except on Instagram, where it can't.)
 */

const PLATFORMS = {
  youtube: { domains: ["youtube.com"], engine: "parallel" },
  tiktok: { domains: ["tiktok.com"], engine: "parallel" },
  // Parallel finds no LinkedIn posts; Exa does.
  linkedin: { domains: ["linkedin.com"], engine: "exa" },
  instagram: { domains: ["instagram.com"], engine: "parallel" },
  x: { domains: ["x.com", "twitter.com"], engine: "parallel" },
} as const;

/**
 * Whether a URL is a single post we can embed. Same rules as parsePostUrl in sycamore-mono's
 * frontend/lib/idea-pages.ts (the studio checks with that); keep the two in step.
 */
export function isPostUrl(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  const host = u.hostname.replace(/^(www|m|mobile)\./, "");
  const p = u.pathname;
  if (host === "youtube.com") return (p === "/watch" && !!u.searchParams.get("v")) || /^\/shorts\/[\w-]{6,}/.test(p);
  if (host === "youtu.be") return /^\/[\w-]{6,}/.test(p);
  if (host === "tiktok.com") return /^\/@[\w.-]+\/video\/\d+/.test(p);
  if (host === "instagram.com") return /^\/(?:[\w.]+\/)?(?:p|reel|reels)\/[\w-]+/.test(p);
  if (host === "x.com" || host === "twitter.com") return /^\/\w+\/status\/\d+/.test(p);
  if (host === "linkedin.com") return /activity[-:]\d{15,}/.test(p);
  return false;
}

export function findExamplesTool(found: Set<string>) {
  return defineTool({
    name: "find_examples",
    label: "Find example posts",
    description:
      "Search one platform for real posts (youtube, tiktok, instagram, linkedin or x). Returns only links to single posts, with title and snippet. Describe the post you want, e.g. 'realtor video things I wish I knew before moving to a city'.",
    parameters: Type.Object({
      platform: Type.Union(Object.keys(PLATFORMS).map((p) => Type.Literal(p)) as never, { description: "youtube, tiktok, instagram, linkedin or x" }),
      query: Type.String({ description: "What the post is about" }),
    }),
    execute: async (_id, { platform, query }) => {
      const cfg = PLATFORMS[platform as keyof typeof PLATFORMS];
      try {
        const results = (await search(query, { engine: cfg.engine, domains: [...cfg.domains], max: 10 })).filter((r) => isPostUrl(r.url));
        for (const r of results) found.add(r.url);
        return { content: [{ type: "text" as const, text: formatResults(results) }], details: {} };
      } catch (e) {
        return { content: [{ type: "text" as const, text: `Search failed: ${(e as Error).message}` }], details: {} };
      }
    },
  });
}
