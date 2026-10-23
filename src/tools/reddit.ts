/**
 * Reads a Reddit thread (post + comments) through the Apify Reddit scraper, for read_page.
 * Every free route to Reddit is blocked (checked 2026-10-23: Jina Reader gets "You've been
 * blocked", a plain fetch gets a JavaScript challenge), so this one is paid: about 1 cent a
 * thread, billed to the Apify account (APIFY_TOKEN, the same token as the studio's tutorial
 * harvest, which uses the same actor and settings). Apify scrapes from its own servers.
 *
 * Scraper facts (from the harvest): comments come back flat and their score is always 0, so
 * the text can't say which answer was upvoted; [OP] marks the person who posted.
 */

const ACTOR = "automation-lab~reddit-scraper";
const MAX_COMMENTS = 30;
const SKIP_AUTHORS = new Set(["AutoModerator"]);
const SKIP_BODIES = new Set(["[deleted]", "[removed]", ""]);

/** A thread URL: reddit.com/r/<sub>/comments/<id>/... (only threads can be scraped by URL). */
export const isRedditThread = (url: string) => /^https?:\/\/([a-z]+\.)?reddit\.com\/r\/[^/]+\/comments\/[a-z0-9]+/i.test(url);

type Item = Record<string, any>;

export async function readRedditThread(url: string): Promise<string> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN is not set");
  // Starts the actor and waits for its results in one request (Apify allows up to 5 minutes).
  const res = await fetch(`https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?clean=true&format=json`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ urls: [url], includeComments: true, maxCommentsPerPost: MAX_COMMENTS, commentDepth: 3 }),
    signal: AbortSignal.timeout(300_000),
  });
  if (!res.ok) throw new Error(`Apify ${res.status} ${(await res.text()).slice(0, 200)}`);
  const items = (await res.json()) as Item[];

  const post = items.find((i) => i.type === "post");
  if (!post?.title) throw new Error("the Reddit scraper found no post at that URL");
  const body = String(post.selfText ?? "")
    .replace(/\s*(submitted by \/u\/\S+\s*)?\[link\]\s*\[comments\]\s*$/, "")
    .trim();
  const comments = items
    .filter((i) => i.type === "comment" && !SKIP_AUTHORS.has(i.author) && !SKIP_BODIES.has(String(i.body ?? "").trim()))
    .map((i) => `- ${i.isSubmitter ? "[OP] " : ""}${i.author ?? "?"}: ${String(i.body).trim().replace(/\s+/g, " ")}`);

  return [
    `# ${post.title}`,
    `Reddit${post.subreddit ? ` · r/${post.subreddit}` : ""} · posted ${String(post.createdAt ?? "?").slice(0, 10)} · by ${post.author ?? "?"}`,
    "",
    body || "(no text: a link or image post)",
    "",
    `## Comments (${comments.length}, in no particular order; votes aren't available)`,
    ...(comments.length ? comments : ["(none)"]),
  ].join("\n");
}
