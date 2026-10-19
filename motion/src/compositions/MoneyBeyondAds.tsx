/**
 * MoneyBeyondAds: voiced 1920x1080 explainer, "How creators actually make money beyond ads".
 * Length follows the voiceover (src/films/money-beyond-ads/voice.json), ~87 s.
 *
 * PLAN
 * PAGE  P: creators live on ad payouts and don't see how much of each dollar the platform keeps.
 *       A: solo creators / small-team marketers on YouTube, watching with sound, ~90 s.
 *       G: they know who takes a cut of each stream (ads, sponsors, affiliates, products,
 *          memberships) and pick one to build next to their ads.
 *       E: from "ads are the money" to "ads are the stream that keeps the most of my dollar".
 * One true thing: the platform's cut is about half on ads, 10-30% on memberships, 10% + 50¢ on
 *   your own product and nothing on a sponsor; an affiliate gets the small slice instead.
 * Data: src/films/money-beyond-ads/data.ts (YouTube Help + How YouTube Works, NeoReach/IMH survey,
 *   Amazon Associates rate table, Gumroad pricing, Patreon). Nothing on screen is outside it.
 * Shape: UI documentary of one object, the "dollar card": 100 cells = one dollar (or one sale),
 *   lit cells = yours, muted cells = taken. Re-filled per stream, filmed by one camera group.
 *   Rejected: talking-head-free montage of creator screens (no real footage we can use: the
 *   creator videos couldn't be fetched in this job); typographic essay (five percentages as
 *   type is a stat wall; the cells make the cut countable).
 * Length: ~2620 f. Clock smooth 30, crisp grammar (no blur except word entries' 4 px clear).
 * Type: Inter, 400-520, headline 0.09 H, hero number 0.25 H, card text through the camera.
 * World: act 1 (hook..recap) light lit ground + grain, card with contact shadow, key light top-left;
 *   act 2 (close) dark ground, same key. Sound: one bed (allowlist), ticks on cell cascades.
 * Importance: hook 2, ads 2, sponsor 2, affiliate 2, product 3, member 1, recap 2, close 1
 *   (one 3 of 8).
 * Accent #E0702B, ONE meaning: "yours" (cells you keep; the figure's arrival tint). No green.
 * Carrier: the dollar card (hook -> ads carried in place; affiliate -> product carried in place:
 *   the 3 lit cells of the headphone commission become the start of the product beat).
 * Cursor: none.
 * Hero frame: product beat, the cascade from 3 lit cells to a full 100 on "flips it back"
 *   (about frame 1515, 58%): one lit card, the flip mid-wave, "$10" landing.
 * Overshoot spent on: none (the product flip carries the scale-free payoff with the one subDrop).
 *
 * # | role  | imp | Buys: the viewer...                                   | picture (text covered)          | frames
 * 1 | hook  | 2   | believes most earning channels already go past ads     | big words, then a full card     | ~356
 * 2 | proof | 2   | sees YouTube keep 45 then 55 of 100 ad cents           | card, cells peel from the end   | ~307
 * 3 | proof | 2   | sees a sponsor dollar arrive whole, and how common     | full card swept; 49% figure     | ~438
 * 4 | proof | 2   | sees an affiliate get 3 cells of someone else's 100    | dark card, few cells lit        | ~361
 * 5 | proof | 3   | watches the product flip it back to 100, minus 15      | cascade to full, 15 peel        | ~296
 * 6 | proof | 1   | sees memberships keep 70 then 90                       | card, 30 peel, 20 return        | ~269
 * 7 | recap | 2   | holds the four cuts side by side                       | table, bars by cut              | ~348
 * 8 | close | 1   | knows what to do: keep ads, build one beside them      | dark ground, the line           | ~248
 * Seams: 1->2 carried card (header swaps in place); 2->3, 5->6, 6->7 card exits up, next rises
 *   (hard cut at exit's peak); 3 survey -> 4 words exit up, card rises; 4->5 carried card;
 *   7->8 table exits up, cut to dark.
 */
import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolateColors, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { enter, exit, tween } from "../lib/eases";
import { DarkGround, LightGround, MAX_CREEP, WordLine, drift } from "../lib/scene";
import { POPS, Sfx, WOOSHES } from "../lib/sfx";
import { MusicBed } from "../lib/music";
import music from "../films/money-beyond-ads/music.json";
import { em, fontFamily, palette, tracking, weight } from "../lib/tokens";
import { ShareTable, defaultTheme, withAlpha, type UiTheme } from "../ui-kit";
import { CELLS, RECAP, STREAMS, SURVEY, type Stream } from "../films/money-beyond-ads/data";
import { BEATS, TOTAL_FRAMES, beatMarks, wordOnsets, type BeatT, type SegT } from "../films/money-beyond-ads/timeline";

export const MONEY_BEYOND_ADS = { durationInFrames: TOTAL_FRAMES } as const;

const ACCENT = "#E0702B";
const theme: UiTheme = { ...defaultTheme, shareTint: palette.ink, positive: palette.inkSoft, warning: palette.inkMuted };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// ---------------------------------------------------------------- camera (as in BestTimes)

interface Shot {
  at: number;
  s: number;
  x: number;
  y: number;
}
const CREEP = 0.00035;

const camera = (lf: number, shots: Shot[]): { s: number; x: number; y: number } => {
  let i = shots.length - 1;
  while (i > 0 && shots[i].at > lf) i--;
  const sh = shots[i];
  if (i === 0) return { s: sh.s * (1 + Math.min(MAX_CREEP, Math.max(0, lf - sh.at) * CREEP)), x: sh.x, y: sh.y };
  const from = camera(sh.at - 1, shots.slice(0, i));
  const k = tween(lf, sh.at, 14, 0, 1, "softInOut");
  const s = lerp(from.s, sh.s, k);
  return { s: s * (1 + Math.min(MAX_CREEP, Math.max(0, lf - sh.at - 15) * CREEP)), x: lerp(from.x, sh.x, k), y: lerp(from.y, sh.y, k) };
};

const CameraGroup: React.FC<{ s: number; x: number; y: number; dy?: number; children: React.ReactNode }> = ({ s, x, y, dy = 0, children }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ transformOrigin: "0 0", transform: `translate(${width / 2 - x * s}px, ${height / 2 - y * s + dy}px) scale(${s})` }}>
      {children}
    </AbsoluteFill>
  );
};

const ContactShadow: React.FC<{ w: number; top: number }> = ({ w, top }) => (
  <div style={{ position: "absolute", left: 24, top, width: w - 48, height: 24, borderRadius: "50%", background: "rgba(60,50,40,0.16)", filter: "blur(12px)" }} />
);

// ---------------------------------------------------------------- dollar card geometry

const PAD = 32;
const CELL = 26;
const GAP = 5;
const GRID = 10 * CELL + 9 * GAP; // 305
const GRID_X = PAD;
const GRID_Y = 112;
const FIG_X = GRID_X + GRID + 56;
const FIG_W = 330;
const CARD_W = FIG_X + FIG_W + PAD;
const CARD_H = GRID_Y + GRID + PAD;
const WIDE = 2.0;
const cellXY = (i: number) => ({ x: (i % 10) * (CELL + GAP), y: Math.floor(i / 10) * (CELL + GAP) });

/** One state of the card: from frame `at`, `yours` cells are lit, figure/note read so. */
interface CardState {
  at: number;
  yours: number;
  figure: string;
  note: string;
  chip?: string;
}

/** Each cell's on/off events: when "yours" shrinks, cells peel from the end backwards (1 f per ~2
 *  cells, uneven); when it grows, cells light from the first new one forwards. */
const cellEvents = (states: CardState[]) => {
  const ev: { at: number; on: boolean }[][] = Array.from({ length: CELLS }, () => []);
  for (let k = 1; k < states.length; k++) {
    const a = states[k - 1].yours;
    const b = states[k].yours;
    const at = states[k].at;
    if (b < a) for (let i = a - 1; i >= b; i--) ev[i].push({ at: at + Math.floor((a - 1 - i) * 0.55), on: false });
    if (b > a) for (let i = a; i < b; i++) ev[i].push({ at: at + Math.floor((i - a) * 0.3), on: true });
  }
  return ev;
};

const cellLook = (lf: number, i: number, start: number, ev: { at: number; on: boolean }[][]) => {
  let on = i < start;
  let since = -999;
  for (const e of ev[i]) if (lf >= e.at) {
    on = e.on;
    since = e.at;
  }
  const t = lf - since;
  // Press, not ripple: squeeze on the frame it changes, settle over ~7 f.
  const squeeze = t >= 0 && t < 8 ? tween(t, 0, 7, on ? 0.7 : 0.78, 1, "softLand") : 1;
  const bg = on ? (t < 6 ? interpolateColors(t, [0, 5], ["#FFB27A", ACCENT]) : ACCENT) : withAlpha(palette.ink, 0.09);
  return { on, scale: (on ? 1 : 0.86) * squeeze, bg };
};

const DollarCard: React.FC<{
  lf: number;
  name: string;
  unit: string;
  start: number;
  states: CardState[];
  /** Frame the header/unit text arrives (carried cards swap in place). */
  headerAt?: number;
  sweepAt?: number;
}> = ({ lf, name, unit, start, states, headerAt = -2, sweepAt }) => {
  const ev = cellEvents(states);
  const head = enter(lf, headerAt, { from: { y: 14, blur: 0 }, frames: 10 });
  const sweep = sweepAt !== undefined ? tween(lf, sweepAt, 16, -0.4, 1.3, "softInOut") : -1;
  return (
    <div style={{ position: "absolute", width: CARD_W, height: CARD_H, background: theme.surface, border: `1px solid ${theme.line}`, borderRadius: theme.radius + 4, fontFamily, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: PAD, top: 26, transform: `translateY(${head.y}px)`, opacity: head.opacity }}>
        <div style={{ fontSize: 31, fontWeight: weight.branded, letterSpacing: "-0.015em", color: theme.ink }}>{name}</div>
        <div style={{ marginTop: 6, fontSize: 18, color: theme.inkMuted }}>100 cells = {unit}</div>
      </div>
      <div style={{ position: "absolute", left: GRID_X, top: GRID_Y, width: GRID, height: GRID, overflow: "hidden" }}>
        {Array.from({ length: CELLS }, (_, i) => {
          const c = cellLook(lf, i, start, ev);
          const p = cellXY(i);
          return <div key={i} style={{ position: "absolute", left: p.x, top: p.y, width: CELL, height: CELL, borderRadius: 5, background: c.bg, transform: `scale(${c.scale})` }} />;
        })}
        {sweep > -0.4 && sweep < 1.3 ? (
          <div style={{ position: "absolute", top: 0, left: sweep * GRID - 70, width: 140, height: GRID, background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.55), rgba(255,255,255,0))" }} />
        ) : null}
      </div>
      {/* Figure column: hard replacement per state (old leaves up fast, new rises). */}
      {states.map((st, k) => {
        const next = states[k + 1]?.at;
        if (lf < st.at - (k === 0 ? 999 : 0)) return null;
        if (next !== undefined && lf >= next + 7) return null;
        const e = k === 0 ? enter(lf, -6, { from: { y: 0, blur: 0 }, frames: 6 }) : enter(lf, st.at, { from: { y: 34, blur: 3 }, frames: 12 });
        const x = next !== undefined ? exit(lf, next, { to: { y: -46 }, frames: 7 }) : null;
        if (x && !x.visible) return null;
        const tint = k > 0 && st.yours > 0 ? interpolateColors(lf, [st.at, st.at + 7], [ACCENT, theme.ink]) : theme.ink;
        return (
          <div key={k} style={{ position: "absolute", left: FIG_X, top: GRID_Y + 18, width: FIG_W, transform: `translateY(${e.y + (x?.y ?? 0)}px)`, opacity: e.opacity, filter: `blur(${e.blur}px)` }}>
            <div style={{ fontSize: 96, fontWeight: weight.headline, letterSpacing: tracking.display, color: tint, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{st.figure}</div>
            <div style={{ marginTop: 14, fontSize: 23, color: theme.inkMuted }}>{st.note}</div>
          </div>
        );
      })}
      {states.map((st, k) => {
        if (!st.chip) return null;
        const next = states.slice(k + 1).find((n) => n.chip)?.at;
        const e = enter(lf, st.at + 4, { from: { y: 12, blur: 0 }, frames: 10, easing: "snapSettle" });
        const x = next !== undefined ? exit(lf, next, { to: { y: -20 }, frames: 6 }) : null;
        if (!e.visible || (x && !x.visible)) return null;
        return (
          <div
            key={`c${k}`}
            style={{
              position: "absolute",
              left: FIG_X,
              top: GRID_Y + GRID - 46,
              transform: `translateY(${e.y + (x?.y ?? 0)}px)`,
              opacity: e.opacity,
              padding: "8px 14px",
              borderRadius: 999,
              background: interpolateColors(lf, [st.at + 4, st.at + 10], [ACCENT, palette.ink]),
              color: palette.surface,
              fontSize: 20,
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            {st.chip}
          </div>
        );
      })}
    </div>
  );
};

/** States for a stream beat from data + marks (relative to the beat). */
const streamStates = (st: Stream, marks: Record<string, number>): CardState[] => [
  { at: -999, yours: st.start, figure: st.startFigure, note: st.startNote },
  ...st.splits.filter((s) => marks[s.mark] !== undefined).map((s) => ({ at: marks[s.mark], yours: s.yours, figure: s.figure, note: s.note, chip: s.chip })),
];

/** Sound for a card: a tick per row of cells that changes, a pop on each new figure. */
const CardCues: React.FC<{ states: CardState[] }> = ({ states }) => (
  <>
    {states.slice(1).map((s, k) => {
      const prev = states[k].yours;
      const rows = Math.min(6, Math.ceil(Math.abs(s.yours - prev) / 10));
      return (
        <React.Fragment key={k}>
          <Sfx name={POPS[k % POPS.length]} at={s.at} />
          {Array.from({ length: rows }, (_, r) => (
            <Sfx key={r} name="tick" at={s.at + 1 + r * (s.yours < prev ? 5 : 3)} gain={0.6} />
          ))}
          {s.chip ? <Sfx name="press" at={s.at + 4} gain={0.7} /> : null}
        </React.Fragment>
      );
    })}
  </>
);

const cardShots = (states: CardState[]): Shot[] => [
  { at: 0, s: WIDE, x: CARD_W / 2, y: CARD_H / 2 },
  ...states.slice(1).map((s, k) => ({ at: s.at - 4, s: k % 2 === 0 ? 2.16 : 2.08, x: CARD_W / 2 + (k % 2 === 0 ? 26 : 8), y: CARD_H / 2 + 6 })),
];

const StreamBeat: React.FC<{ st: Stream; b: BeatT; carriedIn?: boolean; carriedOut?: boolean; sweepMark?: string; bigHit?: string }> = ({ st, b, carriedIn, carriedOut, sweepMark, bigHit }) => {
  const lf = useCurrentFrame();
  const marks = beatMarks(b);
  const states = streamStates(st, marks);
  const cam = camera(lf, cardShots(states));
  const rise = carriedIn ? 0 : tween(lf, -3, 14, 340, 0, "snapSettle");
  const leave = carriedOut ? { y: 0 } : exit(lf, b.frames - 13, { to: { y: -600 } });
  return (
    <AbsoluteFill>
      {!carriedIn ? <Sfx name={WOOSHES[STREAMS.indexOf(st) % WOOSHES.length]} at={0} /> : null}
      {bigHit && marks[bigHit] !== undefined ? <Sfx name="subDrop" at={marks[bigHit]} maxFrames={75} /> : null}
      <CardCues states={states} />
      <LightGround frame={lf + b.from} />
      <CameraGroup s={cam.s} x={cam.x} y={cam.y} dy={rise + leave.y}>
        <ContactShadow w={CARD_W} top={CARD_H - 10} />
        <DollarCard lf={lf} name={st.name} unit={st.unit} start={st.start} states={states} headerAt={carriedIn ? -1 : -2} sweepAt={sweepMark ? marks[sweepMark] : undefined} />
      </CameraGroup>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- type helpers

/** Words of a fixed on-screen line spread over a spoken span (from..to, local frames). */
const spread = (n: number, from: number, to: number) => Array.from({ length: n }, (_, i) => Math.round(from + ((to - from) * i) / Math.max(1, n)));

const HeadlineFromVoice: React.FC<{ seg: SegT; relativeTo: number; dark?: boolean; size?: number; maxWordsPerLine?: number; exitAt?: number }> = ({
  seg,
  relativeTo,
  dark,
  size,
  maxWordsPerLine = 7,
  exitAt,
}) => {
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
          accentColor={ACCENT}
          exits={exitAt !== undefined ? ln.map((_, i) => exitAt + li * 2 + Math.floor(i / 2)) : undefined}
        />
      ))}
    </div>
  );
};

// ---------------------------------------------------------------- hook

const HOOK_PRE = ["YouTube,", "2024."];
const HOOK_LINE = [
  ["of", "its", "partner", "channels", "earning"],
  ["five", "figures", "also", "earned", "outside", "ads."],
];

const HookHalf: React.FC<{ seg: SegT; relativeTo: number; until: number }> = ({ seg, relativeTo, until }) => {
  const lf = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const h = seg.marks.h - relativeTo;
  const end = seg.from + seg.frames - relativeTo;
  const big = [h - 3, h + 5];
  const n = HOOK_LINE[0].length + HOOK_LINE[1].length;
  const on = spread(n, h + 14, end - 26);
  // Before "over half": who and when, on the voice's "YouTube says that in 2024".
  const preOn = [-4, Math.round(h * 0.55)];
  const preOut = h - 10;
  const leave = exit(lf, until - 13, { to: { y: -170 } });
  const fs = em("phrase", width, height) * 0.92;
  return (
    <AbsoluteFill>
      <Sfx name="popB" at={Math.max(0, h - 3)} />
      <LightGround frame={lf + relativeTo} />
      {lf < preOut + 10 ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `translate(${drift(lf, until)}px, ${height * 0.02}px)` }}>
          <WordLine frame={lf} words={HOOK_PRE} onsets={preOn} size={em("headline", width, height) * 1.15} weight={weight.headline} tracking={tracking.display} color={palette.ink} rise={height * 0.06} exits={[preOut, preOut + 2]} exitRise={130} entryEase="snapSettle" />
        </AbsoluteFill>
      ) : null}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `translate(${drift(lf, until)}px, ${height * 0.02 + leave.y}px)` }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: height * 0.035, visibility: lf >= h - 3 ? "visible" : "hidden" }}>
          <WordLine frame={lf} words={["Over", "half"]} onsets={big} size={em("heroNumber", width, height) * 0.78} weight={weight.headline} tracking={tracking.display} color={palette.ink} rise={height * 0.08} accent={[1]} accentColor={ACCENT} entryEase="snapSettle" />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: fs * 0.25 }}>
            <WordLine frame={lf} words={HOOK_LINE[0]} onsets={on.slice(0, HOOK_LINE[0].length)} size={fs} weight={weight.body} tracking={tracking.phrase} color={palette.inkSoft} rise={height * 0.04} />
            <WordLine frame={lf} words={HOOK_LINE[1]} onsets={on.slice(HOOK_LINE[0].length)} size={fs} weight={weight.body} tracking={tracking.phrase} color={palette.inkSoft} rise={height * 0.04} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** "Who takes a cut of each dollar." then the dollar card rises under the voice's "who". */
const HOOK_CARD: CardState[] = [{ at: -999, yours: 0, figure: "$1", note: "100 cents" }];

const HookDollar: React.FC<{ seg: SegT; relativeTo: number; frames: number }> = ({ seg, relativeTo, frames }) => {
  const lf = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const d = seg.marks.d - relativeTo;
  const cardAt = d - 2;
  const lineOut = cardAt - 6;
  const states: CardState[] = [...HOOK_CARD, { at: cardAt + 8, yours: 100, figure: "$1", note: "100 cents" }];
  const rise = tween(lf, cardAt, 15, 760, 0, "snapSettle");
  const cam = camera(lf - cardAt, [{ at: 0, s: WIDE, x: CARD_W / 2, y: CARD_H / 2 }]);
  const words = ["Who", "takes", "a", "cut", "of", "each", "dollar."];
  const on = spread(words.length, -3, d + 4);
  return (
    <AbsoluteFill>
      <Sfx name="wooshC" at={cardAt} />
      <Sfx name="tick" at={cardAt + 9} gain={0.6} />
      <Sfx name="tick" at={cardAt + 17} gain={0.6} />
      <Sfx name="tick" at={cardAt + 26} gain={0.6} />
      <LightGround frame={lf + relativeTo} />
      {lf < lineOut + 10 ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `translate(${drift(lf, frames)}px, ${height * 0.02}px)` }}>
          <WordLine frame={lf} words={words} onsets={on} size={em("headline", width, height)} weight={weight.headline} tracking={tracking.headline} color={palette.ink} rise={height * 0.05} accent={[3]} accentColor={ACCENT} exits={words.map((_, i) => lineOut + Math.floor(i / 2))} exitRise={140} />
        </AbsoluteFill>
      ) : null}
      {lf >= cardAt ? (
        <CameraGroup s={cam.s} x={cam.x} y={cam.y} dy={rise}>
          <ContactShadow w={CARD_W} top={CARD_H - 10} />
          <DollarCard lf={lf} name="One dollar" unit="one dollar" start={0} states={states} headerAt={cardAt} />
        </CameraGroup>
      ) : null}
    </AbsoluteFill>
  );
};

const Hook: React.FC<{ b: BeatT }> = ({ b }) => {
  const [s1, s2] = b.segs;
  const cut = s2.from - b.from - 4;
  return (
    <>
      <Sequence durationInFrames={cut} name="hook: over half">
        <HookHalf seg={s1} relativeTo={b.from} until={cut} />
      </Sequence>
      <Sequence from={cut} durationInFrames={b.frames - cut} name="hook: dollar">
        <HookDollar seg={s2} relativeTo={b.from + cut} frames={b.frames - cut} />
      </Sequence>
    </>
  );
};

// ---------------------------------------------------------------- sponsorship (card + survey)

const SurveyFigure: React.FC<{ seg: SegT; relativeTo: number; frames: number }> = ({ seg, relativeTo, frames }) => {
  const lf = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const n = seg.marks.n - relativeTo;
  const end = seg.from + seg.frames - relativeTo;
  // Before the number: the survey's size on the voice ("over three thousand creators").
  const pre = ["NeoReach", "asked", "3,000+", "creators."];
  const preOn = [-3, ...spread(pre.length - 1, Math.round(n * 0.45), n - 16)];
  const preOut = n - 8;
  // The number: per-frame decaying steps, lands on 49.
  const steps = [0, 12, 22, 30, 36, 41, 44, 46, 47, 48, 48, 49];
  const k = Math.max(0, Math.min(steps.length - 1, lf - n));
  const value = `${lf >= n ? steps[k] : 0}%`;
  const fig = enter(lf, n, { from: { y: height * 0.06, blur: 4 }, frames: 12, easing: "snapSettle" });
  const lineOn = spread(SURVEY.line.length, n + 8, Math.min(end - 10, n + 50));
  const leave = exit(lf, frames - 13, { to: { y: -200 } });
  return (
    <AbsoluteFill>
      <Sfx name="wooshA" at={0} gain={0.8} />
      <Sfx name="popA" at={n} />
      <LightGround frame={lf + relativeTo} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `translate(${drift(lf, frames)}px, ${height * 0.02 + leave.y}px)` }}>
        {lf < preOut + 10 ? (
          <div style={{ position: "absolute" }}>
            <WordLine frame={lf} words={pre} onsets={preOn} size={em("headline", width, height)} weight={weight.headline} tracking={tracking.headline} color={palette.ink} rise={height * 0.05} exits={pre.map((_, i) => preOut + i)} exitRise={120} />
          </div>
        ) : null}
        {fig.visible ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: height * 0.02 }}>
            <div
              style={{
                fontFamily,
                fontSize: em("heroNumber", width, height),
                fontWeight: weight.headline,
                letterSpacing: tracking.display,
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
                color: interpolateColors(lf, [n + 10, n + 18], [ACCENT, palette.ink]),
                transform: `translateY(${fig.y}px)`,
                filter: `blur(${fig.blur}px)`,
                opacity: fig.opacity,
              }}
            >
              {value}
            </div>
            <WordLine frame={lf} words={SURVEY.line} onsets={lineOn} size={em("phrase", width, height)} weight={weight.body} tracking={tracking.phrase} color={palette.inkSoft} rise={height * 0.04} />
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Sponsor: React.FC<{ b: BeatT; st: Stream }> = ({ b, st }) => {
  const [, s2] = b.segs;
  const cut = s2.from - b.from - 6;
  const cardBeat: BeatT = { ...b, frames: cut, segs: [b.segs[0]] };
  return (
    <>
      <Sequence durationInFrames={cut} name="sponsor: card">
        <StreamBeat st={st} b={cardBeat} sweepMark="b" />
      </Sequence>
      <Sequence from={cut} durationInFrames={b.frames - cut} name="sponsor: survey">
        <SurveyFigure seg={s2} relativeTo={b.from + cut} frames={b.frames - cut} />
      </Sequence>
    </>
  );
};

// ---------------------------------------------------------------- recap + close

const RECAP_CUT = [50, 30, 15, 0];
const rowAt0 = (seg: SegT, b: BeatT) => seg.marks[RECAP[1].mark] - b.from - 3; // bar length = the platform's cut (ads ~half, memberships up to 30%, $10 guide 15%, sponsor 0)

const Recap: React.FC<{ b: BeatT }> = ({ b }) => {
  const lf = useCurrentFrame();
  const seg = b.segs[0];
  const TABLE_W = 600;
  const rise = tween(lf, -3, 14, 340, 0, "snapSettle");
  const leave = exit(lf, b.frames - 13, { to: { y: -520 } });
  // Opens close on the header (the comparison's title), pulls back as rows arrive.
  const s = lerp(3.1, 2.8, tween(lf, rowAt0(seg, b) - 6, 18, 0, 1, "softInOut")) * (1 + Math.min(0.02, lf * 0.00012));
  // The ads row is there from the start (no header-only card waiting); the rest land on the voice.
  const rowAt = (i: number) => (i === 0 ? -2 : seg.marks[RECAP[i].mark] - b.from - 3);
  const rowsIn = RECAP.reduce((n, _, i) => n + tween(lf, rowAt(i), 8, 0, 1, "softLand"), 0);
  const grown = 32 + 36 * rowsIn + 1;
  const tableTheme: UiTheme = { ...theme, textSmall: 17, textBase: 19 };
  const bar = tween(lf, rowAt(RECAP.length - 1) + 14, 14, 0, 1, "softLand");
  return (
    <AbsoluteFill>
      <Sfx name="wooshC" at={0} />
      {RECAP.map((r, i) => (
        <Sfx key={r.mark} name="popC" at={rowAt(i)} />
      ))}
      <LightGround frame={lf + b.from} />
      <CameraGroup s={s} x={TABLE_W / 2} y={grown / 2} dy={rise + leave.y}>
        <ContactShadow w={TABLE_W} top={grown - 6} />
        <div style={{ position: "absolute", width: TABLE_W, height: grown, overflow: "hidden", borderRadius: theme.radius, borderBottom: `1px solid ${theme.line}` }}>
          <ShareTable
            columns={[{ header: "Stream", width: 270 }, { header: "Platform's cut" }]}
            rows={RECAP.map((r, i) => ({ cells: [...r.cells], percentage: RECAP_CUT[i] }))}
            width={TABLE_W}
            showBadge={false}
            shareScale={bar}
            theme={tableTheme}
            rowStyle={(i) => {
              const at = rowAt(i);
              const e = enter(lf, at, { from: { y: 14, blur: 0 }, frames: 10 });
              return {
                transform: `translateY(${e.y}px)`,
                visibility: e.visible ? "visible" : "hidden",
                color: lf >= at ? interpolateColors(lf, [at, at + 7], [ACCENT, palette.ink]) : palette.ink,
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
  const { width, height } = useVideoConfig();
  const seg = b.segs[0];
  const lean = tween(lf, b.frames - 10, 10, 0, -100, "crashOut");
  return (
    <AbsoluteFill>
      <Sfx name="wooshA" at={0} gain={0.8} />
      <DarkGround frame={lf} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `translate(${-width * 0.03 + drift(lf, b.frames)}px, ${lean}px)` }}>
        <HeadlineFromVoice seg={seg} relativeTo={b.from} dark maxWordsPerLine={7} size={em("headline", width, height) * 0.85} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- film

const stream = (id: Stream["id"]) => STREAMS.find((s) => s.id === id)!;

const BeatView: React.FC<{ b: BeatT }> = ({ b }) => {
  switch (b.id) {
    case "hook":
      return <Hook b={b} />;
    case "ads":
      return <StreamBeat st={stream("ads")} b={b} carriedIn />;
    case "sponsor":
      return <Sponsor b={b} st={stream("sponsor")} />;
    case "affiliate":
      return <StreamBeat st={stream("affiliate")} b={b} carriedOut />;
    case "product":
      return <StreamBeat st={stream("product")} b={b} carriedIn bigHit="f" />;
    case "member":
      return <StreamBeat st={stream("member")} b={b} />;
    case "recap":
      return <Recap b={b} />;
    case "close":
      return <Close b={b} />;
    default:
      return null;
  }
};

export const MoneyBeyondAds: React.FC = () => (
  <AbsoluteFill style={{ background: palette.ground }}>
    {BEATS.map((b) => (
      <Sequence key={b.id} from={b.from} durationInFrames={b.frames} name={b.id}>
        <BeatView b={b} />
      </Sequence>
    ))}
    <MusicBed music={music} totalFrames={TOTAL_FRAMES} speech={BEATS.flatMap((b) => b.segs).map((s) => [s.from, s.from + s.frames] as [number, number])} />
    {BEATS.flatMap((b) => b.segs).map((s) => (
      <Sequence key={`vo-${s.id}`} from={s.from} durationInFrames={s.frames + 6} name={`vo ${s.id}`}>
        <Audio src={staticFile(s.file)} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
