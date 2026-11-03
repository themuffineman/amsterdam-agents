// Lab: recreation of the opening of a reference clip (60 fps, 1280x720). Not a film.
// The tables below are measured from that clip's frames, so they replace eases on purpose.
// They are keyed by the clip's frame number (f = 1 is the first frame), positions in its 720p pixels.
//
// Plan as events:
// - f1-f8: the word shoots up from below the frame, fast then slowing. Its speed causes the vertical motion
//   blur that turns the "e"s into slots. A fixed lens over the whole frame curves it near the bottom edge,
//   and it straightens by itself as it travels toward the middle. Colour cools from blue through cyan to white.
// - f2-f10: the blue block flickers through three poses, two frames each with gaps between, then is gone.
// - f14-f28: the word starts to slide left and speeds up, which blurs it sideways.
// - f24-f32: everything fades up to the light background of the next scene.
// - Screenshot frame: f3, the word curved and smeared at the bottom edge beside the block.
//
// The filter chain over the text:
//   speed-based directional blur -> alpha contrast -> lens -> soften
//   -> add tight and wide glows = a heat field -> gradient map (heat to colour) -> RGB split
import React, { useEffect, useMemo, useState } from "react";
import { AbsoluteFill, cancelRender, continueRender, delayRender, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { FONT_FAMILY } from "../lib/fonts";

const slider = (min: number, max: number, step: number) => z.number().min(min).max(max).step(step);

export const glowTextSchema = z.object({
  text: z.string(),
  fontSize: slider(100, 400, 5),
  fontWeight: slider(300, 800, 50),
  motionBlur: slider(0, 0.5, 0.01),
  softness: slider(0, 3, 0.05),
  swell: slider(0, 3, 0.05),
  lens: slider(0, 800, 10),
  glowTight: slider(0, 1, 0.01),
  glowWide: slider(0, 1, 0.01),
  rgbSplit: slider(0, 4, 0.05),
  backgroundGlow: slider(0, 2, 0.01),
  blockSize: slider(0, 2, 0.05),
});

export type GlowTextProps = z.infer<typeof glowTextSchema>;

export const glowTextDefaults: GlowTextProps = {
  text: "Need",
  fontSize: 195,
  fontWeight: 550,
  motionBlur: 0.3,
  softness: 1,
  swell: 1,
  lens: 400,
  glowTight: 0.22,
  glowWide: 0.34,
  rgbSplit: 1,
  backgroundGlow: 1,
  blockSize: 1,
};

export const GLOW_TEXT = { durationInFrames: 34, fps: 60 };

// All layout is in 1920x1080; the clip's 720p measurements are multiplied by this.
const FROM_CLIP = 1.5;

const clamped = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const at = (f: number, table: readonly (readonly [number, number])[]) =>
  interpolate(f, table.map((row) => row[0]), table.map((row) => row[1]), clamped);

// Top of the word in the clip, per frame.
const WORD_TOP = [
  [1, 680], [2, 624], [3, 569], [4, 528], [5, 497], [6, 472], [7, 452], [8, 433], [9, 418], [10, 405], [11, 393],
  [12, 382], [13, 373], [14, 365], [16, 350], [18, 338], [20, 329], [22, 321], [24, 313], [26, 307], [28, 303], [32, 298],
] as const;
// The word's sideways drift from its settled position.
const WORD_X = [
  [12, 0], [14, -2], [16, -7], [18, -16], [20, -30], [22, -50], [24, -83], [26, -138], [28, -250], [32, -480],
] as const;
const BASE_BLUR = [[1, 7], [3, 6], [5, 5], [7, 4], [9, 3.5], [12, 2.5], [16, 2], [32, 2]] as const;
const SWELL = [[1, 1], [6, 0.7], [11, 0]] as const;
const SPLIT = [[1, 3], [5, 5], [8, 4], [12, 1.5], [20, 0.6]] as const;
const SCALE = [[2, 1.3], [5, 1.18], [8, 1.08], [12, 1.02], [14, 1]] as const;
const STRETCH_Y = [[2, 1.15], [8, 1.1], [13, 1]] as const;
const COLOUR = [[1, 0], [3, 0.15], [6, 0.5], [12, 1]] as const;
const TEXT_OPACITY = [[1, 0.3], [2, 1]] as const;
const GLOW_SIZE = [[1, 30], [5, 50], [14, 80]] as const; // background glow radius, % of the frame
const GLOW_OPACITY = [[1, 0.3], [3, 1]] as const;
// The fade reaches the top of the frame first; the bottom catches up by f29.
const WHITEOUT_TOP = [[23, 0], [24, 0.03], [25, 0.045], [26, 0.13], [27, 0.25], [28, 0.43], [29, 0.62], [30, 0.8], [31, 0.95], [32, 1]] as const;
const WHITEOUT_BOTTOM = [[24, 0], [26, 0.05], [27, 0.13], [28, 0.27], [29, 0.62], [30, 0.8], [31, 0.95], [32, 1]] as const;

// The block's held poses in the clip: x, y, width, height.
const blockPose = (f: number) => {
  if (f === 2 || f === 3) return { x: 836, y: 638, w: 58, h: 58 };
  if (f === 6 || f === 7) return { x: 829, y: 461, w: 48, h: 71 };
  if (f === 9 || f === 10) return { x: 816, y: 361, w: 46, h: 39 };
  return null;
};

// Colour by heat, at the stops below. Sampled from the clip's blue, cyan and white frames.
const HEAT_STOPS = [0, 0.12, 0.3, 0.55, 0.8, 1];
const PALETTE = {
  blue: ["#000000", "#02184f", "#0a4aae", "#1a8ff0", "#2aa6f5", "#3cc4ff"],
  cyan: ["#000000", "#052a58", "#0c6fbe", "#3fb7f0", "#74e2fa", "#a0f4ff"],
  white: ["#000000", "#0a1520", "#2a4d6b", "#9fb7c7", "#eef6fa", "#ffffff"],
};

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

// feComponentTransfer tables are evenly spaced, so resample the stops onto 33 even steps.
const table = (colours: number[][], channel: number) =>
  Array.from({ length: 33 }, (_, i) => {
    const heat = i / 32;
    const hi = Math.max(1, HEAT_STOPS.findIndex((s) => s >= heat));
    const t = (heat - HEAT_STOPS[hi - 1]) / (HEAT_STOPS[hi] - HEAT_STOPS[hi - 1]);
    return mix(colours[hi - 1][channel], colours[hi][channel], t).toFixed(3);
  }).join(" ");

const WIDTH = 1920;
const HEIGHT = 1080;
const LENS_CX = WIDTH / 2;
const LENS_CY = HEIGHT * 0.44;
const LENS_RADIUS = HEIGHT / 2;
const LENS_RANGE = 2.5; // largest offset the map's colours can hold, in lens radii
const FILTER_HEIGHT = 1500; // taller than the frame: near the bottom edge the lens samples text below it

// A barrel lens as a displacement map: each pixel samples further from the centre the further out it is.
const lensMap = () => {
  const w = 480;
  const h = Math.round((w * FILTER_HEIGHT) / WIDTH);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D canvas for the lens map");
  const image = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = ((x / w) * WIDTH - LENS_CX) / LENS_RADIUS;
      const ny = ((y / h) * FILTER_HEIGHT - LENS_CY) / LENS_RADIUS;
      const r2 = nx * nx + ny * ny;
      const i = (y * w + x) * 4;
      image.data[i] = 127.5 + 127.5 * Math.max(-1, Math.min(1, (nx * r2) / LENS_RANGE));
      image.data[i + 1] = 127.5 + 127.5 * Math.max(-1, Math.min(1, (ny * r2) / LENS_RANGE));
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
};

const ONLY = {
  r: "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0",
  g: "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0",
  b: "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0",
};

export const GlowTextReveal: React.FC<GlowTextProps> = (p) => {
  const f = useCurrentFrame() + 1;
  const { width: outputWidth, height: outputHeight } = useVideoConfig();
  const outputScale = outputWidth / WIDTH;

  const map = useMemo(lensMap, []);

  // The map is a data URL, but the filter still has to wait for it to decode.
  const [handle] = useState(() => delayRender("Decoding the lens map"));
  useEffect(() => {
    const image = new Image();
    image.src = map;
    image.decode().then(() => continueRender(handle)).catch(cancelRender);
  }, [map, handle]);

  // Position this frame, and speed from the frames either side of it.
  const top = at(f, WORD_TOP) * FROM_CLIP;
  const speedY = Math.abs(at(f + 0.5, WORD_TOP) - at(f - 0.5, WORD_TOP)) * FROM_CLIP;
  const speedX = Math.abs(at(f + 0.5, WORD_X) - at(f - 0.5, WORD_X)) * FROM_CLIP;
  const driftX = at(f, WORD_X) * FROM_CLIP;

  const capHeight = p.fontSize * 0.727;
  const scale = at(f, SCALE);
  const scaleY = scale * at(f, STRETCH_Y);
  const centreX = WIDTH / 2 + driftX;

  // The measured position is what we see through the lens, so place the text where the lens will show it there.
  const seenY = top + (capHeight * scaleY) / 2;
  const ny = (seenY - LENS_CY) / LENS_RADIUS;
  const centreY = seenY + (p.lens / 2) * ((ny * ny * ny) / LENS_RANGE);
  const baseline = centreY + capHeight * 0.5;

  const base = at(f, BASE_BLUR) * p.softness;
  const blurX = base + speedX * p.motionBlur;
  const blurY = base + speedY * p.motionBlur;
  const swell = Math.min(1, at(f, SWELL) * p.swell);
  const contrast = mix(1, 2.4, swell);
  const threshold = mix(0, 0.12, swell);
  const soften = mix(0.6, 3, swell) * p.softness;
  const glowTightSize = mix(6, 24, swell);
  const glowWideSize = mix(48, 70, swell);
  const split = at(f, SPLIT) * p.rgbSplit;

  const colour = at(f, COLOUR);
  const [from, to, t] =
    colour < 0.5
      ? [PALETTE.blue, PALETTE.cyan, colour / 0.5]
      : [PALETTE.cyan, PALETTE.white, (colour - 0.5) / 0.5];
  const fromRgb = from.map(channels);
  const toRgb = to.map(channels);
  const colours = fromRgb.map((c, i) => c.map((v, ch) => mix(v, toRgb[i][ch], t)));

  const pose = blockPose(f);
  const glowSize = at(f, GLOW_SIZE);
  const glowOpacity = at(f, GLOW_OPACITY) * p.backgroundGlow;

  return (
    <AbsoluteFill style={{ background: "#000", isolation: "isolate" }}>
      <AbsoluteFill
        style={{
          opacity: Math.min(1, glowOpacity),
          background: `radial-gradient(${glowSize * 1.1}% ${glowSize}% at 50% 110%, #052a50 0%, #042244 40%, #010c19 72%, #000000 100%)`,
        }}
      />
      <svg
        width={outputWidth}
        height={outputHeight}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ position: "absolute", inset: 0, mixBlendMode: "screen", opacity: at(f, TEXT_OPACITY) }}
      >
        <defs>
          <filter
            id="glow-text"
            filterUnits="userSpaceOnUse"
            x={0}
            y={0}
            width={WIDTH}
            height={FILTER_HEIGHT}
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceAlpha" stdDeviation={`${blurX} ${blurY}`} result="blurred" />
            <feComponentTransfer in="blurred" result="swollen">
              <feFuncA type="linear" slope={contrast} intercept={-contrast * threshold} />
            </feComponentTransfer>
            <feImage href={map} x={0} y={0} width={WIDTH} height={FILTER_HEIGHT} preserveAspectRatio="none" result="map" />
            <feDisplacementMap in="swollen" in2="map" scale={p.lens} xChannelSelector="R" yChannelSelector="G" result="bent" />
            <feGaussianBlur in="bent" stdDeviation={soften} result="body" />

            <feGaussianBlur in="body" stdDeviation={glowTightSize} result="tight" />
            <feGaussianBlur in="body" stdDeviation={glowWideSize} result="wide" />
            <feComposite in="body" in2="tight" operator="arithmetic" k2={0.85} k3={p.glowTight} result="heat1" />
            <feComposite in="heat1" in2="wide" operator="arithmetic" k2={1} k3={p.glowWide} result="heat" />

            <feColorMatrix in="heat" values="0 0 0 1 0  0 0 0 1 0  0 0 0 1 0  0 0 0 0 1" result="grey" />
            <feComponentTransfer in="grey" result="coloured">
              <feFuncR type="table" tableValues={table(colours, 0)} />
              <feFuncG type="table" tableValues={table(colours, 1)} />
              <feFuncB type="table" tableValues={table(colours, 2)} />
            </feComponentTransfer>

            <feColorMatrix in="coloured" values={ONLY.r} result="r0" />
            <feColorMatrix in="coloured" values={ONLY.g} result="g" />
            <feColorMatrix in="coloured" values={ONLY.b} result="b0" />
            <feOffset in="r0" dx={split} result="r" />
            <feOffset in="b0" dx={-split} result="b" />
            <feBlend in="r" in2="g" mode="screen" result="rg" />
            <feBlend in="rg" in2="b" mode="screen" />
          </filter>
        </defs>
        <g filter="url(#glow-text)">
          <text
            x={centreX}
            y={baseline}
            textAnchor="middle"
            fontFamily={FONT_FAMILY}
            fontWeight={p.fontWeight}
            fontSize={p.fontSize}
            letterSpacing={p.fontSize * -0.015}
            fill="#fff"
            transform={`translate(${centreX} ${centreY}) scale(${scale} ${scaleY}) translate(${-centreX} ${-centreY})`}
          >
            {p.text}
          </text>
        </g>
      </svg>
      {pose ? (
        <div
          style={{
            position: "absolute",
            left: pose.x * FROM_CLIP * outputScale,
            top: pose.y * FROM_CLIP * outputScale,
            width: pose.w * FROM_CLIP * outputScale * p.blockSize,
            height: pose.h * FROM_CLIP * outputScale * p.blockSize,
            background: "#39a3fa",
          }}
        />
      ) : null}
      <AbsoluteFill
        style={{
          background: `linear-gradient(to bottom, rgba(243,244,249,${at(f, WHITEOUT_TOP)}), rgba(243,244,249,${at(f, WHITEOUT_BOTTOM)}))`,
        }}
      />
    </AbsoluteFill>
  );
};
