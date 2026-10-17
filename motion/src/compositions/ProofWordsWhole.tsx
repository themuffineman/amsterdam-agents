/**
 * ProofWordsWhole: 9 s proof-of-pipeline film (1920x1080, 30 fps, 270 frames).
 *
 * PLAN (director.md worksheet, short form)
 * One true thing: in human-made motion, words arrive whole far more often than letter by
 *   letter (137 vs 34 of 507 decoded beats).
 * Data source (real, not invented): _reference/motionmaxxing/library/moments.jsonl, the 507
 *   "lib" beats from 39 human-made films, counted by tag. A beat can carry several tags, so
 *   shares are "% of beats" and don't sum to 100.
 * Shape: claim -> proof -> close. Rejected: held shot (one table can't carry 9 s of interest),
 *   montage (no real footage of the 39 films to show).
 * Clock: smooth 30. Grammar: crisp (no smear, no shutter blur).
 * World: act 1 light lit paper-ish ground, key light top-left, static grain; act 2 dark ground,
 *   same key direction. Flip by hard cut on upward motion.
 * Accent (one meaning): "the thing the film is about" (the word "whole", the per-word row).
 * Hero frame: ~f150. Camera snapped onto the "Per-word type" row at 3.8x, other rows dimmed,
 *   table cropped by the frame edges.
 *
 * Beats
 * A  0-72   hook  imp 2  "Words arrive whole." rises word by word; already moving at f0;
 *                        exits up on accelExit ending at the cut.
 * B  72-204 proof imp 3  ShareTable rises into frame mid-move (continues A's upward vector),
 *                        rows step in, share bars grow, cameraSnap 3.2x -> 3.8x onto the
 *                        per-word row, others dim; after a 24 f read a second push travels
 *                        down to the per-letter row (34); camera group exits up into the cut.
 * C  204-270 close imp 2 Dark ground; two lines rise (continuing the upward vector); the block
 *                        leans up into the last frame (ends mid-motion). 66 f = 24% of film.
 */
import React from "react";
import { AbsoluteFill, Sequence, interpolateColors, useCurrentFrame, useVideoConfig } from "remotion";
import { cameraSnap, enter, exit, staggerOnsets, tween } from "../lib/eases";
import { em, fontFamily, palette, tracking, weight } from "../lib/tokens";
import { ShareTable, defaultTheme, type UiTheme } from "../ui-kit";

export const PROOF_WORDS_WHOLE = { durationInFrames: 270 } as const;

const CUT_B = 72;
const CUT_C = 204;

// ---------------------------------------------------------------- shared world pieces

/** Static paper grain (fixed seed: identical every frame). */
const Grain: React.FC<{ opacity: number }> = ({ opacity }) => (
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

/** Light ground with a key light from the top-left that drifts slowly (the living thing). */
const LightGround: React.FC<{ frame: number }> = ({ frame }) => {
  const drift = frame * 0.04; // % per frame, linear (cruise)
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(110% 85% at ${14 + drift}% -12%, #FFFFFF 0%, rgba(255,255,255,0) 58%),
                     radial-gradient(90% 70% at 105% 115%, rgba(150,140,120,0.22) 0%, rgba(150,140,120,0) 60%),
                     ${palette.ground}`,
      }}
    >
      <Grain opacity={0.09} />
    </AbsoluteFill>
  );
};

const DarkGround: React.FC<{ frame: number }> = ({ frame }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(95% 80% at ${16 + frame * 0.05}% -15%, #34302B 0%, rgba(52,48,43,0) 60%),
                   ${palette.groundDark}`,
    }}
  >
    <Grain opacity={0.05} />
  </AbsoluteFill>
);

// ---------------------------------------------------------------- A: hook

const HookLine: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const size = em("headline", width, height);
  const words = ["Words", "arrive", "whole."];
  // First word starts 6 f before the film, so f0 is already mid-rise. Longer gap before
  // the stinger word.
  const onsets = staggerOnsets(words.length, -6, [6, 9]);
  const out = exit(frame, CUT_B - 13, { to: { y: -150 } }); // ends exactly on the cut
  const lineDrift = frame * -1.1;

  return (
    <AbsoluteFill>
      <LightGround frame={frame} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            gap: size * 0.26,
            marginTop: height * 0.06, // baseline near y 0.53
            transform: `translate(${lineDrift}px, ${out.y}px)`,
            fontFamily,
            fontSize: size,
            fontWeight: weight.headline,
            letterSpacing: tracking.headline,
            color: palette.ink,
          }}
        >
          {words.map((w, i) => {
            const stinger = i === words.length - 1;
            const e = enter(frame, onsets[i], {
              from: { y: height * (stinger ? 0.09 : 0.06), blur: 5 },
              frames: stinger ? 15 : 14,
              easing: stinger ? "snapSettle" : "softLand",
            });
            const color = stinger
              ? interpolateColors(frame, [onsets[i], onsets[i] + 7], [palette.accent, palette.ink])
              : palette.ink;
            return (
              <span
                key={w}
                style={{
                  display: "inline-block",
                  transform: `translateY(${e.y}px)`,
                  filter: `blur(${e.blur}px)`,
                  opacity: e.opacity,
                  visibility: e.visible ? "visible" : "hidden",
                  color,
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- B: proof

// Real counts: tags on the 507 decoded beats in motionmaxxing's moments library.
const TOTAL_BEATS = 507;
const TAGS: [string, number][] = [
  ["Centred layout", 381],
  ["Per-word type", 137],
  ["Camera push", 96],
  ["Camera pull", 54],
  ["Typing", 46],
  ["Morph", 40],
  ["Per-letter type", 34],
];
const HERO_ROW = 1;
const LETTER_ROW = 6;

const TABLE_W = 560;
const HEADER_H = 32;
const ROW_H = 36;
const TABLE_H = HEADER_H + ROW_H * TAGS.length;

// Neutral theme: the accent is spent only on the hero row, so badges/bars stay grey.
const proofTheme: UiTheme = {
  ...defaultTheme,
  shareTint: palette.ink,
  positive: palette.inkSoft,
  warning: palette.inkMuted,
};

const ProofTable: React.FC = () => {
  const frame = useCurrentFrame(); // local to the Sequence
  const { width, height } = useVideoConfig();
  const global = frame + CUT_B;

  // Camera: one group. Base 3.2x on the table centre; one-frame snap to 3.8x on the hero row.
  const SNAP_AT = 62;
  const BASE = 3.2;
  // 3.8x shows ~505 px of the 560 px table: name + count in frame, badge cropped by the edge.
  const PUSH = 3.8;
  const s = cameraSnap(frame, SNAP_AT, BASE, PUSH, { share: 0.6, tail: 15 });
  const k = (s - BASE) / (PUSH - BASE); // 0 -> 1 with the snap, so focus moves with scale
  const creep = 1 + Math.max(0, frame - SNAP_AT) * 0.0006; // slow push while holding
  const scale = s * creep;
  const rowCentre = (i: number) => HEADER_H + ROW_H * i + ROW_H / 2;
  // After a 24 f read on the hero row, a second, slower push travels down to the per-letter
  // row so both numbers the film is about are seen (lands before the exit starts).
  const PAN_AT = SNAP_AT + 24;
  const pan = tween(frame, PAN_AT, 20, 0, 1, "softLand");
  const focusX = TABLE_W / 2 + (238 - TABLE_W / 2) * k;
  const focusY =
    TABLE_H / 2 +
    (rowCentre(HERO_ROW) - TABLE_H / 2) * k +
    (rowCentre(LETTER_ROW) - rowCentre(HERO_ROW)) * pan;

  // Arrives already moving (started 3 f before the cut), continuing A's upward vector.
  const rise = tween(frame, -3, 14, 320, 0, "snapSettle");
  // Leaves upward, accelerating, ending on the cut into C.
  const leave = exit(frame, CUT_C - CUT_B - 13, { to: { y: -520 } });
  const driftX = Math.max(0, frame - SNAP_AT) * -0.5;

  const rowOnsets = staggerOnsets(TAGS.length, 2, [2, 2, 1, 2, 2, 2]);
  const shareScale = tween(frame, 14, 22, 0, 1, "softInOut");

  const rowStyle = (i: number): React.CSSProperties => {
    const e = enter(frame, rowOnsets[i], { from: { y: 14, blur: 0 }, frames: 10 });
    // Before the snap every row is ink. At the snap the hero row flashes the accent for 6 f
    // and settles to ink; the others dim. The per-letter row comes back to ink as the pan
    // lands on it.
    let color: string = palette.ink;
    if (i === HERO_ROW) {
      color = frame <= SNAP_AT ? palette.ink : interpolateColors(frame, [SNAP_AT + 1, SNAP_AT + 7], [palette.accent, palette.ink]);
    } else {
      const dim = tween(frame, SNAP_AT + 1, 6, 0, 1, "softInOut");
      const back = i === LETTER_ROW ? tween(frame, PAN_AT + 10, 8, 0, 1, "softInOut") : 0;
      color = interpolateColors(dim * (1 - back), [0, 1], [palette.ink, palette.connective]);
    }
    return {
      transform: `translateY(${e.y}px)`,
      visibility: e.visible ? "visible" : "hidden",
      color,
    };
  };

  const rows = TAGS.map(([name, n]) => ({
    cells: [name, String(n)],
    percentage: (n / TOTAL_BEATS) * 100,
  }));

  return (
    <AbsoluteFill>
      <LightGround frame={global} />
      {/* Camera group: the table and its contact shadow move as one object. */}
      <AbsoluteFill
        style={{
          transformOrigin: "0 0",
          transform: `translate(${width / 2 - focusX * scale + driftX}px, ${height / 2 - focusY * scale + rise + leave.y}px) scale(${scale})`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 12,
            top: TABLE_H - 6,
            width: TABLE_W - 24,
            height: 18,
            borderRadius: "50%",
            background: "rgba(60,50,40,0.18)",
            filter: "blur(10px)",
          }}
        />
        <ShareTable
          columns={[{ header: "Technique" }, { header: "Beats", width: 80, numeric: true }]}
          rows={rows}
          width={TABLE_W}
          badgeHeader="Share"
          shareScale={shareScale}
          rowStyle={rowStyle}
          theme={proofTheme}
          style={{ position: "absolute", left: 0, top: 0 }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- C: close

const CloseLines: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const big = em("headline", width, height) * 0.85;
  const small = em("phrase", width, height);

  const line1 = ["137", "beats", "bring", "words", "in", "whole."];
  const line2 = ["34", "build", "them", "letter", "by", "letter."];
  const on1 = staggerOnsets(line1.length, -4, [3, 3, 2, 4, 5]);
  const on2 = staggerOnsets(line2.length, 22, [3, 2, 3, 2, 3]);
  // Last frames: the block leans up, accelerating (ends mid-motion, never a held card).
  const lean = tween(frame, 58, 8, 0, -70, "crashOut");
  const drift = frame * -0.9;

  const word = (w: string, at: number, i: number, last: boolean, base: string, rise: number) => {
    const e = enter(frame, at, { from: { y: rise, blur: 4 }, frames: 13 });
    const color = last ? interpolateColors(frame, [at, at + 7], [palette.accent, base]) : base;
    return (
      <span
        key={`${w}-${i}`}
        style={{
          display: "inline-block",
          transform: `translateY(${e.y}px)`,
          filter: `blur(${e.blur}px)`,
          opacity: e.opacity,
          visibility: e.visible ? "visible" : "hidden",
          color,
        }}
      >
        {w}
      </span>
    );
  };

  return (
    <AbsoluteFill>
      <DarkGround frame={frame} />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          fontFamily,
          transform: `translate(${-width * 0.03 + drift}px, ${lean}px)`,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: big * 0.32 }}>
          <div
            style={{
              display: "flex",
              gap: big * 0.25,
              fontSize: big,
              fontWeight: weight.headline,
              letterSpacing: tracking.headline,
            }}
          >
            {line1.map((w, i) => word(w, on1[i], i, i === line1.length - 1, palette.inkOnDark, height * 0.07))}
          </div>
          <div
            style={{
              display: "flex",
              gap: small * 0.25,
              fontSize: small,
              fontWeight: weight.body,
              letterSpacing: tracking.phrase,
            }}
          >
            {line2.map((w, i) => word(w, on2[i], i, false, palette.connective, height * 0.04))}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- film

export const ProofWordsWhole: React.FC = () => (
  <AbsoluteFill style={{ background: palette.ground }}>
    <Sequence durationInFrames={CUT_B} name="A hook">
      <HookLine />
    </Sequence>
    <Sequence from={CUT_B} durationInFrames={CUT_C - CUT_B} name="B proof">
      <ProofTable />
    </Sequence>
    <Sequence from={CUT_C} name="C close">
      <CloseLines />
    </Sequence>
  </AbsoluteFill>
);
