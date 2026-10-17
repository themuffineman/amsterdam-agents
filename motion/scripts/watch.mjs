#!/usr/bin/env node
// watch.mjs: "watch" a social video for research: who posted it, what they said, what was
// on screen. For pulling facts and tips out of YouTube, TikTok, Instagram, X and Facebook
// videos while researching a film.
//
// Usage:  npm run watch -- <video-url> <film-slug> [--frames=6] [--no-frames] [--lang=en]
//
// Writes research/<film-slug>/<platform>-<id>/:
//   transcript.md   who, when, views, link, the caption, then the transcript with [m:ss] times
//   source.json     the same as data (metadata + transcript chunks)
//   frames/NN.jpg   still frames spread over the video (on-screen text, charts, app screens).
//                   Only the thumbnail if the video can't be downloaded.
// and adds one line per video to research/<film-slug>/sources.md.
//
// Where things come from (free first):
//   1. yt-dlp (local, free): metadata, the platform's own captions when it has them, and the
//      video file for the frames. Works for YouTube and usually TikTok.
//   2. Supadata (SUPADATA_API_KEY in .env, free plan = 100 credits/month): metadata when
//      yt-dlp can't read the post (Instagram usually), and the transcript when there are no
//      captions. Existing transcript = 1 credit; AI-generated = 2 credits per minute.
//      The credits used and left are printed at the end.
//
// Frames are skipped by default for videos over 15 minutes (a big download); pass --frames=N
// to force them.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

// ------------------------------------------------------------------ args

const args = process.argv.slice(2);
const flags = Object.fromEntries(
  args.filter((a) => a.startsWith("--")).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);
const [url, film] = args.filter((a) => !a.startsWith("--"));
if (!url || !film || !/^[a-z0-9][a-z0-9-]*$/.test(film)) {
  console.error("usage: npm run watch -- <video-url> <film-slug>   (slug: lowercase letters, digits, dashes)");
  process.exit(1);
}
const lang = typeof flags.lang === "string" ? flags.lang : "en";
const wantFrames = !flags["no-frames"];
const frameCount = Number(flags.frames) > 0 ? Number(flags.frames) : 6;
const SUPADATA = "https://api.supadata.ai/v1";
const KEY = process.env.SUPADATA_API_KEY;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const notes = [];
const note = (m) => {
  notes.push(m);
  console.error(`note: ${m}`);
};

/** youtube | tiktok | instagram | x | facebook | video */
const platformOf = (u) => {
  const h = new URL(u).hostname.replace(/^www\.|^m\./, "");
  if (/youtube\.com$|youtu\.be$/.test(h)) return "youtube";
  if (/tiktok\.com$/.test(h)) return "tiktok";
  if (/instagram\.com$/.test(h)) return "instagram";
  if (/^(x|twitter)\.com$/.test(h)) return "x";
  if (/facebook\.com$|fb\.watch$/.test(h)) return "facebook";
  return "video";
};
const platform = platformOf(url);

const mmss = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// ------------------------------------------------------------------ yt-dlp

const ytdlp = (...a) => spawnSync("yt-dlp", ["--no-warnings", ...a], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });

/** Full yt-dlp info (metadata + caption track URLs), or null if it can't read the post. */
const ytInfo = () => {
  const r = ytdlp("-J", "--skip-download", url);
  if (r.status !== 0) {
    note(`yt-dlp couldn't read the post: ${(r.stderr || "").trim().split("\n").pop()}`);
    return null;
  }
  return JSON.parse(r.stdout);
};

/** Parse YouTube's json3 caption format into chunks. */
const parseJson3 = (j) =>
  (j.events || [])
    .filter((e) => e.segs && !e.aAppend)
    .map((e) => ({
      text: e.segs.map((s) => s.utf8 || "").join("").replace(/\s+/g, " ").trim(),
      offset: e.tStartMs || 0,
      duration: e.dDurationMs || 0,
    }))
    .filter((c) => c.text);

/** Parse WebVTT into chunks (TikTok captions come as VTT). */
const parseVtt = (vtt) => {
  const toMs = (t) => {
    const p = t.trim().split(":").map(Number);
    const [h, m, s] = p.length === 3 ? p : [0, ...p];
    return Math.round(((h * 60 + m) * 60 + s) * 1000);
  };
  const out = [];
  for (const block of vtt.replace(/\r/g, "").split(/\n\n+/)) {
    const lines = block.split("\n");
    const i = lines.findIndex((l) => l.includes("-->"));
    if (i < 0) continue;
    const [a, b] = lines[i].split("-->");
    const text = lines.slice(i + 1).join(" ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (text && text !== out.at(-1)?.text) out.push({ text, offset: toMs(a), duration: toMs(b.split(" ")[1] ?? b) - toMs(a) });
  }
  return out;
};

/**
 * The platform's own captions from the yt-dlp info: uploaded ones first, then automatic
 * ("-orig" = the original-language track, not a machine translation). Returns null if none.
 */
const ytCaptions = async (info) => {
  const pick = (tracks) => {
    if (!tracks) return null;
    // YouTube uses two-letter codes ("en", "en-US"); TikTok uses three ("eng-US").
    const codes = [lang, { en: "eng", es: "spa", fr: "fra", de: "deu", pt: "por" }[lang]].filter(Boolean);
    const keys = Object.keys(tracks).filter((k) => codes.some((c) => k === c || k.startsWith(`${c}-`)));
    keys.sort((a, b) => (b.endsWith("-orig") ? 1 : 0) - (a.endsWith("-orig") ? 1 : 0));
    for (const k of keys) {
      const t = tracks[k].find((f) => f.ext === "json3") || tracks[k].find((f) => f.ext === "vtt");
      if (t) return { key: k, ...t };
    }
    return null;
  };
  for (const [tracks, kind] of [[info.subtitles, "uploaded captions"], [info.automatic_captions, "automatic captions"]]) {
    const t = pick(tracks);
    if (!t) continue;
    try {
      const r = await fetch(t.url, { headers: t.http_headers || {} });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const body = await r.text();
      const chunks = t.ext === "json3" ? parseJson3(JSON.parse(body)) : parseVtt(body);
      if (chunks.length) return { chunks, source: `${platform} ${kind} (${t.key}), via yt-dlp`, lang: t.key };
    } catch (e) {
      note(`couldn't fetch ${kind} ${t.key}: ${e.message}`);
    }
  }
  return null;
};

// ------------------------------------------------------------------ Supadata

let lastCall = 0;
/** GET a Supadata endpoint, keeping to the free plan's 1 request per second. */
const supa = async (p) => {
  if (!KEY) throw new Error("SUPADATA_API_KEY is not set in .env");
  await sleep(Math.max(0, lastCall + 1100 - Date.now()));
  lastCall = Date.now();
  const r = await fetch(`${SUPADATA}${p}`, { headers: { "x-api-key": KEY } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok && r.status !== 202) throw new Error(`Supadata ${p.split("?")[0]} -> ${r.status} ${body.message || body.error || ""}`);
  return { status: r.status, body };
};

const credits = async () => {
  try {
    const { body } = await supa("/me");
    return body;
  } catch {
    return null;
  }
};

/** Transcript via Supadata: the existing one if there is one, else AI-generated. Polls big jobs. */
const supaTranscript = async () => {
  let { status, body } = await supa(`/transcript?url=${encodeURIComponent(url)}&lang=${lang}&mode=auto`);
  if (status === 202) {
    const id = body.jobId;
    console.error(`Supadata is transcribing (job ${id})...`);
    for (let i = 0; i < 120; i++) {
      await sleep(3000);
      ({ body } = await supa(`/transcript/${id}`));
      if (body.status === "completed") break;
      if (body.status === "failed") throw new Error(`Supadata job failed: ${body.error?.message ?? "unknown"}`);
    }
    if (body.status !== "completed") throw new Error("Supadata job still running after 6 minutes");
  }
  const chunks = (body.content || []).map((c) => ({ text: c.text.trim(), offset: c.offset, duration: c.duration })).filter((c) => c.text);
  if (!chunks.length) note("Supadata found no speech (music-only or text-only video?): the caption and frames are the content");
  return { chunks, source: "Supadata (existing transcript or AI-generated, see credits used)", lang: body.lang ?? null };
};

// ------------------------------------------------------------------ frames

/**
 * Download the video (<=720p, no audio) to a temp folder and pull `n` evenly spaced frames.
 * `duration` may be null (Instagram doesn't report it); then ffprobe reads it from the file.
 */
const grabFrames = (dir, duration, n) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sm-watch-"));
  try {
    const r = ytdlp("-f", "bv[height<=720]/b[height<=720]/bv/b", "--no-part", "-o", path.join(tmp, "v.%(ext)s"), url);
    const file = fs.readdirSync(tmp).find((f) => f.startsWith("v."));
    if (r.status !== 0 || !file) throw new Error((r.stderr || "").trim().split("\n").pop() || "no file");
    if (!duration) {
      const p = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path.join(tmp, file)], { encoding: "utf8" });
      duration = parseFloat(p.stdout);
      if (!(duration > 0)) throw new Error("couldn't read the video length");
    }
    fs.mkdirSync(path.join(dir, "frames"), { recursive: true });
    const frames = [];
    for (let i = 0; i < n; i++) {
      const t = (duration * (i + 0.5)) / n;
      const name = `frames/${String(i + 1).padStart(2, "0")}.jpg`;
      const f = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", t.toFixed(2), "-i", path.join(tmp, file), "-frames:v", "1", "-q:v", "3", path.join(dir, name)]);
      if (f.status === 0) frames.push({ file: name, atMs: Math.round(t * 1000) });
    }
    return { frames, duration };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
};

const saveThumb = async (dir, thumbUrl) => {
  try {
    const r = await fetch(thumbUrl);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    fs.mkdirSync(path.join(dir, "frames"), { recursive: true });
    fs.writeFileSync(path.join(dir, "frames", "thumbnail.jpg"), Buffer.from(await r.arrayBuffer()));
    return [{ file: "frames/thumbnail.jpg", atMs: null }];
  } catch (e) {
    note(`thumbnail download failed: ${e.message}`);
    return [];
  }
};

// ------------------------------------------------------------------ main

const main = async () => {
  const before = await credits();

  // ---- metadata: yt-dlp first (free), Supadata if yt-dlp can't read the post
  const info = ytInfo();
  let meta;
  if (info) {
    const d = info.upload_date; // YYYYMMDD
    meta = {
      platform,
      id: String(info.id),
      url: info.webpage_url || url,
      // Instagram titles are a generic "Video by <user>"; the caption is the real text.
      title: /^Video by /.test(info.title || "") ? null : info.title || null,
      caption: info.description || null,
      // yt-dlp swaps name and username between platforms: TikTok has the display name in
      // `channel` and the username in `uploader`, Instagram the other way round. Their
      // uploader_id is a number, so the handle comes from the username.
      creator: (platform === "instagram" ? info.uploader : info.channel || info.uploader) || info.creator || null,
      handle:
        platform === "tiktok" && info.uploader
          ? `@${info.uploader}`
          : platform === "instagram" && info.channel
            ? `@${info.channel}`
            : info.uploader_id || info.channel_id || null,
      postedAt: d ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : info.timestamp ? new Date(info.timestamp * 1000).toISOString().slice(0, 10) : null,
      durationSec: info.duration ?? null,
      stats: { views: info.view_count ?? null, likes: info.like_count ?? null, comments: info.comment_count ?? null },
      thumbnail: info.thumbnail ?? null,
      metadataSource: "yt-dlp",
    };
  } else {
    const { body: m } = await supa(`/metadata?url=${encodeURIComponent(url)}`);
    meta = {
      platform,
      id: String(m.id),
      url: m.url || url,
      title: m.title,
      caption: m.description,
      creator: m.author?.displayName ?? null,
      handle: m.author?.username ?? null,
      postedAt: m.createdAt?.slice(0, 10) ?? null,
      durationSec: m.media?.duration ?? null,
      stats: { views: m.stats?.views ?? null, likes: m.stats?.likes ?? null, comments: m.stats?.comments ?? null },
      thumbnail: m.media?.thumbnailUrl ?? null,
      metadataSource: "Supadata",
    };
  }

  const dir = path.resolve("research", film, `${platform}-${meta.id.replace(/[^\w-]/g, "_")}`);
  fs.mkdirSync(dir, { recursive: true });

  // ---- transcript: the platform's captions (free), else Supadata
  let tr = info ? await ytCaptions(info) : null;
  if (!tr) {
    try {
      tr = await supaTranscript();
    } catch (e) {
      note(`no transcript: ${e.message}`);
      tr = { chunks: [], source: "none", lang: null };
    }
  }

  // ---- frames
  let frames = [];
  if (wantFrames) {
    const long = (meta.durationSec ?? 0) > 900 && !flags.frames;
    if (long) note("video is over 15 minutes, frames skipped (pass --frames=N to force)");
    else if (info) {
      try {
        const g = grabFrames(dir, meta.durationSec, frameCount);
        frames = g.frames;
        meta.durationSec ??= Math.round(g.duration);
      } catch (e) {
        note(`video download failed, saving the thumbnail instead: ${e.message}`);
      }
    }
    if (!frames.length && !long && meta.thumbnail) frames = await saveThumb(dir, meta.thumbnail);
  }

  const after = await credits();
  const used = before && after ? after.usedCredits - before.usedCredits : null;

  // ---- write
  // Merge short caption cues into readable lines of ~200 characters, each with its start time.
  const lines = [];
  for (const c of tr.chunks) {
    const last = lines.at(-1);
    if (last && last.text.length < 200) last.text += ` ${c.text}`;
    else lines.push({ at: c.offset, text: c.text });
  }
  const n = (v) => (v == null ? "?" : Number(v).toLocaleString("en-US"));
  const md = [
    `# ${meta.title || meta.caption?.split("\n")[0]?.slice(0, 100) || meta.url}`,
    "",
    `- Creator: ${meta.creator ?? "?"}${meta.handle ? ` (${meta.handle})` : ""}`,
    `- Platform: ${platform}, posted ${meta.postedAt ?? "?"}, ${meta.durationSec ? `${Math.round(meta.durationSec)} s` : "length ?"}`,
    `- Views ${n(meta.stats.views)}, likes ${n(meta.stats.likes)}, comments ${n(meta.stats.comments)}`,
    `- Link: ${meta.url}`,
    `- Transcript: ${tr.source}${tr.lang ? `, language ${tr.lang}` : ""}`,
    `- Retrieved: ${new Date().toISOString().slice(0, 10)}`,
    "",
    "## Caption / description",
    "",
    meta.caption?.trim() || "(none)",
    "",
    "## Transcript",
    "",
    ...(lines.length ? lines.map((l) => `[${mmss(l.at)}] ${l.text}`) : ["(none)"]),
    "",
    "## Frames",
    "",
    ...(frames.length ? frames.map((f) => `- ${f.file}${f.atMs != null ? ` at ${mmss(f.atMs)}` : " (thumbnail)"}`) : ["(none)"]),
    ...(notes.length ? ["", "## Notes", "", ...notes.map((x) => `- ${x}`)] : []),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(dir, "transcript.md"), md);
  fs.writeFileSync(path.join(dir, "source.json"), JSON.stringify({ ...meta, transcript: tr, frames, notes, supadataCreditsUsed: used }, null, 2));

  // One line per video in the film's source list (replaced, not duplicated, on a re-run).
  const index = path.resolve("research", film, "sources.md");
  const rel = path.relative(path.resolve("research", film), dir).replace(/\\/g, "/");
  const entry = `- ${meta.creator ?? "?"}, "${(meta.title || meta.caption || "").split("\n")[0].slice(0, 90)}" (${platform}, ${meta.postedAt ?? "?"}, ${n(meta.stats.views)} views) ${meta.url} -> ${rel}/transcript.md`;
  const old = fs.existsSync(index) ? fs.readFileSync(index, "utf8").split("\n").filter((l) => l && !l.includes(`-> ${rel}/`)) : [`# Research sources: ${film}`, ""];
  fs.writeFileSync(index, [...old, entry, ""].join("\n"));

  console.log(
    JSON.stringify(
      {
        out: path.relative(process.cwd(), dir),
        creator: meta.creator,
        postedAt: meta.postedAt,
        transcript: `${tr.chunks.length} chunks from ${tr.source}`,
        frames: frames.length,
        supadataCredits: after ? `${used ?? "?"} used now, ${after.maxCredits - after.usedCredits} of ${after.maxCredits} left (${after.plan})` : "unknown",
        notes: notes.length,
      },
      null,
      2,
    ),
  );
};

main().catch((e) => {
  console.error(`error: ${e.message}`);
  process.exit(1);
});
