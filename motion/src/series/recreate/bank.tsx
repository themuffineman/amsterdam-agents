/**
 * Component bank for the "recreate" series, ported from the user's website references into
 * video moves. Every component takes cue frames (from useCue / useWords) and animates with the
 * series grammar: float-up in 3D, rack focus, eased glides, words on their spoken frames.
 *
 *   DealtPrints        (Extrafazant cards)      2-4 thick-framed prints deal in; one can take focus
 *   PrintStack         (Extrafazant "Recent werk") a title, then prints slide up and pile over it
 *   PolaroidStatement  (Extrafazant "Wie wij zijn") polaroids + sticker left, statement + action right
 *   MediaSentence      (Butter hero)            a sentence whose media chips open gaps as it's spoken
 *
 * Media is always a real Sycamore template (TemplateClip), never drawn art.
 */
import React from "react";
import { Img, Loop, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
import { enter, tween } from "../../lib/eases";
import { Arrow, Sticker } from "./kit";
import { Float3D, OpeningChip, Words, floatUp, rackStyle } from "./moves";
import { TEMPLATES, type TemplateId } from "./templates";
import { C, F } from "./tokens";

export type Spoken = { text: string; at: number }[];

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

/** Thick coloured frame + label block (caps label, serif sub). Static; parents move it. */
const Frame: React.FC<{ id: TemplateId; color: string; w: number; mediaH: number; label?: string; sub?: string; ink?: string; border?: number }> = ({
  id,
  color,
  w,
  mediaH,
  label,
  sub,
  ink = C.white,
  border = 22,
}) => (
  <div style={{ width: w, background: color, padding: border, paddingBottom: label ? border * 0.6 : border, boxShadow: "0 34px 70px rgba(0,0,0,0.25), 0 8px 16px rgba(0,0,0,0.12)" }}>
    <div style={{ width: w - border * 2, height: mediaH, position: "relative", overflow: "hidden" }}>
      <TemplateClip id={id} />
    </div>
    {label && (
      <div style={{ textAlign: "center", color: ink, paddingTop: border * 0.6 }}>
        <div style={{ ...F.caps, fontSize: w * 0.16 }}>{label}</div>
        {sub && <div style={{ ...F.serif, fontSize: w * 0.066, lineHeight: 1.05, marginTop: 6 }}>{sub}</div>}
      </div>
    )}
  </div>
);

// ---------------------------------------------------------------- 1. DealtPrints

export type PrintItem = { id: TemplateId; color: string; at: number; label?: string; sub?: string; ink?: string };

/**
 * Prints deal in one by one on their cues, each floating up and unwinding its tilt (outer ones
 * angled toward the centre). With `focus`, the chosen print glides to the centre and grows while
 * the others rack out and part.
 */
export const DealtPrints: React.FC<{ items: PrintItem[]; focus?: { index: number; at: number }; w?: number; mediaH?: number; top?: number }> = ({
  items,
  focus,
  w = 500,
  mediaH = 540,
  top = 140,
}) => {
  const frame = useCurrentFrame();
  const mid = (items.length - 1) / 2;
  const step = w + 50;
  const tilts = [-4, 1.5, 4.5, -2];
  const k = focus ? tween(frame, focus.at, 34, 0, 1, "softInOut") : 0;
  const order = items.map((_, i) => i).sort((a, b) => (a === focus?.index ? 1 : b === focus?.index ? -1 : 0));
  return (
    <>
      {order.map((i) => {
        const it = items[i];
        const side = Math.sign(i - mid);
        const pose = floatUp(frame, it.at, { to: { rotX: 4, rotY: -side * 10, rotZ: tilts[i % tilts.length] }, from: { rotY: side * 40 || 30 } });
        const chosen = focus?.index === i;
        const x = (i - mid) * step;
        const fx = chosen ? x * (1 - k) : x + side * 140 * k;
        const s = chosen ? 1 + 0.12 * k : 1 - 0.06 * k;
        const posed = chosen ? { ...pose, rotY: pose.rotY * (1 - k), rotZ: pose.rotZ * (1 - k * 0.6), y: pose.y - 24 * k } : pose;
        return (
          <div key={i} style={{ position: "absolute", left: 960 - w / 2, top, ...(chosen ? {} : rackStyle(k, 10, 0.4)) }}>
            <Float3D pose={posed} x={fx} scale={s}>
              <Frame id={it.id} color={it.color} w={w} mediaH={mediaH} label={it.label} sub={it.sub} ink={it.ink} />
            </Float3D>
          </div>
        );
      })}
    </>
  );
};

// ---------------------------------------------------------------- 2. PrintStack

export type StackItem = { id: TemplateId; color: string; at: number };

/**
 * A mixed title holds the frame; then prints slide up from below and pile over it, each one
 * lower and a little wider than the last (a stack seen while scrolling). From the third print
 * the whole pile glides up to make room. The title racks out as the first print covers it.
 */
export const PrintStack: React.FC<{ kicker?: Spoken; caps: Spoken; serif: Spoken; items: StackItem[]; ink?: string; w?: number }> = ({ kicker, caps, serif, items, ink = C.white, w = 760 }) => {
  const frame = useCurrentFrame();
  const STEP = 150;
  const scroll = items.reduce((acc, it, i) => (i < 2 ? acc : acc + STEP * tween(frame, it.at, 30, 0, 1, "softInOut")), 0);
  const rack = items.length ? tween(frame, items[0].at + 6, 22, 0, 1, "softInOut") : 0;
  const jitter = [0, -16, 12, -8, 14, -4];
  const tilt = [-1.2, 0.8, -0.4, 1.4, -1, 0.6];
  return (
    <>
      <div style={{ position: "absolute", top: 120, width: "100%", textAlign: "center", color: ink, transform: `translateY(${-scroll * 0.3}px)` }}>
        <div style={rackStyle(rack, 12, 0.45)}>
          {kicker && <Words size={58} base={F.serif} words={kicker} />}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 40, marginTop: 6 }}>
            <Words size={190} base={F.caps} words={caps} />
            <Words size={196} base={{ ...F.serif, textTransform: "uppercase", letterSpacing: "-0.035em", lineHeight: 0.9 }} words={serif} />
          </div>
        </div>
      </div>
      {items.map((it, i) => {
        if (frame < it.at) return null;
        const p = tween(frame, it.at, 26, 0, 1, "softLand");
        const lean = tween(frame, it.at, 40, 22, 0, "softLand");
        const y = 400 + i * STEP - scroll + (1 - p) * 760;
        const s = 0.9 + i * 0.035;
        return (
          <div key={i} style={{ position: "absolute", left: 960 - w / 2 + jitter[i % jitter.length], top: y, transform: `perspective(2000px) rotateX(${lean}deg) rotate(${tilt[i % tilt.length]}deg) scale(${s})`, transformOrigin: "50% 0%" }}>
            <Frame id={it.id} color={it.color} w={w} mediaH={(w - 44) * 0.5625} />
          </div>
        );
      })}
    </>
  );
};

// ---------------------------------------------------------------- 3. PolaroidStatement

const Polaroid: React.FC<{ id: TemplateId; w: number; h: number; still?: boolean }> = ({ id, w, h, still }) => (
  <div style={{ background: C.white, padding: 18, boxShadow: "0 30px 60px rgba(0,0,0,0.22), 0 6px 14px rgba(0,0,0,0.1)" }}>
    <div style={{ width: w, height: h, position: "relative", overflow: "hidden" }}>
      <TemplateClip id={id} still={still} />
    </div>
  </div>
);

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

/**
 * Left: a tall polaroid and a smaller one float in, overlapping; a die-cut sticker slaps onto
 * the seam (the one overshoot). Right: serif kicker, caps line, serif caps line, a body line,
 * an action chip that gets pressed.
 */
export const PolaroidStatement: React.FC<{
  big: { id: TemplateId; at: number };
  small?: { id: TemplateId; at: number; still?: boolean };
  sticker?: { text: React.ReactNode; at: number; bg?: string };
  kicker?: Spoken;
  caps: Spoken;
  serif: Spoken;
  body?: Spoken;
  action?: { label: string; at: number; pressAt?: number };
  ink?: string;
}> = ({ big, small, sticker, kicker, caps, serif, body, action, ink = C.ink }) => {
  const frame = useCurrentFrame();
  const p1 = floatUp(frame, big.at, { to: { rotX: 2, rotY: 8, rotZ: -3 } });
  const p2 = small ? floatUp(frame, small.at, { to: { rotX: 2, rotY: -6, rotZ: 4 }, from: { rotY: -40, rotZ: 14 } }) : null;
  const slap = sticker ? tween(frame, sticker.at, 15, 0, 1, "popOver") : 0;
  return (
    <>
      <div style={{ position: "absolute", left: 130, top: 100 }}>
        <Float3D pose={p1}>
          <Polaroid id={big.id} w={480} h={760} />
        </Float3D>
      </div>
      {small && p2 && (
        <div style={{ position: "absolute", left: 560, top: 330 }}>
          <Float3D pose={p2}>
            <Polaroid id={small.id} w={340} h={480} still={small.still} />
          </Float3D>
        </div>
      )}
      {sticker && frame >= sticker.at && (
        <div style={{ position: "absolute", left: 520, top: 290, transform: `scale(${0.4 + 0.6 * slap}) rotate(${(1 - slap) * -20}deg)`, transformOrigin: "30% 60%" }}>
          <Sticker bg={sticker.bg ?? C.pink} tilt={-9} size={56}>
            {sticker.text}
          </Sticker>
        </div>
      )}
      <div style={{ position: "absolute", left: 1000, width: 860, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", color: ink }}>
        {kicker && <Words size={60} base={F.serif} words={kicker} />}
        <div style={{ height: 14 }} />
        <Words size={136} base={F.caps} words={caps} />
        <Words size={150} base={{ ...F.serif, textTransform: "uppercase", letterSpacing: "-0.035em", lineHeight: 0.92 }} words={serif} />
        {body && (
          <div style={{ marginTop: 34, maxWidth: 640 }}>
            <Words size={34} base={{ ...F.body, lineHeight: 1.4 }} gap={0.28} rise={0.6} words={body} />
          </div>
        )}
        {action && (
          <div style={{ marginTop: 44, height: 84 }}>
            <ActionChip label={action.label} at={action.at} pressAt={action.pressAt} scale={1.3} />
          </div>
        )}
      </div>
    </>
  );
};

// ---------------------------------------------------------------- 4. MediaSentence

export type FlowItem = { text: string; at: number } | { chip: TemplateId; at: number };

/**
 * One sentence, wrapped and centred, words on their spoken frames; each media chip OPENS a gap
 * in the line on its cue (the words around it part) with a real template playing inside.
 */
export const MediaSentence: React.FC<{ items: FlowItem[]; size?: number; ink?: string; maxWidth?: number; kicker?: Spoken }> = ({ items, size = 104, ink = C.ink, maxWidth = 1640, kicker }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: ink }}>
      {kicker && (
        <div style={{ marginBottom: size * 0.5 }}>
          <Words size={size * 0.55} base={F.serif} words={kicker} />
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", maxWidth, columnGap: size * 0.24, rowGap: size * 0.12, ...F.grotesk, fontSize: size }}>
        {items.map((it, i) => {
          if ("chip" in it) {
            const h = size * 1.0;
            return (
              <OpeningChip key={i} at={it.at} w={h * 1.45} h={h} tilt={i % 2 ? 4 : -4} radius={0.24}>
                <TemplateClip id={it.chip} />
              </OpeningChip>
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
