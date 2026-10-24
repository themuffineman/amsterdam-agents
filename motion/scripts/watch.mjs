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
// Where things come from: the same free sources as the page agents' watch_video, in
// ../src/tools/video-sources.ts (no logins, no yt-dlp, no Supadata):
//   YouTube: Invidious (metadata, captions when it has them, the audio for Whisper, a 360p
//     video for the frames), Gemini if GEMINI_API_KEY is set and nothing else worked.
//   Instagram, TikTok, X, Facebook: snapsave.app (caption + video file; Whisper transcribes it).
// Whisper needs faster-whisper (`pip install faster-whisper`; the film runner installs it).
//
// Frames are skipped by default for videos over 15 minutes (a big download); pass --frames=N
// to force them.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  download,
  geminiTranscript,
  invidiousCaptions,
  invidiousStream,
  invidiousVideo,
  platformOf,
  snapsavePost,
  whisperFile,
  youtubeId,
  youtubeOembed,
} from "../../src/tools/video-sources.ts";

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

const notes = [];
const note = (m) => {
  notes.push(m);
  console.error(`note: ${m}`);
};

const platform = platformOf(url);

const mmss = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// ------------------------------------------------------------------ frames

/**
 * Pull `n` evenly spaced frames from a downloaded video file. `duration` may be null
 * (snapsave doesn't report it); then ffprobe reads it from the file.
 */
const grabFrames = (dir, file, duration, n) => {
  if (!duration) {
    const p = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" });
    duration = parseFloat(p.stdout);
    if (!(duration > 0)) throw new Error("couldn't read the video length");
  }
  fs.mkdirSync(path.join(dir, "frames"), { recursive: true });
  const frames = [];
  for (let i = 0; i < n; i++) {
    const t = (duration * (i + 0.5)) / n;
    const name = `frames/${String(i + 1).padStart(2, "0")}.jpg`;
    const f = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", t.toFixed(2), "-i", file, "-frames:v", "1", "-q:v", "3", path.join(dir, name)]);
    if (f.status === 0) frames.push({ file: name, atMs: Math.round(t * 1000) });
  }
  return { frames, duration };
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

/** Runs `fn`, turning a throw into a note and null. */
const attempt = async (what, fn) => {
  try {
    return await fn();
  } catch (e) {
    note(`${what}: ${e.message}`);
    return null;
  }
};

// ------------------------------------------------------------------ main

const main = async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sm-watch-"));
  try {
    let meta;
    let tr = null;
    /** The downloaded video file for the frames, if any. */
    let videoFile = null;

    if (platform === "youtube") {
      const id = youtubeId(url);
      if (!id) throw new Error("not a YouTube video link");
      const inv = await invidiousVideo(id, notes);
      const v = inv?.video ?? {};
      const oembed = inv ? {} : await attempt("YouTube oEmbed", () => youtubeOembed(url));
      meta = {
        platform,
        id,
        url,
        title: v.title ?? oembed?.title ?? null,
        caption: v.description ?? null,
        creator: v.author ?? oembed?.creator ?? null,
        handle: v.authorId ?? null,
        postedAt: v.published ? new Date(v.published * 1000).toISOString().slice(0, 10) : null,
        durationSec: v.lengthSeconds ?? null,
        stats: { views: v.viewCount ?? null, likes: v.likeCount ?? null, comments: null },
        thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        metadataSource: inv ? `Invidious (${new URL(inv.base).hostname})` : "YouTube oEmbed",
      };
      if (inv) {
        tr = await attempt("captions", () => invidiousCaptions(inv.base, inv.video, lang));
        if (!tr?.chunks.length) {
          tr = await attempt("Invidious audio + Whisper", async () =>
            whisperFile(await invidiousStream(inv.base, id, 140, path.join(tmp, "audio.m4a")), "Invidious"));
        }
        const long = (meta.durationSec ?? 0) > 900 && !flags.frames;
        if (wantFrames && !long) videoFile = await attempt("video download (frames)", () => invidiousStream(inv.base, id, 134, path.join(tmp, "v.mp4")));
      }
      if (!tr?.chunks.length && process.env.GEMINI_API_KEY) tr = await attempt("Gemini", () => geminiTranscript(url));
    } else {
      const post = await snapsavePost(url);
      if (post.problem) note(post.problem);
      meta = {
        platform,
        id: (url.match(/\/(?:video|reel|reels|p|status|videos)\/([\w-]+)/)?.[1] ?? new URL(url).pathname).replace(/^\/|\/$/g, ""),
        url,
        title: null,
        caption: post.caption,
        creator: post.creator,
        handle: post.creator ? `@${post.creator}` : null,
        postedAt: null,
        durationSec: null,
        stats: { views: null, likes: null, comments: null },
        thumbnail: post.thumbnail,
        metadataSource: "snapsave",
      };
      // One download serves both the transcript and the frames.
      if (post.videoUrl) {
        videoFile = await attempt("snapsave download", () => download(post.videoUrl, path.join(tmp, "v.mp4"), "snapsave"));
        if (videoFile) tr = await attempt("Whisper", () => whisperFile(videoFile, "snapsave"));
      }
    }
    if (!tr?.chunks.length) {
      if (!tr) note("no transcript");
      else note("no speech found (music-only or text-only video?): the caption and frames are the content");
      tr = { chunks: [], source: "none" };
    }

    const dir = path.resolve("research", film, `${platform}-${meta.id.replace(/[^\w-]/g, "_")}`);
    fs.mkdirSync(dir, { recursive: true });

    // ---- frames
    let frames = [];
    if (wantFrames) {
      const long = (meta.durationSec ?? 0) > 900 && !flags.frames;
      if (long) note("video is over 15 minutes, frames skipped (pass --frames=N to force)");
      else if (videoFile) {
        try {
          const g = grabFrames(dir, videoFile, meta.durationSec, frameCount);
          frames = g.frames;
          meta.durationSec ??= Math.round(g.duration);
        } catch (e) {
          note(`couldn't take frames, saving the thumbnail instead: ${e.message}`);
        }
      }
      if (!frames.length && !long && meta.thumbnail) frames = await saveThumb(dir, meta.thumbnail);
    }

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
      `- Transcript: ${tr.source}`,
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
    fs.writeFileSync(path.join(dir, "source.json"), JSON.stringify({ ...meta, transcript: tr, frames, notes }, null, 2));

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
          notes: notes.length,
        },
        null,
        2,
      ),
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
};

main().catch((e) => {
  console.error(`error: ${e.message}`);
  process.exit(1);
});
