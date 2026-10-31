/**
 * Fixes up content ideas directory entries the collector filed before entries had titles,
 * summaries and thumbnails (and any later video missing one): `node scripts/directory-backfill.ts`.
 * Run on GitHub (.github/workflows/directory-backfill.yml), never locally: it downloads videos
 * to grab a frame. Env: STUDIO_URL, AGENT_API_KEY, OPENROUTER_API_KEY; optional MODEL (a free
 * OpenRouter model), LIMIT (most videos this run, default 400) and TEXT_ONLY=1 (titles and
 * summaries only, no pages, images or videos fetched: for trying the prompt locally).
 *
 * For each video the studio lists (GET /api/agent/directory-videos):
 *   - TikTok: views, likes, date, length and the cover image from its own page;
 *   - no thumbnail yet: snapsave's preview image, else a frame of the video (scripts/frame.py);
 *   - no title/summary: one call to a free model, from what the collector stored (caption,
 *     transcript start, its old note). The studio checks it like a collector's entry (no
 *     number the video doesn't say, lengths) and says what's wrong; one retry with that.
 * Then PATCH /api/agent/directory-videos/<id>, which saves it and publishes the entry. A video
 * it can't fix is marked tried and comes back a day later.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { jsonrepair } from "jsonrepair";

import { download, frameOf, imageBytes, snapsavePost, tiktokPage } from "../src/tools/video-sources.ts";

const STUDIO = (process.env.STUDIO_URL ?? "").replace(/\/$/, "");
const KEY = process.env.AGENT_API_KEY ?? "";
const MODEL = process.env.MODEL || "nvidia/nemotron-3-ultra-550b-a55b:free";
const LIMIT = Number(process.env.LIMIT) || 400;
/** Free models allow 20 requests a minute. */
const LLM_GAP_MS = 3_500;

type Item = {
  id: string;
  url: string;
  platform: string;
  niche: string;
  ideaName: string;
  ideaSummary: string;
  creator: string | null;
  platformTitle: string | null;
  caption: string | null;
  transcript: string | null;
  hook: string | null;
  note: string | null;
  needs: { text: boolean; thumbnail: boolean; stats: boolean };
};
type Fix = { title?: string; summary?: string; thumbnail?: string; views?: number; likes?: number; postedAt?: string; durationSec?: number; creator?: string; model?: string };

const auth = { authorization: `Bearer ${KEY}` };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const b64 = (b: Uint8Array) => Buffer.from(b).toString("base64");

async function queue(): Promise<Item[]> {
  const r = await fetch(`${STUDIO}/api/agent/directory-videos?limit=50`, { headers: auth });
  if (!r.ok) throw new Error(`studio list HTTP ${r.status}`);
  return ((await r.json()) as { videos: Item[] }).videos;
}

async function send(id: string, fix: Fix): Promise<{ problems: string[]; published: boolean }> {
  const r = await fetch(`${STUDIO}/api/agent/directory-videos/${id}`, { method: "PATCH", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify(fix) });
  if (!r.ok) throw new Error(`studio PATCH HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json() as Promise<{ problems: string[]; published: boolean }>;
}

// ------------------------------------------------------------------ title and summary

let lastLlm = 0;
async function writeText(v: Item, problems: string[] = []): Promise<{ title: string; summary: string } | null> {
  const wait = lastLlm + LLM_GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastLlm = Date.now();
  const prompt = `You write one entry for a directory of real ${v.niche.toLowerCase()} videos. Write from the material below only.

Video: ${v.url} (${v.platform}${v.creator ? `, by ${v.creator}` : ""})
Idea it belongs to: ${v.ideaName}: ${v.ideaSummary}
Platform title: ${v.platformTitle ?? "(none)"}
Caption: ${(v.caption ?? "(none)").slice(0, 1200)}
Transcript (start): ${(v.transcript ?? "(none: no speech)").slice(0, 2500)}
An editor's note on it: ${v.note ?? "(none)"}

Return only JSON: {"title": "...", "summary": "..."}
- title: 15 to 75 characters, what THIS video is. Specific and plain, e.g. "Guess the price: a 4-bedroom Palm Beach home" or "Grooming a matted Bernedoodle, start to finish".
- summary: 40 to 260 characters, 1 or 2 plain sentences on what happens in the video.
- Only facts from the material above. No number, price, place or name it doesn't contain.
- No hype words, emojis, hashtags, or "In this video".${problems.length ? `\n\nYour last answer was refused: ${problems.join("; ")}. Fix that.` : ""}`;

  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: prompt }], temperature: 0.3 }),
    signal: AbortSignal.timeout(120_000),
  });
  const j = (await r.json().catch(() => ({}))) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
  if (!r.ok) throw new Error(`OpenRouter ${r.status}: ${j.error?.message ?? ""}`);
  const text = j.choices?.[0]?.message?.content ?? "";
  const raw = text.match(/\{[\s\S]*\}/)?.[0];
  if (!raw) return null;
  const out = JSON.parse(jsonrepair(raw)) as { title?: unknown; summary?: unknown };
  return typeof out.title === "string" && typeof out.summary === "string" ? { title: out.title.trim(), summary: out.summary.trim() } : null;
}

// ------------------------------------------------------------------ thumbnail and numbers

async function media(v: Item, fix: Fix): Promise<void> {
  if (v.platform === "tiktok") {
    const page = await tiktokPage(v.url).catch((e) => (console.log(`  TikTok page: ${(e as Error).message}`), null));
    if (page) {
      Object.assign(fix, {
        views: page.views ?? undefined,
        likes: page.likes ?? undefined,
        postedAt: page.postedAt ?? undefined,
        durationSec: page.durationSec ?? undefined,
        creator: page.creator ?? undefined,
      });
      const cover = v.needs.thumbnail && page.cover ? await imageBytes(page.cover) : null;
      if (cover) fix.thumbnail = b64(cover);
    }
  }
  if (!v.needs.thumbnail || fix.thumbnail || v.platform === "youtube") return;
  const post = await snapsavePost(v.url).catch(() => null);
  const preview = post?.thumbnail ? await imageBytes(post.thumbnail) : null;
  if (preview) return void (fix.thumbnail = b64(preview));
  if (!post?.videoUrl) return;
  const dir = mkdtempSync(join(tmpdir(), "backfill-"));
  try {
    fix.thumbnail = b64(frameOf(await download(post.videoUrl, join(dir, "video.mp4"), "snapsave")));
  } catch (e) {
    console.log(`  frame: ${(e as Error).message}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ------------------------------------------------------------------ main

async function main() {
  if (!STUDIO || !KEY) throw new Error("STUDIO_URL and AGENT_API_KEY must be set");
  let done = 0;
  let published = 0;
  const seen = new Set<string>();
  while (done < LIMIT) {
    const batch = (await queue()).filter((v) => !seen.has(v.id));
    if (!batch.length) break;
    for (const v of batch) {
      if (done >= LIMIT) break;
      seen.add(v.id);
      done++;
      const fix: Fix = { model: MODEL };
      try {
        if (!process.env.TEXT_ONLY) await media(v, fix);
        let text = v.needs.text ? await writeText(v).catch((e) => (console.log(`  model: ${(e as Error).message}`), null)) : null;
        let result = await send(v.id, { ...fix, ...text });
        if (text && result.problems.length) {
          text = await writeText(v, result.problems).catch(() => null);
          if (text) result = await send(v.id, { ...text, model: MODEL });
        }
        if (result.published) published++;
        console.log(`${done}. ${v.platform} ${v.url}: ${result.published ? "published" : "not yet"}${fix.thumbnail ? ", thumbnail" : ""}${fix.views != null ? `, ${fix.views} views` : ""}${result.problems.length ? ` (refused: ${result.problems.join("; ")})` : ""}`);
      } catch (e) {
        console.log(`${done}. ${v.url}: ${(e as Error).message}`);
        await send(v.id, {}).catch(() => null); // marked tried, so the next batch moves on
      }
    }
  }
  console.log(`\n${done} videos looked at, ${published} published.`);
  console.log(`::notice title=Directory backfill::${done} videos looked at, ${published} published`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
