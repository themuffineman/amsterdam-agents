// Lab: section 7 of the reference clip (60 fps, 1280x720): the end card. Not a film.
// The tables are measured from the clip's frames, keyed by its frame number (f650-f737), in its 720p pixels.
//
// Plan as events:
// - f650: hard cut to black with the text too big for the frame and smeared.
// - f650-f690: it shrinks, fast then slow, sharpening, inside a soft white glow: a white echo of the opening.
// - f690-f737: it keeps easing smaller, then falls away faster at the end. Hard cut to black at f738.
// - Screenshot frame: f655, the text just inside the frame with its glow at full size.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { z } from "zod";
import { FONT_FAMILY } from "../lib/fonts";

const K = 1.5;
export const FIRST_FRAME = 650;
export const LAST_FRAME = 737;
export const ICY_END_CARD = { durationInFrames: LAST_FRAME - FIRST_FRAME + 1, fps: 60 };

export const icyEndCardSchema = z.object({ text: z.string() });
export type IcyEndCardProps = z.infer<typeof icyEndCardSchema>;
export const icyEndCardDefaults: IcyEndCardProps = { text: "icy.mp4" };

type Row = readonly number[];
const clamped = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const at = (f: number, rows: readonly Row[], column = 1) =>
  interpolate(f, rows.map((r) => r[0]), rows.map((r) => r[column]), clamped);

const TEXT_WIDTH = [
  [650, 1500], [651, 1262], [652, 1116], [653, 1017], [654, 943], [655, 881], [656, 831], [657, 786], [658, 747], [659, 714], [660, 684], [661, 657], [662, 633], [663, 611],
  [664, 590], [665, 572], [666, 555], [667, 539], [668, 525], [669, 512], [670, 499], [671, 489], [672, 477], [678, 427], [684, 393], [690, 371], [696, 354], [702, 343],
  [708, 333], [714, 323], [720, 311], [726, 291], [732, 255], [737, 175],
] as const;
const BASE_WIDTH = 343;
const CENTRE_Y = [[650, 400], [651, 361], [654, 360], [737, 360]] as const;
const BLUR_X = [[650, 5], [651, 3.5], [652, 2.5], [653, 2], [654, 1.5], [656, 1], [658, 0.8], [660, 0.6], [665, 0.5], [672, 0.4], [690, 0.3]] as const;
const BLUR_Y = [[650, 2.5], [651, 1.8], [652, 1.5], [653, 1.2], [654, 1], [656, 0.8], [658, 0.7], [660, 0.6], [665, 0.5], [672, 0.4], [690, 0.3]] as const;
// Fainter, larger copies of the text: the streak of the fast zoom.
const GHOST_OPACITY = [[650, 0.5], [651, 0.3], [652, 0.14], [653, 0.05], [654, 0]] as const;
const GHOST_SCALES = [1.03, 1.06, 1.1];
const FONT_SIZE = 91;
// The soft pool of light behind the text keeps its brightness as the text shrinks.
const GLOW_BRIGHTNESS = 0.13;
const GLOW_WIDTH = 2.4;
const GLOW_HEIGHT = 1.5;

export const IcyEndCard: React.FC<IcyEndCardProps> = ({ text }) => {
  const f = useCurrentFrame() + FIRST_FRAME;
  const textWidth = at(f, TEXT_WIDTH) * K;
  const scale = textWidth / (BASE_WIDTH * K);
  const centreY = at(f, CENTRE_Y) * K;
  const ghost = at(f, GHOST_OPACITY);
  const style: React.CSSProperties = {
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
    color: "#fff",
  };
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id="end-card-blur" x="-20%" y="-100%" width="140%" height="300%">
          <feGaussianBlur stdDeviation={`${at(f, BLUR_X) * K} ${at(f, BLUR_Y) * K}`} />
        </filter>
      </svg>
      <div
        style={{
          position: "absolute",
          left: 960 - (textWidth * GLOW_WIDTH) / 2,
          top: centreY - (textWidth * GLOW_HEIGHT) / 2,
          width: textWidth * GLOW_WIDTH,
          height: textWidth * GLOW_HEIGHT,
          background: `radial-gradient(closest-side, rgba(255, 255, 255, ${GLOW_BRIGHTNESS}) 0%, rgba(255, 255, 255, ${GLOW_BRIGHTNESS * 0.6}) 30%, rgba(255, 255, 255, ${GLOW_BRIGHTNESS * 0.18}) 65%, rgba(255, 255, 255, 0) 100%)`,
        }}
      />
      {/* A tight glow hugging the letters, sized in screen pixels whatever the text's scale. */}
      <div style={{ ...style, filter: `blur(${10 / scale}px)`, opacity: 0.4 }}>{text}</div>
      {ghost > 0.01
        ? GHOST_SCALES.map((ghostScale) => (
            <div
              key={ghostScale}
              style={{ ...style, transform: `translateY(-50%) scale(${scale * ghostScale})`, opacity: ghost, filter: "url(#end-card-blur)" }}
            >
              {text}
            </div>
          ))
        : null}
      <div style={{ ...style, filter: "url(#end-card-blur)" }}>{text}</div>
    </AbsoluteFill>
  );
};
