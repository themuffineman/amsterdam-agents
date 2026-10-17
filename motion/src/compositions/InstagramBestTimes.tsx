/**
 * InstagramBestTimes: 26.7 s landscape test film (1920x1080, 30 fps, 802 frames).
 *
 * PLAN
 * One true thing: midweek wins and the small hours lose. Buffer's 9.6M-post study ranks
 *   Thu 9 a.m., Wed 12 p.m. and Wed 6 p.m. as the top three slots, and 1-5 a.m. as the worst
 *   window on every day.
 * Data (real, quoted, not invented): Buffer, "Best Time to Post on Instagram: Data from 9.6M
 *   Posts" (updated Sep 2026), https://buffer.com/resources/when-is-the-best-time-to-post-on-instagram/
 *   9.6M posts, 200,000+ accounts, Jan 2024 - Dec 2025, median engagement rate, local time.
 *   Per-day best + runner-up hours, top three overall, worst window 1-5 a.m., best day Wed,
 *   worst days Fri/Sat. Buffer publishes NO per-slot values, so the grid shows rankings as
 *   discrete levels (best / runner-up / worst), never invented magnitudes.
 * Shape: UI documentary of one object (the week grid), one continuous camera take, bracketed
 *   by a type hook and a dark close. Rejected: montage (no real footage), typographic essay
 *   (the grid is the proof; words alone would be a deck).
 * Clock smooth 30. Grammar crisp (no smear). One camera group per scene.
 * World: light lit ground + static grain for acts 1-2; dark ground for the close.
 * Accent (one meaning): "the answer": best slots, the rank chips, the stinger word.
 * Hero frame: ~f290. Pull-back landed: the whole week visible, dark 1-5 a.m. band down
 *   every row, best slots lit in accent, Thursday morning about to be pushed into.
 *
 * Beats
 * A    0-105  hook  imp 2  "Buffer studied 9.6 million Instagram posts." then hard-replaced by
 *                          "When did they do best?"; exits up into the cut.
 * B  105-562  proof imp 3  Grid card rises in mid-move at 3.4x on the night hours; cells cascade
 *                          in, 1-5 a.m. steps dark row by row, chip names it. Snap pull-back to
 *                          the whole week; best/runner-up slots light day by day. Push to
 *                          Thu 9 a.m. (#1), pan to Wed 12 p.m. (#2), Wed 6 p.m. (#3), pull back
 *                          to the three chips together; group exits up into the cut.
 * C  562-682  proof imp 2  Per-day table rises in at 3.2x; Wednesday flashes (best day), Friday
 *                          and Saturday dim (worst days); leans up into the cut.
 * D  682-802  close imp 2  Dark ground. "Post midweek. Skip 1 to 5 a.m." + source line; the
 *                           block leans up into the last frame. 120 f = 15% of the film.
 */
import React from "react";
import { AbsoluteFill, Sequence, interpolateColors, useCurrentFrame, useVideoConfig } from "remotion";
import { cameraSnap, enter, exit, staggerOnsets, tween } from "../lib/eases";
import { DarkGround, LightGround, WordLine } from "../lib/scene";
import { em, fontFamily, palette, tracking, weight } from "../lib/tokens";
import { ShareTable, SlotGrid, defaultTheme, slotGridGeometry, withAlpha, type SlotLevel, type UiTheme } from "../ui-kit";

export const INSTAGRAM_BEST_TIMES = { durationInFrames: 802 } as const;

const CUT_B = 105;
const CUT_C = 562;
const CUT_D = 682;

const theme: UiTheme = { ...defaultTheme, shareTint: palette.ink, positive: palette.inkSoft, warning: palette.inkMuted };

// ---------------------------------------------------------------- data (Buffer, see header)

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const BEST: Record<string, { best: number; then: number[] }> = {
  Mon: { best: 19, then: [18, 20] },
  Tue: { best: 19, then: [15, 17] },
  Wed: { best: 12, then: [18, 8] },
  Thu: { best: 9, then: [8, 7] },
  Fri: { best: 22, then: [21] },
  Sat: { best: 21, then: [22, 20] },
  Sun: { best: 21, then: [22, 20] },
};
const WORST_HOURS = [1, 2, 3, 4]; // "between 1 a.m. and 5 a.m. on any day"
const TOP3: { day: number; hour: number; text: string }[] = [
  { day: 3, hour: 9, text: "Thu 9 a.m." },
  { day: 2, hour: 12, text: "Wed 12 p.m." },
  { day: 2, hour: 18, text: "Wed 6 p.m." },
];

const levelOf = (day: string, hour: number): SlotLevel => {
  if (WORST_HOURS.includes(hour)) return "low";
  if (BEST[day].best === hour) return "best";
  if (BEST[day].then.includes(hour)) return "good";
  return "base";
};
const ROWS = DAYS.map((d) => ({ label: d, cells: Array.from({ length: 24 }, (_, h) => levelOf(d, h)) }));

const fmtHour = (h: number) => (h === 0 ? "12 a.m." : h < 12 ? `${h} a.m.` : h === 12 ? "12 p.m." : `${h - 12} p.m.`);

// ---------------------------------------------------------------- A: hook

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const size = em("headline", width, height) * 0.82;

  const l1 = ["Buffer", "studied", "9.6", "million", "Instagram", "posts."];
  const on1 = staggerOnsets(l1.length, -5, [4, 4, 3, 5, 4]);
  const out1 = staggerOnsets(l1.length, 56, [1]); // words leave 1 f apart
  const l2 = ["When", "did", "they", "do", "best?"];
  const on2 = staggerOnsets(l2.length, 60, [4, 3, 4, 7]);
  const leave = exit(frame, CUT_B - 13, { to: { y: -160 } });

  return (
    <AbsoluteFill>
      <LightGround frame={frame} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `translate(${frame * -1.0}px, ${height * 0.035 + leave.y}px)` }}>
        <div style={{ position: "absolute" }}>
          <WordLine frame={frame} words={l1} onsets={on1} exits={out1} size={size} weight={weight.headline} tracking={tracking.headline} color={palette.ink} rise={height * 0.05} />
        </div>
        <div style={{ position: "absolute" }}>
          <WordLine frame={frame} words={l2} onsets={on2} size={size} weight={weight.headline} tracking={tracking.headline} color={palette.ink} rise={height * 0.06} accent={[4]} entryEase="softLand" />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- B: the week grid

const GEO = slotGridGeometry();
const PAD = 24;
const HEADER_H = 64;
const GRID_X = PAD;
const GRID_Y = HEADER_H + 20;
const CARD_W = PAD * 2 + GEO.width(24);
const CARD_H = GRID_Y + GEO.height(7) + 34 + PAD;

/** Centre of a cell in card coordinates. */
const cellCentre = (row: number, col: number) => {
  const c = GEO.cell(row, col);
  return { x: GRID_X + c.x + c.w / 2, y: GRID_Y + c.y + c.h / 2 };
};

/** Callout pill to the right of a cell (card coordinates), entering on snapSettle. Right, not
 * above: rows are 8 px apart, so a chip above would hide real cells in the row above. */
const Chip: React.FC<{ frame: number; at: number; row: number; col: number; rank?: number; text: string; leaveAt?: number }> = ({ frame, at, row, col, rank, text, leaveAt }) => {
  const e = enter(frame, at, { from: { y: 10, blur: 0 }, frames: 10, easing: "snapSettle" });
  const x = leaveAt !== undefined ? exit(frame, leaveAt, { to: { y: -30 }, frames: 8 }) : null;
  if (!e.visible || (x && !x.visible)) return null;
  const c = cellCentre(row, col);
  const fresh = interpolateColors(frame, [at, at + 6], [palette.accent, palette.ink]);
  return (
    <div
      style={{
        position: "absolute",
        left: c.x + GEO.cellWidth / 2 + 6,
        top: c.y,
        transform: `translate(0, -50%) translate(${e.y * -0.6}px, ${x?.y ?? 0}px)`,
        opacity: e.opacity,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px 4px 8px",
        borderRadius: 999,
        background: fresh,
        color: palette.surface,
        fontFamily,
        fontSize: 13,
        fontWeight: 500,
        whiteSpace: "nowrap",
        fontVariantNumeric: "tabular-nums",
        boxShadow: "0 4px 10px rgba(30,25,20,0.12)",
      }}
    >
      {rank ? <span style={{ color: withAlpha(palette.surface, 0.6) }}>#{rank}</span> : null}
      {text}
    </div>
  );
};

const WeekGrid: React.FC = () => {
  const lf = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // ---- camera keyframes (scale + focus point in card coordinates)
  const WIDE = 1.95;
  const NIGHT = 3.4;
  const PUSH = 3.6;
  const night = cellCentre(1.5, 3);
  const centre = { x: CARD_W / 2, y: CARD_H / 2 };
  const TRIO = 3.2;
  const trio = { x: (cellCentre(2, 9).x + cellCentre(2, 18).x + 150) / 2, y: (cellCentre(2, 0).y + cellCentre(3, 0).y) / 2 };
  const chipShift = 60; // frame the cell and the chip to its right together
  const t = TOP3.map((p) => {
    const c = cellCentre(p.day, p.hour);
    return { x: c.x + chipShift, y: c.y };
  });

  const PULL1 = 125; // night -> wide
  const PUSH1 = 178; // wide -> #1 (wide shot ~1 s: it is texture, G1 allows only a short one)
  const PAN2 = 248; // #1 -> #2
  const PAN3 = 328; // #2 -> #3
  const PULL2 = 398; // #3 -> the three chips together (not the whole card: chips must stay readable)
  const EXIT = CUT_C - CUT_B - 13;

  let s: number;
  let fx: number;
  let fy: number;
  const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
  // One continuous creep while pushed in (#1 -> #3), so segments join without a pop.
  const pushed = (f: number) => PUSH * (1 + Math.max(0, f - PUSH1 - 15) * 0.0003);
  if (lf <= PULL1) {
    s = NIGHT * (1 + lf * 0.0004);
    fx = night.x + lf * 0.05;
    fy = night.y;
  } else if (lf <= PUSH1) {
    s = cameraSnap(lf, PULL1, NIGHT, WIDE, { share: 0.62, tail: 16 }) * (1 + (lf - PULL1) * 0.0003);
    const k = (NIGHT - Math.min(NIGHT, s)) / (NIGHT - WIDE);
    fx = lerp(night.x, centre.x, Math.min(1, k));
    fy = lerp(night.y, centre.y, Math.min(1, k));
  } else if (lf <= PAN2) {
    const base = WIDE * (1 + (PUSH1 - PULL1) * 0.0003);
    s = lf <= PUSH1 + 15 ? cameraSnap(lf, PUSH1, base, PUSH, { share: 0.6, tail: 14 }) : pushed(lf);
    const k = Math.min(1, (s - base) / (PUSH - base));
    fx = lerp(centre.x, t[0].x, k);
    fy = lerp(centre.y, t[0].y, k);
  } else if (lf <= PULL2) {
    s = pushed(lf);
    const a = tween(lf, PAN2, 13, 0, 1, "softInOut");
    const b = tween(lf, PAN3, 13, 0, 1, "softInOut");
    fx = lerp(lerp(t[0].x, t[1].x, a), t[2].x, b);
    fy = lerp(lerp(t[0].y, t[1].y, a), t[2].y, b);
  } else {
    const from = pushed(PULL2);
    s = cameraSnap(lf, PULL2, from, TRIO, { share: 0.6, tail: 16 }) * (1 + Math.max(0, lf - PULL2 - 16) * 0.0004);
    const k = Math.min(1, Math.max(0, (from - s) / (from - TRIO)));
    fx = lerp(t[2].x, trio.x, k);
    fy = lerp(t[2].y, trio.y, k);
  }

  const rise = tween(lf, -3, 14, 340, 0, "snapSettle"); // arrives already moving
  const leave = exit(lf, EXIT, { to: { y: -560 } });

  // ---- cell events
  const colOn = staggerOnsets(24, 1, [2, 1, 1, 2, 1, 1, 2, 1, 1, 1, 2, 1]);
  const lowOn = (row: number, col: number) => 34 + row * 3 + (col - 1) * 2; // dark band steps in
  const lightOn = (row: number) => PULL1 + 12 + row * 3; // answers light day by day

  const cellStyle = (row: number, col: number): React.CSSProperties => {
    const lvl = ROWS[row].cells[col];
    const on = colOn[col] + (row % 2); // tiny row offset so columns don't drop as a block
    const e = enter(lf, on, { from: { y: 0, scale: 0.55, blur: 0 }, frames: 6 });
    const baseColor = withAlpha(palette.inkMuted, 0.16);
    let bg: string | undefined;
    if (lvl === "low" && lf < lowOn(row, col)) bg = baseColor;
    if ((lvl === "best" || lvl === "good") && lf < lightOn(row)) bg = baseColor;
    if (lvl === "best" && lf >= lightOn(row) && lf < lightOn(row) + 5) bg = palette.accent;
    return {
      transform: `scaleY(${e.scale})`,
      visibility: e.visible ? "visible" : "hidden",
      ...(bg ? { background: bg } : {}),
    };
  };

  const header = enter(lf, 0, { from: { y: 12, blur: 0 }, frames: 12 });

  return (
    <AbsoluteFill>
      <LightGround frame={lf + CUT_B} />
      <AbsoluteFill
        style={{
          transformOrigin: "0 0",
          transform: `translate(${width / 2 - fx * s}px, ${height / 2 - fy * s + rise + leave.y}px) scale(${s})`,
        }}
      >
        {/* contact shadow */}
        <div style={{ position: "absolute", left: 20, top: CARD_H - 8, width: CARD_W - 40, height: 22, borderRadius: "50%", background: "rgba(60,50,40,0.16)", filter: "blur(12px)" }} />
        <div
          style={{
            position: "absolute",
            width: CARD_W,
            height: CARD_H,
            background: theme.surface,
            border: `1px solid ${theme.line}`,
            borderRadius: theme.radius + 2,
            fontFamily,
          }}
        >
          <div style={{ position: "absolute", left: PAD, top: 18, transform: `translateY(${header.y}px)` }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: theme.ink }}>When Instagram posts did best</div>
            <div style={{ marginTop: 3, fontSize: 12, color: theme.inkMuted }}>Median engagement rate, your local time</div>
          </div>
          <SlotGrid
            rows={ROWS}
            columnLabels={[0, 6, 12, 18].map((h) => [h, fmtHour(h)] as [number, string])}
            cellStyle={cellStyle}
            theme={theme}
            style={{ position: "absolute", left: GRID_X, top: GRID_Y }}
          />
          <Chip frame={lf} at={62} row={3} col={4} text="1–5 a.m. is the worst, every day" leaveAt={PULL1 - 8} />
          {TOP3.map((p, i) => (
            <Chip key={p.text} frame={lf} at={[PUSH1 + 12, PAN2 + 13, PAN3 + 13][i]} row={p.day} col={p.hour} rank={i + 1} text={p.text} />
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- C: per-day table

const DayTable: React.FC = () => {
  const lf = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const TABLE_W = 500;
  const TABLE_H = 32 + 36 * 7;
  const s = 3.2 * (1 + lf * 0.0004);
  const rise = tween(lf, -3, 14, 340, 0, "snapSettle");
  const lean = tween(lf, CUT_D - CUT_C - 10, 10, 0, -380, "crashOut");
  const rowOn = staggerOnsets(7, 2, [2, 2, 1, 2, 2, 2]);
  const WED = 2;
  const WORST = [4, 5];

  const rowStyle = (i: number): React.CSSProperties => {
    const e = enter(lf, rowOn[i], { from: { y: 14, blur: 0 }, frames: 10 });
    let color: string = palette.ink;
    if (i === WED && lf >= 40) color = interpolateColors(lf, [40, 47], [palette.accent, palette.ink]);
    if (WORST.includes(i)) color = interpolateColors(tween(lf, 62 + (i - 4) * 2, 6, 0, 1, "softInOut"), [0, 1], [palette.ink, palette.connective]);
    return { transform: `translateY(${e.y}px)`, visibility: e.visible ? "visible" : "hidden", color };
  };

  const rows = DAYS.map((d) => ({
    cells: [d === "Mon" ? "Monday" : d === "Tue" ? "Tuesday" : d === "Wed" ? "Wednesday" : d === "Thu" ? "Thursday" : d === "Fri" ? "Friday" : d === "Sat" ? "Saturday" : "Sunday", fmtHour(BEST[d].best), BEST[d].then.map(fmtHour).join(" or ")],
    percentage: 0,
  }));

  return (
    <AbsoluteFill>
      <LightGround frame={lf + CUT_C} />
      <AbsoluteFill
        style={{
          transformOrigin: "0 0",
          transform: `translate(${width / 2 - (TABLE_W / 2) * s + lf * -0.6}px, ${height / 2 - (TABLE_H / 2) * s + rise + lean}px) scale(${s})`,
        }}
      >
        <div style={{ position: "absolute", left: 12, top: TABLE_H - 6, width: TABLE_W - 24, height: 18, borderRadius: "50%", background: "rgba(60,50,40,0.16)", filter: "blur(10px)" }} />
        <ShareTable
          columns={[{ header: "Day", width: 140 }, { header: "Best", width: 110 }, { header: "Then" }]}
          rows={rows}
          width={TABLE_W}
          showBadge={false}
          rowStyle={rowStyle}
          theme={theme}
          style={{ position: "absolute" }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- D: close

const Close: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const big = em("headline", width, height) * 0.85;
  const small = Math.round(em("phrase", width, height) * 0.72); // ~0.043 H: readable source line
  const line = ["Post", "midweek.", "Skip", "1", "to", "5", "a.m."];
  const on = staggerOnsets(line.length, -4, [3, 9, 3, 2, 2, 3]);
  const src = ["Buffer,", "9.6M", "Instagram", "posts,", "Jan", "2024", "–", "Dec", "2025"];
  const onSrc = staggerOnsets(src.length, 34, [2, 2, 2, 3, 1, 2, 1, 1]);
  const lean = tween(frame, 104, 16, 0, -110, "crashOut");

  return (
    <AbsoluteFill>
      <DarkGround frame={frame} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `translate(${-width * 0.02 + frame * -0.9}px, ${lean}px)` }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: big * 0.42 }}>
          <WordLine frame={frame} words={line} onsets={on} size={big} weight={weight.headline} tracking={tracking.headline} color={palette.inkOnDark} rise={height * 0.07} accent={[1]} />
          <WordLine frame={frame} words={src} onsets={onSrc} size={small} weight={weight.body} tracking={tracking.ui} color={palette.connective} rise={height * 0.03} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- film

export const InstagramBestTimes: React.FC = () => (
  <AbsoluteFill style={{ background: palette.ground }}>
    <Sequence durationInFrames={CUT_B} name="A hook">
      <Hook />
    </Sequence>
    <Sequence from={CUT_B} durationInFrames={CUT_C - CUT_B} name="B week grid">
      <WeekGrid />
    </Sequence>
    <Sequence from={CUT_C} durationInFrames={CUT_D - CUT_C} name="C day table">
      <DayTable />
    </Sequence>
    <Sequence from={CUT_D} name="D close">
      <Close />
    </Sequence>
  </AbsoluteFill>
);
