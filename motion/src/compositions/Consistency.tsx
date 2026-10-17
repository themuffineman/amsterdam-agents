/**
 * Consistency: voiced 1920x1080 explainer, "Do you need to be consistent with content, or is
 * that a myth?" Length follows the voiceover (src/films/consistency-myth/voice.json), ~1:37.
 *
 * PLAN
 * PAGE  P: creators are told "post on schedule or the algorithm buries you" and burn out
 *          guarding a calendar they think is being watched.
 *       A: founders / solo creators / small-team marketers making Shorts, Reels, TikToks;
 *          watching a YouTube explainer with sound on, ~1.5 min.
 *       G: stop guarding a fixed day; post as much as quality allows; take breaks without guilt.
 *       E: relief, plus a clear rule they can act on.
 * One true thing: platforms score each video on how viewers react, so the schedule itself
 *   counts for nothing, but the number of videos you post still tracks with growth.
 * Data: src/films/consistency-myth/data.ts (YouTube Help x2, TikTok Newsroom 2020, Buffer
 *   consistency study, vidIQ 2026 frequency study). Help-page shots are real captures with
 *   the FAQ answers expanded; highlight boxes are measured on the capture, not guessed.
 * Shape: data documentary on two real objects: the YouTube Help page (what the platform says)
 *   and diagrams rebuilt from published numbers (what the studies measured). One carried
 *   object, the upload track, returns from "each" into "why".
 *   Rejected: typographic essay (the claims are quotes; type alone on a ground is a deck);
 *   montage of real output (no footage we have rights to; invented thumbnails are banned).
 * Length: 2918 f (97.3 s), beats from the voice.
 * Clock smooth 30, crisp grammar (no blur on moves except word arrival). Type: Inter, 400-520,
 *   page text magnified by the camera (16 px x 2.75 = 44 px), card text >= 0.04 H at its shot.
 * World: act 1-3 light ground (key top-left, grain) with the captured page as the lit sheet;
 *   close on the dark ground. Sound: calm bed (allowlist #11), dry UI cues, one hit (v3).
 * Importance: hook 3, each 2, breaks 1, weeks 2, volume 3, why 2, close 1 (2 of 7 are 3s).
 * Accent #E8642C, ONE meaning: "the finding" (highlight on the quoted sentence, +450%, the
 *   12+ bar and 4.1x chip, the 90-day window). Signal colour: none.
 * Carrier: the upload track (each -> why). Cursor: none.
 * Hero frame: ~1957 (volume beat, 20 f after v3): vidIQ tier card at 1.3x, the "12+ a month"
 *   row's accent bar landed at 2.18% with 13 upload ticks in its month strip, 0.53% row
 *   above it in ink. Built first as a still.
 * Overshoot: none. Scale spent on: hook pull-back, volume push.
 *
 * # | role  | imp | Buys: the viewer...                                   | picture (text covered)                 | moves / into next
 * 1 | hook  | 3   | learns YouTube itself says gaps between uploads don't  | magnified help page, accent bar wipes  | pull back to the FAQ list, page
 *   |       |     | correlate with view growth                             | behind a sentence                      | exits up -> track rises
 * 2 | proof | 2   | sees that each video is scored alone, on its signals   | strip of video tiles on a week ruler,  | camera snaps wide, more tiles drop in
 *   |       |     |                                                        | one ringed, words stacked beside it    | on "amount", quote lands; exits up
 * 3 | proof | 1   | knows breaks aren't punished, only the audience cools  | the help page again, two highlights    | exits up -> card rises
 * 4 | turn  | 2   | sees regular weeks line up with 450% more engagement   | two 26-week rows, one nearly full      | push to +450%; exits up
 * 5 | proof | 3   | sees volume line up with ~4x view growth, and that     | five rows: month strips with upload    | push row 0 -> pan row 4 (hero) ->
 *   |       |     | it's correlation                                       | ticks, bars growing                    | pull wide, card blurs under the quote
 * 6 | proof | 2   | gets what consistency means to an algorithm: more      | the upload track returns, a 90-day     | cut to the help page, last highlight
 *   |       |     | videos inside the window it scores                     | window slides over it                  |
 * 7 | close | 1   | leaves with the rule                                   | dark ground, one line on the voice     | leans out on the last frames
 */
import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { cameraSnap, enter, exit, staggerOnsets, tween } from "../lib/eases";
import { DarkGround, LightGround, MAX_CREEP, WordLine, drift } from "../lib/scene";
import { Sfx } from "../lib/sfx";
import { MusicBed } from "../lib/music";
import music from "../films/consistency-myth/music.json";
import { em, fontFamily, palette, tracking, weight } from "../lib/tokens";
import { withAlpha } from "../ui-kit";
import { BUFFER, PAGES, SIGNALS, TIKTOK_QUOTE, TRACK, VIDIQ, WINDOW_DAYS, type PageCapture } from "../films/consistency-myth/data";
import { BEATS, TOTAL_FRAMES, wordOnsets, type BeatT, type SegT } from "../films/consistency-myth/timeline";

export const CONSISTENCY = { durationInFrames: TOTAL_FRAMES } as const;

/** The film's one accent: "the finding". */
const ACCENT = "#E8642C";
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// ---------------------------------------------------------------- camera (same model as BestTimes)

interface Shot {
  at: number;
  s: number;
  x: number;
  y: number;
}
const CREEP = 0.0006;

/** Camera state at a local frame: big scale changes snap (cameraSnap), small ones pan 14 f. */
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

/** The one camera group: focus point (x, y) in content coordinates lands on frame centre. */
const CameraGroup: React.FC<{ s: number; x: number; y: number; dx?: number; dy?: number; bounds?: { w: number; h: number }; style?: React.CSSProperties; children: React.ReactNode }> = ({
  s,
  x: rawX,
  y: rawY,
  dx = 0,
  dy = 0,
  bounds,
  style,
  children,
}) => {
  const { width, height } = useVideoConfig();
  const clampAxis = (v: number, view: number, size: number) => (view >= size ? size / 2 : Math.min(size - view / 2, Math.max(view / 2, v)));
  const x = bounds ? clampAxis(rawX, width / s, bounds.w) : rawX;
  const y = bounds ? clampAxis(rawY, height / s, bounds.h) : rawY;
  return (
    <AbsoluteFill style={{ transformOrigin: "0 0", transform: `translate(${width / 2 - x * s + dx}px, ${height / 2 - y * s + dy}px) scale(${s})`, ...style }}>
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

/** Absolute mark frame -> frame local to `relativeTo`. */
const markAt = (seg: SegT, key: string, relativeTo: number) => {
  const m = seg.marks[key];
  if (m === undefined) throw new Error(`segment ${seg.id} has no mark {${key}}`);
  return m - relativeTo;
};

/** Spoken onset of the n-th word starting with `prefix` (n = -1 for the last one). */
const wordAt = (seg: SegT, relativeTo: number, prefix: string, n = 0) => {
  const hits = wordOnsets(seg, relativeTo).filter((w) => w.word.toLowerCase().startsWith(prefix));
  const hit = n < 0 ? hits[hits.length + n] : hits[n];
  if (!hit) throw new Error(`no word "${prefix}" in ${seg.id}`);
  return hit.at;
};

// ---------------------------------------------------------------- the captured help page

/**
 * A real YouTube Help capture (answers expanded) through the camera. Highlights are solid
 * accent boxes behind the quoted phrase (multiply over the page), each line wiping in 6 f.
 */
/** Ground showing left of the page, so flush-left text never touches the frame edge. */
const PAGE_M = 26;
const pageCx = (p: PageCapture) => (p.w + PAGE_M) / 2;
/** Focus x that pins the page's left margin to the frame's left edge at scale s (text starts
 *  flush left; the right edge, only chevrons, is what gets cropped). */
const pageLeftX = (s: number) => 960 / s;

const PageShot: React.FC<{
  page: PageCapture;
  frames: number;
  /** Absolute frame of this sequence's start (for the ground's light drift). */
  groundFrom: number;
  shots: Shot[];
  highlights: { key: string; at: number }[];
  cues?: React.ReactNode;
}> = ({ page, frames, groundFrom, shots, highlights, cues }) => {
  const lf = useCurrentFrame();
  const cam = camera(lf, shots);
  return (
    <AbsoluteFill>
      {cues}
      <LightGround frame={lf + groundFrom} />
      <CameraGroup s={cam.s} x={cam.x} y={cam.y} dx={drift(lf, frames, -40)} dy={riseAndLeave(lf, frames)} bounds={{ w: page.w + PAGE_M, h: page.h }}>
        <ContactShadow w={page.w} left={PAGE_M} top={page.h - 8} />
        <Img src={staticFile(page.file)} style={{ position: "absolute", left: PAGE_M, top: 0, width: page.w, height: page.h }} />
        {highlights.flatMap((h) =>
          page.phrases[h.key as keyof typeof page.phrases].map((r: { x: number; y: number; w: number; h: number }, li: number) => {
            const at = h.at + li * 5;
            if (lf < at) return null;
            const w = tween(lf, at, 6, 0, r.w + 6, "softLand");
            return (
              <div
                key={`${h.key}-${li}`}
                style={{
                  position: "absolute",
                  left: PAGE_M + r.x - 3,
                  top: r.y - 1,
                  width: w,
                  height: r.h + 3,
                  borderRadius: 3,
                  background: withAlpha(ACCENT, 0.34),
                  mixBlendMode: "multiply",
                }}
              />
            );
          }),
        )}
      </CameraGroup>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- the upload track

const DAY_W = 14;
const TRACK_W = TRACK.days * DAY_W;
const TILE_W = 96;
const TILE_H = 54;
const RULER_Y = 98;
const dayX = (d: number) => d * DAY_W + DAY_W / 2;

/** One upload: a dark 16:9 tile with a play mark, a stem down to its dot on the week ruler. */
const Tile: React.FC<{ day: number; style?: React.CSSProperties; dotStyle?: React.CSSProperties }> = ({ day, style, dotStyle }) => {
  const cx = dayX(day);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, ...style }}>
      <div style={{ position: "absolute", left: cx - 0.75, top: TILE_H, width: 1.5, height: RULER_Y - TILE_H, background: withAlpha(palette.ink, 0.25) }} />
      <div
        style={{
          position: "absolute",
          left: cx - TILE_W / 2,
          top: 0,
          width: TILE_W,
          height: TILE_H,
          borderRadius: 7,
          background: "linear-gradient(160deg, #4A4844 0%, #2A2927 55%, #1F1E1C 100%)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 6px 14px rgba(30,25,20,0.16)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: TILE_W / 2 - 6,
            top: TILE_H / 2 - 9,
            width: 0,
            height: 0,
            borderTop: "9px solid transparent",
            borderBottom: "9px solid transparent",
            borderLeft: `15px solid ${withAlpha("#FFFFFF", 0.6)}`,
          }}
        />
      </div>
      <div style={{ position: "absolute", left: cx - 5, top: RULER_Y - 5, width: 10, height: 10, borderRadius: 5, background: palette.ink, ...dotStyle }} />
    </div>
  );
};

/** Week ruler: a line with a tick every 7 days. Texture, no labels. */
const Ruler: React.FC = () => (
  <>
    <div style={{ position: "absolute", left: 0, top: RULER_Y - 0.75, width: TRACK_W, height: 1.5, background: withAlpha(palette.ink, 0.3) }} />
    {Array.from({ length: TRACK.days / 7 + 1 }, (_, w) => (
      <div key={w} style={{ position: "absolute", left: w * 7 * DAY_W - 0.75, top: RULER_Y - 7, width: 1.5, height: 14, background: withAlpha(palette.ink, 0.3) }} />
    ))}
  </>
);

/** Wide framing for the track: the strip sits at ~0.40 H, the quote/label space below it. */
const TRACK_WIDE: Omit<Shot, "at"> = { s: 0.9, x: TRACK_W / 2, y: 60 + 130 };

const EachBeat: React.FC<{ b: BeatT }> = ({ b }) => {
  const lf = useCurrentFrame();
  const { height } = useVideoConfig();
  const [s1, s2] = b.segs;
  const f1 = markAt(s1, "f1", b.from);
  const f2 = markAt(s1, "f2", b.from);
  const t1 = markAt(s2, "t1", b.from);
  const wide = s2.from - b.from - 2;

  const focus = TRACK.uploads.find((u) => u.day === 37)!;
  const fx = dayX(focus.day);
  const shots: Shot[] = [
    { at: 0, s: 2.5, x: fx + 110, y: 40 },
    { at: f2 - 4, s: 2.35, x: fx + 190, y: 30 },
    { at: wide, ...TRACK_WIDE },
  ];
  const cam = camera(lf, shots);

  // Signal words land on their spoken word; they leave (up, 2 f apart) as the camera pulls wide.
  const SPOKEN = ["clicks", "watch", "likes", "shares", "not-interested"];
  const sigOn = SPOKEN.map((w) => wordAt(s1, b.from, w));
  const late = TRACK.uploads.filter((u) => !u.early);
  const dropOn = staggerOnsets(late.length, t1 - 2, [2, 1, 2, 1, 3, 1, 2, 2, 1]);

  // TikTok's sentence, word for word on the voice.
  const quoteWords = TIKTOK_QUOTE.split(" ");
  const spoken = wordOnsets(s2, b.from);
  const first = spoken.findIndex((w) => w.word.toLowerCase() === "the");
  const qOn = quoteWords.map((_, i) => spoken[first + i]?.at ?? t1 + i * 4);
  const lines = [quoteWords.slice(0, 6), quoteWords.slice(6)];
  const leave = riseAndLeave(lf, b.frames);

  return (
    <AbsoluteFill>
      <Sfx name="wooshA" at={0} />
      <Sfx name="press" at={f1} />
      {sigOn.map((at, i) => (
        <Sfx key={i} name={i % 2 ? "popB" : "popC"} at={at} gain={0.7} />
      ))}
      <Sfx name="wooshC" at={wide} gain={0.7} />
      {dropOn.slice(0, 5).map((at, i) => (
        <Sfx key={`d${i}`} name="tick" at={at} gain={0.6} />
      ))}
      <LightGround frame={lf + b.from} />
      <CameraGroup s={cam.s} x={cam.x} y={cam.y} dx={drift(lf, b.frames, -40)} dy={leave}>
        <ContactShadow w={TRACK_W} top={RULER_Y + 14} />
        <Ruler />
        {TRACK.uploads.map((u) => {
          const li = late.indexOf(u);
          const on = li >= 0 ? dropOn[li] : -3;
          if (lf < on) return null;
          const e = enter(lf, on, { from: { y: -70, blur: 0 }, frames: 10 });
          const dim = u === focus ? 1 : lf < wide ? tween(lf, f1, 6, 1, 0.3, "softInOut") : tween(lf, wide, 6, 0.3, 1, "softInOut");
          return <Tile key={u.day} day={u.day} style={{ transform: `translateY(${e.y}px)`, opacity: Math.min(dim, e.opacity) }} />;
        })}
        {/* Ring around the one video being judged. */}
        {lf >= f1 && lf < wide + 8 ? (
          <div
            style={{
              position: "absolute",
              left: fx - TILE_W / 2 - 8,
              top: -8,
              width: TILE_W + 16,
              height: TILE_H + 16,
              borderRadius: 11,
              border: `2px solid ${palette.ink}`,
              transform: `scale(${tween(lf, f1, 8, 1.12, 1, "softLand") * tween(lf, wide, 8, 1, 0.9, "accelExit")})`,
              opacity: tween(lf, wide, 8, 1, 0, "accelExit"),
            }}
          />
        ) : null}
        {/* The signals it is judged on (YouTube's list). */}
        <div style={{ position: "absolute", left: fx + TILE_W / 2 + 30, top: TILE_H / 2 - 74, fontFamily, fontSize: 19, fontWeight: 460, color: palette.ink, letterSpacing: "-0.01em" }}>
          {SIGNALS.map((sig, i) => {
            const e = enter(lf, sigOn[i] - 2, { from: { y: 10, blur: 3 }, frames: 12 });
            const x = exit(lf, wide - 6 + i * 2, { to: { y: -40 }, frames: 8 });
            if (!e.visible || !x.visible) return null;
            return (
              <div key={sig} style={{ position: "absolute", top: i * 30, whiteSpace: "nowrap", transform: `translateY(${e.y + x.y}px)`, filter: `blur(${e.blur}px)`, opacity: e.opacity }}>
                {sig}
              </div>
            );
          })}
        </div>
      </CameraGroup>
      {/* TikTok's sentence: claim text, screen-fixed under the strip. */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: height * 0.6, transform: `translate(${drift(lf, b.frames)}px, ${leave}px)` }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          {lines.map((ln, li) => {
            const off = li === 0 ? 0 : lines[0].length;
            return (
              <WordLine
                key={li}
                frame={lf}
                words={ln}
                onsets={ln.map((_, i) => qOn[off + i] - 2)}
                size={Math.round(height * 0.05)}
                weight={weight.headline}
                tracking={tracking.headline}
                color={palette.ink}
                rise={height * 0.04}
              />
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- Buffer: 26-week rows

const WK = { pad: 40, rowsTop: 104, rowH: 112, labelW: 470, cell: 30, gap: 6, valueX: 1470, w: 1710 };
const WK_CELLS_X = WK.pad + WK.labelW;
const WK_H = WK.rowsTop + WK.rowH * 2 + 16;
const OFF_WEEKS = [4, 11, 17, 20, 24]; // the 5 empty weeks in the 21-week row
const FEW_WEEKS = [2, 9, 15, 23]; // the 4 posted weeks in the inconsistent row

const WeeksBeat: React.FC<{ b: BeatT }> = ({ b }) => {
  const lf = useCurrentFrame();
  const [s1, s2] = b.segs;
  const w1 = markAt(s1, "w1", b.from);
  const w2 = markAt(s2, "w2", b.from);
  const w3 = markAt(s2, "w3", b.from);
  const few = wordAt(s2, b.from, "four", -1);

  const rowY = (r: number) => WK.rowsTop + r * WK.rowH;
  const shots: Shot[] = [
    { at: 0, s: 1.06, x: WK.w / 2, y: WK_H / 2 },
    { at: w3 - 4, s: 1.1, x: WK.w / 2, y: WK_H / 2 + 10 },
  ];
  const cam = camera(lf, shots);
  const colOn = staggerOnsets(26, w1 - 6, [1, 1, 2, 1, 1, 2, 1, 1, 1, 2]);
  const litRows = [
    { at: few, weeks: FEW_WEEKS },
    { at: w2, weeks: Array.from({ length: 26 }, (_, i) => i).filter((i) => !OFF_WEEKS.includes(i)) },
  ];
  const valueOn = [few + 6, w3];
  const base = withAlpha(palette.inkMuted, 0.16);

  return (
    <AbsoluteFill>
      <Sfx name="wooshB" at={0} />
      <Sfx name="tick" at={w1} />
      <Sfx name="press" at={w2} />
      <Sfx name="popB" at={w3} />
      <Sfx name="tick" at={few} gain={0.8} />
      <LightGround frame={lf + b.from} />
      <CameraGroup s={cam.s} x={cam.x} y={cam.y} dx={drift(lf, b.frames, -40)} dy={riseAndLeave(lf, b.frames)}>
        <ContactShadow w={WK.w} top={WK_H - 8} />
        <div style={{ position: "absolute", width: WK.w, height: WK_H, background: palette.surface, border: `1px solid ${palette.line}`, borderRadius: 14, fontFamily }}>
          <div style={{ position: "absolute", left: WK.pad, top: 30, fontSize: 22, color: palette.inkMuted }}>{BUFFER.sample}</div>
          <div style={{ position: "absolute", right: WK.pad, top: 30, fontSize: 22, color: palette.inkMuted }}>{BUFFER.metric}</div>
          {BUFFER.rows.map((row, r) => {
            const y = rowY(r);
            const vOn = valueOn[r];
            const ve = enter(lf, vOn, { from: { y: 16, blur: 0 }, frames: 11, easing: "snapSettle" });
            return (
              <React.Fragment key={row.label}>
                <div style={{ position: "absolute", left: 0, right: 0, top: y, height: 1, background: palette.line }} />
                <div style={{ position: "absolute", left: WK.pad, top: y + WK.rowH / 2 - 22, fontSize: 36, fontWeight: 440, color: palette.ink, letterSpacing: "-0.015em", whiteSpace: "nowrap" }}>
                  {row.label}
                </div>
                {Array.from({ length: BUFFER.weeks }, (_, c) => {
                  const e = enter(lf, colOn[c] + r, { from: { y: 0, scale: 0.55, blur: 0 }, frames: 6 });
                  const li = litRows[r].weeks.indexOf(c);
                  const litAt = li >= 0 ? litRows[r].at + Math.floor(li * 0.8) : Infinity;
                  return (
                    <div
                      key={c}
                      style={{
                        position: "absolute",
                        left: WK_CELLS_X + c * (WK.cell + WK.gap),
                        top: y + (WK.rowH - 56) / 2,
                        width: WK.cell,
                        height: 56,
                        borderRadius: 6,
                        background: lf >= litAt ? palette.ink : base,
                        transform: `scaleY(${e.scale})`,
                        visibility: e.visible ? "visible" : "hidden",
                      }}
                    />
                  );
                })}
                {ve.visible ? (
                  <div
                    style={{
                      position: "absolute",
                      left: WK.valueX,
                      top: y + WK.rowH / 2 - 28,
                      transform: `translateY(${ve.y}px)`,
                      opacity: ve.opacity,
                      fontSize: r === 1 ? 50 : 34,
                      lineHeight: r === 1 ? "56px" : "56px",
                      fontWeight: r === 1 ? 520 : 420,
                      color: r === 1 ? ACCENT : palette.inkMuted,
                      letterSpacing: "-0.02em",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {row.value}
                  </div>
                ) : null}
              </React.Fragment>
            );
          })}
        </div>
      </CameraGroup>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- vidIQ: tiers (the hero)

const TV = { pad: 40, top: 100, rowH: 116, labelX: 40, stripX: 345, slot: 12, slots: 30, barX: 730, barMax: 600, domain: 2.6, w: 1570 };
const TV_H = TV.top + TV.rowH * VIDIQ.tiers.length + 28;
const rowMid = (i: number) => TV.top + i * TV.rowH + TV.rowH / 2;
const barW = (g: number) => (g / TV.domain) * TV.barMax;

const VolumeBeat: React.FC<{ b: BeatT }> = ({ b }) => {
  const lf = useCurrentFrame();
  const { height } = useVideoConfig();
  const [s1, s2, s3] = b.segs;
  const v1 = markAt(s1, "v1", b.from);
  const v2 = markAt(s2, "v2", b.from);
  const v3 = markAt(s2, "v3", b.from);
  const v4 = markAt(s2, "v4", b.from);
  const c1 = markAt(s3, "c1", b.from);
  const last = VIDIQ.tiers.length - 1;

  // Opens at 1.0 on the whole card, pushes to 1.22 as the first value lands and holds there:
  // at 1.22 the whole card still fits, so both compared rows share the hero frame.
  const shots: Shot[] = [
    { at: 0, s: 1.14, x: TV.w / 2, y: TV_H / 2 },
    { at: v2 - 4, s: 1.22, x: TV.w / 2, y: TV_H / 2 + 8 },
  ];
  const cam = camera(lf, shots);

  const rowOn = staggerOnsets(VIDIQ.tiers.length, v1 - 8, [4, 3, 3, 2]);
  // Bars: row 0 on v2; rows 1-3 fill as the camera travels down (texture); row 4 on v3.
  const barOn = [v2, v3 - 13, v3 - 10, v3 - 7, v3];
  const blurK = tween(lf, c1 - 4, 9, 0, 1, "softInOut");

  const caveat = VIDIQ.caveat.split(" ");
  const cvOn = staggerOnsets(caveat.length, c1 - 6, [4, 3, 5, 3, 4]);

  return (
    <AbsoluteFill>
      <Sfx name="wooshC" at={0} gain={0.8} />
      {rowOn.map((at, i) => (
        <Sfx key={i} name="tick" at={at + 2} gain={0.6} />
      ))}
      <Sfx name="popA" at={v2} />
      <Sfx name="subDrop" at={v3} maxFrames={75} />
      <Sfx name="popB" at={v4} />
      <Sfx name="press" at={c1 - 4} gain={0.7} />
      <LightGround frame={lf + b.from} />
      <CameraGroup
        s={cam.s}
        x={cam.x}
        y={cam.y}
        dx={drift(lf, b.frames, -40)}
        dy={riseAndLeave(lf, b.frames)}
        style={{ filter: blurK > 0 ? `blur(${blurK * 7}px)` : undefined, opacity: 1 - blurK * 0.35 }}
      >
        <ContactShadow w={TV.w} top={TV_H - 8} />
        <div style={{ position: "absolute", width: TV.w, height: TV_H, background: palette.surface, border: `1px solid ${palette.line}`, borderRadius: 14, fontFamily }}>
          <div style={{ position: "absolute", left: TV.pad, top: 30, fontSize: 22, color: palette.inkMuted }}>{VIDIQ.sample}</div>
          <div style={{ position: "absolute", left: TV.barX, top: 30, fontSize: 22, color: palette.inkMuted }}>{VIDIQ.metric}</div>
          {VIDIQ.tiers.map((t, i) => {
            const re = enter(lf, rowOn[i], { from: { y: 18, blur: 0 }, frames: 10 });
            const mid = rowMid(i) - TV.top - i * TV.rowH; // within the row
            const tickSlots = Array.from({ length: t.ticks }, (_, k) => Math.floor(((k + 0.5) * TV.slots) / t.ticks));
            const bOn = barOn[i];
            const isHero = i === last;
            const g = i === 0 || isHero ? tween(lf, bOn, 15, 0, t.growth, "softLand") : lf >= bOn ? t.growth : 0;
            const w = tween(lf, bOn, i === 0 || isHero ? 15 : 10, 0, barW(t.growth), "softLand");
            return (
              <div
                key={t.label}
                style={{ position: "absolute", left: 0, top: TV.top + i * TV.rowH, width: TV.w, height: TV.rowH, transform: `translateY(${re.y}px)`, visibility: re.visible ? "visible" : "hidden" }}
              >
                <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 1, background: palette.line }} />
                <div style={{ position: "absolute", left: TV.labelX, top: mid - 22, fontSize: 36, fontWeight: 440, color: palette.ink, letterSpacing: "-0.015em", whiteSpace: "nowrap" }}>
                  {t.label}
                </div>
                {/* One month: 30 day slots, one tick per upload. */}
                <div style={{ position: "absolute", left: TV.stripX, top: mid + 22, width: TV.slot * TV.slots, height: 1.5, background: withAlpha(palette.ink, 0.25) }} />
                {tickSlots.map((sl, k) => {
                  const te = enter(lf, rowOn[i] + 6 + k, { from: { y: -22, blur: 0 }, frames: 8 });
                  return te.visible ? (
                    <div
                      key={k}
                      style={{
                        position: "absolute",
                        left: TV.stripX + sl * TV.slot + 3,
                        top: mid - 18,
                        width: 8,
                        height: 40,
                        borderRadius: 3,
                        background: palette.inkSoft,
                        transform: `translateY(${te.y}px)`,
                      }}
                    />
                  ) : null;
                })}
                {/* Growth bar + value. */}
                <div style={{ position: "absolute", left: TV.barX, top: mid - 17, width: w, height: 34, borderRadius: 6, background: isHero ? ACCENT : i === 0 ? palette.ink : withAlpha(palette.ink, 0.35) }} />
                {lf >= bOn ? (
                  <div
                    style={{
                      position: "absolute",
                      left: TV.barX + w + 18,
                      top: mid - 25,
                      fontSize: 42,
                      lineHeight: "50px",
                      fontWeight: isHero || i === 0 ? 500 : 420,
                      color: isHero || i === 0 ? palette.ink : palette.inkMuted,
                      fontVariantNumeric: "tabular-nums",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {g.toFixed(2)}%
                  </div>
                ) : null}
                {isHero && lf >= v4 ? (
                  (() => {
                    const ce = enter(lf, v4, { from: { x: 30, y: 0, blur: 0 }, frames: 11, easing: "snapSettle" });
                    return (
                      <div
                        style={{
                          position: "absolute",
                          left: TV.barX + barW(t.growth) + 190,
                          top: mid - 26,
                          padding: "2px 16px",
                          borderRadius: 999,
                          background: ACCENT,
                          color: palette.surface,
                          fontSize: 38,
                          lineHeight: "48px",
                          fontWeight: 500,
                          transform: `translateX(${ce.x}px)`,
                          opacity: ce.opacity,
                        }}
                      >
                        {VIDIQ.ratio}
                      </div>
                    );
                  })()
                ) : null}
              </div>
            );
          })}
        </div>
      </CameraGroup>
      {/* vidIQ's own caveat, in front of the defocused card. */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `translate(${drift(lf - c1, b.frames - c1)}px, ${height * 0.02 + exit(lf, b.frames - 13, { to: { y: -200 } }).y}px)` }}>
        <WordLine
          frame={lf}
          words={caveat}
          onsets={cvOn}
          size={Math.round(height * 0.068)}
          weight={weight.headline}
          tracking={tracking.headline}
          color={palette.ink}
          rise={height * 0.05}
          accent={[3, 5]}
          accentColor={ACCENT}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- why: the track again, the window

const WhyTrack: React.FC<{ b: BeatT; frames: number }> = ({ b, frames }) => {
  const lf = useCurrentFrame();
  const { height } = useVideoConfig();
  const seg = b.segs[0];
  const r1 = markAt(seg, "r1", b.from);
  const startDay = TRACK.days - WINDOW_DAYS;
  const scoreOn = staggerOnsets(TRACK.uploads.length, 24, [3, 2, 3, 2, 2, 3, 2]);
  const cam = camera(lf, [{ at: 0, ...TRACK_WIDE }]);
  const winE = enter(lf, r1 - 2, { from: { x: 260, y: 0, blur: 0 }, frames: 14 });
  const leave = riseAndLeave(lf, frames);
  // First sentence of why1, word by word on the voice, under the strip (same place as TikTok's quote).
  const said = wordOnsets(seg, b.from);
  const end = said.findIndex((w) => w.word.endsWith("score."));
  const line = said.slice(0, end + 1);
  const lineLeave = exit(lf, r1 - 10, { to: { y: -50 }, frames: 10 });
  return (
    <AbsoluteFill>
      <Sfx name="wooshB" at={0} />
      <Sfx name="press" at={r1} />
      <LightGround frame={lf + b.from} />
      <CameraGroup s={cam.s} x={cam.x} y={cam.y} dx={drift(lf, frames, 40)} dy={leave}>
        <ContactShadow w={TRACK_W} top={RULER_Y + 14} />
        {/* The window TikTok's feed draws from: the last 90 days. */}
        {winE.visible ? (
          <div
            style={{
              position: "absolute",
              left: startDay * DAY_W + winE.x,
              top: -26,
              width: WINDOW_DAYS * DAY_W,
              height: RULER_Y + 50,
              borderRadius: 14,
              border: `2.5px solid ${ACCENT}`,
              background: withAlpha(ACCENT, 0.08),
              opacity: winE.opacity,
            }}
          >
            <div style={{ position: "absolute", left: 6, top: -66, fontFamily, fontSize: 48, fontWeight: 480, color: palette.ink, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>
              Last 90 days
            </div>
          </div>
        ) : null}
        <Ruler />
        {TRACK.uploads.map((u, i) => {
          const outside = u.day < startDay;
          const op = outside ? tween(lf, r1 + 6 + i * 2, 6, 1, 0.28, "softInOut") : 1;
          const scored = lf >= scoreOn[i];
          return (
            <Tile
              key={u.day}
              day={u.day}
              style={{ opacity: op }}
              dotStyle={{ transform: `scale(${scored ? tween(lf, scoreOn[i], 6, 1.8, 1, "softLand") : 0.6})`, background: scored ? palette.ink : withAlpha(palette.ink, 0.35) }}
            />
          );
        })}
      </CameraGroup>
      {lineLeave.visible ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: height * 0.6, transform: `translate(${drift(lf, frames)}px, ${leave + lineLeave.y}px)` }}>
          <WordLine
            frame={lf}
            words={line.map((w) => w.word)}
            onsets={line.map((w) => w.at)}
            size={Math.round(height * 0.05)}
            weight={weight.headline}
            tracking={tracking.headline}
            color={palette.ink}
            rise={height * 0.04}
          />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- close

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

const Close: React.FC<{ b: BeatT }> = ({ b }) => {
  const lf = useCurrentFrame();
  const { width } = useVideoConfig();
  const lean = tween(lf, b.frames - 10, 10, 0, -100, "crashOut");
  return (
    <AbsoluteFill>
      <Sfx name="wooshA" at={0} gain={0.8} />
      <DarkGround frame={lf} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `translate(${-width * 0.02 + drift(lf, b.frames)}px, ${lean}px)` }}>
        <HeadlineFromVoice seg={b.segs[0]} relativeTo={b.from} dark maxWordsPerLine={8} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- beats that are page shots

const Hook: React.FC<{ b: BeatT }> = ({ b }) => {
  const [s1, s2] = b.segs;
  const q = markAt(s1, "q", b.from);
  const back = s2.from - b.from - 2;
  const P = PAGES.daily;
  return (
    <PageShot
      page={P}
      frames={b.frames}
      groundFrom={b.from}
      shots={[
        { at: 0, s: 3.0, x: pageLeftX(3.0), y: P.questionY + 8 },
        { at: q - 6, s: 2.75, x: pageLeftX(2.75), y: 1424 },
        { at: back, s: 1.8, x: pageCx(P), y: 1380 },
      ]}
      highlights={[{ key: "q", at: q }]}
      cues={
        <>
          <Sfx name="popC" at={q} />
          <Sfx name="wooshB" at={back} gain={0.7} />
        </>
      }
    />
  );
};

const Breaks: React.FC<{ b: BeatT }> = ({ b }) => {
  const [s1, s2] = b.segs;
  const b1 = markAt(s1, "b1", b.from);
  const b2 = markAt(s2, "b2", b.from);
  const P = PAGES.breaks;
  return (
    <PageShot
      page={P}
      frames={b.frames}
      groundFrom={b.from}
      shots={[
        { at: 0, s: 3.0, x: pageLeftX(3.0), y: P.questionY + 8 },
        { at: b1 - 6, s: 2.75, x: pageLeftX(2.75), y: 1396 },
      ]}
      highlights={[
        { key: "b1", at: b1 },
        { key: "b2", at: b2 },
      ]}
      cues={
        <>
          <Sfx name="wooshC" at={0} gain={0.7} />
          <Sfx name="popC" at={b1} />
          <Sfx name="popC" at={b2} gain={0.8} />
        </>
      }
    />
  );
};

const Why: React.FC<{ b: BeatT }> = ({ b }) => {
  const seg2 = b.segs[1];
  const cut = seg2.from - b.from - 6;
  const r2 = markAt(seg2, "r2", b.from) - cut;
  const P = PAGES.traffic;
  return (
    <>
      <Sequence durationInFrames={cut} name="why: window">
        <WhyTrack b={b} frames={cut} />
      </Sequence>
      <Sequence from={cut} durationInFrames={b.frames - cut} name="why: page">
        <PageShot
          page={P}
          frames={b.frames - cut}
          groundFrom={b.from + cut}
          shots={[
            { at: 0, s: 3.0, x: pageLeftX(3.0), y: P.questionY + 4 },
            { at: r2 - 8, s: 2.75, x: pageLeftX(2.75), y: 2010 },
          ]}
          highlights={[{ key: "r2", at: r2 }]}
          cues={
            <>
              <Sfx name="wooshA" at={0} gain={0.7} />
              <Sfx name="popC" at={r2} />
            </>
          }
        />
      </Sequence>
    </>
  );
};

// ---------------------------------------------------------------- film

const BEAT_VIEW: Record<string, React.FC<{ b: BeatT }>> = {
  hook: Hook,
  each: EachBeat,
  breaks: Breaks,
  weeks: WeeksBeat,
  volume: VolumeBeat,
  why: Why,
  close: Close,
};

export const Consistency: React.FC = () => (
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
