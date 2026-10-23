/**
 * RecreateLook: look-development boards for the "recreate" series. Not a film. One board per
 * frame, rendered as stills so the look can be judged before any motion is built:
 *   frame 0  title     paper ground, mixed caps/serif line with a media chip inside it
 *   frame 1  showcase  night ground, the template as tilted prints + a callout naming the ease
 *   frame 2  prompt    sky ground, blurred type behind glass, the prompt as a ticket
 *   frame 3  build     paper ground, Claude Code clone + "10 min later" sticker + output print
 *
 * The template pictures here are placeholders drawn in CSS; real videos use the real
 * template's frames.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ArrowButton, Chip, NavPill, NightGround, PaperGround, Print, PromptTicket, SkyGround, SpinBadge, Squiggle, Sticker, Terminal } from "./kit";
import { C, F } from "./tokens";

export const RECREATE_LOOK = { durationInFrames: 4 } as const;

// ---------------------------------------------------------------- placeholder template art

const ArtFlow: React.FC<{ bg?: string; ink?: string; size?: number }> = ({ bg = C.blue, ink = C.white, size = 200 }) => (
  <AbsoluteFill style={{ background: bg, display: "grid", placeItems: "center" }}>
    <div style={{ textAlign: "center", color: ink }}>
      <div style={{ ...F.caps, fontSize: size * 0.16, letterSpacing: "0.02em" }}>Motion 01</div>
      <div style={{ ...F.italic, fontSize: size, lineHeight: 0.9 }}>flow</div>
    </div>
  </AbsoluteFill>
);

const ArtOrbit: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(135deg, #F7A6C9 0%, #8E86F5 55%, #6C8BF7 100%)" }}>
    <div style={{ position: "absolute", width: 220, height: 220, borderRadius: 999, left: -50, top: -40, background: "radial-gradient(circle at 35% 35%, #FFC2A8, #F26B8A)" }} />
    <div style={{ position: "absolute", width: 120, height: 120, borderRadius: 999, right: -30, top: 150, background: "radial-gradient(circle at 35% 35%, #FFD0C0, #F07C8F)" }} />
    {[
      [210, 80, 34],
      [120, 210, 18],
      [290, 260, 22],
    ].map(([x, y, s], i) => (
      <svg key={i} width={s} height={s} viewBox="0 0 10 10" style={{ position: "absolute", left: x, top: y }}>
        <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" fill="#FFF" />
      </svg>
    ))}
  </AbsoluteFill>
);

const ArtStack: React.FC = () => (
  <AbsoluteFill style={{ background: C.night, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
    {[0, 1, 2, 3, 4].map((i) => (
      <div
        key={i}
        style={{
          ...F.caps,
          fontSize: 96,
          lineHeight: 0.8,
          color: i === 2 ? C.butter : "transparent",
          WebkitTextStroke: i === 2 ? undefined : `2px ${C.butter}`,
        }}
      >
        Type
      </div>
    ))}
  </AbsoluteFill>
);

const ArtSky: React.FC = () => (
  <AbsoluteFill style={{ display: "grid", placeItems: "center" }}>
    <SkyGround />
    <div style={{ ...F.italic, fontSize: 130, color: C.white, position: "relative" }}>look</div>
  </AbsoluteFill>
);

// ---------------------------------------------------------------- boards

const Corner: React.FC<{ dark?: boolean }> = ({ dark }) => (
  <>
    <div style={{ position: "absolute", left: 64, top: 52, ...F.mono, fontSize: 20, color: dark ? C.white : C.ink }}>Prompt → Motion · Nº 014</div>
    <NavPill items={["The look", "The prompt", "The build"]} style={{ position: "absolute", left: "50%", top: 36, transform: "translateX(-50%)" }} />
    <div style={{ position: "absolute", right: 64, top: 36, padding: "14px 20px", background: C.white, ...F.caps, fontSize: 22, display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 10, height: 10, borderRadius: 99, background: C.blue }} />
      Claude Code
    </div>
  </>
);

const TitleBoard: React.FC = () => (
  <AbsoluteFill>
    <PaperGround />
    <Corner />
    <div style={{ position: "absolute", top: 210, width: "100%", textAlign: "center", color: C.ink }}>
      <div style={{ ...F.serif, fontSize: 64, lineHeight: 1 }}>One prompt, ten minutes,</div>
      <div style={{ ...F.serif, fontSize: 64, lineHeight: 1, marginTop: 4 }}>
        and <span style={F.italic}>no</span> After Effects.
      </div>
      <div style={{ ...F.caps, fontSize: 230, marginTop: 34, whiteSpace: "nowrap" }}>
        Recreate{" "}
        <Chip w={300} h={176} tilt={-4} radius={18}>
          <div style={{ textTransform: "none" }}>
            <ArtSky />
          </div>
        </Chip>{" "}
        any
      </div>
      <div style={{ ...F.serif, fontSize: 236, textTransform: "uppercase", lineHeight: 0.92, letterSpacing: "-0.035em" }}>Motion look</div>
      <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", marginTop: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ ...F.serif, fontSize: 50 }}>Copy the prompt</span>
          <span style={{ width: 44, height: 44, background: C.blue, display: "grid", placeItems: "center" }}>
            <svg width={24} height={24} viewBox="0 0 24 24">
              <path d="M12 3v16M5 13l7 7 7-7" stroke={C.white} strokeWidth={3} fill="none" strokeLinecap="square" />
            </svg>
          </span>
        </div>
        <div style={{ marginLeft: -60 }}>
          <Squiggle width={300} />
        </div>
      </div>
    </div>
    <div style={{ position: "absolute", right: 90, bottom: 70 }}>
      <SpinBadge text="COPY · PASTE · REMIX · COPY · PASTE · REMIX ·" size={180} spin={-20} />
    </div>
  </AbsoluteFill>
);

const ShowcaseBoard: React.FC = () => (
  <AbsoluteFill>
    <NightGround />
    <Corner dark />
    <div style={{ position: "absolute", top: 150, width: "100%", textAlign: "center", color: C.white }}>
      <div style={{ ...F.serif, fontSize: 44, lineHeight: 1 }}>Template Nº 014, built from one prompt.</div>
      <div style={{ fontSize: 200, marginTop: 12, whiteSpace: "nowrap" }}>
        <span style={F.caps}>The </span>
        <span style={{ ...F.serif, textTransform: "uppercase", letterSpacing: "-0.035em" }}>Result</span>
      </div>
    </div>
    <Print color={C.blue} width={440} height={380} tilt={-3.5} label="Kinetic" sub="Serif melts in, letter by letter" style={{ left: 250, top: 470 }}>
      <ArtFlow size={170} />
    </Print>
    <Print color={C.pink} width={440} height={380} tilt={1} label="Depth" sub="Planets drift on two layers" style={{ left: 740, top: 440, zIndex: 2 }}>
      <ArtOrbit />
    </Print>
    <Print color={C.orange} width={440} height={380} tilt={4} label="Stack" sub="One row lights, the rest outline" style={{ left: 1230, top: 470 }}>
      <ArtStack />
    </Print>
    {/* callout: names the motion detail the voice is talking about */}
    <div style={{ position: "absolute", left: 420, top: 545, zIndex: 3 }}>
      <div style={{ background: C.white, padding: "12px 18px", display: "flex", alignItems: "center", gap: 10, ...F.mono, fontSize: 22, color: C.ink, transform: "rotate(-5deg)", boxShadow: "0 12px 30px rgba(0,0,0,0.3)" }}>
        <span style={{ width: 10, height: 10, borderRadius: 99, background: C.blue }} />
        expo-out · 600 ms · 40 ms stagger
      </div>
    </div>
  </AbsoluteFill>
);

const PromptBoard: React.FC = () => (
  <AbsoluteFill>
    <SkyGround />
    {/* type behind glass: sans blurred, italic serif sharp */}
    <div style={{ position: "absolute", left: 760, top: 250, color: C.white, textAlign: "center", width: 1080 }}>
      <div style={{ ...F.grotesk, fontSize: 190, filter: "blur(9px)", opacity: 0.9 }}>Copy the</div>
      <div style={{ ...F.italic, fontSize: 230, lineHeight: 0.95 }}>whole prompt</div>
      <div style={{ ...F.mono, fontSize: 24, marginTop: 40, opacity: 0.9 }}>sycamore.to/motion · template Nº 014</div>
    </div>
    <PromptTicket
      width={600}
      rotY={14}
      rotZ={-2}
      style={{ left: 200, top: 110 }}
      title="Liquid Type"
      body={["A big serif headline that ", { em: "melts in" }, " letter by letter on a ", { em: "soft blue" }, " gradient, holds for a beat, then ", { em: "wipes" }, " away."]}
      bullets={[["1920×1080 · 30 fps · 6 s"], ["Instrument Serif + Archivo"], ["Easing: ", { em: "expo out, 600 ms" }]]}
      stubLeft="Prompt length:"
      stubRight="1,842 words"
      footer="Paste into Claude Code"
    />
    <div style={{ position: "absolute", left: 330, top: 850, transform: "rotate(-3deg)" }}>
      <ArrowButton label="Copy prompt" scale={1.1} />
    </div>
  </AbsoluteFill>
);

const BuildBoard: React.FC = () => (
  <AbsoluteFill>
    <PaperGround />
    <div style={{ position: "absolute", left: 120, top: 92, color: C.ink, fontSize: 140, whiteSpace: "nowrap" }}>
      <span style={F.caps}>Paste it. </span>
      <span style={{ ...F.italic, fontSize: 150 }}>then wait.</span>
    </div>
    <Terminal
      width={1160}
      height={640}
      tilt={-1.2}
      style={{ left: 110, top: 300 }}
      lines={[
        { kind: "welcome", cwd: "~/motion-template" },
        { kind: "user", text: "[Pasted text #1 +214 lines] Remix it: warm cream ground, red type, film grain." },
        { kind: "tool", name: "Write", arg: "src/LiquidType.tsx", result: "Wrote 186 lines" },
        { kind: "tool", name: "Bash", arg: "npx remotion still LiquidType out/check.png --frame=90", result: "Rendered out/check.png" },
        { kind: "say", text: "Letters now ease in on expo-out with a 40 ms stagger. Checking the hold..." },
        { kind: "status", text: "Rendering…", hint: "9m 48s · esc to interrupt" },
        { kind: "input", text: "", caret: true },
      ]}
    />
    <div style={{ position: "absolute", left: 1330, top: 250, zIndex: 3 }}>
      <Sticker tilt={-7} size={52}>10 min later</Sticker>
    </div>
    <Print color={C.butter} width={460} height={400} tilt={4} label="Output" sub="Same prompt, warm remix" labelInk={C.ink} style={{ left: 1340, top: 380 }}>
      <ArtFlow bg="#F3E6D3" ink={C.red} size={180} />
    </Print>
  </AbsoluteFill>
);

const BOARDS = [TitleBoard, ShowcaseBoard, PromptBoard, BuildBoard];

export const RecreateLook: React.FC = () => {
  const frame = useCurrentFrame();
  const Board = BOARDS[Math.min(frame, BOARDS.length - 1)];
  return <Board />;
};
