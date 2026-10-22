import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { defineTool } from "@earendil-works/pi-coding-agent";
import { snapsave } from "snapsave-media-downloader";
import { Type } from "typebox";

import { isPostUrl } from "./examples.ts";
import { normalUrl, type Seen } from "./web.ts";

/**
 * watch_video: what a video on YouTube, TikTok, Instagram, X or Facebook says. Who posted
 * it, when, its views, the caption, and the transcript with [m:ss] times, as text. For
 * research: real user experience from reviews and tutorials, a creator's own tips, what an
 * example post actually shows.
 *
 * Ported from sycamore-motion/scripts/watch.mjs (text only, no frames). Free first:
 *   1. yt-dlp: metadata and the platform's own captions (YouTube, usually TikTok).
 *   2. No captions: download the video and transcribe it with Whisper (scripts/transcribe.py,
 *      faster-whisper on the CPU, free). Instagram videos come from snapsave.app (the
 *      snapsave-media-downloader package; snapsave fetches from Instagram on its own servers,
 *      so Instagram's bot checks on GitHub's IPs don't matter), other platforms from yt-dlp.
 *   3. Supadata (SUPADATA_API_KEY, free plan 100 credits/month): metadata when yt-dlp can't
 *      read the post (Instagram usually), and the transcript when the above fail.
 * yt-dlp and faster-whisper must be installed (the workflows do it); without them, each
 * step that needs one is skipped with a note.
 */

/** Most of a transcript the agent gets back (everything it reads is resent every turn). */
const LIMIT = 7_000;
const SUPADATA = "https://api.supadata.ai/v1";

type Chunk = { text: string; offset: number };
type Meta = {
  platform: string;
  url: string;
  title: string | null;
  caption: string | null;
  creator: string | null;
  postedAt: string | null;
  durationSec: number | null;
  views: number | null;
  likes: number | null;
};

const platformOf = (u: string) => {
  const h = new URL(u).hostname.replace(/^www\.|^m\./, "");
  if (/youtube\.com$|youtu\.be$/.test(h)) return "youtube";
  if (/tiktok\.com$/.test(h)) return "tiktok";
  if (/instagram\.com$/.test(h)) return "instagram";
  if (/^(x|twitter)\.com$/.test(h)) return "x";
  if (/facebook\.com$|fb\.watch$/.test(h)) return "facebook";
  return "video";
};

const mmss = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// ------------------------------------------------------------------ yt-dlp

type YtInfo = Record<string, unknown> & {
  subtitles?: Record<string, { ext: string; url: string }[]>;
  automatic_captions?: Record<string, { ext: string; url: string }[]>;
};

function ytInfo(url: string, notes: string[]): YtInfo | null {
  const r = spawnSync("yt-dlp", ["--no-warnings", "-J", "--skip-download", url], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 60_000 });
  if (r.error) {
    notes.push("yt-dlp isn't installed here");
    return null;
  }
  if (r.status !== 0) {
    notes.push(`yt-dlp couldn't read the post: ${(r.stderr || "").trim().split("\n").pop()}`);
    return null;
  }
  return JSON.parse(r.stdout);
}

/** YouTube's json3 caption format. */
const parseJson3 = (j: { events?: { segs?: { utf8?: string }[]; aAppend?: unknown; tStartMs?: number }[] }): Chunk[] =>
  (j.events ?? [])
    .filter((e) => e.segs && !e.aAppend)
    .map((e) => ({ text: e.segs!.map((s) => s.utf8 ?? "").join("").replace(/\s+/g, " ").trim(), offset: e.tStartMs ?? 0 }))
    .filter((c) => c.text);

/** WebVTT (TikTok captions). */
function parseVtt(vtt: string): Chunk[] {
  const toMs = (t: string) => {
    const p = t.trim().split(":").map(Number);
    const [h, m, s] = p.length === 3 ? p : [0, ...p];
    return Math.round(((h * 60 + m) * 60 + s) * 1000);
  };
  const out: Chunk[] = [];
  for (const block of vtt.replace(/\r/g, "").split(/\n\n+/)) {
    const lines = block.split("\n");
    const i = lines.findIndex((l) => l.includes("-->"));
    if (i < 0) continue;
    const text = lines.slice(i + 1).join(" ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (text && text !== out.at(-1)?.text) out.push({ text, offset: toMs(lines[i].split("-->")[0]) });
  }
  return out;
}

/** The platform's own English captions: uploaded first, then automatic ("-orig" = original language). */
async function ytCaptions(info: YtInfo, notes: string[]): Promise<{ chunks: Chunk[]; source: string } | null> {
  const pick = (tracks?: Record<string, { ext: string; url: string }[]>) => {
    if (!tracks) return null;
    const keys = Object.keys(tracks).filter((k) => ["en", "eng"].some((c) => k === c || k.startsWith(`${c}-`)));
    keys.sort((a, b) => (b.endsWith("-orig") ? 1 : 0) - (a.endsWith("-orig") ? 1 : 0));
    for (const k of keys) {
      const t = tracks[k].find((f) => f.ext === "json3") ?? tracks[k].find((f) => f.ext === "vtt");
      if (t) return { key: k, ...t };
    }
    return null;
  };
  for (const [tracks, kind] of [[info.subtitles, "uploaded captions"], [info.automatic_captions, "automatic captions"]] as const) {
    const t = pick(tracks);
    if (!t) continue;
    try {
      const r = await fetch(t.url, { signal: AbortSignal.timeout(30_000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const body = await r.text();
      const chunks = t.ext === "json3" ? parseJson3(JSON.parse(body)) : parseVtt(body);
      if (chunks.length) return { chunks, source: `${kind} (${t.key})` };
    } catch (e) {
      notes.push(`couldn't fetch ${kind}: ${(e as Error).message}`);
    }
  }
  return null;
}

// ------------------------------------------------------------------ download + Whisper

const TRANSCRIBE = fileURLToPath(new URL("../../scripts/transcribe.py", import.meta.url));
const PYTHON = process.platform === "win32" ? "python" : "python3";

/** Instagram: the video file's URL from snapsave.app. */
async function snapsaveFile(url: string, dir: string): Promise<string> {
  const r = await snapsave(url);
  const media = r.data?.media?.find((m) => m.type === "video" && m.url);
  if (!r.success || !media) throw new Error(`snapsave: ${r.message ?? "no video in the post"}`);
  const res = await fetch(media.url!, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`snapsave download HTTP ${res.status}`);
  const file = join(dir, "video.mp4");
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

/** Other platforms: the audio track (or the whole video) through yt-dlp. */
function ytdlpFile(url: string, dir: string): string {
  const r = spawnSync("yt-dlp", ["--no-warnings", "-q", "-f", "ba/b", "-o", join(dir, "media.%(ext)s"), url], { encoding: "utf8", timeout: 180_000 });
  const file = readdirSync(dir).find((f) => f.startsWith("media."));
  if (r.status !== 0 || !file) throw new Error(`yt-dlp download failed: ${(r.stderr || r.error?.message || "").trim().split("\n").pop()}`);
  return join(dir, file);
}

/** Downloads the video and transcribes it with Whisper. */
async function whisperTranscript(url: string, platform: string): Promise<{ chunks: Chunk[]; source: string }> {
  const dir = mkdtempSync(join(tmpdir(), "watch-"));
  try {
    const file = platform === "instagram" ? await snapsaveFile(url, dir) : ytdlpFile(url, dir);
    const r = spawnSync(PYTHON, [TRANSCRIBE, file], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024, timeout: 600_000 });
    if (r.status !== 0) throw new Error(`Whisper failed: ${(r.stderr || r.error?.message || "").trim().split("\n").pop()}`);
    return { chunks: JSON.parse(r.stdout), source: `Whisper transcript (video from ${platform === "instagram" ? "snapsave" : "yt-dlp"})` };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ------------------------------------------------------------------ Supadata

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** GET a Supadata endpoint (the free plan allows 1 request a second). */
async function supa(path: string): Promise<{ status: number; body: Record<string, any> }> {
  const key = process.env.SUPADATA_API_KEY;
  if (!key) throw new Error("SUPADATA_API_KEY is not set");
  await sleep(1100);
  const r = await fetch(`${SUPADATA}${path}`, { headers: { "x-api-key": key }, signal: AbortSignal.timeout(60_000) });
  const body = await r.json().catch(() => ({}));
  if (!r.ok && r.status !== 202) throw new Error(`Supadata ${r.status} ${body.message ?? body.error ?? ""}`.trim());
  return { status: r.status, body };
}

async function supaTranscript(url: string): Promise<{ chunks: Chunk[]; source: string }> {
  let { status, body } = await supa(`/transcript?url=${encodeURIComponent(url)}&lang=en&mode=auto`);
  if (status === 202) {
    const id = body.jobId;
    for (let i = 0; i < 60 && body.status !== "completed"; i++) {
      await sleep(3000);
      ({ body } = await supa(`/transcript/${id}`));
      if (body.status === "failed") throw new Error(`Supadata job failed: ${body.error?.message ?? "unknown"}`);
    }
    if (body.status !== "completed") throw new Error("Supadata still transcribing after 3 minutes");
  }
  const chunks = ((body.content ?? []) as { text: string; offset: number }[])
    .map((c) => ({ text: c.text.trim(), offset: c.offset }))
    .filter((c) => c.text);
  return { chunks, source: "Supadata transcript" };
}

// ------------------------------------------------------------------ the tool

async function watch(url: string): Promise<string> {
  const notes: string[] = [];
  const platform = platformOf(url);
  const info = ytInfo(url, notes);

  let meta: Meta;
  if (info) {
    const d = info.upload_date as string | undefined;
    const title = (info.title as string) ?? null;
    meta = {
      platform,
      url: (info.webpage_url as string) || url,
      // Instagram titles are a generic "Video by <user>"; the caption is the real text.
      title: title && !/^Video by /.test(title) ? title : null,
      caption: (info.description as string) ?? null,
      creator: ((platform === "instagram" ? info.uploader : info.channel || info.uploader) as string) ?? null,
      postedAt: d ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : null,
      durationSec: (info.duration as number) ?? null,
      views: (info.view_count as number) ?? null,
      likes: (info.like_count as number) ?? null,
    };
  } else {
    // Without metadata the transcript is still worth returning, so a Supadata failure isn't fatal.
    const m = await supa(`/metadata?url=${encodeURIComponent(url)}`).then(
      (r) => r.body,
      (e) => (notes.push(`no metadata: ${(e as Error).message}`), {} as Record<string, any>),
    );
    meta = {
      platform,
      url: m.url || url,
      title: m.title ?? null,
      caption: m.description ?? null,
      creator: m.author?.displayName ?? m.author?.username ?? null,
      postedAt: m.createdAt?.slice(0, 10) ?? null,
      durationSec: m.media?.duration ?? null,
      views: m.stats?.views ?? null,
      likes: m.stats?.likes ?? null,
    };
  }

  let tr = info ? await ytCaptions(info, notes) : null;
  if (!tr) {
    try {
      tr = await whisperTranscript(url, platform);
    } catch (e) {
      notes.push((e as Error).message);
    }
  }
  if (!tr) {
    try {
      tr = await supaTranscript(url);
    } catch (e) {
      notes.push(`no transcript: ${(e as Error).message}`);
    }
  }

  // Short caption cues merged into readable lines of ~200 characters, each with its start time.
  const lines: { at: number; text: string }[] = [];
  for (const c of tr?.chunks ?? []) {
    const last = lines.at(-1);
    if (last && last.text.length < 200) last.text += ` ${c.text}`;
    else lines.push({ at: c.offset, text: c.text });
  }
  const n = (v: number | null) => (v == null ? "?" : v.toLocaleString("en-US"));
  let text = [
    `# ${meta.title || meta.caption?.split("\n")[0]?.slice(0, 100) || meta.url}`,
    `Creator: ${meta.creator ?? "?"} · ${platform} · posted ${meta.postedAt ?? "?"} · ${meta.durationSec ? `${Math.round(meta.durationSec)} s` : "length ?"} · ${n(meta.views)} views · ${n(meta.likes)} likes`,
    `Link: ${meta.url}`,
    "",
    "## Caption",
    meta.caption?.trim().slice(0, 1500) || "(none)",
    "",
    `## Transcript${tr ? ` (${tr.source})` : ""}`,
    ...(lines.length ? lines.map((l) => `[${mmss(l.at)}] ${l.text}`) : ["(none: music-only or text-on-screen video, or no transcript available)"]),
    ...(notes.length ? ["", `Notes: ${notes.join("; ")}`] : []),
  ].join("\n");
  if (text.length > LIMIT) text = `${text.slice(0, LIMIT)}\n\n[cut at ${LIMIT} characters]`;
  return text;
}

export const watchVideoTool = (found: Set<string>, seen: Seen) =>
  defineTool({
    name: "watch_video",
    label: "Watch video",
    description:
      "Read what a YouTube, TikTok, Instagram, X or Facebook video says: creator, date, views, caption and the transcript with timestamps. Use it for reviews, tutorials and creators' own tips. Pass the video's URL.",
    parameters: Type.Object({ url: Type.String({ description: "The video's full URL" }) }),
    execute: async (_id, { url }) => {
      try {
        const text = await watch(url);
        seen.add(normalUrl(url));
        if (isPostUrl(url)) found.add(url);
        return { content: [{ type: "text" as const, text }], details: {} };
      } catch (e) {
        return { content: [{ type: "text" as const, text: `Couldn't watch ${url}: ${(e as Error).message}` }], details: {} };
      }
    },
  });
