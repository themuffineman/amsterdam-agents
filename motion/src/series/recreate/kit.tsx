/**
 * Building blocks for the "recreate" series. Presentational only: every piece takes plain
 * props (position, tilt, progress) so scenes animate them from useCurrentFrame().
 */
import React from "react";
import { AbsoluteFill, random } from "remotion";
import { C, F } from "./tokens";

// ---------------------------------------------------------------- grounds

/** Off-white paper with a faint vignette, so it never reads as a flat swatch. */
export const PaperGround: React.FC = () => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(120% 90% at 50% 40%, ${C.paper} 55%, ${C.paperDeep} 100%)`,
    }}
  />
);

export const NightGround: React.FC = () => (
  <AbsoluteFill style={{ background: `radial-gradient(90% 80% at 50% 30%, #1A1A1A 0%, ${C.night} 70%)` }} />
);

/** Sky: soft blue gradient, the glass ground for blurred type and floating cards. */
export const SkyGround: React.FC<{ shift?: number }> = ({ shift = 0 }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(60% 70% at ${50 + shift}% 45%, #7AB4EE 0%, rgba(122,180,238,0) 70%),
                   radial-gradient(50% 60% at ${8 + shift}% 30%, #8FD3FA 0%, rgba(143,211,250,0) 70%),
                   radial-gradient(50% 60% at ${95 - shift}% 70%, #85CFF8 0%, rgba(133,207,248,0) 70%),
                   linear-gradient(180deg, #A9D3F7 0%, #7EB6EE 60%, #8EC2F1 100%)`,
    }}
  />
);

// ---------------------------------------------------------------- chrome

/** White box with caps links (Extrafazant nav). */
export const NavPill: React.FC<{ items: string[]; style?: React.CSSProperties }> = ({ items, style }) => (
  <div style={{ display: "flex", gap: 26, padding: "14px 22px", background: C.white, ...F.caps, fontSize: 22, color: C.ink, ...style }}>
    {items.map((t) => (
      <span key={t}>{t}</span>
    ))}
  </div>
);

/** Blue square arrow + blue label box (the series' one button). */
export const ArrowButton: React.FC<{ label: string; scale?: number; color?: string }> = ({ label, scale = 1, color = C.blue }) => (
  <div style={{ display: "flex", gap: 4 * scale, ...F.caps, fontSize: 26 * scale, color: C.white }}>
    <div style={{ width: 56 * scale, height: 56 * scale, background: color, display: "grid", placeItems: "center" }}>
      <Arrow size={26 * scale} />
    </div>
    <div style={{ height: 56 * scale, padding: `0 ${18 * scale}px`, background: color, display: "flex", alignItems: "center" }}>{label}</div>
  </div>
);

export const Arrow: React.FC<{ size: number; color?: string; down?: boolean }> = ({ size, color = C.white, down }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: down ? "rotate(90deg)" : undefined }}>
    <path d="M3 12h16M13 5l7 7-7 7" stroke={color} strokeWidth={3} fill="none" strokeLinecap="square" />
  </svg>
);

/** Hand-drawn squiggle underline. `draw` 0..1 strokes it on. */
export const Squiggle: React.FC<{ width: number; color?: string; draw?: number; stroke?: number }> = ({ width, color = C.blue, draw = 1, stroke = 6 }) => {
  const h = width * 0.09;
  const d = `M2 ${h * 0.6} C ${width * 0.12} ${-h * 0.2}, ${width * 0.2} ${h * 1.3}, ${width * 0.33} ${h * 0.5} S ${width * 0.55} ${-h * 0.1}, ${width * 0.66} ${h * 0.6} S ${width * 0.86} ${h * 0.9}, ${width - 2} ${h * 0.3}`;
  return (
    <svg width={width} height={h + stroke * 2} viewBox={`0 ${-stroke} ${width} ${h + stroke * 2}`} style={{ overflow: "visible" }}>
      <path d={d} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
    </svg>
  );
};

/** Round badge with text on a circle ("THIS IS HOW WE SCROLL"). `spin` in degrees. */
export const SpinBadge: React.FC<{ text: string; size: number; spin?: number; bg?: string; ink?: string }> = ({ text, size, spin = 0, bg = "#8FA2F5", ink = C.ink }) => (
  <svg width={size} height={size} viewBox="0 0 200 200">
    <circle cx={100} cy={100} r={98} fill={bg} />
    <defs>
      <path id="badge-ring" d="M100,100 m-68,0 a68,68 0 1,1 136,0 a68,68 0 1,1 -136,0" />
    </defs>
    <g transform={`rotate(${spin} 100 100)`}>
      <text style={{ ...F.caps, fontSize: 27, letterSpacing: "0.06em" }} fill={ink}>
        <textPath href="#badge-ring">{text}</textPath>
      </text>
    </g>
    <circle cx={100} cy={100} r={24} fill="none" stroke={ink} strokeWidth={5} />
    <path d="M100 76 v48 M76 100 h48" stroke={ink} strokeWidth={5} />
  </svg>
);

/** Die-cut sticker: thick white outline around caps text, tilted. */
export const Sticker: React.FC<{ children: React.ReactNode; bg?: string; ink?: string; tilt?: number; size?: number }> = ({ children, bg = C.pink, ink = C.ink, tilt = -8, size = 44 }) => (
  <div
    style={{
      display: "inline-block",
      transform: `rotate(${tilt}deg)`,
      background: bg,
      color: ink,
      ...F.caps,
      fontSize: size,
      padding: `${size * 0.28}px ${size * 0.45}px ${size * 0.2}px`,
      borderRadius: size * 0.35,
      boxShadow: `0 0 0 ${size * 0.16}px ${C.white}, 0 ${size * 0.3}px ${size * 0.6}px rgba(0,0,0,0.18)`,
    }}
  >
    {children}
  </div>
);

// ---------------------------------------------------------------- media holders

/** A print: thick coloured frame around media, label block under it, tilted. */
export const Print: React.FC<{
  color: string;
  width: number;
  height: number;
  tilt?: number;
  border?: number;
  label?: string;
  sub?: string;
  labelInk?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ color, width, height, tilt = 0, border = 22, label, sub, labelInk = C.white, children, style }) => (
  <div
    style={{
      position: "absolute",
      width,
      background: color,
      padding: border,
      paddingBottom: label ? border * 0.6 : border,
      transform: `rotate(${tilt}deg)`,
      boxShadow: "0 30px 60px rgba(0,0,0,0.22), 0 6px 14px rgba(0,0,0,0.12)",
      ...style,
    }}
  >
    <div style={{ width: width - border * 2, height, overflow: "hidden", position: "relative" }}>{children}</div>
    {label && (
      <div style={{ textAlign: "center", color: labelInk, paddingTop: border * 0.7 }}>
        <div style={{ ...F.caps, fontSize: width * 0.15 }}>{label}</div>
        {sub && <div style={{ ...F.serif, fontSize: width * 0.065, lineHeight: 1.05, marginTop: 6 }}>{sub}</div>}
      </div>
    )}
  </div>
);

/** Rounded media chip that sits inside a line of type, sized to the cap height. */
export const Chip: React.FC<{ w: number; h: number; tilt?: number; radius?: number; children: React.ReactNode }> = ({ w, h, tilt = 0, radius = 14, children }) => (
  <span
    style={{
      display: "inline-block",
      width: w,
      height: h,
      borderRadius: radius,
      overflow: "hidden",
      position: "relative",
      transform: `rotate(${tilt}deg)`,
      verticalAlign: "middle",
      boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
    }}
  >
    {children}
  </span>
);

// ---------------------------------------------------------------- the prompt ticket

/** Deterministic barcode (seeded). */
export const Barcode: React.FC<{ width: number; height: number; color?: string; seed?: string }> = ({ width, height, color = C.red, seed = "ticket" }) => {
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  let i = 0;
  while (x < width) {
    const w = 3 + Math.floor(random(`${seed}-w-${i}`) * 4) * 3;
    const gap = 4 + Math.floor(random(`${seed}-g-${i}`) * 3) * 3;
    if (x + w > width) break;
    bars.push({ x, w });
    x += w + gap;
    i++;
  }
  return (
    <svg width={width} height={height}>
      {bars.map((b, k) => (
        <rect key={k} x={b.x} y={0} width={b.w} height={height} fill={color} />
      ))}
    </svg>
  );
};

/** One run of ticket text: plain sans, or an italic-serif emphasis. */
export type Run = string | { em: string };

const Runs: React.FC<{ runs: Run[]; size: number }> = ({ runs, size }) => (
  <>
    {runs.map((r, i) =>
      typeof r === "string" ? (
        <span key={i}>{r}</span>
      ) : (
        <span key={i} style={{ ...F.italic, fontSize: size * 1.12 }}>
          {r.em}
        </span>
      ),
    )}
  </>
);

/**
 * The prompt as a ticket: italic serif title, body with serif emphases, diamond bullets,
 * perforation, stub with mono labels + barcode. The series' signature object: every video
 * shows the prompt this way before it is pasted into Claude Code.
 */
export const PromptTicket: React.FC<{
  width: number;
  title: string;
  body: Run[];
  bullets: Run[][];
  stubLeft: string;
  stubRight: string;
  footer: string;
  ink?: string;
  /** 3D lean, degrees. */
  rotY?: number;
  rotZ?: number;
  style?: React.CSSProperties;
}> = ({ width, title, body, bullets, stubLeft, stubRight, footer, ink = C.red, rotY = 0, rotZ = 0, style }) => {
  const pad = width * 0.06;
  const card: React.CSSProperties = { background: C.white, borderRadius: width * 0.055, padding: pad, color: ink };
  return (
    <div style={{ position: "absolute", width, transform: `perspective(1800px) rotateY(${rotY}deg) rotateZ(${rotZ}deg)`, filter: "drop-shadow(0 30px 50px rgba(20,60,120,0.25))", ...style }}>
      <div style={{ ...card, borderBottomLeftRadius: width * 0.03, borderBottomRightRadius: width * 0.03, paddingBottom: pad * 0.9 }}>
        <div style={{ ...F.italic, fontSize: width * 0.11, lineHeight: 1 }}>{title}</div>
        <div style={{ ...F.body, fontSize: width * 0.042, lineHeight: 1.3, marginTop: pad * 0.7 }}>
          <Runs runs={body} size={width * 0.042} />
        </div>
        <div style={{ marginTop: pad * 1.6, display: "flex", flexDirection: "column", gap: width * 0.012 }}>
          {bullets.map((b, i) => (
            <div key={i} style={{ ...F.body, fontSize: width * 0.04, display: "flex", alignItems: "baseline", gap: width * 0.022 }}>
              <span style={{ display: "inline-block", width: width * 0.016, height: width * 0.016, background: ink, transform: "rotate(45deg) translateY(-3px)" }} />
              <span>
                <Runs runs={b} size={width * 0.04} />
              </span>
            </div>
          ))}
        </div>
      </div>
      {/* perforation */}
      <div style={{ height: 0, margin: `0 ${width * 0.04}px`, borderTop: `4px dashed ${C.sky}` }} />
      <div style={{ ...card, borderTopLeftRadius: width * 0.03, borderTopRightRadius: width * 0.03, paddingTop: pad * 0.9 }}>
        <div style={{ display: "flex", justifyContent: "space-between", ...F.mono, fontSize: width * 0.036 }}>
          <span>{stubLeft}</span>
          <span>{stubRight}</span>
        </div>
        <div style={{ marginTop: pad * 0.6 }}>
          <Barcode width={width - pad * 2} height={width * 0.13} color={ink} seed={title} />
        </div>
        <div style={{ ...F.mono, fontSize: width * 0.032, marginTop: pad * 0.5 }}>{footer}</div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- Claude Code clone

export const CLAUDE_ORANGE = "#D97757";

export type TermLine =
  | { kind: "welcome"; cwd: string }
  | { kind: "user"; text: string }
  | { kind: "tool"; name: string; arg: string; result: string }
  | { kind: "say"; text: string }
  | { kind: "status"; text: string; hint: string }
  | { kind: "input"; text: string; caret?: boolean };

/**
 * Claude Code in a terminal window: a stylised clone (mono, dark, orange marks), not a
 * screenshot. Lines are data so a scene can reveal them one by one.
 */
export const Terminal: React.FC<{ width: number; height: number; lines: TermLine[]; title?: string; tilt?: number; style?: React.CSSProperties }> = ({
  width,
  height,
  lines,
  title = "claude — ~/motion-template",
  tilt = 0,
  style,
}) => {
  const fs = width * 0.0175;
  const mono: React.CSSProperties = { fontFamily: F.mono.fontFamily, fontWeight: 450, fontSize: fs, lineHeight: 1.55, letterSpacing: 0 };
  const dim = "#8B8B86";
  return (
    <div
      style={{
        position: "absolute",
        width,
        height,
        borderRadius: 18,
        overflow: "hidden",
        background: "#1C1B19",
        transform: `rotate(${tilt}deg)`,
        boxShadow: "0 40px 80px rgba(0,0,0,0.3), 0 0 0 1.5px rgba(255,255,255,0.06) inset",
        ...style,
      }}
    >
      <div style={{ height: 52, display: "flex", alignItems: "center", gap: 10, padding: "0 20px", background: "#262522" }}>
        {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
          <span key={c} style={{ width: 15, height: 15, borderRadius: 99, background: c }} />
        ))}
        <span style={{ ...mono, fontSize: fs * 0.85, color: dim, marginLeft: 16 }}>{title}</span>
      </div>
      <div style={{ padding: "26px 34px", color: "#E8E6E1", ...mono, display: "flex", flexDirection: "column", gap: fs * 0.9 }}>
        {lines.map((l, i) => {
          switch (l.kind) {
            case "welcome":
              return (
                <div key={i} style={{ border: `1.5px solid ${CLAUDE_ORANGE}`, borderRadius: 10, padding: `${fs * 0.6}px ${fs}px`, width: "62%" }}>
                  <div>
                    <span style={{ color: CLAUDE_ORANGE }}>✻</span> Welcome to <b>Claude Code</b>!
                  </div>
                  <div style={{ color: dim, marginTop: fs * 0.5 }}>/help for help</div>
                  <div style={{ color: dim }}>cwd: {l.cwd}</div>
                </div>
              );
            case "user":
              return (
                <div key={i} style={{ color: dim }}>
                  &gt; <span style={{ color: "#CFCBC3" }}>{l.text}</span>
                </div>
              );
            case "tool":
              return (
                <div key={i}>
                  <div>
                    <span style={{ color: "#5FBF7A" }}>●</span> <b>{l.name}</b>({l.arg})
                  </div>
                  <div style={{ color: dim }}>&nbsp;&nbsp;⎿&nbsp; {l.result}</div>
                </div>
              );
            case "say":
              return (
                <div key={i}>
                  <span style={{ color: "#E8E6E1" }}>●</span> {l.text}
                </div>
              );
            case "status":
              return (
                <div key={i} style={{ color: CLAUDE_ORANGE }}>
                  ✻ {l.text} <span style={{ color: dim }}>({l.hint})</span>
                </div>
              );
            case "input":
              return (
                <div key={i} style={{ border: "1.5px solid #4A4844", borderRadius: 10, padding: `${fs * 0.5}px ${fs * 0.8}px`, marginTop: fs * 0.4 }}>
                  <span style={{ color: dim }}>&gt; </span>
                  {l.text}
                  {l.caret && <span style={{ display: "inline-block", width: fs * 0.55, height: fs * 1.1, background: "#E8E6E1", verticalAlign: "text-bottom", marginLeft: 2 }} />}
                </div>
              );
          }
        })}
      </div>
    </div>
  );
};
