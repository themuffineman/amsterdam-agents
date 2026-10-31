import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { defineTool } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { noteProblem } from "../problems.ts";
import { isPostUrl } from "./examples.ts";
import {
  download,
  frameOf,
  geminiTranscript,
  imageBytes,
  invidiousCaptions,
  invidiousVideo,
  invidiousWhisper,
  platformOf,
  snapsavePost,
  tiktokPage,
  whisperFile,
  youtubeId,
  youtubeOembed,
  type Transcript,
} from "./video-sources.ts";
import { normalUrl, type Seen } from "./web.ts";

/**
 * watch_video: what a video on YouTube, TikTok, Instagram, X or Facebook says. Who posted
 * it, when, its views, the caption, and the transcript with [m:ss] times, as text. For
 * research: real user experience from reviews and tutorials, a creator's own tips, what an
 * example post actually shows.
 *
 * Free, no logins (video-sources.ts):
 *   YouTube: Invidious metadata, then its captions, else its audio track through Whisper, else
 *     Gemini when GEMINI_API_KEY is set. YouTube's oEmbed for title and channel if no
 *     Invidious instance answers.
 *   Instagram, TikTok, X, Facebook: snapsave's caption and video file through Whisper. TikTok's
 *     own page for views, likes, date and length.
 *
 * Thumbnails (for the directory): a frame of the video file it downloads for Whisper anyway,
 * else the post's cover/preview image (TikTok's page, snapsave). Kept as bytes in `thumbnail`:
 * submit_page uploads only the ones of videos the agent files. YouTube needs none (i.ytimg.com).
 */

/** Most of a transcript the agent gets back (everything it reads is resent every turn). */
const LIMIT = 7_000;

export type Meta = {
  url: string;
  title: string | null;
  caption: string | null;
  creator: string | null;
  postedAt: string | null;
  durationSec: number | null;
  views: number | null;
  likes: number | null;
};

const mmss = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Tries each way to a transcript in turn; records why each one failed. */
async function firstTranscript(steps: [string, () => Promise<Transcript | null>][], notes: string[], failures: string[]): Promise<Transcript | null> {
  for (const [name, step] of steps) {
    try {
      const tr = await step();
      if (tr?.chunks.length) return tr;
      notes.push(`${name}: nothing`);
    } catch (e) {
      const why = `${name}: ${(e as Error).message}`;
      notes.push(why);
      failures.push(why);
    }
  }
  return null;
}

/**
 * What one watched video is: its details, the transcript as [m:ss] lines, and whether we could
 * reach the video at all (`exists`): Invidious or oEmbed answered for YouTube, snapsave gave a
 * video file for the others. A video with no speech still exists.
 */
export type Thumbnail = { bytes: Uint8Array; type: "image/jpeg" | "image/png" | "image/webp" };
export type Watched = Omit<Meta, "url"> & { exists: boolean; transcript: string | null; thumbnail?: Thumbnail };

/** What kind of image some bytes are (cover images come as JPEG or WebP whatever their URL says). */
const imageType = (b: Uint8Array): Thumbnail["type"] =>
  b[0] === 0x89 && b[1] === 0x50 ? "image/png" : b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 ? "image/webp" : "image/jpeg";

export async function watch(url: string): Promise<{ text: string; transcript: Transcript | null; failures: string[]; watched: Watched }> {
  const notes: string[] = [];
  const failures: string[] = [];
  const platform = platformOf(url);
  let meta: Meta = { url, title: null, caption: null, creator: null, postedAt: null, durationSec: null, views: null, likes: null };
  let tr: Transcript | null = null;
  let exists = false;
  let thumbnail: Thumbnail | undefined;

  if (platform === "youtube") {
    const id = youtubeId(url);
    if (!id) throw new Error("not a YouTube video link");
    const inv = await invidiousVideo(id, notes);
    if (inv) {
      exists = true;
      const v = inv.video;
      meta = {
        url,
        title: v.title ?? null,
        caption: v.description ?? null,
        creator: v.author ?? null,
        postedAt: v.published ? new Date(v.published * 1000).toISOString().slice(0, 10) : null,
        durationSec: v.lengthSeconds ?? null,
        views: v.viewCount ?? null,
        likes: v.likeCount ?? null,
      };
    } else {
      failures.push("no Invidious instance answered");
      const oembed = await youtubeOembed(url).catch((e) => (notes.push((e as Error).message), null));
      if (oembed) {
        exists = true;
        meta = { ...meta, ...oembed };
      }
    }
    tr = await firstTranscript([
      ["captions", async () => (inv ? invidiousCaptions(inv.base, inv.video) : null)],
      ["Invidious audio + Whisper", async () => (inv ? invidiousWhisper(inv.base, id, inv.video.lengthSeconds) : null)],
      ["Gemini", async () => (process.env.GEMINI_API_KEY ? geminiTranscript(url) : null)],
    ], notes, failures);
  } else {
    const [post, page] = await Promise.all([
      snapsavePost(url),
      platform === "tiktok" ? tiktokPage(url).catch((e) => (notes.push((e as Error).message), null)) : Promise.resolve(null),
    ]);
    meta.caption = post.caption ?? page?.caption ?? null;
    meta.creator = post.creator ?? page?.creator ?? null;
    if (page) meta = { ...meta, postedAt: page.postedAt, durationSec: page.durationSec, views: page.views, likes: page.likes };
    if (post.problem || !post.videoUrl) {
      failures.push(post.problem ?? "snapsave: no video");
      notes.push(post.problem ?? "snapsave: no video");
    } else {
      exists = true;
      const videoUrl = post.videoUrl;
      const dir = mkdtempSync(join(tmpdir(), "watch-"));
      try {
        const file = join(dir, "video.mp4");
        tr = await firstTranscript([["Whisper", async () => whisperFile(await download(videoUrl, file, "snapsave"), "snapsave")]], notes, failures);
        try {
          const bytes = frameOf(file);
          thumbnail = { bytes, type: "image/jpeg" };
        } catch (e) {
          notes.push((e as Error).message);
        }
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    }
    if (!thumbnail) {
      const cover = page?.cover ?? post.thumbnail;
      const bytes = cover ? await imageBytes(cover) : null;
      if (bytes) thumbnail = { bytes, type: imageType(bytes) };
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
    ...(notes.length && !tr ? ["", `Notes: ${notes.join("; ")}`] : []),
  ].join("\n");
  if (text.length > LIMIT) text = `${text.slice(0, LIMIT)}\n\n[cut at ${LIMIT} characters]`;
  const { url: _, ...details } = meta;
  const transcript = lines.length ? lines.map((l) => `[${mmss(l.at)}] ${l.text}`).join("\n") : null;
  return { text, transcript: tr, failures, watched: { ...details, exists, transcript, thumbnail } };
}

/** Videos watched in this topic, by URL as the agent passed it (submit_page's attachWatched). */
export type WatchedMap = Map<string, Watched>;

export const watchVideoTool = (found: Set<string>, seen: Seen, watchedMap?: WatchedMap) =>
  defineTool({
    name: "watch_video",
    label: "Watch video",
    description:
      "Read what a YouTube, TikTok, Instagram, X or Facebook video says: creator, date, views, caption and the transcript with timestamps. Use it for reviews, tutorials and creators' own tips. Pass the video's URL.",
    parameters: Type.Object({ url: Type.String({ description: "The video's full URL" }) }),
    execute: async (_id, { url }) => {
      try {
        const { text, transcript, failures, watched } = await watch(url);
        watchedMap?.set(url, watched);
        // A step that broke is worth knowing about (/agents Problems) when no transcript came
        // back; a video that simply has no speech isn't.
        if (!transcript) for (const f of failures) noteProblem("watch_video", f, url);
        seen.add(normalUrl(url));
        if (isPostUrl(url)) found.add(url);
        return { content: [{ type: "text" as const, text }], details: {} };
      } catch (e) {
        return { content: [{ type: "text" as const, text: `Couldn't watch ${url}: ${(e as Error).message}` }], details: {} };
      }
    },
  });
