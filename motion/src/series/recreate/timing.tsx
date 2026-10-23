/**
 * The word-level transcript is the clock (structure ported from codemotion's
 * src/timing/transcript.tsx). Every reveal is anchored to a spoken word, never a typed frame.
 *
 *   <TranscriptProvider transcript={t}>
 *     <Track>
 *       <Scene from="this is template">...</Scene>     one scene per spoken beat
 *       <Scene from="now watch">...</Scene>
 *     </Track>
 *   </TranscriptProvider>
 *
 * Inside a scene: const cue = useCue(); cue("easing") -> LOCAL frame the word is heard (minus a
 * small lead so the visual lands on the word, never after it).
 *
 * Transcript JSON, seconds: { "words": [ { "text": "This", "start": 0.4, "end": 0.6 }, ... ] }
 * From a real voiceover: faster-whisper word timestamps (codemotion scripts/transcribe.py).
 */
import React, { createContext, useContext } from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { NightGround, PaperGround, SkyGround } from "./kit";
import { inStyle, outStyle, pickTransition, type TransitionKind } from "./transitions";

export type Word = { text: string; start: number; end: number };
export type Transcript = { words: Word[] };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9']+/g, "");

/** The n-th occurrence (1-based) of a phrase, searching from `after` seconds. */
export const findPhrase = (t: Transcript, phrase: string, n = 1, after = 0) => {
  const target = phrase.split(/\s+/).map(norm).filter(Boolean);
  let seen = 0;
  for (let i = 0; i < t.words.length; i++) {
    if (t.words[i].start < after) continue;
    if (target.every((w, j) => norm(t.words[i + j]?.text ?? "") === w) && ++seen === n) {
      return { start: t.words[i].start, end: t.words[i + target.length - 1].end };
    }
  }
  throw new Error(`Cue not found in transcript: "${phrase}" (occurrence ${n}, after ${after}s)`);
};

type Ctx = { transcript: Transcript; offset: number; sceneStart: number };
const TranscriptCtx = createContext<Ctx | null>(null);

const useCtx = () => {
  const ctx = useContext(TranscriptCtx);
  if (!ctx) throw new Error("must be used inside <TranscriptProvider>");
  return ctx;
};

export const TranscriptProvider: React.FC<{ transcript: Transcript; children: React.ReactNode }> = ({ transcript, children }) => (
  <TranscriptCtx.Provider value={{ transcript, offset: 0, sceneStart: 0 }}>{children}</TranscriptCtx.Provider>
);

/** Total frames: last word + a short tail. */
export const lengthOf = (t: Transcript, fps = 30, tail = 1.2) => Math.ceil((t.words[t.words.length - 1].end + tail) * fps);

/** cue(phrase) -> LOCAL frame inside the current <Scene>. */
export const useCue = () => {
  const ctx = useCtx();
  const { fps } = useVideoConfig();
  return (phrase: string, o: { n?: number; lead?: number; edge?: "start" | "end" } = {}) => {
    const hit = findPhrase(ctx.transcript, phrase, o.n ?? 1, ctx.sceneStart);
    return Math.round((o.edge === "end" ? hit.end : hit.start) * fps) - ctx.offset - (o.lead ?? 3);
  };
};

/** The spoken words from `from` through `to`, each with its LOCAL frame (`at`). */
export const useWords = (from: string, to: string, lead = 2) => {
  const ctx = useCtx();
  const { fps } = useVideoConfig();
  const a = findPhrase(ctx.transcript, from, 1, ctx.sceneStart);
  const b = findPhrase(ctx.transcript, to, 1, a.start);
  return ctx.transcript.words
    .filter((w) => w.start >= a.start && w.end <= b.end + 1e-6)
    .map((w) => ({ ...w, at: Math.round(w.start * fps) - ctx.offset - lead }));
};

export type Ground = "paper" | "night" | "sky";

const GROUNDS: Record<Ground, React.FC> = { paper: PaperGround, night: NightGround, sky: SkyGround };

/** The ground layer: holds until the next scene with a different ground; switches hard on the cut (peak blur). */
const GroundLayer: React.FC<{ ground: Ground }> = ({ ground }) => {
  const G = GROUNDS[ground];
  return <G />;
};

export type SceneProps = {
  from: string;
  fromN?: number;
  name?: string;
  /** Background under this scene. */
  ground?: Ground;
  /** How this scene LEAVES. Default: picked by code (pickTransition). "cut": plain hard cut. */
  transition?: TransitionKind | "cut";
  /** The focused element's centre (px, 1920x1080) when the scene ends: the exit zooms into it. */
  focus?: [number, number];
  children: React.ReactNode;
  _start?: number;
  _dur?: number;
  _after?: number;
  _out?: TransitionKind;
  _in?: TransitionKind;
};

const LEAD = 3; // a scene starts this many frames before its first word, so the first word rides in on the transition

/**
 * One spoken beat. Local frame 0 = the cut into it. It enters on the previous scene's
 * transition (speed ramp in) and leaves on its own (speed ramp out) on its last frame.
 */
export const Scene: React.FC<SceneProps> = ({ from, name, focus, children, _start = 0, _dur = 1, _after = 0, _out, _in }) => {
  const ctx = useCtx();
  return (
    <Sequence from={_start} durationInFrames={_dur} name={name ?? from}>
      <TranscriptCtx.Provider value={{ transcript: ctx.transcript, offset: _start, sceneStart: _after }}>
        <Ramps out={_out} in={_in} dur={_dur} focus={focus}>
          {children}
        </Ramps>
      </TranscriptCtx.Provider>
    </Sequence>
  );
};

/** Lays scenes end to end: each holds until the next one's first word, then the transition cuts. */
export const Track: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ctx = useCtx();
  const { fps, durationInFrames } = useVideoConfig();
  const scenes = React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement<SceneProps>[];
  let after = 0;
  const starts = scenes.map((el) => {
    const hit = findPhrase(ctx.transcript, el.props.from, el.props.fromN ?? 1, after);
    after = hit.start;
    return { frame: Math.max(0, Math.round(hit.start * fps) - LEAD), after: hit.start };
  });
  // the transition that ends each scene (none after the last)
  const outs = scenes.map((el, i) => {
    if (i === scenes.length - 1 || el.props.transition === "cut") return undefined;
    return el.props.transition ?? pickTransition(i, el.props.focus);
  });
  const grounds = scenes.map((el) => el.props.ground ?? "sky");
  return (
    <>
      {scenes.map((el, i) => {
        if (i > 0 && grounds[i] === grounds[i - 1]) return null;
        let j = i + 1;
        while (j < scenes.length && grounds[j] === grounds[i]) j++;
        const start = starts[i].frame;
        const end = j < scenes.length ? starts[j].frame : durationInFrames;
        return (
          <Sequence key={`g${i}`} from={start} durationInFrames={end - start} name={`ground ${grounds[i]}`}>
            <GroundLayer ground={grounds[i]} />
          </Sequence>
        );
      })}
      {scenes.map((el, i) => {
        const last = i === scenes.length - 1;
        const start = starts[i].frame;
        const end = last ? durationInFrames : starts[i + 1].frame;
        return React.cloneElement(el, { key: i, _start: start, _dur: Math.max(1, end - start), _after: starts[i].after, _out: outs[i], _in: i > 0 ? outs[i - 1] : undefined });
      })}
    </>
  );
};

/** Applies the incoming ramp (first frames) and the outgoing ramp (last frames) to a scene. */
const Ramps: React.FC<{ out?: TransitionKind; in?: TransitionKind; dur: number; focus?: [number, number]; children: React.ReactNode }> = ({ out, in: inKind, dur, focus, children }) => {
  const frame = useCurrentFrame();
  const enter = inKind ? inStyle(inKind, frame) : undefined;
  const leave = out ? outStyle(out, frame, dur, focus) : undefined;
  return (
    <AbsoluteFill style={leave ?? enter}>
      {children}
    </AbsoluteFill>
  );
};
