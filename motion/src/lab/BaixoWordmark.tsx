// Lab: section 6 of the reference clip (60 fps, 1280x720): the wordmark. Not a film.
// The tables are measured from the clip's frames, keyed by its frame number (f540-f649), in its 720p pixels.
//
// Plan as events:
// - f540-f556: the word shoots up from below the frame, smeared vertically by its speed, on the white flash left by
//   the last section. The background settles to the light grey by f559.
// - f556-f620: it keeps rising, slower and slower, and holds.
// - f620-f649: it pulls away, shrinking faster each frame. Hard cut at f650.
// - Screenshot frame: f600, the still point before the pull away.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { z } from "zod";
import { FONT_FAMILY } from "../lib/fonts";

const K = 1.5;
export const FIRST_FRAME = 540;
export const LAST_FRAME = 649;
export const BAIXO_WORDMARK = { durationInFrames: LAST_FRAME - FIRST_FRAME + 1, fps: 60 };

export const baixoWordmarkSchema = z.object({ word: z.string() });
export type BaixoWordmarkProps = z.infer<typeof baixoWordmarkSchema>;
export const baixoWordmarkDefaults: BaixoWordmarkProps = { word: "BAIXO" };

type Row = readonly number[];
const clamped = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const at = (f: number, rows: readonly Row[], column = 1) =>
  interpolate(f, rows.map((r) => r[0]), rows.map((r) => r[column]), clamped);

const WORD_TOP = [
  [540, 604], [541, 532], [542, 506], [543, 488], [544, 473], [545, 461], [546, 451], [547, 442], [548, 434], [549, 427], [550, 420], [551, 414], [552, 408],
  [553, 403], [554, 399], [555, 394], [556, 390], [557, 386], [558, 383], [559, 380], [560, 377], [566, 361], [572, 350], [578, 341], [584, 334], [590, 329],
  [596, 325], [602, 321], [608, 319], [614, 317], [620, 316], [632, 316], [638, 318], [644, 322], [646, 325], [647, 326], [648, 329], [649, 332],
] as const;
const WORD_WIDTH = [[540, 377], [552, 381], [553, 383], [602, 383], [608, 381], [614, 379], [620, 375], [626, 367], [632, 355], [638, 337], [644, 303], [646, 282], [647, 267], [648, 249], [649, 221]] as const;
const WORD_HEIGHT = 94;
const BASE_WIDTH = 383;
const BLUR = [[540, 2.5], [541, 2.2], [542, 1.8], [544, 1.4], [546, 1.1], [548, 0.8], [550, 0.6], [552, 0.4], [554, 0.2], [556, 0]] as const;
const BACKGROUND = [[552, 255, 255, 255], [553, 253, 255, 255], [554, 250, 251, 254], [555, 248, 249, 254], [556, 247, 248, 253], [557, 246, 247, 252], [558, 244, 245, 250], [559, 243, 244, 249]] as const;
const FONT_SIZE = 129;
const MOTION_BLUR = 0.09;

export const BaixoWordmark: React.FC<BaixoWordmarkProps> = ({ word }) => {
  const f = useCurrentFrame() + FIRST_FRAME;
  const centreY = (at(f, WORD_TOP) + WORD_HEIGHT / 2) * K;
  const scale = at(f, WORD_WIDTH) / BASE_WIDTH;
  const speed = Math.abs(at(f + 0.5, WORD_TOP) - at(f - 0.5, WORD_TOP)) * K;
  const blurX = at(f, BLUR) * K;
  const blurY = blurX + speed * MOTION_BLUR;
  return (
    <AbsoluteFill style={{ background: `rgb(${at(f, BACKGROUND, 1)}, ${at(f, BACKGROUND, 2)}, ${at(f, BACKGROUND, 3)})`, overflow: "hidden" }}>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id="wordmark-blur" x="-20%" y="-100%" width="140%" height="300%">
          <feGaussianBlur stdDeviation={`${blurX} ${blurY}`} />
        </filter>
      </svg>
      <div
        style={{
          position: "absolute",
          left: 0,
          width: "100%",
          top: centreY,
          textAlign: "center",
          transform: `translateY(-50%) scale(${scale})`,
          fontFamily: FONT_FAMILY,
          fontWeight: 700,
          fontSize: FONT_SIZE * K,
          lineHeight: 1,
          letterSpacing: FONT_SIZE * K * -0.015,
          color: "#000",
          filter: blurY > 0.05 ? "url(#wordmark-blur)" : undefined,
        }}
      >
        {word}
      </div>
    </AbsoluteFill>
  );
};
