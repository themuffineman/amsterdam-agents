/**
 * Beat-level parts for "recreate" videos, made for the Type Staircase film and reusable:
 *
 *   LowerThird   the bottom of the frame darkens (codemotion's caption shade, tinted for the sky)
 *                and a name writes itself out, centred, word by word as it's spoken
 *   StepTitle    "01" huge in italic serif + STEP ONE + a short label; floats in, then flies off
 *                on the speed ramp when the step's content arrives (`outAt`)
 *   ChoiceCards  2-4 option cards (logo, name, one line) float in on cue; one can take focus on a
 *                speed ramp while the others go soft
 *   VersionRow   a row of labelled result cards; a highlight walks across them on cue
 */
import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { enter, tween } from "../../lib/eases";
import { TemplateClip, stepper } from "./bank";
import { TicketShell } from "./kit";
import { Float3D, Words, floatUp, rackStyle, ramp, type WordSpec } from "./moves";
import type { TemplateId } from "./templates";
import { C, F } from "./tokens";

// ---------------------------------------------------------------- LowerThird

export const LowerThird: React.FC<{ name: WordSpec[]; outAt?: number; size?: number }> = ({ name, outAt, size = 112 }) => {
  const frame = useCurrentFrame();
  const start = name[0]?.at ?? 0;
  const shade = tween(frame, start - 6, 16, 0, 1, "softInOut") * (outAt === undefined ? 1 : tween(frame, outAt, 16, 1, 0, "softInOut"));
  const gone = outAt !== undefined ? tween(frame, outAt, 14, 0, 1, "accelExit") : 0;
  if (shade <= 0.001 && frame > start) return null;
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(10,28,64,0.62) 0%, rgba(10,28,64,0.28) 26%, rgba(10,28,64,0) 46%)", opacity: shade, pointerEvents: "none" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 90, display: "flex", justifyContent: "center", color: C.white, opacity: 1 - gone, transform: `translateY(${gone * 30}px)`, filter: gone > 0.02 ? `blur(${gone * 10}px)` : undefined }}>
        <Words size={size} base={{ ...F.serif, lineHeight: 1 }} words={name} gap={0.2} />
      </div>
    </>
  );
};

// ---------------------------------------------------------------- StepTitle

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six"];

export const StepTitle: React.FC<{ n: number; label: string; at: number; outAt: number }> = ({ n, label, at, outAt }) => {
  const frame = useCurrentFrame();
  if (frame >= outAt + 20) return null;
  const num = enter(frame, at, { from: { y: 120, blur: 16, scale: 0.92 }, frames: 18 });
  const caps = enter(frame, at + 5, { from: { y: 50, blur: 10 }, frames: 14 });
  const lab = enter(frame, at + 10, { from: { y: 50, blur: 10 }, frames: 14 });
  const out = ramp(frame, outAt, 22, 22);
  const o = (e: ReturnType<typeof enter>) => (e.visible ? e.opacity : 0);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 50,
        color: C.white,
        transform: `scale(${1 + out.p * 1.4})`,
        opacity: 1 - tween(frame, outAt + 8, 12, 0, 1),
        filter: out.blur > 0.3 ? `blur(${out.blur}px)` : undefined,
      }}
    >
      <div style={{ ...F.italic, fontSize: 420, lineHeight: 0.8, transform: `translateY(${num.y}px) scale(${num.scale})`, opacity: o(num), filter: num.blur > 0.3 ? `blur(${num.blur}px)` : undefined }}>
        {String(n).padStart(2, "0")}
      </div>
      <div>
        <div style={{ ...F.caps, fontSize: 120, transform: `translateY(${caps.y}px)`, opacity: o(caps), filter: caps.blur > 0.3 ? `blur(${caps.blur}px)` : undefined, display: "flex", gap: "0.22em" }}>
          <span>Step</span>
          <span>{NUMBER_WORDS[n] ?? n}</span>
        </div>
        <div style={{ ...F.italic, fontSize: 84, lineHeight: 1.05, marginTop: 6, transform: `translateY(${lab.y}px)`, opacity: o(lab), filter: lab.blur > 0.3 ? `blur(${lab.blur}px)` : undefined }}>{label}</div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- ChoiceCards

export type Choice = { at: number; name: string; line: string; logo?: string; icon?: React.ReactNode };

/** Frames being captured: the "web page + screenshots" option's icon. */
export const FramesIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    {[0, 1, 2].map((i) => (
      <rect key={i} x={14 + i * 10} y={18 + i * 10} width={56} height={44} rx={7} fill={i === 2 ? C.white : "none"} stroke={C.red} strokeWidth={4} opacity={0.45 + i * 0.27} />
    ))}
    <circle cx={62} cy={60} r={9} fill={C.red} />
  </svg>
);

export const ChoiceCards: React.FC<{ items: Choice[]; focus?: { index: number; at: number }; width?: number; top?: number }> = ({ items, focus, width = 440, top = 250 }) => {
  const frame = useCurrentFrame();
  const mid = (items.length - 1) / 2;
  const step = width + 60;
  const r = focus ? ramp(frame, focus.at, 24) : { p: 0, blur: 0 };
  const order = items.map((_, i) => i).sort((a, b) => (a === focus?.index ? 1 : b === focus?.index ? -1 : 0));
  return (
    <>
      {order.map((i) => {
        const it = items[i];
        const side = Math.sign(i - mid);
        const pose = floatUp(frame, it.at, { to: { rotX: 3, rotY: -side * 9, rotZ: [-3, 1, 3.5][i % 3] }, from: { rotY: side * 38 || 28 } });
        const chosen = focus?.index === i;
        const x = (i - mid) * step;
        const fx = chosen ? x * (1 - r.p) : x + side * 130 * r.p;
        return (
          <div key={i} style={{ position: "absolute", left: 960 - width / 2, top, filter: chosen && r.blur > 0.3 ? `blur(${r.blur * 0.6}px)` : undefined }}>
            <Float3D pose={chosen ? { ...pose, rotY: pose.rotY * (1 - r.p), rotZ: pose.rotZ * (1 - r.p) } : pose} x={fx} scale={chosen ? 1 + 0.14 * r.p : 1}>
              <TicketShell width={width} focus={chosen ? r.p : 0} dim={focus && !chosen ? r.p : 0}>
                <div style={{ height: 150, display: "flex", alignItems: "center" }}>
                  {it.logo ? <Img src={staticFile(it.logo)} style={{ width: 110, height: 110, objectFit: "contain" }} /> : it.icon}
                </div>
                <div style={{ ...F.italic, fontSize: 64, lineHeight: 1, marginTop: 14 }}>{it.name}</div>
                <div style={{ ...F.body, fontSize: 25, lineHeight: 1.35, marginTop: 12, color: "#3A3A3A" }}>{it.line}</div>
              </TicketShell>
            </Float3D>
          </div>
        );
      })}
    </>
  );
};

// ---------------------------------------------------------------- VersionRow

export type Version = { label: string; at: number; filter?: string };

export const VersionRow: React.FC<{ id: TemplateId; trim?: number; versions: Version[]; walk?: number[]; width?: number }> = ({ id, trim, versions, walk = [], width = 520 }) => {
  const frame = useCurrentFrame();
  const active = stepper(frame, walk);
  const gap = 50;
  const total = versions.length * width + (versions.length - 1) * gap;
  return (
    <>
      {versions.map((v, i) => {
        const pose = floatUp(frame, v.at, { to: { rotX: 3, rotY: (1 - i) * 8, rotZ: [-2, 0.5, 2][i % 3] } });
        const near = active < 0 ? 1 : Math.max(0, 1 - Math.abs(active - i));
        const dim = active < 0 ? 0 : 1 - near;
        return (
          <div key={i} style={{ position: "absolute", left: 960 - total / 2 + i * (width + gap), top: 290, ...rackStyle(dim * 0.6, 8, 0.6) }}>
            <Float3D pose={pose} scale={1 + 0.06 * (active < 0 ? 0 : near)}>
              <div style={{ ...F.italic, fontSize: 52, color: C.white, marginBottom: 16, marginLeft: 4 }}>
                <span style={{ ...F.mono, fontSize: 24, marginRight: 14, verticalAlign: "middle" }}>{String(i + 1).padStart(2, "0")}</span>
                {v.label}
              </div>
              <TicketShell width={width} focus={active < 0 ? 0 : near}>
                <div style={{ margin: -width * 0.035, width: width * 0.93, height: width * 0.93 * 0.5625, borderRadius: width * 0.03, overflow: "hidden", position: "relative" }}>
                  <div style={{ position: "absolute", inset: 0, filter: v.filter }}>
                    <TemplateClip id={id} trim={trim} />
                  </div>
                </div>
              </TicketShell>
            </Float3D>
          </div>
        );
      })}
    </>
  );
};
