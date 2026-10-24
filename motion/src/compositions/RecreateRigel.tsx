/**
 * RecreateRigel: a full "recreate" video. Template: Type Staircase (Rigel) from
 * sycamore.to/motion. Voice: Gemini TTS (src/films/recreate-rigel/script.json -> npm run voice ->
 * npm run narrate). Rules: src/series/recreate/SERIES.md.
 *
 * Everything shown is real:
 * - the site: screenshots of the live page before and after Copy prompt (npm run page), the
 *   cursor clicking the real button position (public/films/recreate-rigel/page/capture.json);
 * - the prompt: the text that button copies (src/films/recreate-rigel/prompt.md);
 * - the outputs: the component built from that prompt (builds/Run1.tsx) and the three
 *   follow-up changes (builds/runs.ts), rendered live in the replies and the comparisons.
 *
 * Beats (one Scene each; cuts are code-picked speed ramps)
 *  1 "in this video"      the template on a MacBook; its name in a lower third; "the rows switch"
 *                         -> laptop left, big and small / content / system beside it; "springs"
 *                         -> laptop back. Zooms into it.
 *  2 "we're gonna make"   with one prompt; [Claude] Claude Code and [Sycamore] Sycamore.
 *  3 "claude code needs"  the Remotion card; other renderers work too.
 *  4 "step one"           STEP 01 -> the real page in Safari; cursor clicks Copy prompt.
 *  5 "the important"      the real prompt as a document; three key parts light up.
 *  6 "step two"           STEP 02 -> one Claude Code conversation: prompt file -> run 1, then
 *                         the three asks, each reply with its real render.
 *  7 "doing it one"       the three changes in a row; a highlight walks across them.
 *  8 "so here's"          Reference next to Output.
 *  9 "and that's it"      like and subscribe (no plug).
 */
import React from "react";
import { AbsoluteFill, Audio, Img, Loop, staticFile, useCurrentFrame } from "remotion";
import { tween } from "../lib/eases";
import { PromptDoc, TemplateClip } from "../series/recreate/bank";
import { SafariWindow } from "../series/recreate/devices";
import { TicketShell } from "../series/recreate/kit";
import { MacBook } from "../series/recreate/macbook";
import { Float3D, InlineChip, Words, floatUp, glide, rackStyle, ramp } from "../series/recreate/moves";
import { ChoiceCards, LowerThird, StepTitle, VersionRow } from "../series/recreate/parts";
import { Scene, TranscriptProvider, Track, lengthOf, useCue, useWords } from "../series/recreate/timing";
import { C, F } from "../series/recreate/tokens";
import { ClaudeThread, Cursor, threadSendButton } from "../series/recreate/ui";
import { Rigel, rigelDuration } from "../films/recreate-rigel/builds/Run1";
import { RUNS } from "../films/recreate-rigel/builds/runs";
import capture from "../../public/films/recreate-rigel/page/capture.json";
import transcript from "../films/recreate-rigel/transcript.json";

export const RECREATE_RIGEL = { durationInFrames: lengthOf(transcript) } as const;

const ID = "type-staircase" as const;
/** Rigel's preview opens on an empty frame each loop; skip it. */
const TRIM = 22;
/** The copied prompt's length (prompt.md). */
const PROMPT_WORDS = 435;


const Column: React.FC<{ left?: number; width?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ left = 0, width = 1920, style, children }) => (
  <div style={{ position: "absolute", left, width, top: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: C.white, ...style }}>
    {children}
  </div>
);

/** A logo in a dark rounded chip that rises into its slot in a line of type. */
const LogoChip: React.FC<{ at: number; size: number; src: string; bg?: string; fill?: number }> = ({ at, size, src, bg = "#262624", fill = 0.64 }) => (
  <InlineChip at={at} w={size} h={size} tilt={-6} radius={0.24}>
    <div style={{ position: "absolute", inset: 0, background: bg, display: "grid", placeItems: "center" }}>
      <Img src={staticFile(src)} style={{ width: size * fill, height: size * fill, objectFit: "cover" }} />
    </div>
  </InlineChip>
);

/** One run of the component Claude built, rendered live at width `w`, looping. */
const Live: React.FC<{ run: number; w: number }> = ({ run, w }) => {
  const props = RUNS[run].props;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transform: `scale(${w / 1920})`, transformOrigin: "0 0" }}>
        <Loop durationInFrames={rigelDuration(props.rows)}>
          <Rigel {...props} />
        </Loop>
      </div>
    </div>
  );
};

/** A plain media card (the ticket's white card) with a small serif label above it. */
const Labeled: React.FC<{ label: string; width: number; focus?: number; children: React.ReactNode }> = ({ label, width, focus, children }) => (
  <div>
    <div style={{ ...F.italic, fontSize: width * 0.075, color: C.white, marginBottom: 18, marginLeft: 6 }}>{label}</div>
    <TicketShell width={width} focus={focus}>
      <div style={{ margin: -width * 0.035, width: width * 0.93, height: width * 0.93 * 0.5625, borderRadius: width * 0.03, overflow: "hidden", position: "relative" }}>{children}</div>
    </TicketShell>
  </div>
);

// ---------------------------------------------------------------- 1. the template

const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const W = 1000;
  const rise = floatUp(frame, 0, { to: { rotX: 0, rotY: 0, rotZ: 0 }, from: { rotX: 0, rotY: 0, rotZ: 0 }, dist: 500 });
  const side = ramp(frame, cue("the rows"), 26);
  const back = ramp(frame, cue("springs"), 26);
  const x = -430 * side.p + 430 * back.p;
  const s = 1 - 0.36 * side.p + 0.36 * back.p;
  const demoRack = tween(frame, cue("springs"), 18, 0, 1, "softInOut");
  // the template's name as it's written, on the frames it's spoken
  const name = useWords("type", "staircase").map((w, i) => ({ ...w, text: ["Type", "Staircase"][i] ?? w.text }));
  const kicker = useWords("big", "small");
  const content = useWords("content", "content").map((w) => ({ ...w, text: "content" }));
  const system = useWords("system", "system").map((w) => ({ ...w, text: "system" }));
  const little = useWords("little", "way");
  return (
    <>
      <div style={{ position: "absolute", left: 960 - W / 2, top: 130, filter: side.blur + back.blur > 0.4 ? `blur(${(side.blur + back.blur) * 0.6}px)` : undefined }}>
        <Float3D pose={rise} x={x} scale={s}>
          <MacBook width={W} openAt={10}>
            <TemplateClip id={ID} trim={TRIM} />
          </MacBook>
        </Float3D>
      </div>
      <LowerThird name={name} outAt={cue("builds")} />
      <Column left={1060} width={800} style={rackStyle(demoRack, 16, 1)}>
        <Words size={66} base={F.serif} words={kicker} />
        <div style={{ height: 26 }} />
        <Words size={120} base={F.caps} words={content} />
        <Words size={120} base={F.caps} words={system} />
        <div style={{ height: 26 }} />
        <Words size={46} base={F.serif} words={little} />
      </Column>
    </>
  );
};

// ---------------------------------------------------------------- 2. one prompt, two tools

const Tools: React.FC = () => {
  const cue = useCue();
  const kicker = useWords("we're", "it");
  const prompt = useWords("with", "prompt");
  const claude = useWords("claude", "code");
  const and = useWords("and", "and", 2);
  const sycamore = useWords("sycamore", "sycamore");
  return (
    <Column>
      <Words size={56} base={F.serif} words={kicker} />
      <div style={{ height: 14 }} />
      <Words size={150} base={F.caps} words={prompt} />
      <div style={{ height: 60 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <LogoChip at={cue("claude") - 2} size={96} src="recreate/claude-icon.svg" />
        <Words size={72} base={F.grotesk} words={claude} />
        <span style={{ width: 18 }} />
        <Words size={72} base={F.serif} words={and} />
        <span style={{ width: 18 }} />
        <LogoChip at={cue("sycamore") - 2} size={96} src="recreate/sycamore-logo.png" bg="#000" fill={1} />
        <Words size={72} base={F.grotesk} words={sycamore} />
      </div>
    </Column>
  );
};

// ---------------------------------------------------------------- 3. what renders it

const Renderer: React.FC = () => {
  const cue = useCue();
  const line = useWords("in this", "that");
  const others = useWords("but you", "prefer");
  return (
    <>
      <div style={{ position: "absolute", top: 130, width: "100%", textAlign: "center", color: C.white }}>
        <Words size={64} base={F.serif} words={line} />
      </div>
      <ChoiceCards top={290} width={480} items={[{ at: cue("remotion") - 4, name: "Remotion", line: "Claude Code writes the video as React; Remotion renders it.", logo: "recreate/remotion.svg" }]} />
      <div style={{ position: "absolute", bottom: 120, width: "100%", textAlign: "center", color: C.white }}>
        <Words size={44} base={F.serif} words={others} />
      </div>
    </>
  );
};

// ---------------------------------------------------------------- 4. step one: the real page

const BW = 1400;
const SCALE = (BW - 2) / capture.viewport.width; // the page inside Safari's frame
const BAR = (52 * BW) / 1203;
const BH = Math.round(capture.viewport.height * SCALE + BAR + 2);
const BL = 960 - BW / 2;
const BT = Math.round((1080 - BH) / 2);
/** The real Copy prompt button's centre on screen. */
const COPY_BTN: [number, number] = [BL + 1 + (capture.button.x + capture.button.width / 2) * SCALE, BT + 1 + BAR + (capture.button.y + capture.button.height / 2) * SCALE];

const StepOne: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const go = cue("go");
  const click = cue("click");
  const pose = floatUp(frame, go, { to: { rotX: 3, rotY: -4, rotZ: 0 }, from: { rotY: -30 } });
  const zoom = glide(frame, [{ at: 0, v: 1 }, { at: cue("on the right"), v: 1.5, dur: 40 }]);
  return (
    <>
      <StepTitle n={1} label="Copy the prompt" at={2} outAt={go - 6} />
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: `${COPY_BTN[0]}px ${COPY_BTN[1]}px` }}>
        <div style={{ position: "absolute", left: BL, top: BT }}>
          <Float3D pose={pose}>
            <SafariWindow width={BW} height={BH} url="sycamore.to/motion/type-staircase" urlAt={cue("sycamore")}>
              <Img src={staticFile(`films/recreate-rigel/page/${frame >= click + 2 ? "copied" : "page"}.png`)} style={{ width: "100%", display: "block" }} />
            </SafariWindow>
          </Float3D>
        </div>
        <Cursor
          appear={cue("on the right")}
          keys={[
            { at: cue("on the right"), x: COPY_BTN[0] - 240, y: COPY_BTN[1] + 260 },
            { at: cue("copy"), x: COPY_BTN[0] - 30, y: COPY_BTN[1] - 6 },
          ]}
          clicks={[click]}
        />
      </AbsoluteFill>
    </>
  );
};

// ---------------------------------------------------------------- 5. what matters in the prompt

/** The copied prompt (prompt.md), in its own sections; three key parts light up as they're named. */
const ThePrompt: React.FC = () => {
  const cue = useCue();
  return (
    <PromptDoc
      file="type-staircase prompt"
      total={{ value: PROMPT_WORDS, at: cue("follows", { edge: "end" }) + 6, dur: 24 }}
      sections={[
        { title: "Setup", lines: ["React + Remotion, 30 fps, 1920x1080.", "Font: Inter 600. Props: rows, colors."] },
        { title: "Timing", lines: ["First word at frame 8, then one every 6 frames,", "10 frames before each new row."] },
        {
          title: "Layout",
          at: cue("how far"),
          label: "The step",
          sub: "80% along the row above",
          lines: ["Row sizes cycle: small, big, medium, big...", "Each row's left edge is 80% of the way", "along the row above it."],
        },
        {
          title: "Animation",
          at: cue("spring"),
          label: "The spring",
          sub: "a little overshoot on every word",
          lines: ["Each word springs up from 0.5em below", "(damping 8, mass 0.6, stiffness 140)."],
        },
        {
          title: "Camera",
          at: cue("camera"),
          label: "The camera",
          sub: "chases the newest word",
          lines: ["Holds a 1.3x zoom, aims at the newest word", "with an underdamped spring, plus motion blur."],
        },
        { title: "Structure", lines: ["One self-contained .tsx file."] },
      ]}
    />
  );
};

// ---------------------------------------------------------------- 6. step two: one Claude conversation

const CW = 1460;
const CH = 900;
const CLeft = 960 - CW / 2;
const CTop = 100;

const InClaude: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const open = cue("open");
  const pose = floatUp(frame, open, { to: { rotX: 3, rotY: 4, rotZ: 0 }, from: { rotY: 30 } });
  const t0 = { at: cue("paste"), sendAt: cue("send") + 4, replyAt: cue("done") };
  const t1 = { at: cue("first"), sendAt: cue("orange", { edge: "end" }) + 2 };
  const t2 = { at: cue("then"), sendAt: cue("blur", { edge: "end" }) + 2 };
  const t3 = { at: cue("and last"), sendAt: cue("sentence", { edge: "end" }) + 2 };
  const [sx, sy] = threadSendButton(CW, CH);
  const btn: [number, number] = [CLeft + sx, CTop + sy];
  const preview = (run: number) => ({ node: <Live run={run} w={440} /> });
  return (
    <>
      <StepTitle n={2} label="Paste it into Claude Code" at={2} outAt={open - 6} />
      <div style={{ position: "absolute", left: CLeft, top: CTop }}>
        <Float3D pose={pose}>
          <ClaudeThread
            width={CW}
            height={CH}
            turns={[
              { ...t0, text: "", file: { name: "type-staircase-prompt.md", meta: `${PROMPT_WORDS} words · Markdown` }, reply: RUNS[0].reply, preview: preview(0) },
              { ...t1, text: RUNS[1].ask, replyAt: t1.sendAt + 22, reply: RUNS[1].reply, preview: preview(1) },
              { ...t2, text: RUNS[2].ask, replyAt: t2.sendAt + 22, reply: RUNS[2].reply, preview: preview(2) },
              { ...t3, text: RUNS[3].ask, replyAt: t3.sendAt + 18, reply: RUNS[3].reply, preview: preview(3) },
            ]}
          />
        </Float3D>
      </div>
      <Cursor
        appear={t0.sendAt - 30}
        keys={[
          { at: t0.sendAt - 30, x: btn[0] - 240, y: btn[1] + 110 },
          { at: t0.sendAt - 24, x: btn[0] - 8, y: btn[1] - 6 },
        ]}
        clicks={[t0.sendAt, t1.sendAt, t2.sendAt, t3.sendAt]}
      />
    </>
  );
};

// ---------------------------------------------------------------- 7. why one at a time

const ThreeVersions: React.FC = () => {
  const cue = useCue();
  const W = 520;
  return (
    <VersionRow
      id={ID}
      width={W}
      versions={[
        { label: RUNS[1].label, at: 2, node: <Live run={1} w={W * 0.93} /> },
        { label: RUNS[2].label, at: 6, node: <Live run={2} w={W * 0.93} /> },
        { label: RUNS[3].label, at: 10, node: <Live run={3} w={W * 0.93} /> },
      ]}
      walk={[cue("see"), cue("breaks"), cue("message")]}
    />
  );
};

// ---------------------------------------------------------------- 8. side by side

const SideBySide: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const orig = floatUp(frame, 2, { to: { rotX: 3, rotY: 14, rotZ: -3 } });
  const mine = floatUp(frame, cue("ended"), { to: { rotX: 3, rotY: -8, rotZ: 1.5 }, from: { rotY: -36 } });
  const f = ramp(frame, cue("colors"), 24);
  return (
    <>
      <div style={{ position: "absolute", left: 140, top: 300, ...rackStyle(f.p, 10, 0.4) }}>
        <Float3D pose={orig} x={-60 * f.p}>
          <Labeled label="Reference" width={620}>
            <TemplateClip id={ID} trim={TRIM} />
          </Labeled>
        </Float3D>
      </div>
      <div style={{ position: "absolute", left: 840, top: 190, filter: f.blur > 0.4 ? `blur(${f.blur * 0.5}px)` : undefined }}>
        <Float3D pose={mine} x={-110 * f.p} scale={1 + 0.08 * f.p}>
          <Labeled label="Output" width={900} focus={f.p}>
            <Live run={3} w={900 * 0.93} />
          </Labeled>
        </Float3D>
      </div>
    </>
  );
};

// ---------------------------------------------------------------- 9. outro

const Outro: React.FC = () => {
  const kicker = useWords("and that's", "it");
  const caps = useWords("if you want", "this");
  const serif = useWords("like and", "subscribe");
  const ask = useWords("let me", "next");
  return (
    <Column>
      <div style={{ marginBottom: 20 }}>
        <Words size={48} base={F.serif} words={kicker} />
      </div>
      <Words size={120} base={F.caps} words={caps} />
      <Words size={122} base={{ ...F.italic, lineHeight: 1 }} words={serif} />
      <div style={{ height: 50 }} />
      <Words size={48} base={F.serif} words={ask} />
    </Column>
  );
};

export const RecreateRigel: React.FC = () => (
  <>
    <TranscriptProvider transcript={transcript}>
      <Track>
        <Scene from="in this video" focus={[960, 400]}>
          <Intro />
        </Scene>
        <Scene from="we're gonna make">
          <Tools />
        </Scene>
        <Scene from="claude code needs">
          <Renderer />
        </Scene>
        <Scene from="step one" focus={COPY_BTN}>
          <StepOne />
        </Scene>
        <Scene from="the important parts">
          <ThePrompt />
        </Scene>
        <Scene from="step two">
          <InClaude />
        </Scene>
        <Scene from="doing it one">
          <ThreeVersions />
        </Scene>
        <Scene from="so here's the original">
          <SideBySide />
        </Scene>
        <Scene from="and that's it">
          <Outro />
        </Scene>
      </Track>
    </TranscriptProvider>
    <Audio src={staticFile("films/recreate-rigel/voice.wav")} />
  </>
);
