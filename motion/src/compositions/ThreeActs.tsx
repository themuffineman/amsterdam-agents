/**
 * ThreeActs: voiced 1920x1080 explainer, "Storytelling for creators: the 3-act structure in a
 * 60-second video". Length follows the voiceover (src/films/three-acts/voice.json), ~1:39.
 *
 * PLAN
 * PAGE  P: creators know "setup, tension, resolution" but copy a film's proportions, so a
 *          60-second video spends its first 15 seconds setting up while viewers leave.
 *       A: founders, solo creators, small-team marketers making TikToks/Reels/Shorts; YouTube
 *          upload, sound on, ~1:40.
 *       G: cut act one to the first few seconds and spend the freed time on tension.
 *       E: from "I know the three acts" to "I know which act to cut, and why".
 * One true thing: the three acts survive at sixty seconds, but act one can't keep the quarter
 *   Field gave it; it shrinks to the first few seconds and act two (tension, the part Zak
 *   measured doing the work) takes the time.
 * Data: src/films/three-acts/data.ts (Aristotle's Poetics, sydfield.com, Zak in Cerebrum 2015,
 *   TikTok's ad creative guide, YouTube Help). Nothing on screen a source didn't publish; the
 *   15 s is arithmetic (a quarter of 60), said as such.
 * Shape: one object re-cut, an editor-style track of three act blocks that the film keeps
 *   re-proportioning (pages -> seconds -> squeezed), with two typographic interludes and one
 *   study card. Rejected: typographic essay (the claim is a proportion; type alone can't show a
 *   length changing); montage of creator videos (no footage we have rights to, and it would
 *   be about those creators, not the structure).
 * Length: ~2970 f, set by the voice. Clock smooth 30, crisp grammar (no blur on cuts).
 * Type: Inter, 400-520; headline 0.078-0.09 H, block names 46 px x camera, hero 82% 0.25 H.
 * World: light paper ground with a drifting key light and grain (lib/scene LightGround), the
 *   track is a lit card with a contact shadow; dark ground only for the close. Sound: calm bed
 *   (Gordon Crumb, allowlist #1), dry pops/ticks on block and pin events, one sub drop.
 * Importance (3 of 10 are 3s): squeeze 3, donate 3, scale 3; quote 1, close 1; rest 2.
 * Accent #D4572A, ONE meaning: "act one", the part that changes. Nothing else wears it.
 * Carrier: the track. Field's 120 pages and the 60-second track share one geometry (a quarter,
 *   a half, a quarter), so the ruler hard-replaces pages with seconds and the blocks stay put.
 *   From scale to turns the track is one continuous take with one camera.
 * Cursor: none. Overshoot: spent once, on act one's edge landing at 3 s (crashIn).
 * Hero frame: squeeze beat, ~sq + 14 f (about frame 2140, ~71% in): the wide track, act one
 *   slammed down to a sliver against TikTok's "3 s" pin, act two stretched long with "42 s".
 *
 * #  | role  | imp | Buys: the viewer...                                    | picture (text covered)
 * 1 hook   | hook  | 2 | ...sees the three acts as lengths on a 60 s track, act one about to move | three blocks on a track, the first one's edge pulled in
 * 2 quote  | turn  | 1 | ...knows the rule is old and simple                    | one quoted line arriving word by word
 * 3 field  | proof | 2 | ...sees Field's quarter/half/quarter on a real script length | a strip of 120 pages tinting into three blocks
 * 4 zak    | proof | 2 | ...believes tension changes the viewer's body          | a two-row card, one row lit, one dim
 * 5 donate | proof | 3 | ...has a number for it (82%)                           | one huge figure counting up
 * 6 attn   | proof | 2 | ...knows tension rises and falls, peaking late         | a line of words riding a wave, last word highest
 * 7 scale  | turn  | 3 | ...sees a quarter of 60 s is 15 s, past TikTok's and YouTube's marks | the same track, pins dropping onto it
 * 8 squeeze| proof | 3 | ...sees act one cut to 3 s and act two take the time   | act one slammed to a sliver, act two long
 * 9 turns  | proof | 2 | ...knows what to put in the freed middle and the end   | pins inside act two, then one in act three
 * 10 close | cta   | 1 | ...knows how to check their own video                   | one line on dark ground
 * Seams: hook/field/zak/donate exit up on accelExit into a hard cut, next beat rises already
 *   moving; field -> scale carries the track geometry; scale -> squeeze -> turns is one take.
 */
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { cameraSnap, enter, exit, tween } from "../lib/eases";
import { DarkGround, LightGround, MAX_CREEP, WordLine, drift } from "../lib/scene";
import { Sfx } from "../lib/sfx";
import { MusicBed } from "../lib/music";
import music from "../films/three-acts/music.json";
import { em, fontFamily, palette, tracking, weight } from "../lib/tokens";
import { ANSWER, FIELD, MARKERS, PAGES, QUOTE, SCALED, SQUEEZED, TURNS, VIDEO, ZAK } from "../films/three-acts/data";
import { BEATS, TOTAL_FRAMES, beat, wordOnsets, type BeatT, type SegT } from "../films/three-acts/timeline";

export const THREE_ACTS = { durationInFrames: TOTAL_FRAMES } as const;

const ACCENT = "#D4572A";
const ACT2 = "#2B2A27";
const ACT3 = "#8C8781";
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

const CameraGroup: React.FC<{ s: number; x: number; y: number; dy?: number; bounds?: { w: number; h: number }; children: React.ReactNode }> = ({
  s,
  x: rawX,
  y: rawY,
  dy = 0,
  bounds,
  children,
}) => {
  const { width, height } = useVideoConfig();
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
  <div style={{ position: "absolute", left: 20, top, width: w - 40, height: 26, borderRadius: "50%", background: "rgba(60,50,40,0.16)", filter: "blur(14px)" }} />
);

// ---------------------------------------------------------------- the track

const TRACK_W = 1600;
const PADX = 40;
const CW = TRACK_W + PADX * 2;
const BAND = 170; // pin chips live above the blocks
const BLOCK_Y = BAND;
const BLOCK_H = 170;
const RULER_Y = BLOCK_Y + BLOCK_H + 18;
const CH = RULER_Y + 70;
const LEVEL_Y = [96, 26]; // chip top per level

interface Pin {
  u: number;
  label: string;
  by?: string;
  level: number;
  on: number;
  /** Frame the pin leaves (chip exits up, line retracts). */
  leave?: number;
}

interface TrackProps {
  lf: number;
  units: number;
  e1: number;
  e2: number;
  names: [string, string, string];
  subs?: (string | null)[];
  blockOn: [number, number, number];
  ruler: { u: number; label: string }[];
  rulerOn: number;
  /** Field beat: the empty script strip shown before the blocks tint in. */
  pages?: { on: number };
  pins?: Pin[];
}

const Track: React.FC<TrackProps> = ({ lf, units, e1, e2, names, subs = [], blockOn, ruler, rulerOn, pages, pins = [] }) => {
  const ux = (u: number) => PADX + (u / units) * TRACK_W;
  const edges = [0, e1, e2, units];
  const colors = [ACCENT, ACT2, ACT3];
  const pageW = TRACK_W / PAGES;
  const minor = units === PAGES ? 10 : 1;
  const ticks = Array.from({ length: Math.floor(units / minor) + 1 }, (_, i) => i * minor);
  const rulerE = enter(lf, rulerOn, { from: { y: 10, blur: 0 }, frames: 8 });
  return (
    <div style={{ position: "absolute", width: CW, height: CH, fontFamily }}>
      <ContactShadow w={CW} top={CH - 10} />
      <div style={{ position: "absolute", inset: 0, background: palette.surface, border: `1px solid ${palette.line}`, borderRadius: 18 }} />
      {/* The script strip: one hairline per page (field beat only). */}
      {pages && lf >= pages.on ? (
        <div
          style={{
            position: "absolute",
            left: PADX,
            top: BLOCK_Y,
            width: TRACK_W,
            height: BLOCK_H,
            borderRadius: 10,
            background: `repeating-linear-gradient(90deg, ${palette.surfaceSunken} 0px, ${palette.surfaceSunken} ${pageW - 2}px, #D9D7D0 ${pageW - 2}px, #D9D7D0 ${pageW}px)`,
            clipPath: `inset(0 ${100 - tween(lf, pages.on, 12, 0, 100, "softLand")}% 0 0)`,
          }}
        />
      ) : null}
      {[0, 1, 2].map((i) => {
        const on = blockOn[i];
        if (lf < on) return null;
        const left = ux(edges[i]) + (i === 0 ? 0 : 5);
        const right = ux(edges[i + 1]) - (i === 2 ? 0 : 5);
        const w = Math.max(10, right - left);
        const e = enter(lf, on, { from: { y: 18, blur: 0 }, frames: 9 });
        const narrow = w < 230;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left,
              top: BLOCK_Y,
              width: w,
              height: BLOCK_H,
              borderRadius: 10,
              transform: `translateY(${e.y}px)`,
              background: pages
                ? `repeating-linear-gradient(90deg, ${colors[i]} 0px, ${colors[i]} ${pageW - 2}px, rgba(255,255,255,0.10) ${pageW - 2}px, rgba(255,255,255,0.10) ${pageW}px)`
                : colors[i],
              backgroundPosition: `${-(left - PADX)}px 0`,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), 0 3px 8px rgba(30,25,20,0.14)",
              color: palette.surface,
              overflow: "hidden",
            }}
          >
            {narrow ? (
              <div style={{ position: "absolute", left: 0, right: 0, top: 62, textAlign: "center", fontSize: 46, fontWeight: 520 }}>{i + 1}</div>
            ) : (
              <div style={{ position: "absolute", left: 24, top: 50, whiteSpace: "nowrap" }}>
                <div style={{ fontSize: 46, fontWeight: 500, letterSpacing: "-0.02em" }}>{names[i]}</div>
                {subs[i] ? <div style={{ marginTop: 10, fontSize: 34, fontWeight: 420, color: "rgba(251,251,250,0.72)", fontVariantNumeric: "tabular-nums" }}>{subs[i]}</div> : null}
              </div>
            )}
          </div>
        );
      })}
      {/* Ruler */}
      {rulerE.visible ? (
        <div style={{ position: "absolute", left: 0, top: RULER_Y, width: CW, height: 60, transform: `translateY(${rulerE.y}px)` }}>
          {ticks.map((t) => (
            <div key={t} style={{ position: "absolute", left: ux(t) - 1, top: 0, width: 2, height: t % (minor * 5) === 0 ? 14 : 7, background: "#C9C6BE" }} />
          ))}
          {ruler.map((r) => (
            <div
              key={r.label}
              style={{
                position: "absolute",
                left: ux(r.u),
                top: 20,
                transform: `translateX(${r.u === 0 ? 0 : r.u === units ? -100 : -50}%)`,
                fontSize: 26,
                color: palette.inkMuted,
                fontVariantNumeric: "tabular-nums",
                whiteSpace: "nowrap",
              }}
            >
              {r.label}
            </div>
          ))}
        </div>
      ) : null}
      {/* Pins: a line poking into the block's top edge (clear of the names), a chip in the
          band above. Lines first, then every chip on top, so a line never crosses a chip.
          A pin with `leave` pulls its line up and its chip exits up and out of the card. */}
      {pins.map((p) => {
        if (lf < p.on || (p.leave !== undefined && lf >= p.leave + 6)) return null;
        const lineTop = LEVEL_Y[p.level] + 58;
        const full = BLOCK_Y + 34 - lineTop;
        const lineH = p.leave !== undefined && lf >= p.leave ? tween(lf, p.leave, 6, full, 0, "accelExit") : tween(lf, p.on, 7, 0, full, "softLand");
        return (
          <div key={`l-${p.label}`} style={{ position: "absolute", left: ux(p.u) - 2, top: lineTop, width: 4, height: lineH, borderRadius: 2, background: palette.ink, boxShadow: "0 0 0 2px rgba(251,251,250,0.9)" }} />
        );
      })}
      {pins.map((p) => {
        if (lf < p.on) return null;
        const e = enter(lf, p.on, { from: { y: -22, blur: 0 }, frames: 11, easing: "snapSettle" });
        const x = p.leave !== undefined ? exit(lf, p.leave, { to: { y: -260 }, frames: 11 }) : null;
        if (x && !x.visible) return null;
        const top = LEVEL_Y[p.level];
        return (
          <div key={p.label} style={{ position: "absolute", left: 0, top: x?.y ?? 0 }}>
            <div
              style={{
                position: "absolute",
                left: ux(p.u) - 18,
                top,
                transform: `translateY(${e.y}px)`,
                padding: "8px 16px",
                borderRadius: 999,
                background: palette.ink,
                color: palette.surface,
                fontSize: 32,
                fontWeight: 480,
                whiteSpace: "nowrap",
                boxShadow: "0 4px 10px rgba(30,25,20,0.14)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {p.label}
              {p.by ? <span style={{ color: "rgba(251,251,250,0.55)", marginLeft: 12, fontSize: 26 }}>{p.by}</span> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const SECONDS_RULER = [0, 15, 30, 45, 60].map((u) => ({ u, label: `${u} s` }));
const PAGES_RULER = [0, 30, 60, 90, 120].map((u) => ({ u, label: u === 0 ? "p. 1" : `p. ${u}` }));
const tx = (u: number, units = VIDEO) => PADX + (u / units) * TRACK_W;
const WIDE: Shot = { at: 0, s: 1.06, x: CW / 2, y: CH / 2 };

// ---------------------------------------------------------------- headline helper

const HeadlineFromVoice: React.FC<{ seg: SegT; relativeTo: number; dark?: boolean; size?: number; maxWordsPerLine?: number; count?: number }> = ({
  seg,
  relativeTo,
  dark,
  size,
  maxWordsPerLine = 7,
  count,
}) => {
  const lf = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const fs = size ?? em("headline", width, height) * 0.86;
  const words = wordOnsets(seg, relativeTo).slice(0, count);
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

/** A local-frame view of a beat's marks. */
const marksOf = (b: BeatT) => {
  const m: Record<string, number> = {};
  for (const s of b.segs) for (const [k, v] of Object.entries(s.marks)) m[`${s.id}.${k}`] = v - b.from;
  return m;
};

// ---------------------------------------------------------------- 1 hook

const Hook: React.FC<{ b: BeatT }> = ({ b }) => {
  const lf = useCurrentFrame();
  const m = marksOf(b);
  const sq = m["hook.sq"];
  const e1 = SCALED.setupEnd - tween(lf, sq, 16, 0, 6, "glide");
  const rise = tween(lf, -3, 14, 320, 0, "snapSettle");
  const leave = exit(lf, b.frames - 13, { to: { y: -620 } });
  const cam = camera(lf, [WIDE, { at: sq - 4, s: 1.5, x: tx(9), y: CH / 2 + 20 }]);
  return (
    <AbsoluteFill>
      <Sfx name="wooshA" at={0} />
      <Sfx name="popA" at={2} />
      <Sfx name="popB" at={5} />
      <Sfx name="popC" at={7} />
      <Sfx name="press" at={sq} />
      <LightGround frame={lf + b.from} />
      <CameraGroup s={cam.s} x={cam.x} y={cam.y} dy={rise + leave.y} bounds={{ w: CW, h: CH }}>
        <Track
          lf={lf}
          units={VIDEO}
          e1={e1}
          e2={45}
          names={["Act one", "Act two", "Act three"]}
          blockOn={[2, 5, 7]}
          ruler={SECONDS_RULER}
          rulerOn={9}
        />
      </CameraGroup>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 2 quote

const Quote: React.FC<{ b: BeatT }> = ({ b }) => {
  const lf = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const seg = b.segs[0];
  const spoken = wordOnsets(seg, b.from);
  // The quote is the last 13 spoken words.
  const qWords = spoken.slice(spoken.length - QUOTE.words.length);
  const fs = em("headline", width, height) * 0.86;
  const split = 6;
  // "Aristotle wrote the rule down in the Poetics." is on screen until the quote starts,
  // then leaves up and the quote replaces it (the attribution line arrives with the quote).
  const lead = spoken.slice(0, spoken.length - QUOTE.words.length);
  const swapAt = qWords[0].at - 2;
  const leadLeave = exit(lf, swapAt - 9, { to: { y: -200 }, frames: 9 });
  const by = enter(lf, swapAt + 4, { from: { y: 20, blur: 3 }, frames: 12 });
  const leave = exit(lf, b.frames - 13, { to: { y: -200 } });
  if (lf < swapAt)
    return (
      <AbsoluteFill>
        <Sfx name="wooshB" at={0} gain={0.7} />
        <LightGround frame={lf + b.from} />
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `translate(${drift(lf, swapAt)}px, ${height * 0.02 + leadLeave.y}px)` }}>
          <WordLine frame={lf} words={lead.map((w) => w.word)} onsets={lead.map((w) => w.at)} size={fs} weight={weight.headline} tracking={tracking.headline} color={palette.ink} rise={height * 0.05} />
        </AbsoluteFill>
      </AbsoluteFill>
    );
  const line = (from: number, to: number) => (
    <WordLine
      frame={lf}
      words={QUOTE.words.slice(from, to)}
      onsets={qWords.slice(from, to).map((w) => w.at)}
      size={fs}
      weight={weight.headline}
      tracking={tracking.headline}
      color={palette.ink}
      rise={height * 0.05}
    />
  );
  return (
    <AbsoluteFill>
      <Sfx name="wooshB" at={0} gain={0.7} />
      <LightGround frame={lf + b.from} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `translate(${drift(lf, b.frames)}px, ${leave.y}px)` }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: fs * 0.3, marginLeft: -width * 0.03 }}>
          {line(0, split)}
          {line(split, QUOTE.words.length)}
          <div
            style={{
              marginTop: fs * 0.35,
              fontFamily,
              fontSize: em("phrase", width, height) * 0.8,
              fontWeight: 420,
              color: palette.inkMuted,
              transform: `translateY(${by.y}px)`,
              filter: `blur(${by.blur}px)`,
              opacity: by.opacity,
            }}
          >
            {QUOTE.by}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 3 field

const Field: React.FC<{ b: BeatT }> = ({ b }) => {
  const lf = useCurrentFrame();
  const m = marksOf(b);
  const on: [number, number, number] = [m["field1.s"], m["field1.c"], m["field1.r"]];
  const p = [m["field2.p1"], m["field2.p2"], m["field2.p3"]];
  const subs = FIELD.map((f, i) => (lf >= p[i] ? f.label : null));
  const rise = tween(lf, -3, 14, 320, 0, "snapSettle");
  const leave = exit(lf, b.frames - 13, { to: { y: -620 } });
  const mid = (i: number) => tx((FIELD[i].from + FIELD[i].to) / 2, PAGES);
  const cam = camera(lf, [
    WIDE,
    { at: p[0] - 4, s: 1.75, x: mid(0) + 120, y: CH / 2 + 10 },
    { at: p[1] - 4, s: 1.45, x: mid(1), y: CH / 2 + 10 },
    { at: p[2] - 4, s: 1.75, x: mid(2) - 60, y: CH / 2 + 10 },
  ]);
  return (
    <AbsoluteFill>
      <Sfx name="wooshC" at={0} gain={0.7} />
      {on.map((f, i) => (
        <Sfx key={i} name={(["popA", "popB", "popC"] as const)[i]} at={f} />
      ))}
      {p.map((f, i) => (
        <Sfx key={`p${i}`} name="tick" at={f} />
      ))}
      <LightGround frame={lf + b.from} />
      <CameraGroup s={cam.s} x={cam.x} y={cam.y} dy={rise + leave.y} bounds={{ w: CW, h: CH }}>
        <Track
          lf={lf}
          units={PAGES}
          e1={30}
          e2={90}
          names={FIELD.map((f) => f.name) as [string, string, string]}
          subs={subs}
          blockOn={on}
          ruler={PAGES_RULER}
          rulerOn={4}
          pages={{ on: 0 }}
        />
      </CameraGroup>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 4 zak

const Zak: React.FC<{ b: BeatT }> = ({ b }) => {
  const lf = useCurrentFrame();
  const { height } = useVideoConfig();
  const m = marksOf(b);
  const [s1] = b.segs;
  const v = m["zak1.v"];
  const cardFrom = v - 6;
  const firstSentence = s1.text.split(".")[0].split(/\s+/).filter(Boolean).length;
  const lineLeave = exit(lf, cardFrom - 10, { to: { y: -220 }, frames: 10 });
  const rowsOn = [m["zak2.up"], m["zak2.flat"]];
  const CARD_W = 1240;
  const ROW_H = 120;
  const HEAD_H = 120;
  // The card grows as each row arrives (no empty card waiting for rows).
  const rowsIn = rowsOn.reduce((n, at) => n + tween(lf, at - 3, 9, 0, 1, "softLand"), 0);
  const CARD_H = HEAD_H + ROW_H * rowsIn + 8;
  const rise = tween(lf, cardFrom - 2, 14, 360, 0, "snapSettle");
  const leave = exit(lf, b.frames - 13, { to: { y: -620 } });
  const s = 1.32 * (1 + Math.min(0.02, Math.max(0, lf - cardFrom) * 0.0001));
  return (
    <AbsoluteFill>
      <LightGround frame={lf + b.from} />
      {lf < cardFrom ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `translate(${drift(lf, cardFrom)}px, ${height * 0.02 + lineLeave.y}px)` }}>
          <HeadlineFromVoice seg={s1} relativeTo={b.from} count={firstSentence} maxWordsPerLine={6} />
        </AbsoluteFill>
      ) : (
        <>
          <Sfx name="wooshA" at={cardFrom} gain={0.7} />
          {rowsOn.map((f, i) => (
            <Sfx key={i} name="press" at={f} gain={i ? 0.6 : 1} />
          ))}
          <CameraGroup s={s} x={CARD_W / 2} y={CARD_H / 2} dy={rise + leave.y}>
            <ContactShadow w={CARD_W} top={CARD_H - 10} />
            <div style={{ position: "absolute", width: CARD_W, height: CARD_H, background: palette.surface, border: `1px solid ${palette.line}`, borderRadius: 18, fontFamily, overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 40, top: 34, fontSize: 40, fontWeight: 500, color: palette.ink, letterSpacing: "-0.02em" }}>{ZAK.film}</div>
              <div style={{ position: "absolute", right: 40, top: 44, fontSize: 26, color: palette.inkMuted }}>{ZAK.by}</div>
              {ZAK.rows.map((r, i) => {
                const at = rowsOn[i];
                const e = enter(lf, at, { from: { y: 16, blur: 0 }, frames: 9 });
                if (!e.visible) return null;
                const flat = i === 1;
                return (
                  <div
                    key={r.name}
                    style={{
                      position: "absolute",
                      left: 0,
                      top: HEAD_H + i * ROW_H,
                      width: CARD_W,
                      height: ROW_H,
                      borderTop: `1px solid ${palette.line}`,
                      transform: `translateY(${e.y}px)`,
                      display: "flex",
                      alignItems: "center",
                      fontSize: 44,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    <div style={{ width: 560, paddingLeft: 40, color: flat ? palette.inkMuted : palette.ink, fontWeight: 480 }}>{r.name}</div>
                    <div style={{ color: flat ? palette.inkMuted : palette.ink, fontWeight: flat ? 400 : 500 }}>{r.result}</div>
                  </div>
                );
              })}
            </div>
          </CameraGroup>
        </>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 5 donate (82%)

const COUNT = [4, 13, 25, 37, 48, 57, 64, 70, 74, 77, 79, 80, 81, 81, 82];

const Donate: React.FC<{ b: BeatT }> = ({ b }) => {
  const lf = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const m = marksOf(b);
  const p = m["zak3.p"];
  const seg = b.segs[0];
  const spoken = wordOnsets(seg, b.from);
  const lead = spoken.filter((w) => w.at < p - 2);
  const leadLeave = exit(lf, p - 8, { to: { y: -180 }, frames: 9 });
  const k = lf - p;
  const value = k < 0 ? null : COUNT[Math.min(COUNT.length - 1, k)];
  const numE = enter(lf, p, { from: { y: height * 0.06, blur: 0 }, frames: 12, easing: "snapSettle" });
  const subOn = p + COUNT.length - 2;
  const sub = enter(lf, subOn, { from: { y: 26, blur: 4 }, frames: 13 });
  const leave = exit(lf, b.frames - 13, { to: { y: -260 } });
  return (
    <AbsoluteFill>
      <Sfx name="wooshB" at={0} gain={0.6} />
      <Sfx name="popA" at={p} />
      <Sfx name="tick" at={subOn} />
      <LightGround frame={lf + b.from} />
      {lf < p + 1 ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `translate(${drift(lf, p)}px, ${height * 0.02 + leadLeave.y}px)` }}>
          <WordLine
            frame={lf}
            words={lead.map((w) => w.word)}
            onsets={lead.map((w) => w.at)}
            size={em("headline", width, height) * 0.86}
            weight={weight.headline}
            tracking={tracking.headline}
            color={palette.ink}
            rise={height * 0.05}
          />
        </AbsoluteFill>
      ) : null}
      {value !== null ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `translate(${-width * 0.02 + drift(lf - p, b.frames - p, -30)}px, ${leave.y}px)` }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", fontFamily }}>
            <div
              style={{
                fontSize: em("heroNumber", width, height) * 1.05,
                fontWeight: 460,
                letterSpacing: "-0.05em",
                color: "#111110",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
                transform: `translateY(${numE.y}px)`,
                opacity: numE.opacity,
              }}
            >
              {value}%
            </div>
            <div style={{ marginTop: height * 0.035, fontSize: em("phrase", width, height), fontWeight: 420, color: palette.inkSoft, letterSpacing: "-0.02em", transform: `translateY(${sub.y}px)`, filter: `blur(${sub.blur}px)`, opacity: sub.opacity, visibility: sub.visible ? "visible" : "hidden" }}>
              {ZAK.accuracyLine}
            </div>
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 6 attention: words ride the wave

const WAVE = [
  { w: "It", y: 0 },
  { w: "rose", y: -120 },
  { w: "and", y: -40 },
  { w: "fell,", y: 110 },
  { w: "and", y: 40 },
  { w: "peaked", y: -70 },
  { w: "at", y: -130 },
  { w: "the", y: -175 },
  { w: "climax.", y: -250 },
];

const Attention: React.FC<{ b: BeatT }> = ({ b }) => {
  const lf = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const seg = b.segs[0];
  const spoken = wordOnsets(seg, b.from);
  const firstN = spoken.length - WAVE.length;
  const waveOn = spoken.slice(firstN).map((w) => w.at);
  const swapAt = waveOn[0] - 2;
  const leadLeave = exit(lf, swapAt - 9, { to: { y: -200 }, frames: 9 });
  const fs = em("headline", width, height) * 0.86;
  const leave = exit(lf, b.frames - 12, { to: { y: -300 } });
  return (
    <AbsoluteFill>
      <LightGround frame={lf + b.from} />
      {lf < swapAt ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `translate(${drift(lf, swapAt)}px, ${height * 0.02 + leadLeave.y}px)` }}>
          <HeadlineFromVoice seg={seg} relativeTo={b.from} count={firstN} maxWordsPerLine={5} />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `translate(${-width * 0.02 + drift(lf - swapAt, b.frames - swapAt, -30)}px, ${height * 0.08 + leave.y}px)` }}>
          <div style={{ display: "flex", alignItems: "center", gap: fs * 0.26, fontFamily, fontSize: fs, fontWeight: weight.headline, letterSpacing: tracking.headline, color: palette.ink }}>
            {WAVE.map((wv, i) => {
              const at = waveOn[i];
              const e = enter(lf, at, { from: { y: height * 0.06, blur: 4 }, frames: 14 });
              // Each word travels to its height on the wave after it lands, so the line visibly rises and falls.
              const ride = tween(lf, at + 2, 16, 0, wv.y, "softInOut");
              const last = i === WAVE.length - 1;
              return (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    transform: `translateY(${e.y + ride}px) scale(${last ? tween(lf, at + 2, 16, 1, 1.25, "softInOut") : 1})`,
                    transformOrigin: "left center",
                    filter: `blur(${e.blur}px)`,
                    opacity: e.opacity,
                    visibility: e.visible ? "visible" : "hidden",
                    color: ["and", "at", "the"].includes(wv.w) ? palette.connective : palette.ink,
                  }}
                >
                  {wv.w}
                </span>
              );
            })}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 7-9 the 60-second track, one take

const TrackAct: React.FC<{ scale: BeatT; squeeze: BeatT; turns: BeatT }> = ({ scale, squeeze, turns }) => {
  const lf = useCurrentFrame();
  const from = scale.from;
  const abs = (b: BeatT) => {
    const m: Record<string, number> = {};
    for (const s of b.segs) for (const [k, v] of Object.entries(s.marks)) m[`${s.id}.${k}`] = v - from;
    return m;
  };
  const m = { ...abs(scale), ...abs(squeeze), ...abs(turns) };
  const scaleSeg = scale.segs[0];
  // "...to sixty seconds": the ruler swaps pages for seconds on "sixty".
  const sixty = wordOnsets(scaleSeg, from).find((w) => w.word.toLowerCase().startsWith("sixty"))?.at ?? 30;
  const q = m["scale.q"];
  const sq = m["squeeze.sq"];
  const t = m["squeeze.t"];
  const sqStart = squeeze.from - from;
  const turnsStart = turns.from - from;
  const end = turns.from + turns.frames - from;

  // Act one's edge: 15 s, then slammed to 3 s (the film's one overshoot).
  const e1 = lf < sq ? SCALED.setupEnd : tween(lf, sq, 10, SCALED.setupEnd, SQUEEZED.setupEnd, "crashIn");
  const isPages = lf < sixty;
  const units = VIDEO;
  const ruler = isPages ? PAGES_RULER.map((r) => ({ u: r.u / 2, label: r.label })) : SECONDS_RULER;
  const subs = [
    lf >= q ? `${lf >= sq + 4 ? SQUEEZED.setupEnd : SCALED.setupEnd} s` : null,
    lf >= q ? `${lf >= sq + 4 ? 45 - SQUEEZED.setupEnd : 30} s` : null,
    lf >= q ? "15 s" : null,
  ];

  const pins: Pin[] = [
    ...MARKERS.map((mk, i) => ({ u: mk.at, label: mk.label, by: mk.by, level: mk.level, on: m[`platform.${mk.mark}`], leave: turnsStart + i * 2 })),
    ...TURNS.map((tn) => ({ u: tn.at, label: tn.text, level: tn.level, on: m[`turns.${tn.mark}`] })),
    { u: ANSWER.at, label: ANSWER.text, level: ANSWER.level, on: m["resolve.r"] },
  ];

  const yMid = CH / 2 + 10;
  const shots: Shot[] = [
    WIDE,
    { at: q - 4, s: 1.8, x: tx(7.5) + 140, y: yMid },
    { at: m["platform.t3"] - 6, s: 2.2, x: tx(6) + 160, y: CH / 2 - 40 },
    { at: m["platform.y30"] - 6, s: 1.3, x: tx(26), y: CH / 2 - 20 },
    { at: sqStart - 8, s: 1.06, x: CW / 2, y: CH / 2 },
    { at: t - 4, s: 1.3, x: tx(25), y: CH / 2 - 10 },
    { at: m["turns.a"] - 6, s: 1.3, x: tx(24.5), y: CH / 2 - 20 },
    { at: m["resolve.r"] - 6, s: 1.9, x: tx(52), y: CH / 2 - 30 },
  ];
  const cam = camera(lf, shots);
  const rise = tween(lf, -3, 14, 320, 0, "snapSettle");
  const leave = exit(lf, end - 13, { to: { y: -620 } });
  return (
    <AbsoluteFill>
      <Sfx name="wooshC" at={0} gain={0.7} />
      <Sfx name="tick" at={sixty} />
      <Sfx name="press" at={q} />
      {MARKERS.map((mk) => (
        <Sfx key={mk.mark} name="popB" at={m[`platform.${mk.mark}`]} />
      ))}
      <Sfx name="subDrop" at={sq} maxFrames={70} />
      <Sfx name="press" at={sq} />
      <Sfx name="tick" at={t} />
      {TURNS.map((tn) => (
        <Sfx key={tn.mark} name="popC" at={m[`turns.${tn.mark}`]} />
      ))}
      <Sfx name="popA" at={m["resolve.r"]} />
      <LightGround frame={lf + from} />
      <CameraGroup s={cam.s} x={cam.x} y={cam.y} dy={rise + leave.y} bounds={{ w: CW, h: CH }}>
        <Track
          lf={lf}
          units={units}
          e1={e1}
          e2={45}
          names={["Act one", "Act two", "Act three"]}
          subs={subs}
          blockOn={[-30, -30, -30]}
          ruler={ruler}
          rulerOn={-30}
          pins={pins}
        />
      </CameraGroup>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 10 close

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
        <HeadlineFromVoice seg={seg} relativeTo={b.from} dark maxWordsPerLine={6} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- film

const ONE: Record<string, React.FC<{ b: BeatT }>> = { hook: Hook, quote: Quote, field: Field, zak: Zak, donate: Donate, attention: Attention, close: Close };

export const ThreeActs: React.FC = () => {
  const sc = beat("scale");
  const tu = beat("turns");
  return (
    <AbsoluteFill style={{ background: palette.ground }}>
      {BEATS.filter((b) => ONE[b.id]).map((b) => {
        const C = ONE[b.id];
        return (
          <Sequence key={b.id} from={b.from} durationInFrames={b.frames} name={b.id}>
            <C b={b} />
          </Sequence>
        );
      })}
      <Sequence from={sc.from} durationInFrames={tu.from + tu.frames - sc.from} name="track: scale, squeeze, turns">
        <TrackAct scale={sc} squeeze={beat("squeeze")} turns={tu} />
      </Sequence>
      <MusicBed music={music} totalFrames={TOTAL_FRAMES} speech={BEATS.flatMap((b) => b.segs).map((s) => [s.from, s.from + s.frames] as [number, number])} />
      {BEATS.flatMap((b) => b.segs).map((s) => (
        <Sequence key={`vo-${s.id}`} from={s.from} durationInFrames={s.frames + 6} name={`vo ${s.id}`}>
          <Audio src={staticFile(s.file)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
