/**
 * Measured motion eases for Remotion.
 *
 * Ported from motionmaxxing (Apache-2.0, https://github.com/Tejashmakwana/motionmaxxing,
 * runtime/motion.js). Those 12 curves were fitted to the median curves of real
 * human-made motion moves. Math is unchanged; only the packaging differs.
 * Keep this attribution if you redistribute.
 *
 * Every curve satisfies f(0) = 0 and f(1) = 1 (guarded), so they drop straight
 * into Remotion's interpolate({ easing }).
 */
import { interpolate } from "remotion";

type Fn = (t: number) => number;

const powerOut = (p: number): Fn => (t) => 1 - Math.pow(1 - t, p);
const powerIn = (p: number): Fn => (t) => Math.pow(t, p);
const expoOut = (k: number): Fn => {
  const d = 1 - Math.exp(-k);
  return (t) => (1 - Math.exp(-k * t)) / d;
};
const snapRamp = (w: number, tau: number): Fn => {
  const n = w * (1 - Math.exp(-1 / tau)) + (1 - w);
  return (t) => (w * (1 - Math.exp(-t / tau)) + (1 - w) * t) / n;
};
const snapOver = (A: number, ta: number, td: number): Fn => {
  const f = (t: number) => (1 + A * Math.exp(-t / td)) * (1 - Math.exp(-t / ta));
  const n = f(1);
  return (t) => f(t) / n;
};
const spring = (c: number, om: number): Fn => {
  const f = (t: number) =>
    1 - Math.exp(-c * t) * (Math.cos(om * t) + (c / om) * Math.sin(om * t));
  const n = f(1);
  return (t) => f(t) / n;
};
const smoothP = (p: number): Fn => (t) => {
  const a = Math.pow(t, p);
  const b = Math.pow(1 - t, p);
  return a / (a + b);
};
const guard = (f: Fn): Fn => (t) => (t <= 0 ? 0 : t >= 1 ? 1 : f(t));

export const ease = {
  /** Hits and slightly passes its mark at once (peak ~1.18 at t~.27). Slams. */
  crashIn: guard(snapOver(2.0, 0.19, 0.218)),
  /** Slow late overshoot (peak ~1.08 at t~.72). The ONLY routine bounce. */
  popOver: guard(spring(2.67, 4.36)),
  /** Big overshoot (peak ~1.48). Rare. Once per film at most. */
  bounceHard: guard(spring(1.34, 5.07)),
  /** Hero / CTA entry: ~54% of travel in the first 10% of the time. */
  snapSettle: guard(snapRamp(0.942, 0.118)),
  /** Workhorse landing for text and panels. */
  softLand: guard(expoOut(3.41)),
  /** Hard decelerating big move. */
  whip: guard(powerOut(2.52)),
  /** Gentle ease-out for medium moves. */
  glide: guard(powerOut(1.7)),
  /** Linear: fades, drift, counters, ambient motion. */
  cruise: guard((t) => t),
  /** Symmetric S: opacity, blur, colour ramps. */
  softInOut: guard(smoothP(1.42)),
  /** Mild acceleration: fade-out starts, blur-outs. */
  gentleIn: guard(powerIn(2.07)),
  /** THE leaving curve. Exits, scale-outs, pans off frame. */
  accelExit: guard(powerIn(2.6)),
  /** Hard acceleration into a cut. */
  crashOut: guard(powerIn(3.97)),
} satisfies Record<string, Fn>;

export type EaseName = keyof typeof ease;

/** Typical length in frames at 30 fps (measured median per curve). */
export const easeFrames: Record<EaseName, number> = {
  crashIn: 10,
  popOver: 15,
  bounceHard: 22,
  snapSettle: 11,
  softLand: 12,
  whip: 7,
  glide: 10,
  cruise: 9,
  softInOut: 9,
  gentleIn: 9,
  accelExit: 13,
  crashOut: 17,
};

/**
 * tween(frame, start, frames, from, to, easeName)
 * Clamped, frame-authored tween. Frames are the unit, not seconds.
 *   const y = tween(frame, 12, 12, 64, 0, "softLand");
 */
export const tween = (
  frame: number,
  start: number,
  frames: number,
  from: number,
  to: number,
  easing: EaseName | Fn = "cruise",
): number => {
  const fn = typeof easing === "function" ? easing : ease[easing];
  return interpolate(frame, [start, start + Math.max(1, frames)], [from, to], {
    easing: fn,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

/**
 * Entry: moves AND decays. Never opacity alone, never grows from zero.
 * Returns { y, x, scale, blur, opacity } for the element at `frame`.
 * opacity is only a 5-frame helper; the motion carries the arrival.
 */
export const enter = (
  frame: number,
  at: number,
  o: {
    from?: { x?: number; y?: number; scale?: number; blur?: number };
    frames?: number;
    easing?: EaseName;
  } = {},
) => {
  const easing = o.easing ?? "softLand";
  const frames = o.frames ?? easeFrames[easing];
  const f = { x: 0, y: 48, scale: 1, blur: 4, ...o.from };
  return {
    x: tween(frame, at, frames, f.x, 0, easing),
    y: tween(frame, at, frames, f.y, 0, easing),
    scale: tween(frame, at, frames, f.scale, 1, easing),
    blur: tween(frame, at, frames, f.blur, 0, "glide"),
    opacity: tween(frame, at, 5, 0.15, 1, "cruise"),
    visible: frame >= at, // hard 1-frame appearance; render nothing before
  };
};

/** Exit: accelerates away, ends at peak speed. Pair with a hard cut after it. */
export const exit = (
  frame: number,
  at: number,
  o: { to?: { x?: number; y?: number; scale?: number }; frames?: number } = {},
) => {
  const frames = o.frames ?? easeFrames.accelExit;
  const t = { x: 0, y: -80, scale: 1, ...o.to };
  return {
    x: tween(frame, at, frames, 0, t.x, "accelExit"),
    y: tween(frame, at, frames, 0, t.y, "accelExit"),
    scale: tween(frame, at, frames, 1, t.scale, "accelExit"),
    visible: frame < at + frames,
  };
};

/**
 * Stagger onsets: UNEVEN 1-3 frame gaps, never a uniform timer.
 * Default pattern repeats its last value. CTA stacks use ~8.
 *   staggerOnsets(5, 12)            // 12, 15, 17, 19, 21 ...
 */
export const staggerOnsets = (
  count: number,
  start: number,
  gaps: number[] = [3, 2, 2, 2, 2, 2],
): number[] => {
  const out: number[] = [];
  let f = start;
  for (let i = 0; i < count; i++) {
    out.push(f);
    f += gaps[Math.min(i, gaps.length - 1)];
  }
  return out;
};

/**
 * One-frame camera snap: frame `at` = from, frame at+1 already `share` of the
 * way, then a decelerating tail. Reveal/reframe. Never one global ease-out zoom.
 * Apply the result to ONE camera group that contains the whole UI.
 */
export const cameraSnap = (
  frame: number,
  at: number,
  from: number,
  to: number,
  o: { share?: number; tail?: number } = {},
): number => {
  const share = o.share ?? 0.6;
  const tail = o.tail ?? 15;
  if (frame <= at) return from;
  if (frame === at + 1) return from + (to - from) * share;
  return tween(frame, at + 1, tail, from + (to - from) * share, to, "softLand");
};

/**
 * Constant-octave dive (brand -> product zoom). Scale multiplies by `perStep`
 * every frame, no ease, so it reads as constant speed. 1.6/frame for 9 frames
 * is ~69x total; lower perStep or frames for a gentler zoom.
 */
export const dive = (frame: number, at: number, frames = 9, perStep = 1.6) =>
  Math.pow(perStep, Math.max(0, Math.min(frames, frame - at)));
