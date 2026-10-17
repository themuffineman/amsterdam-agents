/**
 * Sound effects: a small named palette (files in public/sfx/, picked from the user's library
 * at C:\Users\ACER\Videos\sound-effect) and a one-line <Sfx> cue.
 * Cue pattern adapted from amsterdam-engine src/components/motion/Sfx.tsx.
 *
 * Levels: the voice sits around -20 dB mean. Default volumes put each effect ~10-14 dB under
 * it, so effects are felt, not heard over the words. Sound rule from the skill: close dry UI
 * sounds on on-screen events, one or two real hits per film, never a sound on every cut.
 */
import React from "react";
import { Audio, Sequence, interpolate, staticFile } from "remotion";

export const SFX = {
  wooshA: { file: "sfx/woosh-a.mp3", volume: 0.28 },
  wooshB: { file: "sfx/woosh-b.mp3", volume: 0.28 },
  wooshC: { file: "sfx/woosh-c.mp3", volume: 0.4 },
  popA: { file: "sfx/pop-a.mp3", volume: 0.18 },
  popB: { file: "sfx/pop-b.mp3", volume: 0.22 },
  popC: { file: "sfx/pop-c.mp3", volume: 0.11 },
  press: { file: "sfx/press.mp3", volume: 0.55 },
  tick: { file: "sfx/tick.mp3", volume: 0.22 },
  focusClick: { file: "sfx/focus-click.wav", volume: 0.9 },
  subDrop: { file: "sfx/sub-drop.mp3", volume: 0.09 },
} as const;

export type SfxName = keyof typeof SFX;

/** Rotate between variants so repeated events don't sound pasted. */
export const WOOSHES: SfxName[] = ["wooshA", "wooshB", "wooshC"];
export const POPS: SfxName[] = ["popA", "popB", "popC"];

export const Sfx: React.FC<{
  name: SfxName;
  /** Frame (relative to the enclosing Sequence) the sound starts. */
  at: number;
  /** Multiplies the palette volume. */
  gain?: number;
  /** Cut the cue after this many frames, with a 10 f fade (for long hits like subDrop). */
  maxFrames?: number;
}> = ({ name, at, gain = 1, maxFrames }) => {
  const s = SFX[name];
  const v = s.volume * gain;
  return (
    <Sequence from={Math.round(at)} durationInFrames={maxFrames} layout="none" name={`sfx ${name}`}>
      <Audio
        src={staticFile(s.file)}
        volume={maxFrames ? (f) => interpolate(f, [0, maxFrames - 10, maxFrames], [v, v, 0], { extrapolateRight: "clamp" }) : v}
      />
    </Sequence>
  );
};
