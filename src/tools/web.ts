import { defineTool } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { formatResults, search } from "./search.ts";

/** Most of a page the agent gets back, so one long page can't fill its context. */
const PAGE_LIMIT = 15_000;

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }], details: {} });

export const webSearch = defineTool({
  name: "web_search",
  label: "Web search",
  description: "Search the web. Returns titles, URLs and snippets. Use specific queries; read the best pages with read_page.",
  parameters: Type.Object({ query: Type.String({ description: "What to search for" }) }),
  execute: async (_id, { query }) => {
    try {
      return text(formatResults(await search(query)));
    } catch (e) {
      return text(`Search failed: ${(e as Error).message}`);
    }
  },
});

/**
 * Reads a page as text. Jina Reader (r.jina.ai) first: it renders JavaScript-heavy pages
 * and returns clean markdown. If it fails, the raw HTML with the tags stripped.
 */
async function readText(url: string): Promise<string> {
  const jina = await fetch(`https://r.jina.ai/${url}`, {
    headers: { Accept: "text/plain", "X-Return-Format": "markdown" },
    signal: AbortSignal.timeout(45_000),
  }).catch(() => null);
  if (jina?.ok) {
    const t = await jina.text();
    if (t.trim().length > 200) return t;
  }
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.text())
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}

export const readPage = defineTool({
  name: "read_page",
  label: "Read page",
  description: "Read a web page as text (the first 15,000 characters). Use it on search results before relying on them.",
  parameters: Type.Object({ url: Type.String({ description: "The page's full URL" }) }),
  execute: async (_id, { url }) => {
    try {
      const t = await readText(url);
      return text(t.length > PAGE_LIMIT ? `${t.slice(0, PAGE_LIMIT)}\n\n[cut at ${PAGE_LIMIT} characters]` : t);
    } catch (e) {
      return text(`Couldn't read ${url}: ${(e as Error).message}`);
    }
  },
});
