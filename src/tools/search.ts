/**
 * Web search. Two backends, tried in this order:
 *
 * 1. SearXNG (free): our own meta-search engine, a container the workflow starts on the runner
 *    (config in searxng/settings.yml). It asks Bing, DuckDuckGo, Brave, Mojeek and others at
 *    once and merges what they return. Used when SEARXNG_URL is set (the workflows set it).
 * 2. OpenRouter's web plugin (paid), when SearXNG fails or finds nothing usable. Each search is
 *    one tiny chat request (max 16 output tokens) whose results come back as url_citation
 *    annotations: we keep the results and ignore the model's reply.
 *
 * OpenRouter engines (checked 2026-10-17): Parallel in "turbo" mode costs about $0.001 a search and
 * finds ordinary pages plus YouTube, TikTok, Instagram and X posts well; it's the default.
 * Exa ($0.007) is only used for LinkedIn posts, which Parallel doesn't find.
 *
 * searchCost counts every search (count), the ones SearXNG answered for free (free) and what the
 * paid ones cost (total). The runner reads and resets it per topic.
 */

import { noteProblem } from "../problems.ts";

export const searchCost = { total: 0, count: 0, free: 0 };

export type SearchResult = { title: string; url: string; snippet: string };

type SearchOpts = {
  engine?: "exa" | "parallel";
  domains?: string[];
  max?: number;
  /** Results the caller can use (e.g. only single posts). If SearXNG returns none of these, the paid search runs. */
  accept?: (r: SearchResult) => boolean;
};

const SEARCH_MODEL = "anthropic/claude-haiku-5.5";

export async function search(query: string, opts: SearchOpts = {}): Promise<SearchResult[]> {
  searchCost.count++;
  if (process.env.SEARXNG_URL) {
    try {
      const results = await searxng(query, opts);
      if (results.some(opts.accept ?? (() => true))) {
        searchCost.free++;
        return results;
      }
    } catch (e) {
      console.log(`SearXNG failed, using the paid search: ${(e as Error).message}`);
      noteProblem("search", `SearXNG failed, paid search used instead: ${(e as Error).message}`);
    }
  }
  return openRouter(query, opts);
}

/** Whether a URL is on one of these domains (or a subdomain, e.g. m.youtube.com). */
const onDomain = (url: string, domains: string[]) => {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return domains.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
};

/** SearXNG's raw JSON answer. Domain filters become site: in the query (every engine it asks understands that). */
export async function searxngRaw(query: string, domains: string[] = []) {
  const site = domains.map((d) => `site:${d}`).join(" OR ");
  const url = new URL("/search", process.env.SEARXNG_URL);
  url.searchParams.set("q", site ? `${query} ${site}` : query);
  url.searchParams.set("format", "json");
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as {
    results?: { url?: string; title?: string; content?: string; engines?: string[] }[];
    /** Engines that didn't answer, with why (CAPTCHA, too many requests, timeout). */
    unresponsive_engines?: [string, string][];
  };
}

/** SearXNG's answer as results; ones off the asked-for domains are dropped. */
export function searxngResults(body: Awaited<ReturnType<typeof searxngRaw>>, opts: SearchOpts = {}): SearchResult[] {
  const domains = opts.domains ?? [];
  const results: SearchResult[] = [];
  for (const r of body.results ?? []) {
    if (!r.url || (domains.length && !onDomain(r.url, domains))) continue;
    results.push({ title: r.title ?? "", url: r.url, snippet: (r.content ?? "").replace(/\s+/g, " ").slice(0, 500) });
    if (results.length >= (opts.max ?? 8)) break;
  }
  return results;
}

export const searxng = async (query: string, opts: SearchOpts = {}) =>
  searxngResults(await searxngRaw(query, opts.domains), opts);

async function openRouter(query: string, opts: SearchOpts): Promise<SearchResult[]> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not set");
  const engine = opts.engine ?? "parallel";
  const plugin: Record<string, unknown> = { id: "web", engine, max_results: opts.max ?? 8 };
  if (engine === "parallel") plugin.mode = "turbo";
  if (opts.domains?.length) plugin.include_domains = opts.domains;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: SEARCH_MODEL,
      max_tokens: 16,
      messages: [{ role: "user", content: query }],
      plugins: [plugin],
      usage: { include: true },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`search failed (${res.status}): ${body?.error?.message ?? "no details"}`);
  searchCost.total += Number(body.usage?.cost) || 0;

  const seen = new Set<string>();
  const results: SearchResult[] = [];
  for (const a of body.choices?.[0]?.message?.annotations ?? []) {
    const c = a.url_citation;
    if (!c?.url || seen.has(c.url)) continue;
    seen.add(c.url);
    results.push({ title: c.title ?? "", url: c.url, snippet: (c.content ?? "").replace(/\s+/g, " ").slice(0, 500) });
  }
  return results;
}

export const formatResults = (results: SearchResult[]) =>
  results.length
    ? results.map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.snippet}`).join("\n\n")
    : "No results. Try different words.";
