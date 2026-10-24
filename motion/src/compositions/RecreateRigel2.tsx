/**
 * RecreateRigel2: a second "recreate" video (~2:39) on Type Staircase (Rigel) from sycamore.to/motion,
 * with its own script (src/films/recreate-type-staircase/script.json -> npm run voice), clips joined
 * with pauses into public/films/recreate-type-staircase/voice.wav, word timings from faster-whisper
 * (transcript.json). Rules: src/series/recreate/SERIES.md. RecreateRigel is the worked example on the
 * same template; this one reads the template's own sentence aloud and builds it as stairs in the
 * series' type (StairSentence, new in bank.tsx) instead of the sizing aside.
 *
 * What the template really does (watched frame by frame, out/type-staircase-frames.png): one
 * sentence, "Most people think you need talent to make content that actually works. But all you
 * really need is a simple system.", near-black Inter-like sans on a pale lavender ground with a soft
 * white glow. Groups of 1-3 words, each group a line lower and further right. Big groups (you need,
 * make content, really need, system) ~3x the small ones (most people think, talent to, that actually
 * works, but all you, is a simple). Each word slides in out of a heavy blur; the camera pans right and
 * down with the newest word, older lines leave the frame left. Opens on an empty frame (TRIM 22).
 *
 * PLACEHOLDERS before publishing (make them true with a real run, or replace):
 * - The prompt doesn't exist yet: PROMPT_WORDS and the document text in ThePrompt.
 * - "around ten minutes" and "looked really close to the original".
 * - Every output preview (first run, dark, orange, my sentence, the Output card) is the original
 *   preview with a CSS filter (DARK / ORANGE). NOT real Claude output.
 * - The site page and the Claude Code window are drawn dummies (ui.tsx), not screen recordings.
 *
 * Beats (one Scene each; cuts are code-picked speed ramps)
 *  1 "i found this"        MacBook opens on Type Staircase; lower third writes the name as it's said.
 *                          Zooms into the laptop.
 *  2 "the whole thing"     the template's sentence built as stairs while it's read (camera follows the
 *                          newest line); "look" -> pulls back to the whole flight; "drops" -> a blue
 *                          stepped guide draws down the line starts; "hold them together" -> the small
 *                          lines go soft, only the big words read.
 *                          HERO FRAME: the whole flight with the guide drawn (~local frame 500).
 *  3 "nothing just pops"   the real template in a card + "Every word / slides in / out of a blur";
 *                          "camera drifts" -> the line racks out, the card takes the frame.
 *  4 "i didn't animate"    peak line "It came from / one prompt." racks out; then "this exact style /
 *                          for any sentence / you want." + Claude Code and Sycamore.
 *  5 "one thing first"     three ways to render; "I use Remotion" -> Remotion takes focus.
 *  6 "step 1 head"         STEP 01 -> the template page in Safari; cursor clicks Copy prompt.
 *  7 "it's worth reading"  PromptDoc: sizes, the blur slide, the steps, the camera light up as named.
 *  8 "step two open"       STEP 02 -> one Claude Code conversation: prompt pasted and sent, first run
 *                          back; then dark / orange / my sentence, one message each.
 *  9 "when you change"     the three versions in a row; a highlight walks across them.
 * 10 "here's the original" Reference next to Output.
 * 11 "that's it for"       like and subscribe (no plug).
 *
 * Type: only Alte Haas (sans) and Feature Display (serif, upright). No caps, no mono, no italic.
 */
import React from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame } from "remotion";
import { enter, tween } from "../lib/eases";
import { PromptDoc, StairSentence, TemplateClip } from "../series/recreate/bank";
import { SafariWindow } from "../series/recreate/devices";
import { TicketShell } from "../series/recreate/kit";
import { MacBook } from "../series/recreate/macbook";
import { Float3D, InlineChip, Words, floatUp, glide, rackStyle, ramp } from "../series/recreate/moves";
import { ChoiceCards, FramesIcon, LowerThird, StepTitle, VersionRow } from "../series/recreate/parts";
import { Scene, TranscriptProvider, Track, lengthOf, useCue, useWords } from "../series/recreate/timing";
import { C, F } from "../series/recreate/tokens";
import { ClaudeThread, Cursor, TemplatePage, threadSendButton } from "../series/recreate/ui";
import transcript from "../films/recreate-type-staircase/transcript.json";

export const RECREATE_RIGEL_2 = { durationInFrames: lengthOf(transcript) } as const;

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

/** A sans line over a serif line (the series' mixed line), with an optional serif kicker. */
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

/** A plain media card (the ticket's white card, media only), with an optional small serif label above. */
const MediaCard: React.FC<{ label?: string; width: number; focus?: number; filter?: string }> = ({ label, width, focus, filter }) => (
  <div>
    {label && <div style={{ ...F.italic, fontSize: width * 0.075, color: C.white, marginBottom: 18, marginLeft: 6 }}>{label}</div>}
    <TicketShell width={width} focus={focus}>
      <div style={{ margin: -width * 0.035, width: width * 0.93, height: width * 0.93 * 0.5625, borderRadius: width * 0.03, overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, filter }}>
          <TemplateClip id={ID} trim={TRIM} />
        </div>
      </div>
    </TicketShell>
  </div>
);

/** Words with the given texts, on the frames whisper heard them (fixes casing/punctuation). */
const retext = (ws: Spoken, texts: string[]) => ws.map((w, i) => ({ ...w, text: texts[i] ?? w.text }));

// ---------------------------------------------------------------- 1. the discovery

const Discovery: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const W = 1000;
  const rise = floatUp(frame, 0, { to: { rotX: 0, rotY: 0, rotZ: 0 }, from: { rotX: 0, rotY: 0, rotZ: 0 }, dist: 500 });
  const push = glide(frame, [{ at: 0, v: 1 }, { at: cue("keep"), v: 1.08, dur: 50 }]);
  const name = retext(useWords("type", "staircase"), ["Type", "Staircase"]);
  return (
    <>
      <div style={{ position: "absolute", left: 960 - W / 2, top: 130 }}>
        <Float3D pose={rise} scale={push}>
          <MacBook width={W} openAt={8}>
            <TemplateClip id={ID} trim={TRIM} />
          </MacBook>
        </Float3D>
      </div>
      <LowerThird name={name} outAt={cue("keep")} />
    </>
  );
};

// ---------------------------------------------------------------- 2. the sentence, as stairs

const SENTENCE = ["Most", "people", "think", "you", "need", "talent", "to", "make", "content", "that", "actually", "works.", "But", "all", "you", "really", "need", "is", "a", "simple", "system."];
const STAIRS = [{ n: 3 }, { n: 2, big: true }, { n: 2 }, { n: 2, big: true }, { n: 3 }, { n: 3 }, { n: 2, big: true }, { n: 3 }, { n: 1, big: true }];

const Stairs: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const intro = useWords("the whole", "sentence");
  const words = retext(useWords("most people", "system"), SENTENCE);
  const introOut = tween(frame, cue("most") - 4, 14, 0, 1, "softInOut");
  const view = tween(frame, cue("look"), 44, 0, 1, "softInOut");
  const stair = tween(frame, cue("drops"), cue("stairs") - cue("drops"), 0, 1, "softInOut");
  const stairOut = tween(frame, cue("the part"), 16, 0, 1, "softInOut");
  const dim = tween(frame, cue("hold them"), 20, 0, 1, "softInOut");
  return (
    <>
      <Column style={rackStyle(introOut, 16, 1)}>
        <Words size={84} base={F.serif} words={intro} />
      </Column>
      <StairSentence words={words} lines={STAIRS} view={view} stair={stair * (1 - stairOut)} dimSmall={dim} />
    </>
  );
};

// ---------------------------------------------------------------- 3. the blur entrance

const BlurIn: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const pose = floatUp(frame, 0, { to: { rotX: 3, rotY: 12, rotZ: -2 } });
  const take = ramp(frame, cue("camera"), 26);
  const kicker = useWords("every word", "word");
  const caps = useWords("slides", "place");
  const serif = retext(useWords("out of", "blur"), ["out", "of", "a", "blur."]);
  // the serif line arrives with the template's heavier blur
  const blurLine = serif.map((w) => {
    const e = enter(frame, w.at, { from: { y: 30, blur: 26 }, frames: 20 });
    return { ...w, e };
  });
  return (
    <>
      <div style={{ position: "absolute", left: 120, top: 250, filter: take.blur > 0.4 ? `blur(${take.blur * 0.5}px)` : undefined }}>
        <Float3D pose={{ ...pose, rotY: pose.rotY * (1 - take.p), rotZ: pose.rotZ * (1 - take.p) }} x={390 * take.p} scale={1 + 0.42 * take.p}>
          <MediaCard width={900} focus={take.p} />
        </Float3D>
      </div>
      <Column left={1060} width={800} style={rackStyle(take.p, 18, 1)}>
        <Words size={64} base={F.serif} words={kicker} />
        <div style={{ height: 16 }} />
        <Words size={132} base={F.caps} words={caps} />
        <span style={{ ...F.italic, fontSize: 132, lineHeight: 1.05, display: "inline-flex", columnGap: 132 * 0.22 }}>
          {blurLine.map((w, i) => (
            <span key={i} style={{ display: "inline-block", transform: `translateY(${w.e.y}px)`, filter: w.e.blur > 0.3 ? `blur(${w.e.blur}px)` : undefined, opacity: w.e.visible ? w.e.opacity : 0 }}>
              {w.text}
            </span>
          ))}
        </span>
      </Column>
    </>
  );
};

// ---------------------------------------------------------------- 4. the segue + promise

const Promise_: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const k1 = useWords("i didn't", "hand");
  const c1 = useWords("it came", "from");
  const s1 = retext(useWords("one prompt", "prompt"), ["one", "prompt."]);
  const out1 = tween(frame, cue("so in this") - 2, 16, 0, 1, "softInOut");
  // the kicker starts on "so in this video" so the frame never empties between the two lines
  const k2 = retext(useWords("so in this", "style"), ["So", "in", "this", "video,", "I'll", "show", "you", "how", "to", "make", "this", "exact", "style"]);
  const c2 = useWords("for any", "sentence");
  const s2 = retext(useWords("you want", "want"), ["you", "want."]);
  const tools = retext(useWords("claude", "sycamore"), ["Claude", "Code", "and", "Sycamore"]);
  return (
    <>
      <Column style={rackStyle(out1, 18, 1)}>
        <Mixed kicker={k1} caps={c1} serif={s1} size={160} />
      </Column>
      <Column>
        <Mixed kicker={k2} caps={c2} serif={s2} size={140} />
        <div style={{ height: 46 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <ClaudeChip at={cue("claude") - 2} size={76} />
          <Words size={64} base={F.grotesk} words={tools} />
        </div>
      </Column>
    </>
  );
};

// ---------------------------------------------------------------- 5. what renders it

const Renderers: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  // "One thing first" holds the frame big until the cards come, then shrinks to a header
  const first = retext(useWords("one thing", "first"), ["One", "thing", "first."]);
  const line = retext(useWords("claude code writes", "video"), ["Claude", "Code", "writes", "the", "code,", "but", "something", "has", "to", "turn", "that", "code", "into", "a", "video."]);
  const up = tween(frame, cue("remotion") - 14, 26, 0, 1, "softInOut");
  return (
    <>
      <Column style={rackStyle(tween(frame, cue("claude code writes") - 4, 14, 0, 1, "softInOut"), 16, 1)}>
        <Words size={150} base={F.caps} words={first} />
      </Column>
      <Column style={{ transform: `translateY(${-360 * up}px) scale(${1 - 0.15 * up})` }}>
        <div style={{ maxWidth: 1500 }}>
          <Words size={72} base={F.serif} words={line} />
        </div>
      </Column>
      <ChoiceCards
        top={290}
        focus={{ index: 0, at: cue("use remotion") }}
        items={[
          { at: cue("remotion"), name: "Remotion", line: "Videos written in React. What I use.", logo: "recreate/remotion.svg" },
          { at: cue("hyperframes"), name: "HyperFrames", line: "HTML compositions rendered to video.", logo: "recreate/hyperframes.png" },
          { at: cue("web page"), name: "A web page", line: "Build it in the browser, screenshot it frame by frame.", icon: <FramesIcon size={120} /> },
        ]}
      />
    </>
  );
};

// ---------------------------------------------------------------- 6. step one: the site

const BW = 1500;
const BH = 860;
const BL = 960 - BW / 2;
const BT = 110;
/** The Copy prompt button's centre on screen (measured on a still for RecreateRigel; same page). */
const COPY_BTN: [number, number] = [BL + 1222, BT + 555];

const StepOne: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const go = cue("head");
  const pose = floatUp(frame, go, { to: { rotX: 3, rotY: -4, rotZ: 0 }, from: { rotY: -30 } });
  const zoom = glide(frame, [{ at: 0, v: 1 }, { at: cue("right below"), v: 1.45, dur: 40 }]);
  return (
    <>
      <StepTitle n={1} label="Copy the prompt" at={2} outAt={go - 6} />
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: `${COPY_BTN[0]}px ${COPY_BTN[1] - 120}px` }}>
        <div style={{ position: "absolute", left: BL, top: BT }}>
          <Float3D pose={pose}>
            <SafariWindow width={BW} height={BH} url="sycamore.to/motion/type-staircase" urlAt={cue("sycamore")}>
              <TemplatePage id={ID} width={BW} copyAt={cue("click it")} promptWords={PROMPT_WORDS} />
            </SafariWindow>
          </Float3D>
        </div>
        <Cursor
          appear={cue("right below")}
          keys={[
            { at: cue("right below"), x: 1180, y: 900 },
            { at: cue("button"), x: COPY_BTN[0] - 40, y: COPY_BTN[1] - 8 },
          ]}
          clicks={[cue("click it")]}
        />
      </AbsoluteFill>
    </>
  );
};

// ---------------------------------------------------------------- 7. what's in the prompt

/** DUMMY prompt text (the real prompt doesn't exist yet); sections follow what the voice names. */
const ThePrompt: React.FC = () => {
  const cue = useCue();
  return (
    <PromptDoc
      file="type-staircase-prompt.md"
      total={{ value: PROMPT_WORDS, at: cue("that's the stuff"), dur: 34 }}
      sections={[
        { title: "Goal", lines: ["One sentence, built a word at a time,", "stepping down and to the right like stairs."] },
        { title: "Sizes", at: cue("how big"), label: "Big and small", sub: "about three to one", lines: ["Key words (you need, make content, system): 120 px.", "Connecting words: 40 px. Nothing in between."] },
        { title: "Entrance", at: cue("how far"), label: "The slide", sub: "out of a blur", lines: ["Each word slides 40 px and clears a 12 px blur", "over 14 frames, ease-out. No bounce."] },
        { title: "Layout", at: cue("how every"), label: "Each line", sub: "down and to the right", lines: ["Each new line starts lower and further right,", "so the sentence walks down the frame."] },
        { title: "Camera", at: cue("camera"), label: "The camera", sub: "keeps the newest word in view", lines: ["Pan so the newest word lands at 60% width;", "older words drift off the left edge."] },
        { title: "Background", lines: ["Pale lavender to white, soft glow behind the words."] },
        { title: "Output", lines: ["Remotion, 1920x1080, 30 fps, 8 s, loop-safe."] },
      ]}
    />
  );
};

// ---------------------------------------------------------------- 8. step two: one Claude conversation

const CW = 1460;
const CH = 900;
const CLeft = 960 - CW / 2;
const CTop = 100;
const InClaude: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const open = cue("open");
  const pose = floatUp(frame, open, { to: { rotX: 3, rotY: 4, rotZ: 0 }, from: { rotY: 30 } });
  const t0 = { at: cue("paste"), sendAt: cue("send") + 4, replyAt: cue("first version") };
  const t1 = { at: cue("asked") - 4, sendAt: cue("background", { edge: "end" }) + 2 };
  const t2 = { at: cue("next") - 2, sendAt: cue("orange", { edge: "end" }) + 2 };
  const t3 = { at: cue("swapped") - 6, sendAt: cue("own sentence", { edge: "end" }) + 2 };
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
              { ...t0, text: "", file: { name: "type-staircase-prompt.md", meta: `${PROMPT_WORDS.toLocaleString("en-US")} words · Markdown` }, minutes: 10, reply: "Here's the first version, built from the prompt.", preview: { id: ID, trim: TRIM } },
              { ...t1, text: "Make the background dark.", replyAt: t1.sendAt + 22, minutes: 2, reply: "Done. Dark background, light type, same motion.", preview: { id: ID, trim: TRIM, filter: DARK } },
              { ...t2, text: "Turn the big words orange.", replyAt: t2.sendAt + 22, minutes: 1, reply: "The big words are orange now; the small ones stay light.", preview: { id: ID, trim: TRIM, filter: ORANGE } },
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

// ---------------------------------------------------------------- 9. why one at a time

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
      walk={[cue("see exactly"), cue("something breaks"), cue("which one")]}
    />
  );
};

// ---------------------------------------------------------------- 10. side by side

const SideBySide: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const orig = floatUp(frame, 2, { to: { rotX: 3, rotY: 14, rotZ: -3 } });
  const mine = floatUp(frame, cue("mine"), { to: { rotX: 3, rotY: -8, rotZ: 1.5 }, from: { rotY: -36 } });
  const f = ramp(frame, cue("just my"), 24);
  return (
    <>
      <div style={{ position: "absolute", left: 140, top: 300, ...rackStyle(f.p, 10, 0.4) }}>
        <Float3D pose={orig} x={-60 * f.p}>
          <MediaCard label="Reference" width={620} />
        </Float3D>
      </div>
      <div style={{ position: "absolute", left: 840, top: 190, filter: f.blur > 0.4 ? `blur(${f.blur * 0.5}px)` : undefined }}>
        <Float3D pose={mine} x={-110 * f.p} scale={1 + 0.08 * f.p}>
          <MediaCard label="Output" width={900} focus={f.p} filter={ORANGE} />
        </Float3D>
      </div>
    </>
  );
};

// ---------------------------------------------------------------- 11. outro

const Outro: React.FC = () => {
  const kicker = useWords("that's it", "one");
  const caps = useWords("if it", "helped");
  const serif = useWords("like and", "subscribe");
  const ask = useWords("tell me", "next");
  const frame = useCurrentFrame();
  const cue = useCue();
  // a slow push all through, then the lines leave upward on the last word (no static end hold)
  const end = cue("next", { edge: "end", lead: 0 });
  const push = 1 + 0.06 * tween(frame, 0, end + 30, 0, 1, "softInOut");
  const leave = tween(frame, end + 4, 18, 0, 1, "accelExit");
  return (
    <Column style={{ transform: `translateY(${-160 * leave}px) scale(${push})`, opacity: 1 - leave, filter: leave > 0.02 ? `blur(${leave * 14}px)` : undefined }}>
      <Mixed kicker={kicker} caps={caps} serif={serif} size={130} />
      <div style={{ height: 50 }} />
      <Words size={48} base={F.serif} words={ask} />
    </Column>
  );
};

export const RecreateRigel2: React.FC = () => (
  <>
    <TranscriptProvider transcript={transcript}>
      <Track>
        <Scene from="i found this" focus={[960, 400]}>
          <Discovery />
        </Scene>
        <Scene from="the whole thing">
          <Stairs />
        </Scene>
        <Scene from="nothing just pops" focus={[960, 540]}>
          <BlurIn />
        </Scene>
        <Scene from="i didn't animate">
          <Promise_ />
        </Scene>
        <Scene from="one thing first">
          <Renderers />
        </Scene>
        <Scene from="step 1 head" focus={COPY_BTN}>
          <StepOne />
        </Scene>
        <Scene from="it's worth reading">
          <ThePrompt />
        </Scene>
        <Scene from="step two open">
          <InClaude />
        </Scene>
        <Scene from="when you change">
          <ThreeVersions />
        </Scene>
        <Scene from="here's the original">
          <SideBySide />
        </Scene>
        <Scene from="that's it for">
          <Outro />
        </Scene>
      </Track>
    </TranscriptProvider>
    <Audio src={staticFile("films/recreate-type-staircase/voice.wav")} />
  </>
);
