/**
 * RecreateRigel: a full "recreate" video (~2:32). Template: Type Staircase (Rigel) from
 * sycamore.to/motion. Voice: Gemini TTS (src/films/recreate-rigel/script.json -> npm run voice),
 * clips joined with pauses into public/films/recreate-rigel/voice.wav (1.6 s between the step-3
 * asks so each reply has time on screen), word timings from faster-whisper (transcript.json).
 * Rules: src/series/recreate/SERIES.md.
 *
 * PLACEHOLDERS before publishing (make them true with a real run, or replace):
 * - The prompt doesn't exist yet: PROMPT_WORDS and the document text in ThePrompt.
 * - "about ten minutes" and "came back looking pretty much the same".
 * - Every output preview (first run, dark, orange, my sentence, the final Output) is the original
 *   preview with a CSS filter (DARK / ORANGE). NOT real Claude output.
 * - The site page and the Claude Code windows are dummies (ui.tsx).
 *
 * Beats (one Scene each; cuts are code-picked speed ramps)
 *  1 "so i was going"      MacBook opens, Type Staircase on its screen; lower third writes the name
 *                          as it's said; "what I like most is the sizing" -> laptop left, CONTENT /
 *                          SYSTEM big beside it; "slides" -> laptop comes back. Zooms into it.
 *  2 "so in this video"    same kind of animation / FOR ANY TEXT / you want; Claude Code and Sycamore.
 *  3 "quick thing before"  three ways to render: Remotion, HyperFrames, web page + screenshots;
 *                          "I'm using Remotion" -> Remotion takes focus.
 *  4 "okay step one"       STEP 01 / Copy the prompt -> the template page in Safari; cursor clicks it.
 *  5 "and it's pretty"     PromptDoc: the sections that make this template itself light up as the
 *                          voice names them (sizes, the blur entrance, the steps, the camera).
 *  6 "step 2 open"         STEP 02 -> one Claude Code conversation: the prompt file is pasted and
 *                          sent, the first run comes back as the reply; then the remix asks, one at
 *                          a time, each reply with its preview.
 *  7 "doing it this way"   the three versions in a row; a highlight walks across them.
 *  8 "so here's the"       Reference next to Output.
 *  9 "and that's pretty"   like and subscribe (no plug).
 *
 * Type: only Alte Haas (sans) and Feature Display (serif, upright). No caps, no mono, no italic.
 */
import React from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame } from "remotion";
import { tween } from "../lib/eases";
import { PromptDoc, TemplateClip } from "../series/recreate/bank";
import { SafariWindow } from "../series/recreate/devices";
import { TicketShell } from "../series/recreate/kit";
import { MacBook } from "../series/recreate/macbook";
import { Float3D, InlineChip, Words, floatUp, glide, rackStyle, ramp } from "../series/recreate/moves";
import { ChoiceCards, FramesIcon, LowerThird, StepTitle, VersionRow } from "../series/recreate/parts";
import { Scene, TranscriptProvider, Track, lengthOf, useCue, useWords } from "../series/recreate/timing";
import { C, F } from "../series/recreate/tokens";
import { ClaudeThread, Cursor, TemplatePage, threadSendButton } from "../series/recreate/ui";
import transcript from "../films/recreate-rigel/transcript.json";

export const RECREATE_RIGEL = { durationInFrames: lengthOf(transcript) } as const;

const ID = "type-staircase" as const;
/** Rigel opens on an empty frame each loop; skip it. */
const TRIM = 22;
/** PLACEHOLDER: the real prompt's length. */
const PROMPT_WORDS = 1940;
/** PLACEHOLDERS standing in for real outputs. */
const DARK = "invert(1) hue-rotate(180deg)";
const ORANGE = `${DARK} sepia(0.7) saturate(3.2) hue-rotate(-14deg)`;

type Spoken = { text: string; at: number }[];

const Column: React.FC<{ left?: number; width?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ left = 0, width = 1920, style, children }) => (
  <div style={{ position: "absolute", left, width, top: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: C.white, ...style }}>
    {children}
  </div>
);

/** A caps line over an italic serif line (the series' mixed line), with an optional serif kicker. */
const Mixed: React.FC<{ kicker?: Spoken; caps: Spoken; serif: Spoken; size?: number }> = ({ kicker, caps, serif, size = 150 }) => (
  <>
    {kicker && (
      <div style={{ marginBottom: size * 0.16 }}>
        <Words size={size * 0.4} base={F.serif} words={kicker} />
      </div>
    )}
    <Words size={size} base={F.caps} words={caps} />
    <Words size={size * 1.02} base={{ ...F.italic, lineHeight: 1 }} words={serif} />
  </>
);

/** The Claude mark in a dark rounded chip, for inline use in a line of type. */
const ClaudeChip: React.FC<{ at: number; size: number }> = ({ at, size }) => (
  <InlineChip at={at} w={size} h={size} tilt={-6} radius={0.24}>
    <div style={{ position: "absolute", inset: 0, background: "#262624", display: "grid", placeItems: "center" }}>
      <Img src={staticFile("recreate/claude-icon.svg")} style={{ width: size * 0.64, height: size * 0.64 }} />
    </div>
  </InlineChip>
);

/** A plain media card (the ticket's white card, media only) with a small italic label above it. */
const Labeled: React.FC<{ label: string; width: number; focus?: number; filter?: string }> = ({ label, width, focus, filter }) => (
  <div>
    <div style={{ ...F.italic, fontSize: width * 0.075, color: C.white, marginBottom: 18, marginLeft: 6 }}>{label}</div>
    <TicketShell width={width} focus={focus}>
      <div style={{ margin: -width * 0.035, width: width * 0.93, height: width * 0.93 * 0.5625, borderRadius: width * 0.03, overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, filter }}>
          <TemplateClip id={ID} trim={TRIM} />
        </div>
      </div>
    </TicketShell>
  </div>
);

// ---------------------------------------------------------------- 1. the discovery

const Discovery: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const W = 1000;
  const rise = floatUp(frame, 0, { to: { rotX: 0, rotY: 0, rotZ: 0 }, from: { rotX: 0, rotY: 0, rotZ: 0 }, dist: 500 });
  const side = ramp(frame, cue("what"), 26);
  const back = ramp(frame, cue("slides"), 26);
  const x = -430 * side.p + 430 * back.p;
  const s = 1 - 0.36 * side.p + 0.36 * back.p;
  const demoRack = tween(frame, cue("slides"), 18, 0, 1, "softInOut");
  // the template's name as it's written, on the frames it's spoken
  const name = useWords("type", "staircase").map((w, i) => ({ ...w, text: ["Type", "Staircase"][i] ?? w.text }));
  const kicker = useWords("what", "sizing");
  const content = useWords("content", "content").map((w) => ({ ...w, text: "content" }));
  const system = useWords("system", "system").map((w) => ({ ...w, text: "system" }));
  const small = useWords("little", "small");
  return (
    <>
      <div style={{ position: "absolute", left: 960 - W / 2, top: 130, filter: side.blur + back.blur > 0.4 ? `blur(${(side.blur + back.blur) * 0.6}px)` : undefined }}>
        <Float3D pose={rise} x={x} scale={s}>
          <MacBook width={W} openAt={10}>
            <TemplateClip id={ID} trim={TRIM} />
          </MacBook>
        </Float3D>
      </div>
      <LowerThird name={name} outAt={cue("takes")} />
      <Column left={1060} width={800} style={rackStyle(demoRack, 16, 1)}>
        <Words size={66} base={F.serif} words={kicker} />
        <div style={{ height: 26 }} />
        <Words size={120} base={F.caps} words={content} />
        <Words size={120} base={F.caps} words={system} />
        <div style={{ height: 26 }} />
        <Words size={52} base={F.serif} words={small} />
      </Column>
    </>
  );
};

// ---------------------------------------------------------------- 2. the promise

const Promise_: React.FC = () => {
  const cue = useCue();
  const kicker = useWords("same kind", "animation");
  const caps = useWords("for any", "text");
  const serif = useWords("you want", "want");
  const tools = useWords("claude", "sycamore");
  const later = useWords("and i'll", "minute");
  return (
    <Column>
      <Mixed kicker={kicker} caps={caps} serif={serif} size={150} />
      <div style={{ height: 50 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <ClaudeChip at={cue("claude") - 2} size={76} />
        <Words size={64} base={F.grotesk} words={tools} />
      </div>
      <div style={{ height: 18 }} />
      <Words size={40} base={F.serif} words={later} />
    </Column>
  );
};

// ---------------------------------------------------------------- 3. what renders it

const Renderers: React.FC = () => {
  const cue = useCue();
  const line = useWords("it needs", "with");
  return (
    <>
      <div style={{ position: "absolute", top: 120, width: "100%", textAlign: "center", color: C.white }}>
        <Words size={64} base={F.serif} words={line} />
      </div>
      <ChoiceCards
        top={290}
        focus={{ index: 0, at: cue("using") }}
        items={[
          { at: cue("remotion"), name: "Remotion", line: "Videos written in React. What I use.", logo: "recreate/remotion.svg" },
          { at: cue("hyperframes"), name: "HyperFrames", line: "HTML compositions rendered to video.", logo: "recreate/hyperframes.png" },
          { at: cue("webpage"), name: "A web page", line: "Build it in the browser, screenshot a few times a second.", icon: <FramesIcon size={120} /> },
        ]}
      />
    </>
  );
};

// ---------------------------------------------------------------- 4. step one: the site

const BW = 1500;
const BH = 860;
const BL = 960 - BW / 2;
const BT = 110;
/** The Copy prompt button's centre on screen (measured on a still). */
const COPY_BTN: [number, number] = [BL + 1222, BT + 555];

const StepOne: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const go = cue("go");
  const pose = floatUp(frame, go, { to: { rotX: 3, rotY: -4, rotZ: 0 }, from: { rotY: -30 } });
  const zoom = glide(frame, [{ at: 0, v: 1 }, { at: cue("under"), v: 1.45, dur: 40 }]);
  return (
    <>
      <StepTitle n={1} label="Copy the prompt" at={2} outAt={go - 6} />
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: `${COPY_BTN[0]}px ${COPY_BTN[1] - 120}px` }}>
        <div style={{ position: "absolute", left: BL, top: BT }}>
          <Float3D pose={pose}>
            <SafariWindow width={BW} height={BH} url="sycamore.to/motion/type-staircase" urlAt={cue("sycamore")}>
              <TemplatePage id={ID} width={BW} copyAt={cue("click")} promptWords={PROMPT_WORDS} />
            </SafariWindow>
          </Float3D>
        </div>
        <Cursor
          appear={cue("under")}
          keys={[
            { at: cue("under"), x: 1180, y: 900 },
            { at: cue("button"), x: COPY_BTN[0] - 40, y: COPY_BTN[1] - 8 },
          ]}
          clicks={[cue("click")]}
        />
      </AbsoluteFill>
    </>
  );
};

// ---------------------------------------------------------------- 5. what's in the prompt

/** DUMMY prompt text (the real prompt doesn't exist yet); sections follow what the voice names. */
const ThePrompt: React.FC = () => {
  const cue = useCue();
  return (
    <PromptDoc
      file="type-staircase-prompt.md"
      total={{ value: PROMPT_WORDS, at: cue("close"), dur: 34 }}
      sections={[
        { title: "Goal", lines: ["One sentence, built a word at a time,", "stepping down and to the right like stairs."] },
        { title: "Sizes", at: cue("bigger"), label: "Big and small", sub: "the point words, way bigger", lines: ["Key words (you need, make, content, system): 120 px.", "Connecting words: 36 px. Nothing in between."] },
        { title: "Entrance", at: cue("blur"), label: "Out of a blur", sub: "never a plain fade", lines: ["Each word slides 40 px and clears a 12 px blur", "over 14 frames, ease-out. No bounce."] },
        { title: "Layout", at: cue("stepping"), label: "Stepping down", sub: "and to the right", lines: ["Each new line starts lower and further right,", "so the sentence walks down the frame."] },
        { title: "Camera", at: cue("camera"), label: "The camera", sub: "follows the newest word", lines: ["Pan so the newest word lands at 60% width;", "older words drift off the left edge."] },
        { title: "Background", lines: ["Pale lavender to white, soft glow behind the words."] },
        { title: "Output", lines: ["Remotion, 1920x1080, 30 fps, 8 s, loop-safe."] },
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
  const t0 = { at: cue("paste"), sendAt: cue("send") + 4, replyAt: cue("came") };
  const t1 = { at: cue("switch") - 4, sendAt: cue("background", { edge: "end" }) + 2 };
  const t2 = { at: cue("orange") - 16, sendAt: cue("orange", { edge: "end" }) + 2 };
  const t3 = { at: cue("gave") - 2, sendAt: cue("animate", { edge: "end" }) + 2 };
  const [sx, sy] = threadSendButton(CW, CH);
  const btn: [number, number] = [CLeft + sx, CTop + sy];
  return (
    <>
      <StepTitle n={2} label="Paste it into Claude Code" at={2} outAt={open - 6} />
      <div style={{ position: "absolute", left: CLeft, top: CTop }}>
        <Float3D pose={pose}>
          <ClaudeThread
            width={CW}
            height={CH}
            turns={[
              { ...t0, text: "", file: { name: "type-staircase-prompt.md", meta: `${PROMPT_WORDS.toLocaleString("en-US")} words · Markdown` }, minutes: 10, reply: "Here's the first run, built from the prompt.", preview: { id: ID, trim: TRIM } },
              { ...t1, text: "Switch to a dark background.", replyAt: t1.sendAt + 22, minutes: 2, reply: "Done. The background's dark now and the type is light so it still reads.", preview: { id: ID, trim: TRIM, filter: DARK } },
              { ...t2, text: "Make the big words orange.", replyAt: t2.sendAt + 22, minutes: 1, reply: "The big words are orange, the small ones stay light.", preview: { id: ID, trim: TRIM, filter: ORANGE } },
              { ...t3, text: "Use my sentence: Good captions keep people watching.", replyAt: t3.sendAt + 18, minutes: 2, reply: "Swapped in your sentence and re-timed the steps to it.", preview: { id: ID, trim: TRIM, filter: ORANGE } },
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
  return (
    <VersionRow
      id={ID}
      trim={TRIM}
      width={520}
      versions={[
        { label: "Dark background", at: 2, filter: DARK },
        { label: "Orange words", at: 6, filter: ORANGE },
        { label: "My sentence", at: 10, filter: ORANGE },
      ]}
      walk={[cue("see"), cue("something"), cue("exactly")]}
    />
  );
};

// ---------------------------------------------------------------- 8. side by side

const SideBySide: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const orig = floatUp(frame, 2, { to: { rotX: 3, rotY: 14, rotZ: -3 } });
  const mine = floatUp(frame, cue("ended"), { to: { rotX: 3, rotY: -8, rotZ: 1.5 }, from: { rotY: -36 } });
  const f = ramp(frame, cue("changed"), 24);
  return (
    <>
      <div style={{ position: "absolute", left: 140, top: 300, ...rackStyle(f.p, 10, 0.4) }}>
        <Float3D pose={orig} x={-60 * f.p}>
          <Labeled label="Reference" width={620} />
        </Float3D>
      </div>
      <div style={{ position: "absolute", left: 840, top: 190, filter: f.blur > 0.4 ? `blur(${f.blur * 0.5}px)` : undefined }}>
        <Float3D pose={mine} x={-110 * f.p} scale={1 + 0.08 * f.p}>
          <Labeled label="Output" width={900} focus={f.p} filter={ORANGE} />
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
      <Mixed kicker={kicker} caps={caps} serif={serif} size={120} />
      <div style={{ height: 50 }} />
      <Words size={48} base={F.serif} words={ask} />
    </Column>
  );
};

export const RecreateRigel: React.FC = () => (
  <>
    <TranscriptProvider transcript={transcript}>
      <Track>
        <Scene from="so i was going" focus={[960, 400]}>
          <Discovery />
        </Scene>
        <Scene from="so in this video">
          <Promise_ />
        </Scene>
        <Scene from="quick thing before">
          <Renderers />
        </Scene>
        <Scene from="okay step one" focus={COPY_BTN}>
          <StepOne />
        </Scene>
        <Scene from="and it's pretty">
          <ThePrompt />
        </Scene>
        <Scene from="step 2 open">
          <InClaude />
        </Scene>
        <Scene from="doing it this way">
          <ThreeVersions />
        </Scene>
        <Scene from="so here's the original">
          <SideBySide />
        </Scene>
        <Scene from="and that's pretty">
          <Outro />
        </Scene>
      </Track>
    </TranscriptProvider>
    <Audio src={staticFile("films/recreate-rigel/voice.wav")} />
  </>
);
