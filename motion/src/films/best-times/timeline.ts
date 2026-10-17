/**
 * Turns the voiceover (voice.json: one clip per script segment, with word marks) into frame
 * numbers for the film. Beat lengths follow the speech; nothing is hand-timed.
 *
 * Re-run `npm run voice -- best-times` after editing script.json, and the whole film
 * re-times itself.
 */
import script from "./script.json";
import voice from "./voice.json";

export const FPS = 30;

interface VoiceSeg {
  file: string;
  durationSec: number;
  marks: Record<string, number>;
}
const V = voice.segments as Record<string, VoiceSeg>;
const TEXT = Object.fromEntries(script.segments.map((s) => [s.id, s.text]));

export interface SegT {
  id: string;
  file: string;
  /** Absolute start frame of the clip. */
  from: number;
  frames: number;
  /** Absolute frame of each {mark} in the script. */
  marks: Record<string, number>;
  /** Script text with marks removed. */
  text: string;
}

export interface BeatT {
  id: string;
  from: number;
  frames: number;
  segs: SegT[];
}

const PLAN: [string, string[]][] = [
  ["hook", ["hook1", "hook2"]],
  ["ig", ["ig1", "ig2"]],
  ["yt", ["yt1", "yt2"]],
  ["li", ["li1", "li2"]],
  ["tt", ["tt1", "tt2"]],
  ["recap", ["recap"]],
  ["close", ["close"]],
];

const LEAD = 4; // frames before the first clip of a beat
const GAP = 10; // between clips inside a beat
const BREATH = 16; // after the last clip of a beat, before the cut
const END = 40; // after the last clip of the film (end hold <= 1.4 s)

const stripMarks = (t: string) => t.replace(/\{[a-z0-9_-]+\}/gi, "");

const build = () => {
  const beats: BeatT[] = [];
  let cursor = 0;
  PLAN.forEach(([id, segIds], bi) => {
    const from = cursor;
    let t = from + LEAD;
    const segs: SegT[] = segIds.map((sid, i) => {
      const v = V[sid];
      if (!v) throw new Error(`voice.json has no segment "${sid}": run npm run voice`);
      const frames = Math.round(v.durationSec * FPS);
      const seg: SegT = {
        id: sid,
        file: v.file,
        from: t,
        frames,
        marks: Object.fromEntries(Object.entries(v.marks).map(([k, f]) => [k, t + Math.round(f * frames)])),
        text: stripMarks(TEXT[sid] ?? ""),
      };
      t += frames + (i < segIds.length - 1 ? GAP : 0);
      return seg;
    });
    const end = t + (bi === PLAN.length - 1 ? END : BREATH);
    beats.push({ id, from, frames: end - from, segs });
    cursor = end;
  });
  return beats;
};

export const BEATS = build();
export const TOTAL_FRAMES = BEATS[BEATS.length - 1].from + BEATS[BEATS.length - 1].frames;
export const beat = (id: string) => {
  const b = BEATS.find((x) => x.id === id);
  if (!b) throw new Error(`no beat ${id}`);
  return b;
};

/**
 * Frame each word of a segment is spoken, estimated from its character position
 * (no word timestamps yet). Returns frames relative to `relativeTo`.
 */
export const wordOnsets = (seg: SegT, relativeTo: number, lead = 2) => {
  const words: { word: string; at: number }[] = [];
  const n = seg.text.length || 1;
  for (const m of seg.text.matchAll(/\S+/g)) {
    words.push({ word: m[0], at: seg.from + Math.round(((m.index ?? 0) / n) * seg.frames) - lead - relativeTo });
  }
  return words;
};
