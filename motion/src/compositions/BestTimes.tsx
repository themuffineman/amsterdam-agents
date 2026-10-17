/**
 * BestTimes: voiced 1920x1080 explainer, "best times to post" on Instagram, YouTube, LinkedIn
 * and TikTok. Length follows the voiceover (src/films/best-times/voice.json), ~1:40.
 *
 * PLAN
 * One true thing: each platform has its own clock (Instagram midweek, YouTube Sunday morning,
 *   LinkedIn late afternoon, TikTok evenings), so one posting schedule for all four is wrong.
 * Data: Buffer's published studies, quoted in src/films/best-times/data.ts. Rankings only;
 *   nothing on screen is a value Buffer didn't publish.
 * Voice: Gemini TTS via the Sycamore backend (/internal/tts), one clip per script segment.
 *   Visual events land on {marks} in script.json (position estimated from characters).
 * Shape: UI documentary. One reusable object, the week grid card, re-filled per platform, filmed
 *   by one camera group per beat. Rejected: talking-head-free montage (no real footage);
 *   typographic essay (the grid is the proof, type alone would be a deck).
 * Clock smooth 30, crisp grammar. World: light lit ground + grain; dark ground for the close.
 * Accent (one meaning): "the answer": best slots, rank chips, peak-window bands.
 * Hero frame: each platform's wide grid with its pattern lit (IG midweek scatter, TikTok's 6-11 p.m. evening
 *   band, LinkedIn's late-afternoon band). LinkedIn's band is the strongest single picture.
 *
 * Beats (lengths come from the voice)
 * hook   "~23 million posts" words on the voice, cut to the four sample tiles (camera pans tile
 *        to tile on each spoken platform), cut to "Here's when to post..." line.
 * ig/yt/li/x  Grid card rises in on its header (platform name readable), snaps wide as cells
 *        cascade and the ranked slots light; pushes onto each top-3 slot on its spoken word;
 *        facts (worst window, weakest days, peak band) land on their words; exits up into
 *        the cut.
 * recap  Table: platform / best slot / avoid, one row per spoken platform.
 * close  Dark ground, the closing line on the voice, leans out on the last frames (no source line).
 */
import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolateColors, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { cameraSnap, enter, exit, staggerOnsets, tween } from "../lib/eases";
import { DarkGround, LightGround, MAX_CREEP, WordLine, drift } from "../lib/scene";
import { POPS, Sfx, WOOSHES } from "../lib/sfx";
import { MusicBed } from "../lib/music";
import music from "../films/best-times/music.json";
import { em, fontFamily, palette, tracking, weight } from "../lib/tokens";
import { ShareTable, SlotGrid, StatRow, defaultTheme, slotGridGeometry, withAlpha, type SlotLevel, type UiTheme } from "../ui-kit";
import { DAYS, PLATFORMS, RECAP, SAMPLES, type Platform } from "../films/best-times/data";
import { BEATS, TOTAL_FRAMES, beat, wordOnsets, type BeatT, type SegT } from "../films/best-times/timeline";

export const BEST_TIMES = { durationInFrames: TOTAL_FRAMES } as const;

const theme: UiTheme = { ...defaultTheme, shareTint: palette.ink, positive: palette.inkSoft, warning: palette.inkMuted };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// ---------------------------------------------------------------- camera

interface Shot {
  at: number;
  s: number;
  x: number;
  y: number;
}
const CREEP = 0.00035;

/**
 * Camera state at a local frame from a list of shots (sorted by `at`). Big scale changes are a
 * one-frame snap + tail (cameraSnap); small ones are a 14 f softInOut pan. Each shot starts
 * from wherever the previous one was, so moves never pop.
 */
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

/** Wrap children in the one camera group: focus point (x, y) in content coordinates. */
const CameraGroup: React.FC<{ s: number; x: number; y: number; dy?: number; bounds?: { w: number; h: number }; children: React.ReactNode }> = ({
  s,
  x: rawX,
  y: rawY,
  dy = 0,
  bounds,
  children,
}) => {
  const { width, height } = useVideoConfig();
  // Keep the content on screen (idea from amsterdam-engine's Cila stage camera): when the view
  // is smaller than the content, never look past its edges; when larger, centre it.
  const clampAxis = (v: number, view: number, size: number) => (view >= size ? size / 2 : Math.min(size - view / 2, Math.max(view / 2, v)));
  const x = bounds ? clampAxis(rawX, width / s, bounds.w) : rawX;
  const y = bounds ? clampAxis(rawY, height / s, bounds.h) : rawY;
  return (
    <AbsoluteFill style={{ transformOrigin: "0 0", transform: `translate(${width / 2 - x * s}px, ${height / 2 - y * s + dy}px) scale(${s})` }}>
      {children}
    </AbsoluteFill>
  );
};

const ContactShadow: React.FC<{ w: number; top: number }> = ({ w, top }) => (
  <div style={{ position: "absolute", left: 20, top, width: w - 40, height: 22, borderRadius: "50%", background: "rgba(60,50,40,0.16)", filter: "blur(12px)" }} />
);

// ---------------------------------------------------------------- grid card geometry

const GEO = slotGridGeometry();
const PAD = 24;
const HEADER_H = 70;
const GRID_X = PAD;
const GRID_Y = HEADER_H + 18;
const CARD_W = PAD * 2 + GEO.width(24);
const CARD_H = GRID_Y + GEO.height(7) + 34 + PAD;
const cellCentre = (row: number, col: number) => {
  const c = GEO.cell(row, col);
  return { x: GRID_X + c.x + c.w / 2, y: GRID_Y + c.y + c.h / 2 };
};
const fmtHour = (h: number) => (h === 0 ? "12 a.m." : h < 12 ? `${h} a.m.` : h === 12 ? "12 p.m." : `${h - 12} p.m.`);

const WIDE = 1.95;
const PUSH = 3.4;

/** Callout pill beside a cell, entering on snapSettle; optional exit. */
const Chip: React.FC<{ lf: number; at: number; row: number; col: number; text: string; rank?: number; side?: "left" | "right"; leaveAt?: number }> = ({
  lf,
  at,
  row,
  col,
  text,
  rank,
  side = "right",
  leaveAt,
}) => {
  const e = enter(lf, at, { from: { y: 10, blur: 0 }, frames: 10, easing: "snapSettle" });
  const x = leaveAt !== undefined ? exit(lf, leaveAt, { to: { y: -24 }, frames: 8 }) : null;
  if (!e.visible || (x && !x.visible)) return null;
  const c = cellCentre(row, col);
  const offset = GEO.cellWidth / 2 + 6;
  const dir = side === "right" ? 1 : -1;
  return (
    <div
      style={{
        position: "absolute",
        left: c.x + offset * dir,
        top: c.y,
        transform: `translate(${side === "right" ? 0 : -100}%, -50%) translate(${e.y * -0.6 * dir}px, ${x?.y ?? 0}px)`,
        opacity: e.opacity,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px 4px 9px",
        borderRadius: 999,
        background: interpolateColors(lf, [at, at + 6], [palette.accent, palette.ink]),
        color: palette.surface,
        fontFamily,
        fontSize: 16, // 16 px x 2.7 camera = 43 px = 0.04 H (gate G1)
        fontWeight: 500,
        whiteSpace: "nowrap",
        fontVariantNumeric: "tabular-nums",
        boxShadow: "0 4px 10px rgba(30,25,20,0.12)",
        zIndex: 2,
      }}
    >
      {rank ? <span style={{ color: withAlpha(palette.surface, 0.6) }}>#{rank}</span> : null}
      {text}
    </div>
  );
};

// ---------------------------------------------------------------- platform beat

const levelGrid = (p: Platform) =>
  DAYS.map((d, row) => ({
    label: d,
    cells: Array.from({ length: 24 }, (_, h): SlotLevel => {
      const r = p.ranks[row];
      if (r[0] === h) return "best";
      if (r.slice(1).includes(h)) return "good";
      return "base";
    }),
  }));

const PlatformBeat: React.FC<{ p: Platform; b: BeatT }> = ({ p, b }) => {
  const lf = useCurrentFrame();
  const rows = levelGrid(p);
  const local = (abs: number) => abs - b.from;
  const marks: Record<string, number> = {};
  for (const s of b.segs) for (const [k, v] of Object.entries(s.marks)) marks[k] = local(v);

  // Event order (by spoken time): top-3 slots and facts.
  const events = [
    ...p.top3.map((t, i) => ({ kind: "top" as const, i, at: marks[`t${i + 1}`] })),
    ...p.facts.map((f, i) => ({ kind: "fact" as const, i, at: marks[f.mark] })),
  ]
    .filter((e) => e.at !== undefined)
    .sort((a, c) => a.at - c.at);

  const lift = (side?: "left" | "right") => (side === "left" ? -60 : 60);

  const shots: Shot[] = [{ at: 0, s: WIDE, x: CARD_W / 2, y: CARD_H / 2 }];
  for (const e of events) {
    if (e.kind === "top") {
      const t = p.top3[e.i];
      const c = cellCentre(t.row, t.col);
      shots.push({ at: e.at - 4, s: PUSH, x: c.x + lift(t.side), y: c.y });
    } else {
      const f = p.facts[e.i];
      // "Wide" facts frame most of the week but stay close enough (2.7x) for the chip to read.
      if (f.shot === "wide") {
        const c = cellCentre(f.at.row, f.at.col);
        shots.push({ at: e.at - 4, s: 2.7, x: (CARD_W / 2 + c.x + lift(f.side) * 2) / 2, y: CARD_H / 2 });
      }
      else {
        const c = cellCentre(f.at.row, f.at.col);
        shots.push({ at: e.at - 4, s: 3.2, x: c.x + lift(f.side) * 1.4, y: c.y });
      }
    }
  }
  const cam = camera(lf, shots);
  const rise = tween(lf, -3, 14, 340, 0, "snapSettle");
  const leave = exit(lf, b.frames - 13, { to: { y: -560 } });

  // Cell events
  // Cells cascade in as the card lands (it opens wide, so an empty grid would show).
  const gridOn = 16;
  const colOn = staggerOnsets(24, gridOn - 8, [2, 1, 1, 2, 1, 1, 2, 1, 1, 1, 2, 1]);
  const lightOn = (row: number) => gridOn + 10 + row * 3;
  const lowOn = new Map<string, number>();
  const dimOn = new Map<number, number>();
  for (const f of p.facts) {
    const at = marks[f.mark];
    if (at === undefined) continue;
    f.lowCells?.rows.forEach((r, ri) => f.lowCells!.cols.forEach((c, ci) => lowOn.set(`${r}:${c}`, at + ri * 2 + ci)));
    f.dimRows?.forEach((r, i) => dimOn.set(r, at + i * 3));
  }
  const base = withAlpha(palette.inkMuted, 0.16);

  const cellStyle = (row: number, col: number): React.CSSProperties => {
    const lvl = rows[row].cells[col];
    const e = enter(lf, colOn[col] + (row % 2), { from: { y: 0, scale: 0.55, blur: 0 }, frames: 6 });
    let bg: string | undefined;
    const low = lowOn.get(`${row}:${col}`);
    if (low !== undefined && lf >= low) bg = withAlpha(palette.ink, 0.72);
    else if ((lvl === "best" || lvl === "good") && lf < lightOn(row)) bg = base;
    else if (lvl === "best" && lf < lightOn(row) + 5) bg = palette.accent;
    const dim = dimOn.get(row);
    const op = dim !== undefined ? tween(lf, dim, 6, 1, 0.32, "softInOut") : 1;
    return { transform: `scaleY(${e.scale})`, visibility: e.visible ? "visible" : "hidden", opacity: op, ...(bg ? { background: bg } : {}) };
  };
  const rowLabelStyle = (row: number): React.CSSProperties | undefined => {
    const dim = dimOn.get(row);
    return dim !== undefined ? { opacity: tween(lf, dim, 6, 1, 0.4, "softInOut") } : undefined;
  };

  // Fact chips leave when the next event fires; rank chips stay.
  const nextAfter = (at: number) => events.find((e) => e.at > at)?.at;

  // Sound cues, on the same frames as the visual events they belong to.
  const pi = PLATFORMS.indexOf(p);
  const lowRowTicks = p.facts.flatMap((f) =>
    f.lowCells && marks[f.mark] !== undefined ? f.lowCells.rows.map((_, ri) => marks[f.mark] + ri * 2) : [],
  );
  const cues = (
    <>
      <Sfx name={WOOSHES[pi % WOOSHES.length]} at={0} />
      {p.top3.map((_, i) => (marks[`t${i + 1}`] !== undefined ? <Sfx key={`t${i}`} name={POPS[i % POPS.length]} at={marks[`t${i + 1}`]} /> : null))}
      {p.facts.map((f) => (marks[f.mark] !== undefined ? <Sfx key={f.mark} name="press" at={marks[f.mark]} /> : null))}
      {lowRowTicks.map((at, i) => (
        <Sfx key={`k${i}`} name="tick" at={at} gain={0.8} />
      ))}
    </>
  );

  return (
    <AbsoluteFill>
      {cues}
      <LightGround frame={lf + b.from} />
      <CameraGroup s={cam.s} x={cam.x} y={cam.y} dy={rise + leave.y} bounds={{ w: CARD_W, h: CARD_H }}>
        <ContactShadow w={CARD_W} top={CARD_H - 8} />
        <div style={{ position: "absolute", width: CARD_W, height: CARD_H, background: theme.surface, border: `1px solid ${theme.line}`, borderRadius: theme.radius + 2, fontFamily }}>
          <div style={{ position: "absolute", left: PAD, top: 18 }}>
            <div style={{ fontSize: 22, fontWeight: weight.branded, letterSpacing: "-0.01em", color: theme.ink }}>{p.name}</div>
            <div style={{ marginTop: 4, fontSize: 12, color: theme.inkMuted }}>{p.sample}</div>
          </div>
          {/* Peak-window bands, behind the cells, wiping down on their word */}
          {p.facts
            .filter((f) => f.band && marks[f.mark] !== undefined)
            .map((f) => {
              const at = marks[f.mark];
              const a = GEO.cell(0, f.band!.from);
              const z = GEO.cell(0, f.band!.to);
              const h = GEO.height(7) + 16;
              const grow = tween(lf, at, 9, 0, 1, "softLand");
              if (lf < at) return null;
              return (
                <div
                  key={f.mark}
                  style={{
                    position: "absolute",
                    left: GRID_X + a.x - 5,
                    top: GRID_Y - 8,
                    width: z.x + z.w - a.x + 10,
                    height: h * grow,
                    borderRadius: 12,
                    background: withAlpha(palette.accent, 0.12),
                    border: `1px solid ${withAlpha(palette.accent, 0.35)}`,
                  }}
                />
              );
            })}
          <SlotGrid
            rows={rows}
            columnLabels={[0, 6, 12, 18].map((h) => [h, fmtHour(h)] as [number, string])}
            cellStyle={cellStyle}
            rowLabelStyle={rowLabelStyle}
            theme={theme}
            style={{ position: "absolute", left: GRID_X, top: GRID_Y }}
          />
          {p.top3.map((t, i) => (marks[`t${i + 1}`] !== undefined ? <Chip key={t.text} lf={lf} at={marks[`t${i + 1}`]} row={t.row} col={t.col} rank={i + 1} text={t.text} side={t.side} /> : null))}
          {p.facts.map((f) => {
            const at = marks[f.mark];
            if (at === undefined) return null;
            const next = nextAfter(at);
            return <Chip key={f.mark} lf={lf} at={at} row={f.at.row} col={f.at.col} text={f.chip} side={f.side} leaveAt={next !== undefined ? next - 6 : undefined} />;
          })}
        </div>
      </CameraGroup>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- hook

const HeadlineFromVoice: React.FC<{ seg: SegT; relativeTo: number; dark?: boolean; size?: number; maxWordsPerLine?: number }> = ({ seg, relativeTo, dark, size, maxWordsPerLine = 7 }) => {
  const lf = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const fs = size ?? em("headline", width, height) * 0.8;
  const words = wordOnsets(seg, relativeTo);
  const lines: (typeof words)[] = [];
  for (let i = 0; i < words.length; i += maxWordsPerLine) lines.push(words.slice(i, i + maxWordsPerLine));
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: fs * 0.28 }}>
      {lines.map((ln, li) => (
        <WordLine
          key={li}
          frame={lf}
          words={ln.map((w) => w.word)}
          onsets={ln.map((w) => w.at)}
          size={fs}
          weight={weight.headline}
          tracking={tracking.headline}
          color={dark ? palette.inkOnDark : palette.ink}
          rise={height * 0.05}
        />
      ))}
    </div>
  );
};

const Hook: React.FC<{ b: BeatT }> = ({ b }) => {
  const [s1, s2] = b.segs;
  const igAt = s1.marks.ig - b.from;
  const tilesFrom = igAt - 8;
  const lineFrom = s2.from - b.from - 6;
  return (
    <>
      <Sequence durationInFrames={tilesFrom} name="hook: number">
        <HookNumber seg={s1} relativeTo={b.from} until={tilesFrom} />
      </Sequence>
      <Sequence from={tilesFrom} durationInFrames={lineFrom - tilesFrom} name="hook: samples">
        <HookTiles seg={s1} relativeTo={b.from + tilesFrom} frames={lineFrom - tilesFrom} />
      </Sequence>
      <Sequence from={lineFrom} durationInFrames={b.frames - lineFrom} name="hook: line">
        <HookLine seg={s2} relativeTo={b.from + lineFrom} frames={b.frames - lineFrom} />
      </Sequence>
    </>
  );
};

/** "Over 23 million posts" landing on the spoken words, exiting up into the cut. */
const HookNumber: React.FC<{ seg: SegT; relativeTo: number; until: number }> = ({ seg, relativeTo, until }) => {
  const lf = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const spoken = wordOnsets(seg, relativeTo);
  const at = (w: string) => spoken.find((x) => x.word.toLowerCase().startsWith(w))?.at ?? 0;
  const words = ["Over", "23", "million", "posts."];
  const onsets = [Math.min(-4, at("over")), at("twenty"), at("million"), at("posts")];
  const leave = exit(lf, until - 13, { to: { y: -160 } });
  return (
    <AbsoluteFill>
      <Sfx name="subDrop" at={onsets[1]} maxFrames={75} />
      <LightGround frame={lf + relativeTo} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `translate(${drift(lf, until)}px, ${height * 0.035 + leave.y}px)` }}>
        <WordLine frame={lf} words={words} onsets={onsets} size={em("headline", width, height) * 1.25} weight={weight.headline} tracking={tracking.display} color={palette.ink} rise={height * 0.07} accent={[1]} entryEase="snapSettle" />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** The four sample sizes, camera panning tile to tile as each platform is named. */
const HookTiles: React.FC<{ seg: SegT; relativeTo: number; frames: number }> = ({ seg, relativeTo, frames }) => {
  const lf = useCurrentFrame();
  const TW = 230;
  const GAP = 14;
  const ROW_W = TW * 4 + GAP * 3;
  const TILE_H = 50;
  const at = (m: string) => seg.marks[m] - relativeTo;
  const shots: Shot[] = [{ at: 0, s: 3.1, x: TW / 2, y: TILE_H / 2 }];
  SAMPLES.forEach((smp, i) => {
    if (i > 0) shots.push({ at: at(smp.mark) - 4, s: 3.1, x: TW / 2 + i * (TW + GAP), y: TILE_H / 2 });
  });
  const cam = camera(lf, shots);
  const rise = tween(lf, -3, 14, 300, 0, "snapSettle");
  const leave = exit(lf, frames - 13, { to: { y: -480 } });
  return (
    <AbsoluteFill>
      <Sfx name="wooshA" at={0} />
      {SAMPLES.map((smp, i) => (i > 0 ? <Sfx key={smp.mark} name="popC" at={at(smp.mark) - 2} /> : null))}
      <LightGround frame={lf + relativeTo} />
      <CameraGroup s={cam.s} x={cam.x} y={cam.y} dy={rise + leave.y}>
        <ContactShadow w={ROW_W} top={TILE_H - 6} />
        <StatRow
          tiles={SAMPLES.map((s) => ({ value: s.value, label: s.label }))}
          tileWidth={TW}
          gap={GAP}
          theme={theme}
          tileStyle={(i) => {
            const e = enter(lf, Math.min(at(SAMPLES[i].mark) - 2, i * 3), { from: { y: 12, blur: 0 }, frames: 10 });
            return { transform: `translateY(${e.y}px)`, visibility: e.visible ? "visible" : "hidden" };
          }}
          style={{ position: "absolute" }}
        />
      </CameraGroup>
    </AbsoluteFill>
  );
};

const HookLine: React.FC<{ seg: SegT; relativeTo: number; frames: number }> = ({ seg, relativeTo, frames }) => {
  const lf = useCurrentFrame();
  const { height } = useVideoConfig();
  const leave = exit(lf, frames - 13, { to: { y: -160 } });
  return (
    <AbsoluteFill>
      <Sfx name="wooshB" at={0} />
      <LightGround frame={lf + relativeTo} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `translate(${drift(lf, frames)}px, ${height * 0.03 + leave.y}px)` }}>
        <HeadlineFromVoice seg={seg} relativeTo={relativeTo} maxWordsPerLine={6} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- recap + close

const Recap: React.FC<{ b: BeatT }> = ({ b }) => {
  const lf = useCurrentFrame();
  const seg = b.segs[0];
  const TABLE_W = 560;
  const rise = tween(lf, -3, 14, 340, 0, "snapSettle");
  const leave = exit(lf, b.frames - 13, { to: { y: -520 } });
  const s = 3.0 * (1 + Math.min(0.02, lf * 0.00012)); // 1680 -> max 1714 px wide: always in frame
  const rowsIn = RECAP.reduce((n, r) => n + tween(lf, seg.marks[r.mark] - b.from - 3, 8, 0, 1, "softLand"), 0);
  const grown = 32 + 36 * rowsIn + 1;
  return (
    <AbsoluteFill>
      <Sfx name="wooshC" at={0} />
      {RECAP.map((r) => (
        <Sfx key={r.mark} name="popC" at={seg.marks[r.mark] - b.from - 3} />
      ))}
      <LightGround frame={lf + b.from} />
      <CameraGroup s={s} x={TABLE_W / 2} y={grown / 2} dy={rise + leave.y}>
        <ContactShadow w={TABLE_W} top={grown - 6} />
        {/* The card grows as each row arrives (no empty card waiting for rows). */}
        <div style={{ position: "absolute", width: TABLE_W, height: grown, overflow: "hidden", borderRadius: theme.radius, borderBottom: `1px solid ${theme.line}` }}>
        <ShareTable
          columns={[{ header: "Platform", width: 170 }, { header: "Best slot", width: 190 }, { header: "Avoid" }]}
          rows={RECAP.map((r) => ({ cells: r.cells, percentage: 0 }))}
          width={TABLE_W}
          showBadge={false}
          theme={theme}
          rowStyle={(i) => {
            const at = seg.marks[RECAP[i].mark] - b.from - 3;
            const e = enter(lf, at, { from: { y: 14, blur: 0 }, frames: 10 });
            return {
              transform: `translateY(${e.y}px)`,
              visibility: e.visible ? "visible" : "hidden",
              color: lf >= at ? interpolateColors(lf, [at, at + 7], [palette.accent, palette.ink]) : palette.ink,
            };
          }}
          style={{ position: "absolute" }}
        />
        </div>
      </CameraGroup>
    </AbsoluteFill>
  );
};

const Close: React.FC<{ b: BeatT }> = ({ b }) => {
  const lf = useCurrentFrame();
  const { width } = useVideoConfig();
  const seg = b.segs[0];
  const lean = tween(lf, b.frames - 10, 10, 0, -100, "crashOut");
  return (
    <AbsoluteFill>
      <Sfx name="wooshA" at={0} gain={0.8} />
      <DarkGround frame={lf} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `translate(${-width * 0.03 + drift(lf, b.frames)}px, ${lean}px)` }}>
        <HeadlineFromVoice seg={seg} relativeTo={b.from} dark maxWordsPerLine={7} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- film

export const BestTimes: React.FC = () => (
  <AbsoluteFill style={{ background: palette.ground }}>
    {BEATS.map((b) => {
      const p = PLATFORMS.find((x) => x.id === b.id);
      return (
        <Sequence key={b.id} from={b.from} durationInFrames={b.frames} name={b.id}>
          {b.id === "hook" ? <Hook b={b} /> : b.id === "recap" ? <Recap b={b} /> : b.id === "close" ? <Close b={b} /> : p ? <PlatformBeat p={p} b={b} /> : null}
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

// Kept for other films that want a beat by id.
export { beat };
