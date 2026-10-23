/**
 * Screen UI for the tutorial part of "recreate" videos: a browser window with the template's page
 * on sycamore.to/motion, a cursor, and the Claude Code desktop window. These are DUMMIES drawn in
 * code until real screen recordings exist (the site has no copy-prompt button yet). The Claude
 * window follows the user's Claude Code design references (dark window, serif greeting with the
 * Claude mark, input card with file chips, numbered instruction lines, Chat/Cowork/Code, model,
 * orange send button). The Claude mark is the official icon from svgl.app
 * (public/recreate/claude-icon.svg).
 *
 * Everything is driven by cue frames passed in; pure functions of useCurrentFrame().
 */
import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { enter, tween } from "../../lib/eases";
import { TemplateClip } from "./bank";
import { ramp } from "./moves";
import { TEMPLATES, type TemplateId } from "./templates";
import { C, F } from "./tokens";

// ---------------------------------------------------------------- cursor

export type CursorKey = { at: number; x: number; y: number };

/**
 * macOS-style arrow. Moves between keys on the speed ramp (slow, fast, hard stop) and dips on a
 * click. Position is in the parent's px.
 */
export const Cursor: React.FC<{ keys: CursorKey[]; clicks?: number[]; appear?: number }> = ({ keys, clicks = [], appear = keys[0]?.at ?? 0 }) => {
  const frame = useCurrentFrame();
  if (frame < appear || !keys.length) return null;
  let x = keys[0].x;
  let y = keys[0].y;
  for (let i = 1; i < keys.length; i++) {
    const p = ramp(frame, keys[i].at, 20, 0).p;
    x += (keys[i].x - x) * p;
    y += (keys[i].y - y) * p;
  }
  const press = clicks.reduce((m, c) => Math.max(m, tween(frame, c, 3, 0, 1, "glide") - tween(frame, c + 3, 7, 0, 1, "softLand")), 0);
  const o = tween(frame, appear, 6, 0, 1);
  return (
    <svg width={34} height={46} viewBox="0 0 17 23" style={{ position: "absolute", left: x, top: y, opacity: o, transform: `scale(${1 - press * 0.18})`, transformOrigin: "10% 10%", filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.35))", zIndex: 50 }}>
      <path d="M1 1 L1 18 L5.4 13.9 L8.4 21 L11.2 19.8 L8.3 12.9 L14.2 12.9 Z" fill="#111" stroke="#fff" strokeWidth={1.4} strokeLinejoin="round" />
    </svg>
  );
};

// ---------------------------------------------------------------- browser + template page

/** A light browser window: traffic lights + address pill. The URL can arrive on a cue. */
export const BrowserWindow: React.FC<{ width: number; height: number; url: string; urlAt?: number; children: React.ReactNode }> = ({ width, height, url, urlAt = 0, children }) => {
  const frame = useCurrentFrame();
  const shown = Math.round(tween(frame, urlAt, 14, 0, url.length, "cruise"));
  return (
    <div style={{ width, height, borderRadius: 18, overflow: "hidden", background: "#0E0E10", boxShadow: "0 50px 100px rgba(20,60,120,0.32), 0 10px 24px rgba(20,60,120,0.16)" }}>
      <div style={{ height: 58, background: "#EDECE9", display: "flex", alignItems: "center", padding: "0 22px", gap: 9 }}>
        {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
          <span key={c} style={{ width: 14, height: 14, borderRadius: 99, background: c }} />
        ))}
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div style={{ width: width * 0.46, height: 36, borderRadius: 10, background: C.white, display: "flex", alignItems: "center", padding: "0 16px", gap: 10, ...F.body, fontSize: 18, color: "#3a3a3a" }}>
            <svg width={13} height={15} viewBox="0 0 13 15">
              <rect x={1} y={6.5} width={11} height={8} rx={2} fill="#8a8a8a" />
              <path d="M3.5 6.5V4.5a3 3 0 0 1 6 0v2" stroke="#8a8a8a" strokeWidth={1.6} fill="none" />
            </svg>
            <span>{url.slice(0, shown)}</span>
          </div>
        </div>
        <span style={{ width: 60 }} />
      </div>
      <div style={{ position: "relative", height: height - 58 }}>{children}</div>
    </div>
  );
};

/**
 * The template's page on sycamore.to/motion (DUMMY: the real page has no prompt button yet).
 * Preview on the left, codename + name + tags + Download / Copy prompt on the right. The copy
 * button presses on `copyAt` and flips to "Copied".
 */
export const TemplatePage: React.FC<{ id: TemplateId; width: number; copyAt?: number; promptWords: number }> = ({
  id,
  width,
  copyAt,
  promptWords,
}) => {
  const frame = useCurrentFrame();
  const t = TEMPLATES[id];
  const copied = copyAt !== undefined && frame >= copyAt + 3;
  const press = copyAt === undefined ? 0 : tween(frame, copyAt, 3, 0, 1, "glide") - tween(frame, copyAt + 3, 8, 0, 1, "softLand");
  const pad = 46;
  const previewW = width * 0.6;
  const ink = "#F4F2EE";
  const muted = "#8E8C88";
  return (
    <div style={{ position: "absolute", inset: 0, background: "#0E0E10", color: ink, ...F.body }}>
      <div style={{ height: 70, display: "flex", alignItems: "center", gap: 34, padding: `0 ${pad}px`, borderBottom: "1px solid #1F1F22", fontSize: 19, color: muted }}>
        <span style={{ fontFamily: F.grotesk.fontFamily, fontWeight: 700, fontSize: 24, color: ink, letterSpacing: "-0.02em" }}>Sycamore</span>
        <span style={{ color: ink }}>Motion</span>
        <span>Templates</span>
        <span>Captions</span>
      </div>
      <div style={{ display: "flex", gap: 44, padding: pad }}>
        <div style={{ width: previewW, height: previewW * 0.5625, borderRadius: 8, overflow: "hidden", position: "relative", border: "1px solid #232326" }}>
          <TemplateClip id={id} />
        </div>
        <div style={{ flex: 1, paddingTop: 6 }}>
          <div style={{ ...F.mono, fontSize: 15, color: muted }}>Nº {String(t.n).padStart(2, "0")} · {t.category}</div>
          <div style={{ ...F.serif, fontSize: 96, lineHeight: 1, marginTop: 14 }}>{t.codename}</div>
          <div style={{ fontSize: 26, color: muted, marginTop: 8 }}>{t.name}</div>
          <div style={{ display: "flex", gap: 10, marginTop: 26 }}>
            {[t.category, `${t.sec.toFixed(1)} s`, "Free"].map((x) => (
              <span key={x} style={{ fontSize: 16, padding: "7px 12px", borderRadius: 6, background: "#1C1C1F", color: "#C9C6C0" }}>
                {x}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 40 }}>
            <div style={{ height: 58, borderRadius: 8, border: "1.5px solid #34343A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21, color: ink }}>Download MP4</div>
            <div
              style={{
                height: 58,
                borderRadius: 8,
                background: copied ? C.blue : ink,
                color: copied ? C.white : "#111",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                fontSize: 21,
                fontWeight: 600,
                transform: `scale(${1 - press * 0.05})`,
              }}
            >
              {copied ? "Copied" : "Copy prompt"}
            </div>
          </div>
          <div style={{ fontSize: 16, color: muted, marginTop: 14 }}>Prompt · {promptWords.toLocaleString("en-US")} words · paste into Claude Code</div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- Claude Code window

const CL = {
  window: "#1F1E1D",
  bar: "#1A1918",
  card: "#2A2928",
  cardLine: "#3B3936",
  chip: "#33312F",
  text: "#ECE9E2",
  muted: "#A19D95",
  faint: "#6F6B65",
  orange: "#D97757",
  active: "#3B9BFF",
} as const;

export type ClaudeAttachment = { name: string; meta: string; kind: "md" | "pdf" | "folder" | "video"; at: number };
export type ClaudeLine = { text: string; at: number; numbered?: boolean };

const FileIcon: React.FC<{ kind: ClaudeAttachment["kind"] }> = ({ kind }) => {
  if (kind === "folder")
    return (
      <svg width={52} height={40} viewBox="0 0 52 40">
        <path d="M3 6a4 4 0 0 1 4-4h13l5 5h20a4 4 0 0 1 4 4v23a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" fill="#5AA8F0" />
        <rect x={3} y={12} width={46} height={26} rx={4} fill="#7CC0F8" />
      </svg>
    );
  const tag = kind === "pdf" ? "PDF" : kind === "video" ? "MP4" : "MD";
  const tagBg = kind === "pdf" ? "#E5484D" : kind === "video" ? "#6E56CF" : CL.orange;
  return (
    <svg width={40} height={50} viewBox="0 0 40 50">
      <path d="M4 2h22l10 10v34a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#F5F3EF" />
      <path d="M26 2v10h10" fill="#D9D5CE" />
      {[18, 23, 28].map((y) => (
        <rect key={y} x={8} y={y} width={20} height={2.4} rx={1.2} fill="#C9C4BB" />
      ))}
      <rect x={4} y={33} width={26} height={12} rx={3} fill={tagBg} />
      <text x={17} y={42} textAnchor="middle" fontSize={8.5} fontWeight={700} fill="#fff" fontFamily="Inter, sans-serif">
        {tag}
      </text>
    </svg>
  );
};

/**
 * Claude Code (desktop) in its new-session state, then working. Attachments pop into the input
 * card on their cues; instruction lines arrive whole on theirs (numbered lines get a circle, the
 * newest one is blue, the way the references show the active step). `sendAt` presses the orange
 * button; from `workingAt` the card slides down, the request sits above as a message and the
 * Claude mark spins beside a status line whose timer runs from 0 to `workMinutes` (a time skip).
 */
export const ClaudeWindow: React.FC<{
  width: number;
  height: number;
  name?: string;
  model?: string;
  attachments: ClaudeAttachment[];
  lines: ClaudeLine[];
  sendAt?: number;
  workingAt?: number;
  workMinutes?: number;
  workFrames?: number;
  steps?: { text: string; at: number }[];
}> = ({ width, height, name, model = "Opus 5.5", attachments, lines, sendAt, workingAt, workMinutes = 10, workFrames = 60, steps = [] }) => {
  const frame = useCurrentFrame();
  const working = workingAt !== undefined && frame >= workingAt;
  const w = workingAt === undefined ? 0 : ramp(frame, workingAt, 24, 0).p;
  const press = sendAt === undefined ? 0 : tween(frame, sendAt, 3, 0, 1, "glide") - tween(frame, sendAt + 3, 8, 0, 1, "softLand");
  const lastLineAt = Math.max(...lines.filter((l) => l.numbered && frame >= l.at).map((l) => l.at), -1);
  const ui: React.CSSProperties = { ...F.body, letterSpacing: "-0.01em" };
  const cardW = width * 0.78;
  const elapsed = workingAt === undefined ? 0 : tween(frame, workingAt + 10, workFrames, 0, workMinutes * 60 - 12, "glide");
  const mm = Math.floor(elapsed / 60);
  const ss = Math.floor(elapsed % 60);
  let n = 0;
  return (
    <div style={{ width, height, borderRadius: 20, overflow: "hidden", background: CL.window, color: CL.text, ...ui, boxShadow: "0 50px 100px rgba(10,30,70,0.38), 0 10px 24px rgba(10,30,70,0.2)", position: "relative" }}>
      {/* title bar */}
      <div style={{ height: 64, background: CL.bar, display: "flex", alignItems: "center", padding: "0 26px", gap: 26, color: CL.muted }}>
        <svg width={22} height={18} viewBox="0 0 22 18">
          <rect x={1} y={1} width={20} height={16} rx={3} stroke="currentColor" strokeWidth={1.6} fill="none" />
          <path d="M8 1v16" stroke="currentColor" strokeWidth={1.6} />
        </svg>
        <span style={{ fontSize: 24 }}>‹</span>
        <span style={{ fontSize: 24, color: CL.faint }}>›</span>
        <span style={{ flex: 1, textAlign: "center", fontSize: 21, color: CL.text }}>Claude Code</span>
        <span style={{ fontSize: 22 }}>—</span>
        <span style={{ width: 17, height: 17, border: "1.6px solid currentColor", borderRadius: 2 }} />
        <span style={{ fontSize: 26 }}>×</span>
      </div>

      {/* greeting (fades and lifts away once working) */}
      <div style={{ position: "absolute", top: 150 - w * 60, width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: 22, opacity: 1 - w }}>
        <Img src={staticFile("recreate/claude-icon.svg")} style={{ width: 62, height: 62 }} />
        <span style={{ ...F.serif, fontSize: 64, letterSpacing: "-0.01em", color: CL.text }}>Hey there{name ? `, ${name}` : ""}</span>
      </div>

      {/* working view: the sent request + the status */}
      {working && (
        <div style={{ position: "absolute", top: 110, left: (width - cardW) / 2, width: cardW, opacity: w }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{ background: CL.card, borderRadius: 18, padding: "18px 24px", fontSize: 22, maxWidth: cardW * 0.7, color: CL.text }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                {attachments.map((a) => (
                  <span key={a.name} style={{ fontSize: 17, padding: "6px 12px", borderRadius: 8, background: CL.chip, color: CL.muted }}>
                    {a.name}
                  </span>
                ))}
              </div>
              {lines.map((l) => l.text).join(" ")}
            </div>
          </div>
          <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 16 }}>
            {steps.map((s) => {
              const e = enter(frame, s.at, { from: { y: 14, blur: 4 }, frames: 12 });
              return (
                <div key={s.text} style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 22, color: CL.muted, opacity: e.visible ? e.opacity : 0, transform: `translateY(${e.y}px)` }}>
                  <span style={{ width: 22, height: 22, borderRadius: 99, background: "#2F6B3F", color: "#B8F0C6", display: "grid", placeItems: "center", fontSize: 14 }}>✓</span>
                  {s.text}
                </div>
              );
            })}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
              <Img src={staticFile("recreate/claude-icon.svg")} style={{ width: 34, height: 34, transform: `rotate(${(frame - (workingAt ?? 0)) * 6}deg)` }} />
              <span style={{ fontSize: 23, color: CL.text }}>Working</span>
              <span style={{ ...F.mono, fontSize: 20, color: CL.muted, textTransform: "none", letterSpacing: 0 }}>
                {mm}m {String(ss).padStart(2, "0")}s
              </span>
            </div>
          </div>
        </div>
      )}

      {/* input card: centred, then slides to the bottom once working */}
      <div
        style={{
          position: "absolute",
          left: (width - cardW) / 2,
          width: cardW,
          top: 270 + w * (height - 270 - 210),
          background: CL.card,
          border: `1.5px solid ${CL.cardLine}`,
          borderRadius: 30,
          padding: 26,
          boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
        }}
      >
        {!working && attachments.some((a) => frame >= a.at) && (
          <div style={{ display: "flex", gap: 16, marginBottom: 22 }}>
            {attachments.map((a) => {
              const e = enter(frame, a.at, { from: { y: 18, blur: 6, scale: 0.92 }, easing: "snapSettle", frames: 12 });
              if (!e.visible) return null;
              return (
                <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 16, background: CL.chip, borderRadius: 16, padding: "14px 22px 14px 16px", transform: `translateY(${e.y}px) scale(${e.scale})`, opacity: e.opacity, filter: e.blur > 0.3 ? `blur(${e.blur}px)` : undefined }}>
                  <FileIcon kind={a.kind} />
                  <div>
                    <div style={{ fontSize: 23, color: CL.text }}>{a.name}</div>
                    <div style={{ fontSize: 17, color: CL.muted, marginTop: 3 }}>{a.meta}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {!working && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 27, minHeight: 40 }}>
            {lines.every((l) => frame < l.at) && <span style={{ color: CL.faint }}>How can I help you today?</span>}
            {lines.map((l, i) => {
              if (frame < l.at) return null;
              const e = enter(frame, l.at, { from: { y: 12, blur: 4 }, frames: 11 });
              const num = l.numbered ? ++n : 0;
              const active = l.numbered && l.at === lastLineAt;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, transform: `translateY(${e.y}px)`, opacity: e.opacity, color: active ? CL.active : CL.text }}>
                  {l.numbered && (
                    <span style={{ width: 34, height: 34, borderRadius: 99, background: active ? CL.active : "#3A3836", color: active ? "#fff" : CL.muted, display: "grid", placeItems: "center", fontSize: 18, flexShrink: 0 }}>{num}</span>
                  )}
                  {l.text}
                </div>
              );
            })}
          </div>
        )}
        {working && <div style={{ fontSize: 24, color: CL.faint, minHeight: 34 }}>Reply to Claude…</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 24 }}>
          <span style={{ width: 52, height: 52, borderRadius: 12, border: `1.5px solid ${CL.cardLine}`, display: "grid", placeItems: "center", fontSize: 28, color: CL.muted }}>+</span>
          <div style={{ display: "flex", background: "#232221", border: `1.5px solid ${CL.cardLine}`, borderRadius: 14, padding: 4 }}>
            {["Chat", "Cowork", "Code"].map((m) => (
              <span key={m} style={{ fontSize: 21, padding: "9px 20px", borderRadius: 10, background: m === "Code" ? "#3A3836" : "transparent", color: m === "Code" ? CL.text : CL.muted }}>
                {m}
              </span>
            ))}
          </div>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 21, color: CL.text }}>{model}</span>
          <span style={{ fontSize: 21, color: CL.muted }}>High ⌄</span>
          <span style={{ width: 56, height: 56, borderRadius: 14, background: CL.orange, display: "grid", placeItems: "center", transform: `scale(${1 - press * 0.1})`, boxShadow: press > 0 ? `0 0 0 ${6 * press}px rgba(217,119,87,0.35)` : undefined }}>
            <svg width={22} height={24} viewBox="0 0 22 24">
              <path d="M11 21V4M4 10l7-7 7 7" stroke="#fff" strokeWidth={2.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
};
