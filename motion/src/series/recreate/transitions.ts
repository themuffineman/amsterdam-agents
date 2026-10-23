/**
 * Scene transitions for the "recreate" series: speed ramps with motion blur.
 *
 * Every cut is a camera move in two halves around a hard cut at peak speed:
 *   OUT  the outgoing scene starts slow and ramps up very fast (crashOut) into the move,
 *        blurring as it speeds up; it ends at full speed and full blur on the cut frame.
 *   IN   the incoming scene starts blurred, already moving fast in the same direction, then
 *        decelerates hard (whip) and sharpens into place.
 * The ground (sky) stays still; only the scene's content travels.
 *
 * Kinds: zoomIn (push through), zoomOut (pull away), slideLeft / slideRight / slideUp,
 * diagonal, zoomInto (push into one element: the scene names its point with `focus`).
 * Track picks one per cut (see pickTransition); a Scene can override with `transition`.
 */
import type React from "react";
import { tween } from "../../lib/eases";

export type TransitionKind = "zoomIn" | "zoomOut" | "slideLeft" | "slideRight" | "slideUp" | "diagonal" | "zoomInto";

/** Frames of the outgoing ramp (before the cut) and the incoming settle (after it). */
export const OUT_FRAMES = 12;
export const IN_FRAMES = 14;
const MAX_BLUR = 26;

type Far = { x?: number; y?: number; s?: number };

/** Where each kind sends the outgoing content (out) and where the incoming content starts (in). */
const FAR: Record<TransitionKind, { out: Far; in: Far }> = {
  zoomIn: { out: { s: 2.3 }, in: { s: 0.7 } },
  zoomOut: { out: { s: 0.45 }, in: { s: 1.7 } },
  slideLeft: { out: { x: -1500 }, in: { x: 1500 } },
  slideRight: { out: { x: 1500 }, in: { x: -1500 } },
  slideUp: { out: { y: -1000 }, in: { y: 1000 } },
  diagonal: { out: { x: -1250, y: -720 }, in: { x: 1250, y: 720 } },
  zoomInto: { out: { s: 3.4 }, in: { s: 0.72 } },
};

/** Default order when nothing on screen asks for a zoom into an element. Never repeats back to back. */
const AUTO: TransitionKind[] = ["zoomIn", "slideLeft", "zoomOut", "diagonal", "slideUp", "slideRight"];

/** Code picks the transition: zoom into the focused element when the scene names one, else rotate. */
export const pickTransition = (index: number, focus?: [number, number]): TransitionKind => (focus ? "zoomInto" : AUTO[index % AUTO.length]);

const pose = (far: Far, k: number) => ({ x: (far.x ?? 0) * k, y: (far.y ?? 0) * k, s: 1 + ((far.s ?? 1) - 1) * k });

const style = (p: { x: number; y: number; s: number }, blur: number, origin: string): React.CSSProperties => ({
  transform: `translate(${p.x}px, ${p.y}px) scale(${p.s})`,
  transformOrigin: origin,
  filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
});

/** Outgoing style at local frame `lf` for a scene whose cut is at local frame `cut`. */
export const outStyle = (kind: TransitionKind, lf: number, cut: number, focus?: [number, number]): React.CSSProperties | undefined => {
  const from = cut - OUT_FRAMES;
  if (lf < from) return undefined;
  const k = tween(lf, from, OUT_FRAMES, 0, 1, "crashOut");
  const blur = tween(lf, from, OUT_FRAMES, 0, MAX_BLUR, "crashOut");
  return style(pose(FAR[kind].out, k), blur, focus ? `${focus[0]}px ${focus[1]}px` : "50% 50%");
};

/** Incoming style at local frame `lf` (0 = the cut). */
export const inStyle = (kind: TransitionKind, lf: number): React.CSSProperties | undefined => {
  if (lf >= IN_FRAMES) return undefined;
  const k = tween(lf, 0, IN_FRAMES, 1, 0, "whip");
  const blur = tween(lf, 0, IN_FRAMES, MAX_BLUR, 0, "whip");
  return style(pose(FAR[kind].in, k), blur, "50% 50%");
};
