/**
 * Shared scene pieces: grounds (surfaces with a key light, not flat swatches) and a
 * whole-word line builder. All pure functions of the frame passed in.
 */
import React from "react";
import { AbsoluteFill, interpolateColors } from "remotion";
import { enter, exit, tween, type EaseName } from "./eases";
import { fontFamily, palette } from "./tokens";

/** Static paper grain (fixed seed: identical every frame). */
export const Grain: React.FC<{ opacity: number }> = ({ opacity }) => (
  <AbsoluteFill style={{ opacity, mixBlendMode: "multiply", pointerEvents: "none" }}>
    <svg width="100%" height="100%">
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={7} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  </AbsoluteFill>
);

/** Light ground: key light from the top-left that drifts slowly (the living thing). */
export const LightGround: React.FC<{ frame: number }> = ({ frame }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(110% 85% at ${14 + frame * 0.04}% -12%, #FFFFFF 0%, rgba(255,255,255,0) 58%),
                   radial-gradient(90% 70% at 105% 115%, rgba(150,140,120,0.22) 0%, rgba(150,140,120,0) 60%),
                   ${palette.ground}`,
    }}
  >
    <Grain opacity={0.09} />
  </AbsoluteFill>
);

/** Dark ground, same key direction as the light one. */
export const DarkGround: React.FC<{ frame: number }> = ({ frame }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(95% 80% at ${16 + frame * 0.05}% -15%, #34302B 0%, rgba(52,48,43,0) 60%),
                   ${palette.groundDark}`,
    }}
  >
    <Grain opacity={0.05} />
  </AbsoluteFill>
);

export interface WordLineProps {
  frame: number;
  words: string[];
  /** Entry frame per word (use staggerOnsets). */
  onsets: number[];
  size: number;
  weight: number;
  tracking: string;
  color: string;
  /** How far below its slot each word starts, px. */
  rise: number;
  /** Words whose arrival flashes the accent (decays to `color` in 7 f). */
  accent?: number[];
  accentColor?: string;
  entryEase?: EaseName;
  entryFrames?: number;
  /** Optional per-word exit start frames (each word leaves upward on accelExit). */
  exits?: number[];
  exitRise?: number;
}

/**
 * One line of whole words. Slots are reserved from frame 0 (visibility, not mounting), so
 * the line never re-flows or re-centres as words arrive.
 */
export const WordLine: React.FC<WordLineProps> = ({
  frame,
  words,
  onsets,
  size,
  weight,
  tracking,
  color,
  rise,
  accent = [],
  accentColor = palette.accent,
  entryEase = "softLand",
  entryFrames = 14,
  exits,
  exitRise = 90,
}) => (
  <div style={{ display: "flex", gap: size * 0.25, fontFamily, fontSize: size, fontWeight: weight, letterSpacing: tracking }}>
    {words.map((w, i) => {
      const e = enter(frame, onsets[i], { from: { y: rise, blur: 4 }, frames: entryFrames, easing: entryEase });
      const x = exits ? exit(frame, exits[i], { to: { y: -exitRise }, frames: 8 }) : null;
      const c = accent.includes(i) && frame >= onsets[i] ? interpolateColors(frame, [onsets[i], onsets[i] + 7], [accentColor, color]) : color;
      return (
        <span
          key={`${w}-${i}`}
          style={{
            display: "inline-block",
            transform: `translateY(${e.y + (x?.y ?? 0)}px)`,
            filter: `blur(${e.blur}px)`,
            opacity: e.opacity,
            visibility: e.visible && (x?.visible ?? true) ? "visible" : "hidden",
            color: c,
          }}
        >
          {w}
        </span>
      );
    })}
  </div>
);

/**
 * Bounded "living" drift for held frames: moves `total` px over the whole `frames`, linearly,
 * then stops. Never pixels-per-frame forever: unbounded drift pushes text and cards off screen
 * on long holds. Keep |total| <= ~2% of the frame width (about 24-40 px at 1920).
 */
export const drift = (frame: number, frames: number, total = -24) => tween(frame, 0, Math.max(1, frames), 0, total, "cruise");

/** Cap for slow camera push-in while a shot holds: never more than +2.5% scale. */
export const MAX_CREEP = 0.025;
