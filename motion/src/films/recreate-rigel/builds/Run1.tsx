/**
 * Rigel as Claude Code builds it in the video. With no extra props it is run 1: the Type
 * Staircase prompt pasted as is (src/films/recreate-rigel/prompt.md, copied from
 * sycamore.to/motion/type-staircase). The three follow-up messages each add a real change,
 * kept as optional props so every step of the conversation renders (runs.ts):
 *   accent    big rows in an accent colour (with a dark background in `colors`)
 *   entrance  "drop": words fall in from above, tipping into place on a bouncy spring, no blur
 *   tilt      the camera rolls a few degrees into each new row (alternating), on the same spring
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AbsoluteFill, CalculateMetadataFunction, continueRender, delayRender, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily, waitUntilDone } = loadFont("normal", { weights: ["600"] });

export type RigelProps = {
  rows: string[];
  colors: { background: string; backgroundEdge: string; text: string };
  accent?: string;
  entrance?: "rise" | "drop";
  tilt?: number;
};

export const rigelDefaultProps: RigelProps = {
  rows: ["Most people think", "you need", "talent to", "make content", "that actually works.", "But all you", "really need", "is a simple", "system"],
  colors: { background: "#ffffff", backgroundEdge: "#f1f2fb", text: "#0b0b10" },
};

const FIRST = 8;
const PER_WORD = 6;
const ROW_GAP = 10;
const HOLD = 80;
const ZOOM = 1.3;
const SIZES = [0.55, 1.7, 0.95, 1.7, 0.55, 0.95, 1.7, 0.55, 1.7];

/** The frame each word comes in, row by row. */
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

/** Length in frames for a set of rows. */
export const rigelDuration = (rows: string[]) => (wordStarts(rows).flat().pop() ?? FIRST) + HOLD;

export const calculateRigelMetadata: CalculateMetadataFunction<RigelProps> = ({ props }) => ({ durationInFrames: rigelDuration(props.rows) });

type Measured = { rowW: number[]; rowH: number[]; centers: number[][] };

export const Rigel: React.FC<RigelProps> = ({ rows, colors, accent, entrance = "rise", tilt = 0 }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const portrait = height > width;
  const starts = useMemo(() => wordStarts(rows), [rows]);

  // sizes: base 9% (16% portrait) of the width, shrunk so the widest row fits 85% at 1.3x
  const base0 = width * (portrait ? 0.16 : 0.09);
  const est = Math.max(...rows.map((r, i) => r.length * 0.53 * base0 * SIZES[i % SIZES.length]));
  const shrink = Math.min(1, (width * 0.85) / ZOOM / est);
  const sizeOf = (i: number) => base0 * shrink * SIZES[i % SIZES.length];

  // measure rows and word centres in the DOM once the font is in
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const wordRefs = useRef<(HTMLSpanElement | null)[][]>([]);
  const [m, setM] = useState<Measured | null>(null);
  const [handle] = useState(() => delayRender("measuring the staircase"));
  useEffect(() => {
    waitUntilDone().then(() => {
      const rowW = rowRefs.current.map((el) => el?.offsetWidth ?? 0);
      const rowH = rowRefs.current.map((el) => el?.offsetHeight ?? 0);
      const centers = wordRefs.current.map((ws) => ws.map((w) => (w ? w.offsetLeft + w.offsetWidth / 2 : 0)));
      setM({ rowW, rowH, centers });
      continueRender(handle);
    });
  }, [handle]);

  // the staircase: tops stack, each left edge is 80% along the row above
  const layout = useMemo(() => {
    if (!m) return null;
    const tops: number[] = [];
    const lefts: number[] = [];
    rows.forEach((_, i) => {
      tops.push(i === 0 ? 0 : tops[i - 1] + m.rowH[i - 1]);
      lefts.push(i === 0 ? 0 : lefts[i - 1] + m.rowW[i - 1] * 0.8);
    });
    return { tops, lefts };
  }, [m, rows]);

  // camera: a slightly underdamped spring stepped frame by frame toward the newest word
  const camera = useMemo(() => {
    if (!m || !layout) return null;
    const targets = starts.flatMap((ws, r) =>
      ws.map((at, w) => ({ at: at - 3, x: layout.lefts[r] + m.centers[r][w], y: layout.tops[r] + m.rowH[r] / 2, a: r % 2 ? tilt : -tilt })),
    );
    const total = (starts.flat().pop() ?? 0) + HOLD + 1;
    const w = 0.14;
    let x = targets[0].x;
    let y = targets[0].y;
    let vx = 0;
    let vy = 0;
    let a = 0;
    let va = 0;
    const path: { x: number; y: number; dx: number; dy: number; a: number }[] = [];
    for (let f = 0; f < total; f++) {
      const t = [...targets].reverse().find((tt) => tt.at <= f) ?? targets[0];
      vx += w * w * (t.x - x) - 2 * 0.8 * w * vx;
      vy += w * w * (t.y - y) - 2 * 0.8 * w * vy;
      va += w * w * (t.a - a) - 2 * 0.8 * w * va;
      x += vx;
      y += vy;
      a += va;
      path.push({ x, y, dx: vx, dy: vy, a });
    }
    return path;
  }, [m, layout, starts]);

  const cam = camera?.[Math.min(frame, camera.length - 1)] ?? { x: 0, y: 0, dx: 0, dy: 0, a: 0 };
  const blurId = "rigel-cam-blur";

  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at center, ${colors.background} 35%, ${colors.backgroundEdge} 100%)`, overflow: "hidden" }}>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id={blurId}>
          <feGaussianBlur stdDeviation={`${Math.abs(cam.dx) * 0.03} ${Math.abs(cam.dy) * 0.03}`} />
        </filter>
      </svg>
      <AbsoluteFill style={{ transform: `scale(${ZOOM}) rotate(${cam.a}deg)`, transformOrigin: "50% 50%" }}>
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
              style={{ position: "absolute", left: layout?.lefts[r] ?? 0, top: layout?.tops[r] ?? 0, fontSize: sizeOf(r), display: "flex", gap: "0.25em", color: accent && SIZES[r % SIZES.length] > 1.5 ? accent : undefined }}
            >
              {row.split(" ").map((word, w) => {
                const drop = entrance === "drop";
                const p = spring({ frame: frame - starts[r][w], fps, config: drop ? { damping: 6, mass: 0.7, stiffness: 170 } : { damping: 8, mass: 0.6, stiffness: 140 } });
                return (
                  <span
                    key={w}
                    ref={(el) => {
                      (wordRefs.current[r] ??= [])[w] = el;
                    }}
                    style={
                      drop
                        ? {
                            display: "inline-block",
                            transformOrigin: "50% 100%",
                            transform: `translateY(${(1 - p) * -1.1}em) rotate(${(1 - p) * -14}deg)`,
                            opacity: frame >= starts[r][w] ? Math.min(1, p * 4) : 0,
                          }
                        : {
                            display: "inline-block",
                            transform: `translateY(${(1 - p) * 0.5}em)`,
                            opacity: Math.min(1, p * 2),
                            filter: `blur(${(1 - Math.min(p, 1)) * 0.08}em)`,
                          }
                    }
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
