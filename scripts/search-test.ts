/**
 * Tries SearXNG (no paid search) with the kinds of searches the agents make, and reports how
 * many came back usable. Run by .github/workflows/search-test.yml on a runner with the SearXNG
 * container up; SEARXNG_URL must be set.
 *
 * Prints every result, plus GitHub annotations (::notice / ::warning) with the totals, which show
 * on the run's page.
 */
import { isPostUrl } from "../src/tools/examples.ts";
import { searxngRaw, searxngResults } from "../src/tools/search.ts";

// Research searches, like the blog posts and ideas agents make.
const RESEARCH = [
  "Submagic pricing plans",
  "CapCut auto captions how to",
  "best AI caption generator for talking head videos",
  "Descript vs Captions app comparison",
  "how to add captions to Instagram Reels",
  "jump cut editing talking head video tips",
  "TikTok video ideas for dentists",
  "Opus Clip alternatives",
];

// find_examples searches: one platform each, only single-post links count.
const EXAMPLES: [string, string[], string][] = [
  ["youtube", ["youtube.com"], "realtor video things I wish I knew before moving"],
  ["tiktok", ["tiktok.com"], "dentist teeth whitening before and after"],
  ["instagram", ["instagram.com"], "florist bouquet making reel"],
  ["x", ["x.com", "twitter.com"], "indie hacker launch thread revenue"],
  ["linkedin", ["linkedin.com"], "B2B SaaS founder post customer story"],
  ["facebook", ["facebook.com"], "plumber tips video"],
  ["pinterest", ["pinterest.com"], "fashion blogger outfit ideas fall"],
];

const base = process.env.SEARXNG_URL;
if (!base) throw new Error("SEARXNG_URL is not set");

const answered = new Map<string, number>();
const failed = new Map<string, string>();
const note = (body: Awaited<ReturnType<typeof searxngRaw>>) => {
  for (const r of body.results ?? []) for (const e of r.engines ?? []) answered.set(e, (answered.get(e) ?? 0) + 1);
  for (const [e, why] of body.unresponsive_engines ?? []) failed.set(e, why);
};

let researchOk = 0;
console.log("== Research searches");
for (const q of RESEARCH) {
  const body = await searxngRaw(q);
  note(body);
  const results = searxngResults(body);
  if (results.length) researchOk++;
  console.log(`\n"${q}": ${results.length} results`);
  for (const r of results) console.log(`  ${r.url}\n    ${r.snippet.slice(0, 120)}`);
}

const examples: string[] = [];
console.log("\n== find_examples searches");
for (const [platform, domains, q] of EXAMPLES) {
  const body = await searxngRaw(q, domains);
  note(body);
  const results = searxngResults(body, { domains, max: 10 });
  const posts = results.filter((r) => isPostUrl(r.url));
  examples.push(`${platform} ${posts.length}/${results.length}`);
  console.log(`\n${platform} "${q}": ${results.length} results on the platform, ${posts.length} single posts`);
  for (const r of results) console.log(`  ${isPostUrl(r.url) ? "POST" : "    "} ${r.url}`);
}

console.log(`::notice title=Research::${researchOk}/${RESEARCH.length} research searches returned results`);
console.log(`::notice title=Examples::single posts / results on the platform: ${examples.join(", ")}`);
console.log(`::notice title=Engines answering::${[...answered].sort((a, b) => b[1] - a[1]).map(([e, n]) => `${e} ${n}`).join(", ") || "none"}`);
if (failed.size) console.log(`::warning title=Engines failing::${[...failed].map(([e, why]) => `${e} (${why})`).join(", ")}`);
