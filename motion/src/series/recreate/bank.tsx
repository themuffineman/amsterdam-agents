/**
 * Component bank for the "recreate" series. Every card is a TICKET (TicketShell in kit.tsx, the
 * prompt ticket's look): white rounded card, red ink, perforation, stub with barcode. Effects are
 * ported from codemotion (src/components): focus/dim as 0..1 depth of field (Card), the receipt
 * list with rows on cue + a total that lands last (ListCard), a highlight that glides row to row
 * (useStepper), a tilted board the camera scrolls over with faded edges (PerspectiveBoard).
 *
 *   MediaTicket      a template as a card: playing preview, italic codename, name, category
 *   DealtTickets     2-4 tickets float up on cue; one can take focus while the rest go soft
 *   TicketBoard      all templates on a tilted, scrolling board under a mixed title
 *   TicketStatement  two tickets left, statement + action chip right
 *   ReceiptTicket    a receipt: rows on cue, a gliding highlight, struck rows, a counted total
 *   MediaSentence    a sentence with media chips rising into reserved slots as it's spoken (Butter)
 *
 * Media is always a real Sycamore template (TemplateClip), never drawn art. Ground: sky.
 */
import React from "react";
import { Img, Loop, OffthreadVideo, interpolate, staticFile, useCurrentFrame } from "remotion";
import { enter, tween } from "../../lib/eases";
import { Arrow, Diamond, TicketShell } from "./kit";
import { Float3D, InlineChip, Words, floatUp, rackStyle, ramp, type WordSpec } from "./moves";
import { TEMPLATES, type TemplateId } from "./templates";
import { C, F } from "./tokens";

export type Spoken = { text: string; at: number }[];

// ---------------------------------------------------------------- helpers (from codemotion)

/** Smooth active index: -1 before ats[0], then glides 0 -> 1 -> 2 as each cue passes (useStepper). */
export const stepper = (frame: number, ats: number[], dur = 14) => {
  if (!ats.length || frame < ats[0]) return -1;
  return ats.slice(1).reduce((pos, at) => pos + tween(frame, at, dur, 0, 1, "softInOut"), 0);
};

/** Counts up to `value` between at and at + dur (Counter). */
export const count = (frame: number, value: number, at: number, dur = 24) => Math.round(tween(frame, at, dur, 0, value, "glide")).toLocaleString("en-US");

// ---------------------------------------------------------------- media

/** A real template, playing on loop (or its still). Fills its box. */
export const TemplateClip: React.FC<{ id: TemplateId; still?: boolean; fit?: "cover" | "contain" }> = ({ id, still, fit = "cover" }) => {
  const style: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: fit };
  if (still) return <Img src={staticFile(`recreate/templates/${id}.jpg`)} style={style} />;
  return (
    <Loop durationInFrames={Math.round(TEMPLATES[id].sec * 30)}>
      <OffthreadVideo src={staticFile(`recreate/templates/${id}.mp4`)} muted style={style} />
    </Loop>
  );
};

/**
 * A template as a card (the ticket's top, no stub): the preview playing in a rounded window, the
 * codename in italic serif, its number, its name, and its category + length in mono.
 */
export const MediaTicket: React.FC<{ id: TemplateId; width: number; focus?: number; dim?: number; still?: boolean; tall?: boolean }> = ({ id, width, focus, dim, still, tall }) => {
  const t = TEMPLATES[id];
  const pad = width * 0.06;
  const inner = width - pad * 2;
  const mediaH = (tall ?? t.vertical) ? inner * 1.15 : inner * 0.5625;
  return (
    <TicketShell width={width} focus={focus} dim={dim}>
      <div style={{ width: inner, height: mediaH, borderRadius: width * 0.03, overflow: "hidden", position: "relative", background: C.paperDeep }}>
        <TemplateClip id={id} still={still} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: pad * 0.6 }}>
        <span style={{ ...F.italic, fontSize: width * 0.11, lineHeight: 1 }}>{t.codename}</span>
        <span style={{ ...F.mono, fontSize: width * 0.034 }}>Nº {String(t.n).padStart(2, "0")}</span>
      </div>
      <div style={{ ...F.body, fontSize: width * 0.044, marginTop: pad * 0.25 }}>{t.name}</div>
      <div style={{ display: "flex", justifyContent: "space-between", ...F.mono, fontSize: width * 0.032, marginTop: pad * 0.6 }}>
        <span>{t.category}</span>
        <span>{t.sec.toFixed(1)} s</span>
      </div>
    </TicketShell>
  );
};

// ---------------------------------------------------------------- DealtTickets

export type DealtItem = { id: TemplateId; at: number };

/**
 * Tickets deal in one by one on their cues, each floating up and unwinding its tilt (outer ones
 * angled toward the centre). With `focus`, the chosen ticket moves to the centre on a speed ramp
 * (slow, very fast with motion blur, hard stop) and lifts, while the others part and go soft.
 */
export const DealtTickets: React.FC<{ items: DealtItem[]; focus?: { index: number; at: number }; width?: number }> = ({ items, focus, width = 420 }) => {
  const frame = useCurrentFrame();
  const mid = (items.length - 1) / 2;
  const step = width + 54;
  const tilts = [-4, 1.5, 4.5, -2];
  const r = focus ? ramp(frame, focus.at, 22) : { p: 0, blur: 0 };
  const k = r.p;
  const order = items.map((_, i) => i).sort((a, b) => (a === focus?.index ? 1 : b === focus?.index ? -1 : 0));
  return (
    <>
      {order.map((i) => {
        const it = items[i];
        const side = Math.sign(i - mid);
        const pose = floatUp(frame, it.at, { to: { rotX: 4, rotY: -side * 10, rotZ: tilts[i % tilts.length] }, from: { rotY: side * 40 || 30 } });
        const chosen = focus?.index === i;
        const x = (i - mid) * step;
        const fx = chosen ? x * (1 - k) : x + side * 150 * k;
        const posed = chosen ? { ...pose, rotY: pose.rotY * (1 - k), rotZ: pose.rotZ * (1 - k * 0.6), y: pose.y - 20 * k } : pose;
        return (
          <div key={i} style={{ position: "absolute", left: 960 - width / 2, top: 170, filter: chosen && r.blur > 0.3 ? `blur(${r.blur}px)` : undefined }}>
            <Float3D pose={posed} x={fx} scale={chosen ? 1 + 0.08 * k : 1}>
              <MediaTicket id={it.id} width={width} focus={chosen ? k : 0} dim={chosen ? 0 : k} />
            </Float3D>
          </div>
        );
      })}
    </>
  );
};

// ---------------------------------------------------------------- TicketBoard

/**
 * PerspectiveBoard, in tickets: every template as a ticket on a plane tilted back in 3D, which
 * rises into view and scrolls up through the frame; top and bottom edges fade out. A mixed title
 * holds above it and racks out once the board is moving.
 */
export const TicketBoard: React.FC<{
  ids: TemplateId[];
  at: number;
  kicker?: Spoken;
  caps: Spoken;
  serif: Spoken;
  cols?: number;
  width?: number;
  scroll?: { from: number; to: number; dur: number };
}> = ({ ids, at, kicker, caps, serif, cols = 4, width = 290, scroll = { from: 560, to: -420, dur: 260 } }) => {
  const frame = useCurrentFrame();
  const rise = tween(frame, at, 30, 0, 1, "softLand");
  const y = interpolate(frame, [at, at + scroll.dur], [scroll.from, scroll.to], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rack = tween(frame, at + 20, 24, 0, 1, "softInOut");
  const gap = 40;
  const boardW = cols * width + (cols - 1) * gap;
  const fade = "linear-gradient(180deg, transparent 0%, #000 26%, #000 80%, transparent 100%)";
  return (
    <>
      <div style={{ position: "absolute", inset: 0, perspective: 2400, perspectiveOrigin: "50% 20%", maskImage: fade, WebkitMaskImage: fade }}>
        {frame >= at && (
          <div
            style={{
              position: "absolute",
              left: 960 - boardW / 2,
              top: 0,
              width: boardW,
              display: "grid",
              gridTemplateColumns: `repeat(${cols}, ${width}px)`,
              gap,
              alignItems: "start",
              transform: `translateY(${y + (1 - rise) * 300}px) rotateX(${22 + (1 - rise) * 14}deg)`,
              transformOrigin: "50% 0%",
            }}
          >
            {ids.map((id, i) => {
              const e = enter(frame, at + i * 2, { from: { y: 80, blur: 8 }, frames: 16 });
              return (
                <div key={id} style={{ transform: `translateY(${e.y}px)`, opacity: e.visible ? e.opacity : 0, filter: e.blur > 0.3 ? `blur(${e.blur}px)` : undefined }}>
                  <MediaTicket id={id} width={width} tall={false} still />
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div style={{ position: "absolute", top: 150, width: "100%", textAlign: "center", color: C.white, ...rackStyle(rack, 16, 0.85) }}>
        {kicker && <Words size={60} base={F.serif} words={kicker} />}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 40, marginTop: 6 }}>
          <Words size={190} base={F.caps} words={caps} />
          <Words size={196} base={{ ...F.italic, lineHeight: 0.9 }} words={serif} />
        </div>
      </div>
    </>
  );
};

// ---------------------------------------------------------------- ActionChip

/** Blue arrow square + label. Slides in, the label unrolls from behind the arrow, then a press. */
export const ActionChip: React.FC<{ label: string; at: number; pressAt?: number; scale?: number }> = ({ label, at, pressAt, scale = 1 }) => {
  const frame = useCurrentFrame();
  const e = enter(frame, at, { from: { x: -40, y: 0, blur: 6, scale: 0.9 }, easing: "snapSettle", frames: 11 });
  const unroll = tween(frame, at + 4, 12, 100, 0, "whip");
  const press = pressAt === undefined ? 0 : tween(frame, pressAt, 4, 0, 1, "glide") - tween(frame, pressAt + 4, 9, 0, 1, "softLand");
  if (!e.visible) return null;
  const h = 64 * scale;
  return (
    <div style={{ display: "inline-flex", gap: 4 * scale, transform: `translateX(${e.x}px) scale(${e.scale * (1 - press * 0.06)})`, filter: e.blur > 0.3 ? `blur(${e.blur}px)` : undefined, opacity: e.opacity }}>
      <div style={{ width: h, height: h, background: C.blue, display: "grid", placeItems: "center" }}>
        <Arrow size={30 * scale} />
      </div>
      <div style={{ height: h, padding: `0 ${22 * scale}px`, background: C.blue, display: "flex", alignItems: "center", ...F.caps, fontSize: 30 * scale, color: C.white, clipPath: `inset(0 ${unroll}% 0 0)` }}>{label}</div>
    </div>
  );
};

// ---------------------------------------------------------------- TicketStatement

/**
 * Left: a tall ticket and a smaller one float in, overlapping. Right: serif kicker, caps line,
 * italic line, an action chip that gets pressed. The tall ticket can carry over from a DealtTickets focus.
 */
export const TicketStatement: React.FC<{
  big: { id: TemplateId; at: number };
  small?: { id: TemplateId; at: number; still?: boolean };
  kicker?: Spoken;
  caps: Spoken;
  serif: Spoken;
  action?: { label: string; at: number; pressAt?: number };
  ink?: string;
}> = ({ big, small, kicker, caps, serif, action, ink = C.white }) => {
  const frame = useCurrentFrame();
  const p1 = floatUp(frame, big.at, { to: { rotX: 3, rotY: 10, rotZ: -3 } });
  const p2 = small ? floatUp(frame, small.at, { to: { rotX: 3, rotY: -8, rotZ: 4 }, from: { rotY: -40, rotZ: 14 } }) : null;
  return (
    <>
      {small && p2 && (
        <div style={{ position: "absolute", left: 560, top: 300 }}>
          <Float3D pose={p2}>
            <MediaTicket id={small.id} width={330} still={small.still} />
          </Float3D>
        </div>
      )}
      <div style={{ position: "absolute", left: 150, top: 90 }}>
        <Float3D pose={p1}>
          <MediaTicket id={big.id} width={430} />
        </Float3D>
      </div>
      <div style={{ position: "absolute", left: 1000, width: 860, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", color: ink }}>
        {kicker && <Words size={52} base={F.serif} words={kicker} />}
        <div style={{ height: 14 }} />
        <Words size={136} base={F.caps} words={caps} />
        <Words size={150} base={{ ...F.italic, lineHeight: 0.95 }} words={serif} />
        {action && (
          <div style={{ marginTop: 44, height: 84 }}>
            <ActionChip label={action.label} at={action.at} pressAt={action.pressAt} scale={1.3} />
          </div>
        )}
      </div>
    </>
  );
};

// ---------------------------------------------------------------- ReceiptTicket

export type ReceiptRow = { label: string; value?: string; at: number; struck?: number };

/**
 * ListCard as a ticket: a titled receipt whose rows arrive top-down on their cues; a soft red
 * highlight glides to each row as it's spoken (stepper); a struck row gets a line drawn through
 * it and goes faint; the stub's total counts up last.
 */
export const ReceiptTicket: React.FC<{
  width?: number;
  title: string;
  kicker?: string;
  rows: ReceiptRow[];
  total: { label: string; value: number; unit?: string; at: number; dur?: number };
  footer?: string;
  focus?: number;
  dim?: number;
}> = ({ width = 640, title, kicker, rows, total, footer, focus, dim }) => {
  const frame = useCurrentFrame();
  const pad = width * 0.06;
  const rowH = width * 0.105;
  const active = stepper(
    frame,
    rows.map((r) => r.at),
  );
  return (
    <TicketShell
      width={width}
      focus={focus}
      dim={dim}
      stub={{
        left: total.label,
        right: frame < total.at ? "—" : `${count(frame, total.value, total.at, total.dur)}${total.unit ? ` ${total.unit}` : ""}`,
        footer,
        seed: title,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ ...F.italic, fontSize: width * 0.1, lineHeight: 1 }}>{title}</span>
        {kicker && <span style={{ ...F.mono, fontSize: width * 0.032 }}>{kicker}</span>}
      </div>
      <div style={{ marginTop: pad * 0.8, position: "relative" }}>
        {active >= 0 && (
          <div
            style={{
              position: "absolute",
              left: -pad * 0.4,
              right: -pad * 0.4,
              top: active * rowH,
              height: rowH,
              borderRadius: width * 0.02,
              background: "rgba(210,31,60,0.08)",
            }}
          />
        )}
        {rows.map((r, i) => {
          const e = enter(frame, r.at, { from: { y: 16, blur: 4 }, frames: 12 });
          const strike = r.struck === undefined ? 0 : tween(frame, r.struck, 12, 0, 1, "softLand");
          return (
            <div
              key={i}
              style={{
                position: "relative",
                height: rowH,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderTop: `1.5px solid rgba(210,31,60,0.16)`,
                opacity: e.visible ? e.opacity * (1 - strike * 0.55) : 0,
                transform: `translateY(${e.y}px)`,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: width * 0.022, ...F.body, fontSize: width * 0.044, position: "relative" }}>
                <Diamond size={width * 0.016} color={C.red} />
                {r.label}
                {strike > 0 && <span style={{ position: "absolute", left: 0, right: 0, top: "52%", height: 2.5, background: C.red, transform: `scaleX(${strike})`, transformOrigin: "left" }} />}
              </span>
              {r.value && <span style={{ ...F.italic, fontSize: width * 0.05 }}>{r.value}</span>}
            </div>
          );
        })}
      </div>
    </TicketShell>
  );
};

// ---------------------------------------------------------------- MediaSentence

export type FlowItem = { text: string; at: number } | { chip: TemplateId; at: number };

/**
 * One sentence, wrapped and centred, words on their spoken frames; each media chip rises into
 * its reserved slot on its cue (nothing else in the line moves), a real template playing inside.
 */
export const MediaSentence: React.FC<{
  items: FlowItem[];
  size?: number;
  ink?: string;
  maxWidth?: number;
  kicker?: WordSpec[];
  /** Font overrides (font experiments); default grotesk sentence + serif kicker. */
  wordFont?: React.CSSProperties;
  kickerFont?: React.CSSProperties;
}> = ({ items, size = 104, ink = C.ink, maxWidth = 1640, kicker, wordFont = F.grotesk, kickerFont = F.serif }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: ink }}>
      {kicker && (
        <div style={{ marginBottom: size * 0.5 }}>
          <Words size={size * 0.55} base={kickerFont} words={kicker} />
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", maxWidth, columnGap: size * 0.24, rowGap: size * 0.12, ...wordFont, fontSize: size }}>
        {items.map((it, i) => {
          if ("chip" in it) {
            const h = size * 1.0;
            return (
              <InlineChip key={i} at={it.at} w={h * 1.45} h={h} tilt={i % 2 ? 4 : -4} radius={0.24}>
                <TemplateClip id={it.chip} />
              </InlineChip>
            );
          }
          const e = enter(frame, it.at, { from: { y: size * 0.45, blur: 10 }, frames: 13 });
          return (
            <span key={i} style={{ display: "inline-block", transform: `translateY(${e.y}px)`, filter: e.blur > 0.3 ? `blur(${e.blur}px)` : undefined, opacity: e.visible ? e.opacity : 0 }}>
              {it.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};
