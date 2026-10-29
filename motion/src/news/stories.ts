// Every news story in src/films/news-*/ (story.json, plus voice.json once `npm run voice` ran),
// found by webpack's require.context, so adding a story needs no code change: Root registers
// one NewsSegment composition per story, with the story's folder name as its id.
import type { Story, Voice } from "./types";
import { FPS } from "../lib/presets";

type Ctx = { keys(): string[]; (key: string): unknown };
const ctx: Ctx = (require as unknown as { context(dir: string, deep: boolean, re: RegExp): Ctx }).context(
  "../films",
  true,
  /^\.\/news-[a-z0-9-]+\/(story|voice)\.json$/,
);

export interface StoryEntry {
  id: string;
  story: Story;
  voice: Voice | null;
}

export const STORIES: StoryEntry[] = ctx
  .keys()
  .filter((k) => k.endsWith("/story.json"))
  .map((k) => {
    const id = k.split("/")[1];
    const v = `./${id}/voice.json`;
    return { id, story: ctx(k) as Story, voice: ctx.keys().includes(v) ? (ctx(v) as Voice) : null };
  });

/** Speaking rate for timing captions when there is no voice yet (about 155 words a minute). */
const WORDS_PER_SEC = 2.6;
const words = (t: string) => t.split(/\s+/).filter(Boolean).length;

export interface Timed {
  start: number;
  frames: number;
  /** The voice clip for this sentence, if `npm run voice` made one. */
  audio: string | null;
}

/** Start and length of every segment: the voice clip's length (else an estimate) + its pause. */
export const timeline = ({ story, voice }: Pick<StoryEntry, "story" | "voice">): Timed[] => {
  let at = 0;
  return story.segments.map((s, i) => {
    const clip = s.text ? voice?.segments[s.id] : undefined;
    const speech = s.text ? (clip?.durationSec ?? words(s.text) / WORDS_PER_SEC + 0.2) : 0;
    const pause = i === story.segments.length - 1 ? 0.5 : (s.pause ?? 0.35);
    const frames = Math.round(Math.max(speech + pause, s.seconds ?? 0) * FPS);
    const t = { start: at, frames, audio: clip?.file ?? null };
    at += frames;
    return t;
  });
};
