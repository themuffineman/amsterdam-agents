import { join } from "node:path";

import { defineTool } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { noteProblem } from "../problems.ts";
import { isPostUrl } from "./examples.ts";
import {
  download,
  geminiTranscript,
  invidiousCaptions,
  invidiousVideo,
  invidiousWhisper,
  platformOf,
  snapsavePost,
  whisper,
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
 *   Instagram, TikTok, X, Facebook: snapsave's caption and video file through Whisper.
 */

/** Most of a transcript the agent gets back (everything it reads is resent every turn). */
const LIMIT = 7_000;

type Meta = {
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

export async function watch(url: string): Promise<{ text: string; transcript: Transcript | null; failures: string[] }> {
  const notes: string[] = [];
  const failures: string[] = [];
  const platform = platformOf(url);
  let meta: Meta = { url, title: null, caption: null, creator: null, postedAt: null, durationSec: null, views: null, likes: null };
  let tr: Transcript | null = null;

  if (platform === "youtube") {
    const id = youtubeId(url);
    if (!id) throw new Error("not a YouTube video link");
    const inv = await invidiousVideo(id, notes);
    if (inv) {
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
      meta = { ...meta, ...(await youtubeOembed(url).catch((e) => (notes.push((e as Error).message), {}))) };
    }
    tr = await firstTranscript([
      ["captions", async () => (inv ? invidiousCaptions(inv.base, inv.video) : null)],
      ["Invidious audio + Whisper", async () => (inv ? invidiousWhisper(inv.base, id, inv.video.lengthSeconds) : null)],
      ["Gemini", async () => (process.env.GEMINI_API_KEY ? geminiTranscript(url) : null)],
    ], notes, failures);
  } else {
    const post = await snapsavePost(url);
    meta.caption = post.caption;
    meta.creator = post.creator;
    if (post.problem || !post.videoUrl) {
      failures.push(post.problem ?? "snapsave: no video");
      notes.push(post.problem ?? "snapsave: no video");
    } else {
      const videoUrl = post.videoUrl;
      tr = await firstTranscript([["Whisper", () => whisper((dir) => download(videoUrl, join(dir, "video.mp4"), "snapsave"), "snapsave")]], notes, failures);
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
  return { text, transcript: tr, failures };
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
        const { text, transcript, failures } = await watch(url);
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
