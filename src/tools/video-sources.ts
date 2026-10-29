import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { snapsave } from "snapsave-media-downloader";

/**
 * Where videos and transcripts come from, for watch_video (watch.ts) and the film agent's
 * `npm run watch` (motion/scripts/watch.mjs). Free, no logins, no yt-dlp (YouTube and TikTok
 * block it on GitHub's IPs) and no Supadata (paid). Every platform goes through a service that
 * fetches the video on its own servers:
 *   YouTube: Invidious, an open-source YouTube front-end with a JSON API (public instances,
 *     INVIDIOUS_URLS or the healthy ones listed on api.invidious.io). Metadata, the English
 *     captions when the instance can get them (often empty), the audio and video tracks.
 *     Gemini (GEMINI_API_KEY, a free-tier key) fetches YouTube links itself: the last resort.
 *   Instagram, TikTok, X, Facebook: snapsave.app (the snapsave-media-downloader package): the
 *     post's caption and video file.
 * Speech without captions is transcribed by scripts/transcribe.py (faster-whisper on the CPU).
 */

export type Chunk = { text: string; offset: number };
export type Transcript = { chunks: Chunk[]; source: string };

export const platformOf = (u: string) => {
  const h = new URL(u).hostname.replace(/^www\.|^m\./, "");
  if (/youtube\.com$|youtu\.be$/.test(h)) return "youtube";
  if (/tiktok\.com$/.test(h)) return "tiktok";
  if (/instagram\.com$/.test(h)) return "instagram";
  if (/^(x|twitter)\.com$/.test(h)) return "x";
  if (/facebook\.com$|fb\.watch$/.test(h)) return "facebook";
  return "video";
};

/** WebVTT captions as chunks. */
function parseVtt(vtt: string): Chunk[] {
  const toMs = (t: string) => {
    const p = t.trim().split(":").map(Number);
    const [h, m, s] = p.length === 3 ? p : [0, ...p];
    return Math.round(((h * 60 + m) * 60 + s) * 1000);
  };
  const out: Chunk[] = [];
  // YouTube's auto captions roll: each cue repeats the line(s) of the cue before it. Only the
  // lines a cue adds are kept, or every sentence comes out two or three times.
  let prev = new Set<string>();
  for (const block of vtt.replace(/\r/g, "").split(/\n\n+/)) {
    const lines = block.split("\n");
    const i = lines.findIndex((l) => l.includes("-->"));
    if (i < 0) continue;
    const cue = lines.slice(i + 1).map((l) => l.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()).filter(Boolean);
    const text = cue.filter((l) => !prev.has(l)).join(" ");
    prev = new Set(cue);
    if (text && text !== out.at(-1)?.text) out.push({ text, offset: toMs(lines[i].split("-->")[0]) });
  }
  return out;
}

/**
 * Saves a file; `maxBytes` asks for only its start (an HTTP Range request). Tries 3 times:
 * Invidious instances pass each request to one of several servers, and some fail (HTTP 500)
 * or drop the connection halfway ("terminated").
 */
export async function download(url: string, file: string, what: string, maxBytes?: number): Promise<string> {
  const headers: Record<string, string> = maxBytes ? { range: `bytes=0-${maxBytes - 1}` } : {};
  let why = "";
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(180_000) });
      if (!res.ok) {
        why = `HTTP ${res.status}`;
        continue;
      }
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      return file;
    } catch (e) {
      why = (e as Error).message;
    }
  }
  throw new Error(`${what} download failed: ${why}`);
}

// ------------------------------------------------------------------ Whisper

const TRANSCRIBE = fileURLToPath(new URL("../../scripts/transcribe.py", import.meta.url));
const PYTHON = process.platform === "win32" ? "python" : "python3";

/** Transcribes a local audio or video file with Whisper. */
export function whisperFile(file: string, from: string): Transcript {
  const r = spawnSync(PYTHON, [TRANSCRIBE, file], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024, timeout: 600_000 });
  if (r.status !== 0) throw new Error(`Whisper failed: ${(r.stderr || r.error?.message || "").trim().split("\n").pop()}`);
  return { chunks: JSON.parse(r.stdout), source: `Whisper transcript (audio from ${from})` };
}

/** Downloads a media file with `fetchFile(dir)` into a temp folder and transcribes it. */
export async function whisper(fetchFile: (dir: string) => Promise<string>, from: string): Promise<Transcript> {
  const dir = mkdtempSync(join(tmpdir(), "watch-"));
  try {
    return whisperFile(await fetchFile(dir), from);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ------------------------------------------------------------------ YouTube: Invidious

/** Used when api.invidious.io can't be reached (it worked when checked, 2026-10-24). */
const FALLBACK_INSTANCES = ["https://yt.chocolatemoo53.com"];
let instances: string[] | null = null;

/** Invidious instances to try, in order: INVIDIOUS_URLS, else the healthy public ones with the API on. */
async function invidiousInstances(): Promise<string[]> {
  if (instances) return instances;
  const own = process.env.INVIDIOUS_URLS?.split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);
  if (own?.length) return (instances = own);
  try {
    const r = await fetch("https://api.invidious.io/instances.json?sort_by=health", { signal: AbortSignal.timeout(15_000) });
    const list = (await r.json()) as [string, { api?: boolean; type?: string; uri?: string }][];
    const healthy = list.filter(([, i]) => i.api && i.type === "https" && i.uri).map(([, i]) => i.uri!.replace(/\/$/, ""));
    instances = [...new Set([...healthy, ...FALLBACK_INSTANCES])];
  } catch {
    instances = FALLBACK_INSTANCES;
  }
  return instances;
}

export const youtubeId = (u: string) => {
  const url = new URL(u);
  if (url.hostname.endsWith("youtu.be")) return url.pathname.slice(1).split("/")[0] || null;
  return url.searchParams.get("v") ?? url.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]{11})/)?.[1] ?? null;
};

export type InvVideo = {
  title?: string;
  author?: string;
  authorId?: string;
  published?: number;
  viewCount?: number;
  likeCount?: number;
  lengthSeconds?: number;
  description?: string;
  captions?: { label: string; language_code?: string; languageCode?: string; url: string }[];
};

/** The video's details from the first instance that answers, and that instance. */
export async function invidiousVideo(id: string, notes: string[]): Promise<{ base: string; video: InvVideo } | null> {
  for (const base of await invidiousInstances()) {
    try {
      const r = await fetch(`${base}/api/v1/videos/${id}`, { signal: AbortSignal.timeout(30_000) });
      const video = (await r.json().catch(() => ({}))) as InvVideo & { error?: string };
      if (r.ok && video.title) return { base, video };
      notes.push(`Invidious ${new URL(base).hostname}: ${video.error?.split("\n")[0] ?? `HTTP ${r.status}`}`);
    } catch (e) {
      notes.push(`Invidious ${new URL(base).hostname}: ${(e as Error).message}`);
    }
  }
  return null;
}

/** Captions in `lang` (default English), uploaded ones before automatic ones. Instances often return them empty. */
export async function invidiousCaptions(base: string, video: InvVideo, lang = "en"): Promise<Transcript | null> {
  const tracks = (video.captions ?? []).filter((c) => (c.language_code ?? c.languageCode ?? "").startsWith(lang));
  tracks.sort((a, b) => Number(/auto-generated/i.test(a.label)) - Number(/auto-generated/i.test(b.label)));
  for (const t of tracks) {
    const r = await fetch(`${base}${t.url}`, { signal: AbortSignal.timeout(30_000) }).catch(() => null);
    const chunks = r?.ok ? parseVtt(await r.text()) : [];
    if (chunks.length) return { chunks, source: `YouTube captions, ${t.label} (via Invidious)` };
  }
  return null;
}

/**
 * One stream of the video, proxied through the instance: itag 140 = audio (m4a, 128 kbit/s),
 * 134 = 360p video without sound (mp4).
 */
export const invidiousStream = (base: string, id: string, itag: 140 | 134, file: string, maxBytes?: number) =>
  download(`${base}/latest_version?id=${id}&itag=${itag}&local=true`, file, "Invidious", maxBytes);

/**
 * The audio track transcribed with Whisper. Only the first ~7 minutes (7 MB at 16 KB/s):
 * watch_video returns about 6 minutes of speech anyway, and whole long videos time out through
 * the proxy. Shorter videos are fetched whole: a Range past the end of the file makes the
 * instance promise more bytes than it sends, and the download fails ("terminated").
 */
export const invidiousWhisper = (base: string, id: string, lengthSeconds?: number) =>
  whisper((dir) => invidiousStream(base, id, 140, join(dir, "audio.m4a"), (lengthSeconds ?? Infinity) > 420 ? 7_000_000 : undefined), "Invidious");

/** Title and channel from YouTube's oEmbed, when no Invidious instance answers. */
export async function youtubeOembed(url: string): Promise<{ title: string | null; creator: string | null }> {
  const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`YouTube oEmbed HTTP ${r.status}`);
  const j = (await r.json()) as { title?: string; author_name?: string };
  return { title: j.title ?? null, creator: j.author_name ?? null };
}

// ------------------------------------------------------------------ YouTube: Gemini

/** Gemini transcribes a YouTube link it fetches itself (free tier; a key from a project without billing). */
export async function geminiTranscript(url: string): Promise<Transcript> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: AbortSignal.timeout(300_000),
    body: JSON.stringify({
      contents: [{
        parts: [
          { file_data: { file_uri: url } },
          { text: "Transcribe the speech in this video word for word, in its original language. One line per sentence or two, each starting with its start time as [m:ss]. Output only the transcript lines. If nobody speaks, output exactly: NO SPEECH" },
        ],
      }],
      generationConfig: { mediaResolution: "MEDIA_RESOLUTION_LOW", temperature: 0 },
    }),
  });
  const j = (await r.json().catch(() => ({}))) as { error?: { message?: string }; candidates?: { content?: { parts?: { text?: string }[] } }[] };
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${j.error?.message?.split(".")[0] ?? ""}`.trim());
  const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  const chunks: Chunk[] = [];
  for (const m of text.matchAll(/^\[(?:(\d+):)?(\d+):(\d{2})\]\s*(.+)$/gm)) {
    chunks.push({ offset: ((Number(m[1] ?? 0) * 60 + Number(m[2])) * 60 + Number(m[3])) * 1000, text: m[4].trim() });
  }
  return { chunks, source: "Gemini transcript (Gemini watched the video)" };
}

// ------------------------------------------------------------------ everything else: snapsave

export type SnapPost = { caption: string | null; creator: string | null; videoUrl: string | null; thumbnail: string | null; problem: string | null };

/** A post's caption and video link from snapsave.app; the creator is in the link on TikTok and X. */
export async function snapsavePost(url: string): Promise<SnapPost> {
  const r = await snapsave(url);
  const video = r.data?.media?.find((m) => m.type === "video" && m.url);
  return {
    caption: r.data?.description?.trim() || null,
    creator: url.match(/tiktok\.com\/@([\w.]+)/)?.[1] ?? url.match(/(?:x|twitter)\.com\/(\w+)\/status/)?.[1] ?? null,
    videoUrl: video?.url ?? null,
    thumbnail: r.data?.preview ?? video?.thumbnail ?? null,
    problem: r.success && video ? null : `snapsave: ${r.message ?? "no video in the post"}`,
  };
}
