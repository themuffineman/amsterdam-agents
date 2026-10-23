/**
 * Animated pieces for the "recreate" series. Each takes the scene's local frame (or reads it)
 * and its cue frames.
 */
import React from "react";
import { useCurrentFrame } from "remotion";
import { enter, tween } from "../../lib/eases";

// ---------------------------------------------------------------- words

export type WordSpec = { text: string; at: number; style?: React.CSSProperties };

/**
 * Whole words arriving on their spoken frames: rise from under the baseline with a short blur.
 * Slots are reserved from frame 0, so the line never re-centres while it builds.
 */
export const Words: React.FC<{ words: WordSpec[]; size: number; base: React.CSSProperties; gap?: number; rise?: number }> = ({ words, size, base, gap = 0.22, rise = 0.45 }) => {
  const frame = useCurrentFrame();
  return (
    <span style={{ ...base, fontSize: size, display: "inline-flex", flexWrap: "wrap", justifyContent: "center", columnGap: size * gap, alignItems: "baseline" }}>
      {words.map((w, i) => {
        const e = enter(frame, w.at, { from: { y: size * rise, blur: 10 }, frames: 13 });
        return (
          <span key={i} style={{ display: "inline-block", transform: `translateY(${e.y}px)`, filter: e.blur > 0.3 ? `blur(${e.blur}px)` : undefined, opacity: e.visible ? e.opacity : 0, ...w.style }}>
            {w.text}
          </span>
        );
      })}
    </span>
  );
};

/**
 * Inline media chip that OPENS a gap in a line: its width grows from 0 (the words around it
 * part), then the picture inside settles from a slight zoom. The move from the references
 * (a picture sitting in the type like a word) turned into an event.
 */
export const OpeningChip: React.FC<{ at: number; w: number; h: number; tilt?: number; children: React.ReactNode }> = ({ at, w, h, tilt = -4, children }) => {
  const frame = useCurrentFrame();
  const width = tween(frame, at, 10, 0, w, "whip");
  const inner = tween(frame, at + 2, 16, 1.35, 1, "softLand");
  const rot = tween(frame, at, 18, tilt * 2.5, tilt, "softLand");
  return (
    <span style={{ display: "inline-block", width, height: h, verticalAlign: "middle", position: "relative", margin: `0 ${(width / w) * h * 0.08}px` }}>
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: h * 0.11,
          overflow: "hidden",
          transform: `rotate(${rot}deg)`,
          boxShadow: "0 12px 28px rgba(0,0,0,0.2)",
          textTransform: "none",
          visibility: frame >= at ? "visible" : "hidden",
        }}
      >
        <span style={{ position: "absolute", left: "50%", top: 0, width: w, height: h, marginLeft: -w / 2, transform: `scale(${inner})` }}>{children}</span>
      </span>
    </span>
  );
};
