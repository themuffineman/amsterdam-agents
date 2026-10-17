/**
 * ContentCalendar: voiced 1920x1080 explainer, "How to set up a content calendar that you stick
 * to". Length follows the voiceover (src/films/content-calendar/voice.json), ~1:18.
 *
 * PLAN
 * PAGE  P: creators plan an ambitious calendar (daily posts, every platform), miss a week, and
 *          the whole plan collapses.
 *       A: founders / solo creators / small-team marketers making Shorts, Reels, TikToks;
 *          watching a YouTube explainer with sound on, ~80 s.
 *       G: build the calendar on a weekly floor they can always hit, in a five-column sheet,
 *          filled in one sitting, with a bank of ready posts.
 *       E: the plan feels small enough to keep.
 * One true thing: Buffer scored 100,000+ accounts by how many WEEKS had a post, and the ones
 *   that posted in 20+ of 26 weeks got 5x+ the engagement per post; so the calendar's unit is
 *   the week, and its number is the floor you can hit in a bad week.
 * Data: src/films/content-calendar/data.ts (Buffer consistency study, Buffer TikTok frequency
 *   study, Later / Buffer / Hootsuite calendar guides, Jade Beason as a credited lead). The
 *   sheet rows and the 26-week dot pattern are an illustrative template, said so in data.ts.
 * Shape: UI documentary of one real task, building the calendar: one object that changes role
 *   at every seam (26-week grid -> one week -> the sheet -> the month -> the bank -> the weeks
 *   again). Rejected: typographic essay (the advice is a structure; words alone would be a
 *   deck); montage of real calendars (no real material we have rights to; invented screenshots
 *   are banned).
 * Length: 2486 f (82.9 s), beats from the voice: hook 492 / week 473 / template 495 /
 *   batch 441 / bank 313 / close 272.
 * Clock smooth 30, crisp grammar (blur only on word arrival). Type: Inter 400-520; sheet text
 *   18 px magnified by the camera (x2.3 = 41 px on the named column); claim pills 50 px.
 * Seams: every object rises in from below and leaves up into the cut (one direction, whole
 *   film), so each cut lands mid-motion; the carried thing is the week (see Carrier).
 * World: light lit ground (key top-left, grain), every object a lit card with a contact shadow;
 *   close on the dark ground. Sound: calm bed (allowlist #13), dry UI cues, one hit (subDrop on
 *   the "5x" value).
 * Importance: hook 3, week 2, template 3, batch 2, bank 2, close 1 (2 of 6 are 3s).
 * Accent #E0532F, ONE meaning: "covered": a week that has a post, a post that is ready.
 *   Signal colour: none.
 * Carrier: the week. Grid columns collapse into week bars (hook), one week opens into the day
 *   strip (week), its two posts become the sheet's two rows (template), the sheet grows to the
 *   month (batch), the bank fills an empty week (bank), the week bars return (bank, last shot).
 * Cursor: none.
 * Hero frame: 1504 (batch beat, local 44, 60% in): the month sheet at 1.36x, statuses flipping
 *   Idea -> Draft -> Ready in a diagonal cascade, the ready pills landing in the accent.
 *   Built first as a still.
 * Overshoot: none. Scale spent on: template push onto each named column, bank push.
 *
 * # | role  | imp | Buys: the viewer...                              | picture (text covered)                 | moves / into next
 * 1 | hook  | 3   | learns consistency was measured in weeks with a  | 26x7 day grid, columns collapse into   | bars shrink to a row; second row
 *   |       |     | post, and that 20+ weeks went with 5x+ per post  | week bars, a second short row below    | arrives; card exits up
 * 2 | turn  | 2   | knows to set the number at a weekly floor (2/wk) | a 7-day strip, two Shorts tiles drop,  | ghosts dim on "bottom of that
 *   |       |     |                                                  | three ghost tiles show the range       | range"; exits up
 * 3 | proof | 3   | sees the template: one row per post, 5 columns   | the sheet, camera pans column by       | pulls wide; pillar menu; status
 *   |       |     | + status                                         | column as each is named                | column steps idea/draft/ready
 * 4 | proof | 2   | sees a month filled in one sitting               | rows cascade to 8, statuses flip       | weeks 2-4 dim on "one week"
 * 5 | proof | 2   | knows a bank covers the bad week, breaks are ok  | bank row slides into an emptied week;  | cut to the week bars, 5 gaps
 * 6 | close | 1   | leaves with the rule                             | dark ground, one line on the voice     | leans out on the last frames
 */
import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolateColors, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { cameraSnap, enter, exit, staggerOnsets, tween } from "../lib/eases";
import { DarkGround, LightGround, MAX_CREEP, WordLine, drift } from "../lib/scene";
import { Sfx } from "../lib/sfx";
import { MusicBed } from "../lib/music";
import music from "../films/content-calendar/music.json";
import { em, fontFamily, palette, tracking, weight } from "../lib/tokens";
import { withAlpha } from "../ui-kit";
import { BANK, BUFFER, CADENCE, COLUMNS, DAYS, FLOOR_DAYS, GHOST_DAYS, LOW_WEEKS, OFF_WEEKS, PILLARS, PLANNING, POSTS, ROWS, type Row, type Status } from "../films/content-calendar/data";
import { BEATS, TOTAL_FRAMES, wordOnsets, type BeatT, type SegT } from "../films/content-calendar/timeline";

export const CONTENT_CALENDAR = { durationInFrames: TOTAL_FRAMES } as const;

/** The film's one accent: "covered" (a week with a post, a post that's ready). */
const ACCENT = "#E0532F";
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// ---------------------------------------------------------------- camera (same model as BestTimes)

interface Shot {
  at: number;
  s: number;
  x: number;
  y: number;
}
const CREEP = 0.0005;

const camera = (lf: number, shots: Shot[]): { s: number; x: number; y: number } => {
  let i = shots.length - 1;
  while (i > 0 && shots[i].at > lf) i--;
  const sh = shots[i];
  if (i === 0) return { s: sh.s * (1 + Math.min(MAX_CREEP, Math.max(0, lf - sh.at) * CREEP)), x: sh.x, y: sh.y };
  const from = camera(sh.at - 1, shots.slice(0, i));
  let k: number;
  let s: number;
  if (Math.abs(sh.s - from.s) > 0.25) {
    s = cameraSnap(lf, sh.at, from.s, sh.s, { share: 0.6, tail: 15 });
    k = (s - from.s) / (sh.s - from.s);
  } else {
    k = tween(lf, sh.at, 14, 0, 1, "softInOut");
    s = lerp(from.s, sh.s, k);
  }
  return { s: s * (1 + Math.min(MAX_CREEP, Math.max(0, lf - sh.at - 15) * CREEP)), x: lerp(from.x, sh.x, k), y: lerp(from.y, sh.y, k) };
};

const CameraGroup: React.FC<{ s: number; x: number; y: number; dx?: number; dy?: number; bounds?: { w: number; h: number }; children: React.ReactNode }> = ({
  s,
  x: rawX,
  y: rawY,
  dx = 0,
  dy = 0,
  bounds,
  children,
}) => {
  const { width, height } = useVideoConfig();
  const clampAxis = (v: number, view: number, size: number) => (view >= size ? size / 2 : Math.min(size - view / 2, Math.max(view / 2, v)));
  const x = bounds ? clampAxis(rawX, width / s, bounds.w) : rawX;
  const y = bounds ? clampAxis(rawY, height / s, bounds.h) : rawY;
  return (
    <AbsoluteFill style={{ transformOrigin: "0 0", transform: `translate(${width / 2 - x * s + dx}px, ${height / 2 - y * s + dy}px) scale(${s})` }}>
      {children}
    </AbsoluteFill>
  );
};

const ContactShadow: React.FC<{ w: number; top: number; left?: number }> = ({ w, top, left = 0 }) => (
  <div style={{ position: "absolute", left: left + 20, top, width: w - 40, height: 22, borderRadius: "50%", background: "rgba(60,50,40,0.16)", filter: "blur(12px)" }} />
);

/** Every beat rises in on its first frames and leaves up into the cut (one direction, whole film). */
const riseAndLeave = (lf: number, frames: number, rise = 340, away = -560) =>
  tween(lf, -3, 14, rise, 0, "snapSettle") + exit(lf, frames - 13, { to: { y: away } }).y;

const markAt = (seg: SegT, key: string, relativeTo: number) => {
  const m = seg.marks[key];
  if (m === undefined) throw new Error(`segment ${seg.id} has no mark {${key}}`);
  return m - relativeTo;
};

/** Spoken onset of the n-th word starting with `prefix`. */
const wordAt = (seg: SegT, relativeTo: number, prefix: string, n = 0) => {
  const hits = wordOnsets(seg, relativeTo).filter((w) => w.word.toLowerCase().startsWith(prefix));
  const hit = n < 0 ? hits[hits.length + n] : hits[n];
  if (!hit) throw new Error(`no word "${prefix}" in ${seg.id}`);
  return hit.at;
};

/** Claim pill: text + source, arriving on snapSettle, optional exit. Screen-fixed, under the object. */
const Chip: React.FC<{ lf: number; at: number; text: string; source?: string; leaveAt?: number; y?: number }> = ({ lf, at, text, source, leaveAt, y = 0.8 }) => {
  const { height } = useVideoConfig();
  const e = enter(lf, at, { from: { y: 26, blur: 0 }, frames: 11, easing: "snapSettle" });
  const x = leaveAt !== undefined ? exit(lf, leaveAt, { to: { y: -40 }, frames: 8 }) : null;
  if (!e.visible || (x && !x.visible)) return null;
  const fs = Math.round(height * 0.046);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: height * y - fs * 0.9 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: fs * 0.45,
          padding: `${fs * 0.28}px ${fs * 0.6}px`,
          borderRadius: 999,
          background: interpolateColors(lf, [at, at + 7], [ACCENT, palette.ink]),
          color: palette.surface,
          fontFamily,
          fontSize: fs,
          fontWeight: 480,
          letterSpacing: "-0.015em",
          whiteSpace: "nowrap",
          transform: `translateY(${e.y + (x?.y ?? 0)}px)`,
          opacity: e.opacity,
          boxShadow: "0 10px 24px rgba(30,25,20,0.16)",
        }}
      >
        {text}
        {source ? <span style={{ fontSize: fs * 0.62, color: withAlpha(palette.surface, 0.62), fontWeight: 420 }}>{source}</span> : null}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- hook: 26 weeks of days -> week bars

const G = { cell: 22, gap: 6, pad: 36, header: 96 };
const PITCH = G.cell + G.gap;
const GRID_W = BUFFER.weeks * PITCH - G.gap;
const GRID_H = 7 * PITCH - G.gap;
const HC_W = GRID_W + G.pad * 2;
const weekX = (w: number) => G.pad + w * PITCH;
const ROW_BAR_H = 60;
/** Second-act layout: label line, bar row, gap, label line, bar row. */
const ROW1_LABEL = G.header - 6;
const ROW1_BARS = ROW1_LABEL + 50;
const ROW2_LABEL = ROW1_BARS + ROW_BAR_H + 34;
const ROW2_BARS = ROW2_LABEL + 50;
const HC_H1 = G.header + GRID_H + G.pad;
const HC_H2 = ROW2_BARS + ROW_BAR_H + G.pad;

const litWeeks = new Set(POSTS.map((p) => p.week));
/** palette.inkMuted at 16% (rgba, so interpolateColors can read it). */
const pale = "rgba(126,130,131,0.16)";

/** Week bars (collapsed). Shared by the hook and the bank's last shot. */
const WeekBars: React.FC<{ lf: number; top: number; h: number; lit: (w: number) => number | null; colOn?: number[] }> = ({ lf, top, h, lit, colOn }) => (
  <>
    {Array.from({ length: BUFFER.weeks }, (_, w) => {
      const on = colOn ? colOn[w] : -99;
      const e = enter(lf, on, { from: { y: 0, scale: 0.5, blur: 0 }, frames: 6 });
      const at = lit(w);
      const bg = at === null || lf < at ? pale : interpolateColors(lf, [at, at + 7], [ACCENT, palette.ink]);
      return (
        <div
          key={w}
          style={{
            position: "absolute",
            left: weekX(w),
            top,
            width: G.cell,
            height: h,
            borderRadius: 5,
            background: bg,
            transform: `scaleY(${e.scale})`,
            visibility: e.visible ? "visible" : "hidden",
          }}
        />
      );
    })}
  </>
);

const Hook: React.FC<{ b: BeatT }> = ({ b }) => {
  const lf = useCurrentFrame();
  const [s1, s2] = b.segs;
  const w1 = markAt(s1, "w1", b.from);
  const w2 = markAt(s1, "w2", b.from);
  const w3 = markAt(s2, "w3", b.from);
  const w4 = markAt(s2, "w4", b.from);
  const w5 = markAt(s2, "w5", b.from);
  const reflow = s2.from - b.from - 10;

  // Columns build left to right as the camera travels along them, already moving at frame 0.
  const colOn = staggerOnsets(BUFFER.weeks, -8, [3, 2, 3, 2, 2, 3, 2, 2]);
  // Weeks collapse into bars left to right on "at least one post"; lit ones count up.
  const collapseOn = staggerOnsets(BUFFER.weeks, w2 - 2, [2, 1, 1, 2, 1, 1, 2, 1, 1, 1, 2, 1]);
  const k = (w: number) => tween(lf, collapseOn[w], 9, 0, 1, "softLand");
  const lowOn = staggerOnsets(BUFFER.weeks, w5 - 10, [1, 1, 2, 1, 1, 1, 2]);

  // Bar-row reflow before hook2: bars shrink from the 7-day height to a row under a label.
  const r = tween(lf, reflow, 13, 0, 1, "softLand");
  const barsTop = lerp(G.header, ROW1_BARS, r);
  const barsH = lerp(GRID_H, ROW_BAR_H, r);
  const cardH = lerp(HC_H1, HC_H2, tween(lf, w5 - 14, 12, 0, 1, "softLand"));

  const count = Array.from({ length: BUFFER.weeks }, (_, w) => w).filter((w) => litWeeks.has(w) && lf >= collapseOn[w] + 4).length;
  const counterOut = exit(lf, reflow - 4, { to: { y: -30 }, frames: 8 });

  const shots: Shot[] = [
    { at: 0, s: 2.7, x: 560, y: G.header + GRID_H / 2 - 30 },
    { at: 30, s: 2.6, x: 372, y: G.header + GRID_H / 2 - 30 },
    { at: w1 - 4, s: 1.95, x: HC_W / 2, y: HC_H1 / 2 },
    { at: reflow, s: 2.0, x: HC_W / 2, y: ROW1_BARS + 10 },
    { at: w5 - 14, s: 1.85, x: HC_W / 2, y: HC_H2 / 2 },
  ];
  const cam = camera(lf, shots);
  const leave = riseAndLeave(lf, b.frames);

  const label = (text: string, value: string | null, y: number, at: number, valueAt: number, strong: boolean) => {
    const e = enter(lf, at, { from: { y: 14, blur: 3 }, frames: 12 });
    const v = enter(lf, valueAt, { from: { x: 24, y: 0, blur: 0 }, frames: 11, easing: "snapSettle" });
    if (!e.visible) return null;
    return (
      <>
        <div style={{ position: "absolute", left: G.pad, top: y, transform: `translateY(${e.y}px)`, filter: `blur(${e.blur}px)`, opacity: e.opacity, fontSize: 25, fontWeight: 460, color: palette.ink, letterSpacing: "-0.015em", whiteSpace: "nowrap" }}>
          {text}
        </div>
        {value && v.visible ? (
          <div
            style={{
              position: "absolute",
              right: G.pad,
              top: y - 6,
              transform: `translateX(${v.x}px)`,
              opacity: v.opacity,
              display: "flex",
              alignItems: "baseline",
              gap: 10,
              whiteSpace: "nowrap",
              letterSpacing: "-0.02em",
            }}
          >
            <span style={{ fontSize: strong ? 36 : 25, fontWeight: strong ? 520 : 420, color: strong ? interpolateColors(lf, [valueAt, valueAt + 7], [ACCENT, palette.ink]) : palette.inkMuted }}>{value}</span>
            {strong ? <span style={{ fontSize: 19, color: palette.inkMuted }}>{BUFFER.ratioNote}</span> : null}
          </div>
        ) : null}
      </>
    );
  };

  return (
    <AbsoluteFill>
      <Sfx name="wooshA" at={0} gain={0.7} />
      <Sfx name="wooshC" at={w1 - 4} gain={0.7} />
      {collapseOn.filter((_, w) => litWeeks.has(w)).filter((_, i) => i % 3 === 0).map((at, i) => (
        <Sfx key={i} name="tick" at={at + 4} gain={0.6} />
      ))}
      <Sfx name="press" at={w3} gain={0.7} />
      <Sfx name="subDrop" at={w4} maxFrames={75} />
      <Sfx name="popC" at={w5} />
      <LightGround frame={lf + b.from} />
      <CameraGroup s={cam.s} x={cam.x} y={cam.y} dx={drift(lf, b.frames, -30)} dy={leave}>
        <ContactShadow w={HC_W} top={cardH - 8} />
        <div style={{ position: "absolute", width: HC_W, height: cardH, background: palette.surface, border: `1px solid ${palette.line}`, borderRadius: 14, fontFamily }}>
          <div style={{ position: "absolute", left: G.pad, top: 26, fontSize: 15, color: palette.inkMuted }}>{BUFFER.sample}</div>
          {/* Weeks-with-a-post counter: steps one week at a time as the bars light. */}
          {counterOut.visible && lf >= w2 - 2 ? (
            <div style={{ position: "absolute", right: G.pad, top: 14, display: "flex", alignItems: "baseline", gap: 10, transform: `translateY(${counterOut.y}px)`, whiteSpace: "nowrap" }}>
              <span style={{ fontSize: 17, color: palette.inkMuted }}>weeks with a post</span>
              <span style={{ fontSize: 40, fontWeight: 500, color: palette.ink, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>{count}</span>
            </div>
          ) : null}
          {/* Day grid -> week bars. */}
          {Array.from({ length: BUFFER.weeks }, (_, w) => {
            const kk = k(w);
            if (kk >= 1) return null;
            const e = enter(lf, colOn[w], { from: { y: -30, blur: 0 }, frames: 8 });
            if (!e.visible) return null;
            const gap = G.gap * (1 - kk);
            const cellH = (GRID_H - gap * 6) / 7;
            return (
              <div key={w} style={{ position: "absolute", left: weekX(w), top: G.header, transform: `translateY(${e.y}px)` }}>
                {DAYS.map((_, d) => {
                  const post = POSTS.some((p) => p.week === w && p.day === d);
                  const toBar = litWeeks.has(w) ? ACCENT : pale;
                  const base = post ? palette.inkSoft : pale;
                  return (
                    <div
                      key={d}
                      style={{
                        position: "absolute",
                        left: 0,
                        top: d * (cellH + gap),
                        width: G.cell,
                        height: cellH + 0.5,
                        borderRadius: lerp(5, 0, kk),
                        background: kk > 0 ? interpolateColors(kk, [0, 1], [base, toBar]) : base,
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
          <WeekBars lf={lf} top={barsTop} h={barsH} lit={(w) => (litWeeks.has(w) ? collapseOn[w] + 9 : null)} colOn={collapseOn.map((c) => c + 9)} />
          {label(BUFFER.topLabel, BUFFER.ratio, ROW1_LABEL, w3 - 2, w4, true)}
          {lf >= w5 - 10 ? (
            <>
              {label(BUFFER.lowLabel, null, ROW2_LABEL, w5 - 4, w5, false)}
              <WeekBars lf={lf} top={ROW2_BARS} h={ROW_BAR_H} lit={(w) => (LOW_WEEKS.includes(w) ? w5 + 4 : null)} colOn={lowOn} />
            </>
          ) : null}
        </div>
      </CameraGroup>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- week: the floor

const WK = { day: 150, gap: 12, pad: 30, head: 64, tileW: 92, tileH: 164 };
const WK_W = WK.pad * 2 + 7 * WK.day + 6 * WK.gap;
const WK_COL_H = WK.head + WK.tileH + 36;
const WK_H = WK_COL_H + WK.pad;
const dayX = (d: number) => WK.pad + d * (WK.day + WK.gap);

/** A vertical Short: dark 9:16 tile with a play mark. `ghost` = dashed outline only. */
const ShortTile: React.FC<{ x: number; y: number; ghost?: boolean; ring?: number; style?: React.CSSProperties }> = ({ x, y, ghost, ring = 0, style }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: WK.tileW,
      height: WK.tileH,
      borderRadius: 10,
      ...(ghost
        ? { border: `2px dashed ${withAlpha(palette.ink, 0.35)}` }
        : {
            background: "linear-gradient(165deg, #4A4844 0%, #2A2927 55%, #1F1E1C 100%)",
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 16px rgba(30,25,20,0.16)${ring > 0 ? `, 0 0 0 ${3 * ring}px ${withAlpha(ACCENT, ring)}` : ""}`,
          }),
      ...style,
    }}
  >
    {ghost ? null : (
      <div
        style={{
          position: "absolute",
          left: WK.tileW / 2 - 7,
          top: WK.tileH / 2 - 11,
          width: 0,
          height: 0,
          borderTop: "11px solid transparent",
          borderBottom: "11px solid transparent",
          borderLeft: `18px solid ${withAlpha("#FFFFFF", 0.6)}`,
        }}
      />
    )}
  </div>
);

const Week: React.FC<{ b: BeatT }> = ({ b }) => {
  const lf = useCurrentFrame();
  const [s1, s2] = b.segs;
  const k1 = markAt(s1, "k1", b.from);
  const c1 = markAt(s2, "c1", b.from);
  const c2 = markAt(s2, "c2", b.from);
  const floorOn = [k1 + 4, k1 + 13];
  const ghostOn = staggerOnsets(GHOST_DAYS.length, c1 - 2, [3, 2]);
  const dayOn = staggerOnsets(7, 2, [2, 2, 3, 2, 2, 3]);
  const shots: Shot[] = [
    { at: 0, s: 1.62, x: WK_W / 2, y: WK_H / 2 + 10 },
    { at: c1 - 6, s: 1.55, x: WK_W / 2, y: WK_H / 2 + 80 },
  ];
  const cam = camera(lf, shots);
  const tileY = WK.head + 18;
  const tileX = (d: number) => dayX(d) + (WK.day - WK.tileW) / 2;
  return (
    <AbsoluteFill>
      <Sfx name="wooshB" at={0} />
      {floorOn.map((at, i) => (
        <Sfx key={i} name={i ? "popB" : "popA"} at={at} />
      ))}
      <Sfx name="press" at={c1} gain={0.7} />
      {ghostOn.map((at, i) => (
        <Sfx key={`g${i}`} name="tick" at={at} gain={0.6} />
      ))}
      <Sfx name="popC" at={c2} />
      <LightGround frame={lf + b.from} />
      <CameraGroup s={cam.s} x={cam.x} y={cam.y} dx={drift(lf, b.frames, -30)} dy={riseAndLeave(lf, b.frames)}>
        <ContactShadow w={WK_W} top={WK_H - 8} />
        <div style={{ position: "absolute", width: WK_W, height: WK_H, background: palette.surface, border: `1px solid ${palette.line}`, borderRadius: 14, fontFamily }}>
          {DAYS.map((d, i) => {
            const e = enter(lf, dayOn[i], { from: { y: 16, blur: 0 }, frames: 10 });
            return (
              <div key={d} style={{ position: "absolute", left: dayX(i), top: WK.pad - 6, width: WK.day, height: WK_COL_H - WK.pad + 6, borderRadius: 10, background: palette.surfaceSunken, transform: `translateY(${e.y}px)`, visibility: e.visible ? "visible" : "hidden" }}>
                <div style={{ position: "absolute", left: 0, right: 0, top: 10, textAlign: "center", fontSize: 24, fontWeight: 460, color: palette.inkSoft, letterSpacing: "-0.01em" }}>{d}</div>
              </div>
            );
          })}
          {GHOST_DAYS.map((d, i) => {
            const e = enter(lf, ghostOn[i], { from: { y: -40, blur: 0 }, frames: 10 });
            if (!e.visible) return null;
            const dim = tween(lf, c2, 8, 1, 0.25, "softInOut");
            return <ShortTile key={d} ghost x={tileX(d)} y={tileY} style={{ transform: `translateY(${e.y}px) scale(${tween(lf, c2, 8, 1, 0.92, "softInOut")})`, opacity: Math.min(e.opacity, dim) }} />;
          })}
          {FLOOR_DAYS.map((d, i) => {
            const e = enter(lf, floorOn[i], { from: { y: -90, blur: 0 }, frames: 11, easing: "whip" });
            if (!e.visible) return null;
            const ring = lf >= c2 ? tween(lf, c2, 6, 0, 1, "softLand") * tween(lf, c2 + 18, 10, 1, 0.0, "softInOut") : tween(lf, floorOn[i], 8, 1, 0, "softInOut");
            return <ShortTile key={d} x={tileX(d)} y={tileY} ring={ring} style={{ transform: `translateY(${e.y}px)` }} />;
          })}
        </div>
      </CameraGroup>
      <Chip lf={lf} at={c1} text={CADENCE.range} source={CADENCE.source} y={0.82} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- the sheet

const SH = { head: 50, row: 56, pad: 22, fs: 18 };
const colX: number[] = COLUMNS.reduce<number[]>((xs, c, i) => [...xs, i === 0 ? 0 : xs[i - 1] + COLUMNS[i - 1].w], []);
const SHEET_W = colX[colX.length - 1] + COLUMNS[COLUMNS.length - 1].w;
const sheetH = (rows: number) => SH.head + rows * SH.row;
const rowY = (i: number) => SH.head + i * SH.row;
const colCx = (key: string) => {
  const i = COLUMNS.findIndex((c) => c.key === key);
  return colX[i] + COLUMNS[i].w / 2;
};

const StatusPill: React.FC<{ status: Status | null; at?: number; lf: number }> = ({ status, at = -99, lf }) => {
  if (!status) return null;
  const ready = status === "Ready";
  const bg = ready ? ACCENT : status === "Draft" ? withAlpha(palette.ink, 0.12) : "transparent";
  const s = tween(lf, at, 6, 0.86, 1, "softLand");
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 12px",
        borderRadius: 999,
        background: bg,
        border: status === "Idea" ? `1.5px solid ${withAlpha(palette.ink, 0.28)}` : "1.5px solid transparent",
        color: ready ? palette.surface : palette.inkSoft,
        fontSize: SH.fs - 2,
        fontWeight: 480,
        transform: `scale(${s})`,
      }}
    >
      {status}
    </span>
  );
};

interface SheetProps {
  lf: number;
  rows: Row[];
  /** Frame each column appears (header + cells); undefined = from the start. */
  colOn?: Partial<Record<string, number>>;
  /** Frame a column's header flashes the accent when it's named (column already on screen). */
  pulse?: Partial<Record<string, number>>;
  /** Frame each row appears. */
  rowOn?: (i: number) => number;
  /** Status shown in row i (null = blank) and the frame it last changed. */
  status?: (i: number) => { s: Status | null; at: number };
  rowStyle?: (i: number) => React.CSSProperties;
  /** Cell text override (e.g. cleared cells). */
  cell?: (i: number, key: string) => string | null | undefined;
  height?: number;
  children?: React.ReactNode;
}

const Sheet: React.FC<SheetProps> = ({ lf, rows, colOn = {}, pulse = {}, rowOn = () => -99, status, rowStyle, cell, height, children }) => {
  const h = height ?? sheetH(rows.length);
  return (
    <>
      <ContactShadow w={SHEET_W} top={h - 8} />
      <div style={{ position: "absolute", width: SHEET_W, height: h, background: palette.surface, border: `1px solid ${palette.line}`, borderRadius: 12, overflow: "hidden", fontFamily }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: SH.head, background: palette.surfaceSunken, borderBottom: `1px solid ${palette.line}` }} />
        {COLUMNS.map((c, ci) => {
          const on0 = colOn[c.key] ?? -99;
          const e = enter(lf, on0, { from: { y: 12, blur: 3 }, frames: 12 });
          if (!e.visible) return null;
          const p = pulse[c.key];
          const on = p !== undefined && lf >= p ? p : on0;
          return (
            <React.Fragment key={c.key}>
              {ci > 0 ? <div style={{ position: "absolute", left: colX[ci], top: 0, width: 1, height: h, background: palette.line, opacity: e.opacity }} /> : null}
              <div
                style={{
                  position: "absolute",
                  left: colX[ci] + SH.pad,
                  top: 14,
                  fontSize: SH.fs - 1,
                  fontWeight: 500,
                  color: lf < on + 8 ? interpolateColors(lf, [on, on + 7], [ACCENT, palette.inkMuted]) : palette.inkMuted,
                  transform: `translateY(${e.y}px)`,
                  filter: `blur(${e.blur}px)`,
                  whiteSpace: "nowrap",
                }}
              >
                {c.header}
              </div>
            </React.Fragment>
          );
        })}
        {rows.map((r, i) => {
          const ro = rowOn(i);
          const re = enter(lf, ro, { from: { y: 18, blur: 0 }, frames: 10 });
          if (!re.visible) return null;
          return (
            <div key={i} style={{ position: "absolute", left: 0, top: rowY(i), width: SHEET_W, height: SH.row, borderBottom: `1px solid ${palette.line}`, transform: `translateY(${re.y}px)`, ...rowStyle?.(i) }}>
              {COLUMNS.map((c, ci) => {
                const on = Math.max(colOn[c.key] ?? -99, ro) + i * 3 + 2;
                if (lf < on) return null;
                const e = enter(lf, on, { from: { y: 10, blur: 0 }, frames: 9 });
                const over = cell?.(i, c.key);
                const content =
                  c.key === "status" ? (
                    (() => {
                      const st = status ? status(i) : { s: r.status, at: -99 };
                      return <StatusPill lf={lf} status={st.s} at={st.at} />;
                    })()
                  ) : over === null ? null : (
                    over ?? (r[c.key as keyof Row] as string)
                  );
                return (
                  <div
                    key={c.key}
                    style={{
                      position: "absolute",
                      left: colX[ci] + SH.pad,
                      top: c.key === "status" ? 12 : 16,
                      width: c.w - SH.pad * 1.5,
                      fontSize: SH.fs,
                      color: c.key === "idea" ? palette.ink : palette.inkSoft,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      transform: `translateY(${e.y}px)`,
                      opacity: e.opacity,
                    }}
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          );
        })}
        {children}
      </div>
    </>
  );
};

// ---------------------------------------------------------------- template

const WEEK1 = ROWS.slice(0, 2);

const Template: React.FC<{ b: BeatT }> = ({ b }) => {
  const lf = useCurrentFrame();
  const [s1, s2] = b.segs;
  const m = (k: string) => markAt(s1, k, b.from);
  const p1 = markAt(s2, "p1", b.from);
  const s1m = markAt(s2, "s1", b.from);
  const said = { idea: wordAt(s2, b.from, "idea"), draft: wordAt(s2, b.from, "draft"), ready: wordAt(s2, b.from, "ready") };
  // The week's two posts arrive as the sheet's two rows (their ideas) with the card; the other
  // columns land on their spoken names, and "the idea" flashes its header.
  const rowWord = wordAt(s1, b.from, "row");
  const colOn: Record<string, number> = { date: m("k1"), platform: m("k2"), format: m("k3"), idea: 4, pillar: m("k5"), status: s1m };
  const wide = s2.from - b.from - 4;
  const menuOn = p1 - 2;
  const menuOff = s1m - 14;

  const H = sheetH(2);
  const push = 2.3;
  const cy = H / 2 + 4;
  const shots: Shot[] = [
    { at: 0, s: 1.85, x: colCx("idea"), y: cy },
    { at: rowWord - 4, s: 1.95, x: colCx("idea") - 40, y: cy },
    { at: m("k1") - 6, s: push, x: colCx("date"), y: cy },
    { at: m("k2") - 4, s: push, x: colCx("platform"), y: cy },
    { at: m("k3") - 4, s: push, x: colCx("format"), y: cy },
    { at: m("k4") - 4, s: push, x: colCx("idea"), y: cy },
    { at: m("k5") - 4, s: push, x: colCx("pillar") + 40, y: cy },
    { at: wide, s: 1.62, x: SHEET_W / 2, y: H / 2 + 70 },
    { at: s1m - 4, s: 2.1, x: SHEET_W - 300, y: H / 2 + 10 },
  ];
  const cam = camera(lf, shots);

  // Row 0's status steps Idea -> Draft -> Ready on the spoken words; row 1 stays a draft.
  const status = (i: number): { s: Status | null; at: number } => {
    if (i === 1) return { s: "Draft", at: s1m + 4 };
    if (lf >= said.ready) return { s: "Ready", at: said.ready };
    if (lf >= said.draft) return { s: "Draft", at: said.draft };
    return { s: "Idea", at: Math.max(s1m, said.idea) };
  };

  // Pillar menu: a real dropdown under row 0's pillar cell, listing the account's 3 pillars.
  const me = enter(lf, menuOn, { from: { y: -14, blur: 0 }, frames: 10 });
  const mx = exit(lf, menuOff, { to: { y: -16 }, frames: 8 });
  const itemOn = staggerOnsets(PILLARS.length, menuOn + 2, [3, 3]);
  const pillarX = colX[COLUMNS.findIndex((c) => c.key === "pillar")];

  return (
    <AbsoluteFill>
      <Sfx name="wooshC" at={0} gain={0.7} />
      {["k1", "k2", "k3", "k4", "k5"].map((k) => (
        <Sfx key={k} name="tick" at={m(k)} gain={0.7} />
      ))}
      <Sfx name="wooshA" at={wide} gain={0.5} />
      <Sfx name="popB" at={menuOn} />
      <Sfx name="press" at={s1m} gain={0.6} />
      <Sfx name="popA" at={said.ready} />
      <LightGround frame={lf + b.from} />
      <CameraGroup s={cam.s} x={cam.x} y={cam.y} dx={drift(lf, b.frames, -24)} dy={riseAndLeave(lf, b.frames)}>
        <Sheet lf={lf} rows={WEEK1} colOn={colOn} pulse={{ idea: m("k4") }} status={status} height={H} />
        {me.visible && mx.visible ? (
          <div
            style={{
              position: "absolute",
              left: pillarX + 10,
              top: rowY(1) + 6,
              width: 230,
              padding: 6,
              background: palette.surface,
              border: `1px solid ${palette.line}`,
              borderRadius: 10,
              boxShadow: "0 14px 28px rgba(30,25,20,0.18)",
              transform: `translateY(${me.y + mx.y}px)`,
              opacity: me.opacity,
              fontFamily,
              zIndex: 3,
            }}
          >
            {PILLARS.map((p, i) => {
              const e = enter(lf, itemOn[i], { from: { y: 8, blur: 0 }, frames: 8 });
              return (
                <div
                  key={p}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 7,
                    fontSize: SH.fs,
                    color: palette.ink,
                    background: i === 0 ? palette.surfaceSunken : "transparent",
                    transform: `translateY(${e.y}px)`,
                    visibility: e.visible ? "visible" : "hidden",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p}
                </div>
              );
            })}
          </div>
        ) : null}
      </CameraGroup>
      <Chip lf={lf} at={p1 + 2} text="3–5 pillars" source="Later · Sprout Social" leaveAt={menuOff} y={0.84} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- batch: the month in one sitting

const STEP: Status[] = ["Idea", "Draft", "Ready"];

const Batch: React.FC<{ b: BeatT }> = ({ b }) => {
  const lf = useCurrentFrame();
  const [s1, s2] = b.segs;
  const b1 = markAt(s1, "b1", b.from);
  const b2 = markAt(s1, "b2", b.from);
  const j1 = markAt(s2, "j1", b.from);
  const n = ROWS.length;
  const rowOn = (i: number) => (i < 2 ? -99 : staggerOnsets(n - 2, 8, [2, 1, 2, 1, 2, 1])[i - 2]);
  // One sitting: every row steps Idea -> Draft -> Ready in a diagonal cascade.
  const flipOn = staggerOnsets(n, 30, [3, 2, 3, 2, 3, 2, 3]);
  const status = (i: number): { s: Status | null; at: number } => {
    const d = flipOn[i];
    const st = lf >= d + 8 ? 2 : lf >= d ? 1 : 0;
    const start = i === 0 ? 2 : i === 1 ? 1 : 0;
    const s = Math.max(st, start);
    return { s: STEP[s], at: s === start ? -99 : s === 1 ? d : d + 8 };
  };
  const H = sheetH(n);
  const grow = n * tween(lf, 8, 22, 2 / n, 1, "softLand");
  const shownH = sheetH(Math.max(2, grow));
  const dimOn = j1;
  // "One to four weeks ahead": one accent band per planned week, stepping down the month.
  const bandOn = staggerOnsets(4, b2 + 4, [6, 6, 6]);
  const shots: Shot[] = [
    { at: 0, s: 1.62, x: SHEET_W / 2, y: sheetH(2) / 2 + 70 },
    { at: 10, s: 1.36, x: SHEET_W / 2, y: H / 2 + 60 },
    { at: b1 - 4, s: 1.44, x: SHEET_W / 2 - 40, y: H / 2 + 50 },
    { at: b2 - 2, s: 1.4, x: SHEET_W / 2 - 70, y: H / 2 + 56 },
    { at: j1 - 4, s: 1.75, x: SHEET_W / 2 - 60, y: sheetH(2) / 2 + 40 },
  ];
  const cam = camera(lf, shots);
  const bands = bandOn.map((at, w) => {
    const e = enter(lf, at, { from: { y: -10, scale: 0.6, blur: 0 }, frames: 9 });
    if (!e.visible) return null;
    const dim = w > 0 ? tween(lf, dimOn + w * 2, 7, 1, 0.25, "softInOut") : 1;
    return (
      <div
        key={w}
        style={{
          position: "absolute",
          left: -24,
          top: rowY(w * 2) + 6,
          width: 8,
          height: SH.row * 2 - 12,
          borderRadius: 4,
          background: ACCENT,
          transform: `translateY(${e.y}px) scaleY(${e.scale})`,
          opacity: Math.min(e.opacity, dim),
        }}
      />
    );
  });
  return (
    <AbsoluteFill>
      <Sfx name="wooshB" at={8} gain={0.7} />
      {flipOn.map((at, i) => (i % 2 === 0 ? <Sfx key={i} name="tick" at={at + 8} gain={0.55} /> : null))}
      <Sfx name="popA" at={b1} />
      <Sfx name="popB" at={b2} />
      {bandOn.map((at, i) => (
        <Sfx key={`band${i}`} name="tick" at={at} gain={0.7} />
      ))}
      <Sfx name="press" at={j1} gain={0.7} />
      <LightGround frame={lf + b.from} />
      <CameraGroup s={cam.s} x={cam.x} y={cam.y} dx={drift(lf, b.frames, 24)} dy={riseAndLeave(lf, b.frames, 0)}>
        <Sheet
          lf={lf}
          rows={ROWS}
          rowOn={rowOn}
          status={status}
          height={shownH}
          rowStyle={(i) => (i >= 2 ? { opacity: tween(lf, dimOn + (i - 2), 7, 1, 0.28, "softInOut") } : {})}
        />
        {bands}
      </CameraGroup>
      <Chip lf={lf} at={b1} text={PLANNING.session.text} source={PLANNING.session.source} leaveAt={b2 - 8} y={0.86 - 0.02} />
      <Chip lf={lf} at={b2} text={PLANNING.ahead.text} source={PLANNING.ahead.source} leaveAt={j1 - 8} y={0.84} />
      <Chip lf={lf} at={j1} text={PLANNING.start.text} source={PLANNING.start.source} y={0.84} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- bank

const BANK_GAP = 70;

const Bank: React.FC<{ b: BeatT }> = ({ b }) => {
  const lf = useCurrentFrame();
  const seg = b.segs[0];
  const k1 = markAt(seg, "k1", b.from);
  const k2 = markAt(seg, "k2", b.from);
  const fall = wordAt(seg, b.from, "fall");
  const move = fall + 16;
  const cut = k2 - 8;
  const n = ROWS.length;
  const H = sheetH(n);
  const trayY = H + BANK_GAP;
  // Week 3 (rows 4, 5) falls apart: its posts clear; the first banked post slides into row 4.
  const broken = [4, 5];
  const cleared = (i: number) => broken.includes(i) && lf >= fall + (i - 4) * 3;
  const slide = tween(lf, move, 16, 0, 1, "softLand");
  const lift = tween(lf, move - 6, 6, 0, 1, "softLand");
  const landed = lf >= move + 16;

  const trayE = enter(lf, k1 - 2, { from: { y: 120, blur: 0 }, frames: 12 });
  const shots: Shot[] = [
    { at: 0, s: 1.3, x: SHEET_W / 2, y: H / 2 + 80 },
    { at: k1 - 4, s: 1.3, x: SHEET_W / 2, y: (rowY(3) + trayY + BANK.length * SH.row) / 2 },
    { at: move - 6, s: 1.6, x: SHEET_W / 2, y: (rowY(4) + trayY + SH.row) / 2 },
  ];
  const cam = camera(lf, shots);

  const bankRow = (r: Row, i: number, style: React.CSSProperties) => (
    <div key={i} style={{ position: "absolute", left: 0, width: SHEET_W, height: SH.row, fontFamily, ...style }}>
      {COLUMNS.map((c, ci) => (
        <div
          key={c.key}
          style={{
            position: "absolute",
            left: colX[ci] + SH.pad,
            top: c.key === "status" ? 12 : 16,
            width: c.w - SH.pad * 1.5,
            fontSize: SH.fs,
            color: c.key === "idea" ? palette.ink : palette.inkSoft,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {c.key === "status" ? <StatusPill lf={lf} status="Ready" /> : c.key === "date" && i === 0 && landed ? ROWS[4].date : (r[c.key as keyof Row] as string)}
        </div>
      ))}
    </div>
  );

  return (
    <AbsoluteFill>
      <Sfx name="wooshA" at={k1 - 2} gain={0.7} />
      <Sfx name="tick" at={fall} />
      <Sfx name="tick" at={fall + 3} gain={0.8} />
      <Sfx name="wooshC" at={move} gain={0.6} />
      <Sfx name="popA" at={move + 16} />
      <LightGround frame={lf + b.from} />
      {lf < cut ? (
        <CameraGroup s={cam.s} x={cam.x} y={cam.y} dx={drift(lf, cut, -24)} dy={exit(lf, cut - 13, { to: { y: -560 } }).y}>
          <Sheet
            lf={lf}
            rows={ROWS}
            status={(i) => (cleared(i) ? { s: null, at: fall } : { s: "Ready", at: -99 })}
            cell={(i, key) => (cleared(i) && key !== "date" ? null : undefined)}
          />
          {/* The bank: a second tab of ready posts under the month. */}
          {trayE.visible ? (
            <div style={{ position: "absolute", left: 0, top: trayY + trayE.y, width: SHEET_W }}>
              <div style={{ position: "absolute", left: SH.pad, top: -40, fontFamily, fontSize: 22, fontWeight: 500, color: palette.ink, letterSpacing: "-0.01em" }}>Bank</div>
              <ContactShadow w={SHEET_W} top={BANK.length * SH.row - 8} />
              <div style={{ position: "absolute", left: 0, top: 0, width: SHEET_W, height: BANK.length * SH.row, background: palette.surface, border: `1px solid ${palette.line}`, borderRadius: 12 }}>
                {BANK.map((r, i) => (i === 0 && lf >= move - 6 ? null : bankRow(r, i, { top: i * SH.row, borderBottom: i === 0 ? `1px solid ${palette.line}` : undefined })))}
              </div>
            </div>
          ) : null}
          {/* The banked post travelling up into the empty week. */}
          {lf >= move - 6
            ? bankRow(BANK[0], 0, {
                top: lerp(trayY, rowY(4), slide),
                background: palette.surface,
                borderRadius: 8,
                boxShadow: `0 ${lerp(4, 18, lift * (1 - slide * 0.6))}px ${lerp(10, 30, lift)}px rgba(30,25,20,${0.12 + 0.08 * lift * (1 - slide)}), 0 0 0 2px ${withAlpha(ACCENT, landed ? tween(lf, move + 16, 12, 1, 0, "softInOut") : 1)}`,
                transform: `scale(${1 + 0.03 * lift * (1 - slide)})`,
                zIndex: 4,
              })
            : null}
        </CameraGroup>
      ) : (
        <BankWeeks lf={lf - cut} frames={b.frames - cut} k2={k2 - cut} />
      )}
    </AbsoluteFill>
  );
};

/** Last shot: the 26 week bars again, 21 lit and 5 off weeks. */
const BankWeeks: React.FC<{ lf: number; frames: number; k2: number }> = ({ lf, frames, k2 }) => {
  const W = HC_W;
  const H = ROW_BAR_H + G.pad * 2;
  const offOn = staggerOnsets(OFF_WEEKS.length, k2 + 10, [3, 2, 3, 2]);
  const cam = { s: 1.9, x: W / 2, y: H / 2 + 25 };
  return (
    <AbsoluteFill>
      <Sfx name="wooshB" at={0} />
      <Sfx name="press" at={k2} gain={0.6} />
      <CameraGroup s={cam.s * (1 + Math.min(MAX_CREEP, lf * 0.0004))} x={cam.x} y={cam.y} dx={drift(lf, frames, -24)} dy={riseAndLeave(lf, frames)}>
        <ContactShadow w={W} top={H - 8} />
        <div style={{ position: "absolute", width: W, height: H, background: palette.surface, border: `1px solid ${palette.line}`, borderRadius: 14 }}>
          <WeekBars lf={lf} top={G.pad} h={ROW_BAR_H} lit={(w) => (OFF_WEEKS.includes(w) ? null : -99)} />
          {/* The five weeks off, each marked by a ring as the voice says "a few weeks off". */}
          {OFF_WEEKS.map((w, i) => {
            const e = enter(lf, offOn[i], { from: { y: 0, scale: 1.4, blur: 0 }, frames: 9 });
            if (!e.visible) return null;
            return <div key={w} style={{ position: "absolute", left: weekX(w) - 5, top: G.pad - 5, width: G.cell + 10, height: ROW_BAR_H + 10, borderRadius: 8, border: `2px solid ${withAlpha(palette.ink, 0.55)}`, transform: `scale(${e.scale})` }} />;
          })}
        </div>
      </CameraGroup>
      <Chip lf={lf} at={k2} text={PLANNING.sweet.text} source={PLANNING.sweet.source} y={0.7} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- close

const HeadlineFromVoice: React.FC<{ seg: SegT; relativeTo: number; maxWordsPerLine?: number }> = ({ seg, relativeTo, maxWordsPerLine = 7 }) => {
  const lf = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const fs = em("headline", width, height) * 0.8;
  const words = wordOnsets(seg, relativeTo);
  // Break lines at sentence ends first, then by length.
  const lines: (typeof words)[] = [];
  let cur: typeof words = [];
  for (const w of words) {
    cur.push(w);
    if (/[.]$/.test(w.word) || cur.length >= maxWordsPerLine) {
      lines.push(cur);
      cur = [];
    }
  }
  if (cur.length) lines.push(cur);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: fs * 0.28 }}>
      {lines.map((ln, li) => (
        <WordLine key={li} frame={lf} words={ln.map((w) => w.word)} onsets={ln.map((w) => w.at)} size={fs} weight={weight.headline} tracking={tracking.headline} color={palette.inkOnDark} rise={height * 0.05} />
      ))}
    </div>
  );
};

const Close: React.FC<{ b: BeatT }> = ({ b }) => {
  const lf = useCurrentFrame();
  const { width } = useVideoConfig();
  const lean = tween(lf, b.frames - 10, 10, 0, -100, "crashOut");
  return (
    <AbsoluteFill>
      <Sfx name="wooshA" at={0} gain={0.8} />
      <DarkGround frame={lf} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `translate(${-width * 0.02 + drift(lf, b.frames)}px, ${lean}px)` }}>
        <HeadlineFromVoice seg={b.segs[0]} relativeTo={b.from} maxWordsPerLine={7} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- film

const BEAT_VIEW: Record<string, React.FC<{ b: BeatT }>> = {
  hook: Hook,
  week: Week,
  template: Template,
  batch: Batch,
  bank: Bank,
  close: Close,
};

export const ContentCalendar: React.FC = () => (
  <AbsoluteFill style={{ background: palette.ground }}>
    {BEATS.map((b) => {
      const View = BEAT_VIEW[b.id];
      return (
        <Sequence key={b.id} from={b.from} durationInFrames={b.frames} name={b.id}>
          <View b={b} />
        </Sequence>
      );
    })}
    <MusicBed music={music} totalFrames={TOTAL_FRAMES} speech={BEATS.flatMap((b) => b.segs).map((s) => [s.from, s.from + s.frames] as [number, number])} />
    {BEATS.flatMap((b) => b.segs).map((s) => (
      <Sequence key={`vo-${s.id}`} from={s.from} durationInFrames={s.frames + 6} name={`vo ${s.id}`}>
        <Audio src={staticFile(s.file)} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
