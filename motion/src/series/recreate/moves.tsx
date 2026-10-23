/**
 * Animated pieces for the "recreate" series. Each takes the scene's local frame (or reads it)
 * and its cue frames; nothing animates on its own clock except the template, which loops like
 * the real thing playing on its page.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, enter, staggerOnsets, tween } from "../../lib/eases";
import { C, F } from "./tokens";

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

// ---------------------------------------------------------------- the template (placeholder)

const LOOP = 84;

/**
 * "Liquid Type", the sample template: a serif word melts in letter by letter (expo-out-ish
 * softLand, ~600 ms, ~40 ms apart), holds, then wipes away; loops. Stands in for a real
 * template's footage until the /motion page has recordings.
 */
export const LiquidType: React.FC<{ t: number; size: number; bg?: string; ink?: string; word?: string }> = ({ t, size, bg = C.blue, ink = C.white, word = "flow" }) => {
  const lt = ((t % LOOP) + LOOP) % LOOP;
  const onsets = staggerOnsets(word.length, 6, [1, 2, 1, 1, 2]);
  const wipe = tween(lt, 62, 12, 0, 100, "accelExit");
  return (
    <AbsoluteFill style={{ background: bg, display: "grid", placeItems: "center", overflow: "hidden" }}>
      <div style={{ textAlign: "center", color: ink, clipPath: `inset(0 0 0 ${wipe}%)` }}>
        <div style={{ ...F.caps, fontSize: size * 0.16, letterSpacing: "0.02em", transform: `translateY(${tween(lt, 2, 14, size * 0.1, 0, "softLand")}px)`, opacity: tween(lt, 2, 5, 0, 1) }}>
          Motion 01
        </div>
        <div style={{ ...F.italic, fontSize: size, lineHeight: 0.9, display: "flex", justifyContent: "center" }}>
          {word.split("").map((ch, i) => {
            const k = tween(lt, onsets[i], 18, 0, 1, "softLand");
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  transformOrigin: "50% 100%",
                  transform: `translateY(${(1 - k) * size * 0.35}px) scaleY(${1 + (1 - k) * 0.6})`,
                  filter: k < 0.98 ? `blur(${(1 - k) * 18}px)` : undefined,
                  opacity: lt >= onsets[i] ? Math.min(1, k * 4) : 0,
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- the ease curve

/**
 * An easing graph that draws itself (progress 0..1) with a dot riding it, so the viewer SEES
 * "fast in, slow settle". The curve is the real softLand function, sampled.
 */
export const EaseGraph: React.FC<{ draw: number; ride: number; w: number; h: number; color?: string; dot?: string }> = ({ draw, ride, w, h, color = C.white, dot = C.butter }) => {
  const N = 60;
  const pts = Array.from({ length: N + 1 }, (_, i) => {
    const x = i / N;
    return [x * w, h - ease.softLand(x) * h] as const;
  });
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const rx = ride * w;
  const ry = h - ease.softLand(ride) * h;
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <path d={`M0 0 V${h} H${w}`} stroke="rgba(255,255,255,0.22)" strokeWidth={2} fill="none" />
      <path d={d} stroke={color} strokeWidth={6} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
      {ride > 0 && <circle cx={rx} cy={ry} r={14} fill={dot} />}
    </svg>
  );
};

/** A small white label tag (mono) that lands with a slight tilt. */
export const Tag: React.FC<{ at: number; children: React.ReactNode; tilt?: number; dot?: string }> = ({ at, children, tilt = -3, dot = C.blue }) => {
  const frame = useCurrentFrame();
  const e = enter(frame, at, { from: { y: 26, blur: 6, scale: 0.92 }, easing: "snapSettle", frames: 11 });
  if (!e.visible) return null;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        background: C.white,
        padding: "14px 20px",
        ...F.mono,
        fontSize: 26,
        color: C.ink,
        transform: `translateY(${e.y}px) rotate(${tilt}deg) scale(${e.scale})`,
        filter: e.blur > 0.3 ? `blur(${e.blur}px)` : undefined,
        boxShadow: "0 14px 34px rgba(0,0,0,0.35)",
      }}
    >
      <span style={{ width: 12, height: 12, borderRadius: 99, background: dot }} />
      {children}
    </div>
  );
};
