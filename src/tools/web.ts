import { defineTool } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { isPostUrl } from "./examples.ts";
import { isRedditThread, readRedditThread } from "./reddit.ts";
import { readWithChrome } from "./screenshot.ts";
import { formatResults, search } from "./search.ts";

/**
 * Most of a page the agent gets back. Everything it reads stays in the conversation and is
 * sent again on every later step, so this is the main lever on input cost.
 */
const PAGE_LIMIT = 5_000;

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }], details: {} });

/**
 * Every URL the agent has seen: search results and pages it read. submit_page can refuse a
 * link outside this set (a URL the model made up). Compared with normalUrl.
 */
export type Seen = Set<string>;

/** A URL in a form two spellings of the same page share: no www, #hash, tracking tags or trailing slash. */
export function normalUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    for (const k of [...u.searchParams.keys()]) if (/^utm_|^ref$|^fbclid$|^gclid$/i.test(k)) u.searchParams.delete(k);
    const query = u.searchParams.toString();
    return `${u.hostname.replace(/^www\./, "").toLowerCase()}${u.pathname.replace(/\/+$/, "")}${query ? `?${query}` : ""}`;
  } catch {
    return url.trim();
  }
}

/** web_search also turns up real posts; they count as found for submit_page, like find_examples results. */
export const webSearchTool = (found: Set<string>, seen: Seen) =>
  defineTool({
  name: "web_search",
  label: "Web search",
  description: "Search the web. Returns titles, URLs and snippets. Use specific queries; read the best pages with read_page.",
  parameters: Type.Object({ query: Type.String({ description: "What to search for" }) }),
  execute: async (_id, { query }) => {
    try {
      const results = await search(query);
      for (const r of results) {
        if (isPostUrl(r.url)) found.add(r.url);
        seen.add(normalUrl(r.url));
      }
      return text(formatResults(results));
    } catch (e) {
      return text(`Search failed: ${(e as Error).message}`);
    }
  },
});

/** Reddit threads per topic through Apify (about 1 cent each). */
const MAX_REDDIT = 3;

/**
 * A bot check or error page instead of the page (Reddit's block page, Cloudflare's "Just a
 * moment", Quora's JavaScript-only shell). Only short texts: a long article quoting one of
 * these phrases is still the article.
 */
const isBlockPage = (t: string) =>
  t.length < 3000 &&
  /blocked by network security|you've been blocked|blocked by mistake|just a moment\.\.\.|enable javascript and cookies to continue|verify you are human|attention required|something went wrong\. wait a moment/i.test(t);

const usable = (t: string | null | undefined): t is string => !!t && t.trim().length > 200 && !isBlockPage(t);

/**
 * Reads a page as text, trying in turn until one gives the real page:
 *   1. Jina Reader (r.jina.ai): renders JavaScript-heavy pages, returns clean markdown.
 *   2. A plain fetch, tags stripped.
 *   3. Chrome on this machine (readWithChrome): gets past some bot checks (Quora's Cloudflare).
 * A block page from all three is an error, so the agent knows it didn't read the page.
 */
async function readText(url: string): Promise<string> {
  const jina = await fetch(`https://r.jina.ai/${url}`, {
    headers: { Accept: "text/plain", "X-Return-Format": "markdown" },
    signal: AbortSignal.timeout(45_000),
  })
    .then((r) => (r.ok ? r.text() : null))
    .catch(() => null);
  if (usable(jina)) return jina;

  const plain = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36" },
    signal: AbortSignal.timeout(30_000),
  })
    .then(async (r) =>
      r.ok
        ? (await r.text())
            .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/\s+/g, " ")
        : null,
    )
    .catch(() => null);
  if (usable(plain)) return plain;

  const chrome = await readWithChrome(url).catch(() => null);
  if (usable(chrome)) return chrome.replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n");
  throw new Error("the site showed a bot check or an error page instead of the page (not read; don't rely on it)");
}

export const readPageTool = (seen: Seen) => {
  let redditReads = 0;
  return defineTool({
  name: "read_page",
  label: "Read page",
  description: `Read a web page as text (the first 5,000 characters). Use it on search results before relying on them. Reddit threads (reddit.com/r/.../comments/...) come back with their comments; at most ${MAX_REDDIT} per post, so pick the most relevant.`,
  parameters: Type.Object({ url: Type.String({ description: "The page's full URL" }) }),
  execute: async (_id, { url }) => {
    try {
      let t: string;
      if (isRedditThread(url) && process.env.APIFY_TOKEN) {
        if (redditReads >= MAX_REDDIT) return text(`You've read ${MAX_REDDIT} Reddit threads, the most for one post. Use the ones you have.`);
        redditReads++;
        t = await readRedditThread(url);
      } else {
        t = await readText(url);
      }
      seen.add(normalUrl(url));
      return text(t.length > PAGE_LIMIT ? `${t.slice(0, PAGE_LIMIT)}\n\n[cut at ${PAGE_LIMIT} characters]` : t);
    } catch (e) {
      return text(`Couldn't read ${url}: ${(e as Error).message}`);
    }
  },
  });
};
