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
export const OpeningChip: React.FC<{ at: number; w: number; h: number; tilt?: number; radius?: number; children: React.ReactNode }> = ({ at, w, h, tilt = -4, radius = 0.11, children }) => {
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
          borderRadius: h * radius,
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

// ---------------------------------------------------------------- camera + focus

type Key = { at: number; v: number; dur?: number };

/** Chained eased glide: from each key's value to the next, softInOut over `dur` frames. No snaps. */
export const glide = (frame: number, keys: Key[]) =>
  keys.slice(1).reduce((v, k) => v + (k.v - v) * tween(frame, k.at, k.dur ?? 36, 0, 1, "softInOut"), keys[0].v);

/** Focus pull: 0 = sharp, 1 = racked out. Blur, a slight push back, and a fade. */
export const rackStyle = (k: number, blur = 14, fade = 0.25): React.CSSProperties =>
  k <= 0.001 ? {} : { filter: `blur(${k * blur}px)`, transform: `scale(${1 - k * 0.05})`, opacity: 1 - k * fade };

// ---------------------------------------------------------------- the float-up

export type Pose = { rotX: number; rotY: number; rotZ: number };

/**
 * The series' signature entrance (the prompt ticket's move): an object floats up from below the
 * frame tilted in 3D and unwinds into its resting pose as it rises, then bobs very slightly.
 * Rise settles in ~34 f, the turn in ~46 f, so it is still turning after it lands.
 */
export const floatUp = (
  frame: number,
  at: number,
  o: { to?: Partial<Pose>; from?: Partial<Pose>; dist?: number; rise?: number; turn?: number; bob?: number } = {},
) => {
  const rise = tween(frame, at, o.rise ?? 34, 0, 1, "softLand");
  const turn = tween(frame, at, o.turn ?? 46, 0, 1, "softLand");
  const f: Pose = { rotX: 26, rotY: 46, rotZ: -12, ...o.from };
  const t: Pose = { rotX: 6, rotY: 14, rotZ: -3, ...o.to };
  return {
    visible: frame >= at,
    y: (1 - rise) * (o.dist ?? 820) + Math.sin((frame - at) / 22) * (o.bob ?? 6) * rise,
    rotX: f.rotX + (t.rotX - f.rotX) * turn,
    rotY: f.rotY + (t.rotY - f.rotY) * turn,
    rotZ: f.rotZ + (t.rotZ - f.rotZ) * turn,
  };
};

/** Applies a floatUp pose (plus optional extra x/scale) to its children. Renders nothing before `visible`. */
export const Float3D: React.FC<{ pose: ReturnType<typeof floatUp>; x?: number; scale?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ pose, x = 0, scale = 1, style, children }) =>
  pose.visible ? (
    <div
      style={{
        transform: `perspective(1800px) translate(${x}px, ${pose.y}px) scale(${scale}) rotateX(${pose.rotX}deg) rotateY(${pose.rotY}deg) rotateZ(${pose.rotZ}deg)`,
        ...style,
      }}
    >
      {children}
    </div>
  ) : null;
