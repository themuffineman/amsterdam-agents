/**
 * Background music bed with ducking under the voice.
 *
 * Levels are set from the track's measured mean loudness (music.json, written by
 * `npm run music`), so any allowlisted track lands at the same place in the mix:
 * - while someone speaks: ~20 dB under the voice (voice sits around -20 dB mean)
 * - in the gaps between lines: ~10 dB under, so the bed is audible but never competes
 * The duck starts 8 f before each line and releases over 18 f after it.
 */
import React from "react";
import { Audio, interpolate, staticFile, useVideoConfig } from "remotion";

export interface MusicInfo {
  file: string;
  durationSec: number;
  meanDb: number;
}

const DB_SPEECH = -40; // target mean level of the bed under speech
const DB_GAP = -30; // target mean level of the bed between lines
const DUCK_IN = 8;
const DUCK_OUT = 18;
const FADE_IN = 15;
const FADE_OUT = 45;

const gainFor = (targetDb: number, meanDb: number) => Math.pow(10, (targetDb - meanDb) / 20);

/** 1 while speaking (with ramps either side), 0 in the gaps. */
export const duckAmount = (f: number, speech: [number, number][]) => {
  let d = 0;
  for (const [a, b] of speech) {
    if (f >= a - DUCK_IN && f <= b + DUCK_OUT) {
      const v = f < a ? (f - (a - DUCK_IN)) / DUCK_IN : f > b ? 1 - (f - b) / DUCK_OUT : 1;
      d = Math.max(d, v);
      if (d >= 1) break;
    }
  }
  return d;
};

export const MusicBed: React.FC<{ music: MusicInfo; speech: [number, number][]; totalFrames: number; gain?: number }> = ({
  music,
  speech,
  totalFrames,
  gain = 1,
}) => {
  const { fps } = useVideoConfig();
  const gSpeech = gainFor(DB_SPEECH, music.meanDb) * gain;
  const gGap = gainFor(DB_GAP, music.meanDb) * gain;
  return (
    <Audio
      src={staticFile(music.file)}
      loop={music.durationSec * fps < totalFrames}
      volume={(f) => {
        const d = duckAmount(f, speech);
        const level = gGap + (gSpeech - gGap) * d;
        const fade = interpolate(f, [0, FADE_IN, totalFrames - FADE_OUT, totalFrames], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return Math.min(1, level * fade);
      }}
    />
  );
};
