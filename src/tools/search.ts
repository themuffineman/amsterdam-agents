/**
 * Web search through OpenRouter's web plugin, so search runs on the same key as the model.
 * Each search is one tiny chat request (max 16 output tokens) whose results come back as
 * url_citation annotations: we keep the results and ignore the model's reply.
 *
 * Engines (checked 2026-10-17): Parallel in "turbo" mode costs about $0.001 a search and
 * finds ordinary pages plus YouTube, TikTok, Instagram and X posts well; it's the default.
 * Exa ($0.007) is only used for LinkedIn posts, which Parallel doesn't find.
 *
 * What searches cost (OpenRouter reports it per request) adds up in searchCost, which the
 * runner reads and resets per topic.
 */

export const searchCost = { total: 0, count: 0 };

export type SearchResult = { title: string; url: string; snippet: string };

const SEARCH_MODEL = "anthropic/claude-haiku-5.5";

export async function search(
  query: string,
  opts: { engine?: "exa" | "parallel"; domains?: string[]; max?: number } = {},
): Promise<SearchResult[]> {
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
  searchCost.count++;

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
