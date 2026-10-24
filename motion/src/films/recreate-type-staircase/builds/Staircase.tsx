/**
 * The Type Staircase component as Claude Code builds it in this video. With no extra props it is
 * run 1: the prompt copied from sycamore.to/motion/type-staircase (../prompt.md), pasted as is
 * (component name `Rigel`, as the prompt asks). The three follow-up messages each add a real
 * change, kept as optional props so every step of the conversation renders (runs.ts):
 *   entrance  "slide": each word glides in from the right on a smooth ease-out, no overshoot, no blur
 *   climb     the staircase climbs UP and to the right instead of stepping down (camera follows)
 *   smallText a second colour for the small rows (with new `colors` and the viewer's own rows)
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AbsoluteFill, CalculateMetadataFunction, Easing, continueRender, delayRender, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily, waitUntilDone } = loadFont("normal", { weights: ["600"] });

export type StaircaseProps = {
  rows: string[];
  colors: { background: string; backgroundEdge: string; text: string };
  entrance?: "rise" | "slide";
  climb?: boolean;
  smallText?: string;
};

export const staircaseDefaultProps: StaircaseProps = {
  rows: ["Most people think", "you need", "talent to", "make content", "that actually works.", "But all you", "really need", "is a simple", "system"],
  colors: { background: "#ffffff", backgroundEdge: "#f1f2fb", text: "#0b0b10" },
};

const FIRST = 8;
const PER_WORD = 6;
const ROW_GAP = 10;
const HOLD = 80;
const ZOOM = 1.3;
const SIZES = [0.55, 1.7, 0.95, 1.7, 0.55, 0.95, 1.7, 0.55, 1.7];
const SLIDE_FRAMES = 16;

const wordStarts = (rows: string[]) => {
  const out: number[][] = [];
  let f = FIRST;
  rows.forEach((row, r) => {
    if (r > 0) f += ROW_GAP;
    out.push(
      row.split(" ").map(() => {
        const at = f;
        f += PER_WORD;
        return at;
      }),
    );
  });
  return out;
};

export const staircaseDuration = (rows: string[]) => (wordStarts(rows).flat().pop() ?? FIRST) + HOLD;

export const calculateStaircaseMetadata: CalculateMetadataFunction<StaircaseProps> = ({ props }) => ({ durationInFrames: staircaseDuration(props.rows) });

type Measured = { rowW: number[]; rowH: number[]; centers: number[][] };

export const Staircase: React.FC<StaircaseProps> = ({ rows, colors, entrance = "rise", climb = false, smallText }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const portrait = height > width;
  const starts = useMemo(() => wordStarts(rows), [rows]);

  const base0 = width * (portrait ? 0.16 : 0.09);
  const est = Math.max(...rows.map((r, i) => r.length * 0.53 * base0 * SIZES[i % SIZES.length]));
  const shrink = Math.min(1, (width * 0.85) / ZOOM / est);
  const sizeOf = (i: number) => base0 * shrink * SIZES[i % SIZES.length];

  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const wordRefs = useRef<(HTMLSpanElement | null)[][]>([]);
  const [m, setM] = useState<Measured | null>(null);
  const [handle] = useState(() => delayRender("measuring the staircase"));
  useEffect(() => {
    waitUntilDone().then(() => {
      setM({
        rowW: rowRefs.current.map((el) => el?.offsetWidth ?? 0),
        rowH: rowRefs.current.map((el) => el?.offsetHeight ?? 0),
        centers: wordRefs.current.map((ws) => ws.map((w) => (w ? w.offsetLeft + w.offsetWidth / 2 : 0))),
      });
      continueRender(handle);
    });
  }, [handle]);

  // rows stack down (or up, with `climb`); each left edge is 80% along the row above
  const layout = useMemo(() => {
    if (!m) return null;
    const tops: number[] = [];
    const lefts: number[] = [];
    rows.forEach((_, i) => {
      tops.push(i === 0 ? 0 : climb ? tops[i - 1] - m.rowH[i] : tops[i - 1] + m.rowH[i - 1]);
      lefts.push(i === 0 ? 0 : lefts[i - 1] + m.rowW[i - 1] * 0.8);
    });
    return { tops, lefts };
  }, [m, rows, climb]);

  // camera: underdamped spring stepped frame by frame toward the newest word, 3 frames early
  const camera = useMemo(() => {
    if (!m || !layout) return null;
    const targets = starts.flatMap((ws, r) => ws.map((at, w) => ({ at: at - 3, x: layout.lefts[r] + m.centers[r][w], y: layout.tops[r] + m.rowH[r] / 2 })));
    const total = (starts.flat().pop() ?? 0) + HOLD + 1;
    const w = 0.14;
    let x = targets[0].x;
    let y = targets[0].y;
    let vx = 0;
    let vy = 0;
    const path: { x: number; y: number; dx: number; dy: number }[] = [];
    for (let f = 0; f < total; f++) {
      const t = [...targets].reverse().find((tt) => tt.at <= f) ?? targets[0];
      vx += w * w * (t.x - x) - 2 * 0.8 * w * vx;
      vy += w * w * (t.y - y) - 2 * 0.8 * w * vy;
      x += vx;
      y += vy;
      path.push({ x, y, dx: vx, dy: vy });
    }
    return path;
  }, [m, layout, starts]);

  const cam = camera?.[Math.min(frame, camera.length - 1)] ?? { x: 0, y: 0, dx: 0, dy: 0 };
  const blurId = "staircase-cam-blur";

  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at center, ${colors.background} 35%, ${colors.backgroundEdge} 100%)`, overflow: "hidden" }}>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id={blurId}>
          <feGaussianBlur stdDeviation={`${Math.abs(cam.dx) * 0.03} ${Math.abs(cam.dy) * 0.03}`} />
        </filter>
      </svg>
      <AbsoluteFill style={{ transform: `scale(${ZOOM})`, transformOrigin: "50% 50%" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transform: `translate(${width / 2 - cam.x}px, ${height / 2 - cam.y}px)`,
            filter: `url(#${blurId})`,
            fontFamily,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            lineHeight: 0.95,
            color: colors.text,
            whiteSpace: "nowrap",
          }}
        >
          {rows.map((row, r) => (
            <div
              key={r}
              ref={(el) => {
                rowRefs.current[r] = el;
              }}
              style={{
                position: "absolute",
                left: layout?.lefts[r] ?? 0,
                top: layout?.tops[r] ?? 0,
                fontSize: sizeOf(r),
                display: "flex",
                gap: "0.25em",
                color: smallText && SIZES[r % SIZES.length] < 0.6 ? smallText : undefined,
              }}
            >
              {row.split(" ").map((word, w) => {
                const at = starts[r][w];
                let style: React.CSSProperties;
                if (entrance === "slide") {
                  const p = interpolate(frame, [at, at + SLIDE_FRAMES], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });
                  style = { display: "inline-block", transform: `translateX(${(1 - p) * 1.4}em)`, opacity: Math.min(1, p * 3) };
                } else {
                  const p = spring({ frame: frame - at, fps, config: { damping: 8, mass: 0.6, stiffness: 140 } });
                  style = { display: "inline-block", transform: `translateY(${(1 - p) * 0.5}em)`, opacity: Math.min(1, p * 2), filter: `blur(${(1 - Math.min(p, 1)) * 0.08}em)` };
                }
                return (
                  <span
                    key={w}
                    ref={(el) => {
                      (wordRefs.current[r] ??= [])[w] = el;
                    }}
                    style={style}
                  >
                    {word}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
