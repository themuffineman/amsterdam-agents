/**
 * RecreateRigel2: the second "recreate" video on Type Staircase (Rigel) from sycamore.to/motion,
 * made by the cloud film agent. Same template as RecreateRigel (the worked example), new script,
 * new remixes. Voice: Gemini TTS (src/films/recreate-type-staircase/script.json -> npm run voice
 * -> npm run narrate). Rules: src/series/recreate/SERIES.md.
 *
 * Everything shown is real:
 * - the site: screenshots of the live page before and after Copy prompt (npm run page), the
 *   cursor on the real button position (public/films/recreate-type-staircase/page/capture.json);
 * - the prompt: the text that button copies (src/films/recreate-type-staircase/prompt.md);
 * - the outputs: the component built from that prompt (builds/Staircase.tsx, no props = run 1)
 *   and the three follow-up changes (builds/runs.ts: slide in, climb up, yellow + own sentence),
 *   rendered live in the replies and the comparisons.
 *
 * Beats (one Scene each; cuts are code-picked speed ramps)
 *  1 "in this video"      the template on a MacBook; its name in a lower third.
 *                         "the trick" -> laptop ramps aside; THE STEP: the template's first three
 *                         rows build as type, each starting where a blue 80% bar ends.
 *                         "tiny and huge" -> THE SIZES: the template's nine rows at their real size
 *                         ratios; on "skips" the small rows dim and the big words read alone.
 *                         "the camera" -> the laptop ramps back to centre; zooms into it.
 *  2 "make it with one"   with one prompt; [Claude] Claude Code and [Sycamore] Sycamore.
 *  3 "claude code needs"  Remotion, HyperFrames, a web page + screenshots; Remotion takes focus.
 *  4 "step one"           STEP 01 -> the real page in Safari; cursor clicks Copy prompt.
 *  5 "what makes it"      the real prompt as a document; the step, the sizes, the camera light up.
 *  6 "step two"           STEP 02 -> one Claude Code conversation: prompt file -> run 1, then
 *                         the three asks, each reply with its real render.
 *  7 "going one change"   the three changes in a row; a highlight walks across them.
 *  8 "here's where"       Reference next to Output.
 *  9 "and that's it"      the plain ask; the YouTube Like / Subscribe bar gets clicked on the words.
 *
 * Screenshot frame: beat 1, THE STEP, just after "steps down" (the three rows stepping right off
 * the blue 80% bar, the laptop playing the template beside them).
 */
import React from "react";
import { AbsoluteFill, Audio, Img, Loop, staticFile, useCurrentFrame } from "remotion";
import { enter, tween } from "../lib/eases";
import { PromptDoc, TemplateClip } from "../series/recreate/bank";
import { SafariWindow } from "../series/recreate/devices";
import { TicketShell } from "../series/recreate/kit";
import { MacBook } from "../series/recreate/macbook";
import { Float3D, InlineChip, Words, floatUp, glide, rackStyle, ramp, type WordSpec } from "../series/recreate/moves";
import { ChoiceCards, FramesIcon, LowerThird, StepTitle, VersionRow, YT, YouTubeActions } from "../series/recreate/parts";
import { Scene, TranscriptProvider, Track, lengthOf, useCue, useWords } from "../series/recreate/timing";
import { C, F } from "../series/recreate/tokens";
import { ClaudeThread, Cursor, threadSendButton } from "../series/recreate/ui";
import { Staircase, staircaseDuration } from "../films/recreate-type-staircase/builds/Staircase";
import { RUNS } from "../films/recreate-type-staircase/builds/runs";
import capture from "../../public/films/recreate-type-staircase/page/capture.json";
import transcript from "../films/recreate-type-staircase/transcript.json";

export const RECREATE_RIGEL_2 = { durationInFrames: lengthOf(transcript) } as const;

const ID = "type-staircase" as const;
const SLUG = "recreate-type-staircase";
/** The preview opens on an empty frame each loop; skip it. */
const TRIM = 22;
/** The copied prompt's length (prompt.md). */
const PROMPT_WORDS = 435;
/** The template's own row sizes and sentence (prompt.md). */
const SIZES = [0.55, 1.7, 0.95, 1.7, 0.55, 0.95, 1.7, 0.55, 1.7];
const ROWS = ["Most people think", "you need", "talent to", "make content", "that actually works.", "But all you", "really need", "is a simple", "system"];

const Column: React.FC<{ left?: number; width?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ left = 0, width = 1920, style, children }) => (
  <div style={{ position: "absolute", left, width, top: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: C.white, ...style }}>
    {children}
  </div>
);

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
        <Loop durationInFrames={staircaseDuration(props.rows)}>
          <Staircase {...props} />
        </Loop>
      </div>
    </div>
  );
};

const Labeled: React.FC<{ label: string; width: number; focus?: number; children: React.ReactNode }> = ({ label, width, focus, children }) => (
  <div>
    <div style={{ ...F.italic, fontSize: width * 0.075, color: C.white, marginBottom: 18, marginLeft: 6 }}>{label}</div>
    <TicketShell width={width} focus={focus}>
      <div style={{ margin: -width * 0.035, width: width * 0.93, height: width * 0.93 * 0.5625, borderRadius: width * 0.03, overflow: "hidden", position: "relative" }}>{children}</div>
    </TicketShell>
  </div>
);

// ---------------------------------------------------------------- 1. the template

const word = (text: string, at: number): WordSpec[] => text.split(" ").map((t, i) => ({ text: t, at: at + i * 3 }));

/**
 * THE STEP: the template's first three rows as type. Each row is positioned at left: 80% of the
 * row above it (CSS percentages of the real text width), and a blue bar marks that 80%.
 */
const StepDiagram: React.FC<{ rows: [number, number, number]; barAt: number }> = ({ rows, barAt }) => {
  const frame = useCurrentFrame();
  const bar = tween(frame, barAt, 16, 0, 1, "softLand");
  const label = enter(frame, barAt + 6, { from: { y: 30, blur: 8 }, frames: 13 });
  const row: React.CSSProperties = { position: "relative", display: "inline-block", whiteSpace: "nowrap", width: "max-content" };
  const next: React.CSSProperties = { position: "absolute", left: "80%", top: "100%" };
  return (
    <div style={{ ...row, color: C.white }}>
      <Words size={50} base={F.caps} words={word(ROWS[0], rows[0])} />
      <div style={{ position: "absolute", left: 0, top: "100%", marginTop: 10, width: "80%", height: 7, borderRadius: 4, background: C.blue, clipPath: `inset(0 ${(1 - bar) * 100}% 0 0 round 4px)` }} />
      <div style={{ position: "absolute", left: 0, width: "80%", top: "100%", marginTop: 30, textAlign: "center", ...F.serif, fontSize: 46, opacity: label.visible ? label.opacity : 0, transform: `translateY(${label.y}px)`, filter: label.blur > 0.3 ? `blur(${label.blur}px)` : undefined }}>
        80%
      </div>
      <div style={next}>
        <div style={row}>
          <Words size={150} base={F.caps} words={word(ROWS[1], rows[1])} />
          <div style={next}>
            <div style={row}>
              <Words size={84} base={F.caps} words={word(ROWS[2], rows[2])} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/** THE SIZES: the template's nine rows at its real size ratios; on `dimAt` the small rows step back. */
const SizeLadder: React.FC<{ at: number; dimAt: number }> = ({ at, dimAt }) => {
  const frame = useCurrentFrame();
  const dim = tween(frame, dimAt, 18, 0, 1, "softInOut");
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", color: C.white }}>
      {ROWS.map((r, i) => {
        const s = SIZES[i];
        const fade = s < 0.6 ? 0.78 : s < 1 ? 0.55 : 0;
        return (
          <div key={i} style={{ marginLeft: i * 26, opacity: 1 - fade * dim, lineHeight: 1 }}>
            <Words size={60 * s} base={F.caps} words={[{ text: r, at: at + [0, 2, 5, 6, 9, 11, 12, 15, 17][i] }]} />
          </div>
        );
      })}
    </div>
  );
};

const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const W = 1000;
  const rise = floatUp(frame, 0, { to: { rotX: 0, rotY: 0, rotZ: 0 }, from: { rotX: 0, rotY: 0, rotZ: 0 }, dist: 500 });
  const aside = ramp(frame, cue("the trick"), 26);
  const back = ramp(frame, cue("the camera"), 26);
  const x = -560 * aside.p + 560 * back.p;
  const s = 1 - 0.5 * aside.p + 0.5 * back.p;
  const stepOut = tween(frame, cue("tiny"), 16, 0, 1, "softInOut");
  const sizesOut = tween(frame, cue("the camera"), 16, 0, 1, "softInOut");
  const name = useWords("type", "staircase").map((w, i) => ({ ...w, text: ["Type", "Staircase"][i] ?? w.text }));
  return (
    <>
      <div style={{ position: "absolute", left: 960 - W / 2, top: 130, filter: aside.blur + back.blur > 0.4 ? `blur(${(aside.blur + back.blur) * 0.6}px)` : undefined }}>
        <Float3D pose={rise} x={x} scale={s}>
          <MacBook width={W} openAt={10}>
            <TemplateClip id={ID} trim={TRIM} />
          </MacBook>
        </Float3D>
      </div>
      <LowerThird name={name} outAt={cue("the trick")} />
      {stepOut < 1 && (
        <div style={{ position: "absolute", left: 740, top: 390, ...rackStyle(stepOut, 16, 1) }}>
          <StepDiagram rows={[cue("each line"), cue("line above"), cue("steps")]} barAt={cue("80")} />
        </div>
      )}
      {frame >= cue("tiny") - 4 && sizesOut < 1 && (
        <div style={{ position: "absolute", left: 900, top: 0, bottom: 0, display: "flex", alignItems: "center", ...rackStyle(sizesOut, 16, 1) }}>
          <SizeLadder at={cue("tiny") - 2} dimAt={cue("skips")} />
        </div>
      )}
    </>
  );
};

// ---------------------------------------------------------------- 2. one prompt, two tools

const Tools: React.FC = () => {
  const cue = useCue();
  const kicker = useWords("make", "it");
  const prompt = useWords("with", "prompt");
  const claude = useWords("claude", "code");
  const and = useWords("and", "and", 2);
  const sycamore = useWords("sycamore", "sycamore").map((w) => ({ ...w, text: "Sycamore" }));
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
  const line = useWords("claude code needs", "with");
  return (
    <>
      <div style={{ position: "absolute", top: 130, width: "100%", textAlign: "center", color: C.white }}>
        <Words size={64} base={F.serif} words={line} />
      </div>
      <ChoiceCards
        top={290}
        focus={{ index: 0, at: cue("screenshots", { edge: "end" }) + 4 }}
        items={[
          { at: cue("remotion") - 4, name: "Remotion", line: "Writes the video as React. What we use here.", logo: "recreate/remotion.svg" },
          { at: cue("hyperframes") - 4, name: "HyperFrames", line: "HTML compositions rendered to video.", logo: "recreate/hyperframes.png" },
          { at: cue("build") - 4, name: "A web page", line: "Claude builds it in the browser and takes screenshots.", icon: <FramesIcon size={120} /> },
        ]}
      />
    </>
  );
};

// ---------------------------------------------------------------- 4. step one: the real page

const BW = 1400;
const SCALE = (BW - 2) / capture.viewport.width;
const BAR = (52 * BW) / 1203;
const BH = Math.round(capture.viewport.height * SCALE + BAR + 2);
const BL = 960 - BW / 2;
const BT = Math.round((1080 - BH) / 2);
/** The real Copy prompt button's centre on screen. */
const COPY_BTN: [number, number] = [BL + 1 + (capture.button.x + capture.button.width / 2) * SCALE, BT + 1 + BAR + (capture.button.y + capture.button.height / 2) * SCALE];

const StepOne: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const go = cue("head");
  const click = cue("click");
  const pose = floatUp(frame, go, { to: { rotX: 3, rotY: -4, rotZ: 0 }, from: { rotY: -30 } });
  const zoom = glide(frame, [{ at: 0, v: 1 }, { at: cue("next to"), v: 1.5, dur: 40 }]);
  return (
    <>
      <StepTitle n={1} label="Copy the prompt" at={2} outAt={go - 6} />
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: `${COPY_BTN[0]}px ${COPY_BTN[1]}px` }}>
        <div style={{ position: "absolute", left: BL, top: BT }}>
          <Float3D pose={pose}>
            <SafariWindow width={BW} height={BH} url="sycamore.to/motion/type-staircase" urlAt={cue("sycamore")}>
              <Img src={staticFile(`films/${SLUG}/page/${frame >= click + 2 ? "copied" : "page"}.png`)} style={{ width: "100%", display: "block" }} />
            </SafariWindow>
          </Float3D>
        </div>
        <Cursor
          appear={cue("next to")}
          keys={[
            { at: cue("next to"), x: COPY_BTN[0] - 240, y: COPY_BTN[1] + 260 },
            { at: cue("copy"), x: COPY_BTN[0] - 30, y: COPY_BTN[1] - 6 },
          ]}
          clicks={[click]}
        />
      </AbsoluteFill>
    </>
  );
};

// ---------------------------------------------------------------- 5. what matters in the prompt

const ThePrompt: React.FC = () => {
  const cue = useCue();
  return (
    <PromptDoc
      file="type-staircase prompt"
      // the script doesn't give the word count, so the count never comes in (past the scene's end)
      total={{ value: PROMPT_WORDS, at: 100000 }}
      sections={[
        { title: "Setup", lines: ["React + Remotion, 30 fps, 1920x1080.", "Font: Inter 600. Props: rows, colors."] },
        { title: "Timing", lines: ["First word at frame 8, then one every 6 frames,", "10 frames before each new row."] },
        {
          title: "Layout: the step",
          at: cue("80"),
          label: "The step",
          sub: "80% along the row above",
          lines: ["Rows stack straight down; each row's left edge", "is 80% of the way along the row above it."],
        },
        {
          title: "Layout: the sizes",
          at: cue("size"),
          label: "The sizes",
          sub: "small, big, medium, big...",
          lines: ["Row sizes cycle: small (0.55x), big (1.7x),", "medium (0.95x), big, small, medium, big..."],
        },
        {
          title: "Camera",
          at: cue("spring"),
          label: "The camera",
          sub: "rides a soft spring",
          lines: ["Holds a 1.3x zoom, aims at the newest word", "3 frames early, on an underdamped spring."],
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
  const t0 = { at: cue("paste"), sendAt: cue("send") + 4, replyAt: cue("comes back") };
  const t1 = { at: cue("first"), sendAt: cue("no blur", { edge: "end" }) + 2 };
  const t2 = { at: cue("then"), sendAt: cue("stepping down", { edge: "end" }) + 2 };
  const t3 = { at: cue("and finally"), sendAt: cue("of a video", { edge: "end" }) + 2 };
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
      walk={[cue("watch"), cue("looks off"), cue("undo")]}
    />
  );
};

// ---------------------------------------------------------------- 8. side by side

const SideBySide: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const orig = floatUp(frame, 2, { to: { rotX: 3, rotY: 14, rotZ: -3 } });
  const mine = floatUp(frame, cue("ended"), { to: { rotX: 3, rotY: -8, rotZ: 1.5 }, from: { rotY: -36 } });
  const f = ramp(frame, cue("it climbs"), 24);
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
  const cue = useCue();
  const line1 = useWords("honestly", "a like").map((w, i) => (i === 0 ? { ...w, text: "Honestly," } : w));
  const line2 = useWords("and if", "subscribe");
  const ask = useWords("tell me", "next");
  const likeAt = cue("a like", { edge: "end" });
  const subAt = cue("subscribe", { edge: "end" });
  const left = 960 - YT.w / 2;
  const top = 560;
  // on "tell me" the ask takes the frame: the lines and the bar leave upward on a speed ramp,
  // and the camera keeps pushing in slowly to the last frame (the film ends mid-motion)
  const frame = useCurrentFrame();
  const tell = cue("tell me");
  const lift = ramp(frame, tell - 4, 24, 14);
  const push = tween(frame, tell, 150, 1, 1.08, "cruise");
  // after the last word the line rushes toward the camera: the film ends inside that move
  const close = tween(frame, cue("next", { edge: "end" }) + 6, 34, 0, 1, "gentleIn");
  const away: React.CSSProperties = { transform: `translateY(${-700 * lift.p}px)`, filter: lift.blur > 0.4 ? `blur(${lift.blur}px)` : undefined, opacity: 1 - lift.p };
  return (
    <AbsoluteFill style={{ transform: `scale(${push})` }}>
      <div style={{ position: "absolute", top: 130, left: 40, right: 40, textAlign: "center", color: C.white, ...away }}>
        <Words size={45} base={F.grotesk} words={line1} />
        <div style={{ height: 18 }} />
        <Words size={66} base={F.serif} words={line2} />
      </div>
      <div style={{ position: "absolute", left, top, ...away }}>
        <YouTubeActions at={cue("honestly")} likeAt={likeAt} subscribeAt={subAt} channel="Sycamore" avatar="recreate/sycamore-logo.png" />
      </div>
      <AbsoluteFill style={away}>
      <Cursor
        appear={likeAt - 26}
        keys={[
          { at: likeAt - 26, x: left + YT.like[0] + 120, y: top + YT.like[1] + 160 },
          { at: likeAt - 18, x: left + YT.like[0] - 6, y: top + YT.like[1] - 4 },
          { at: subAt - 20, x: left + YT.subscribe[0] - 6, y: top + YT.subscribe[1] - 4 },
        ]}
        clicks={[likeAt, subAt]}
      />
      </AbsoluteFill>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 160, right: 160, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", color: C.white, transform: `scale(${1 + 0.7 * close})`, filter: close > 0.05 ? `blur(${close * 10}px)` : undefined }}>
        <Words size={104} base={F.serif} words={ask} />
      </div>
    </AbsoluteFill>
  );
};

export const RecreateRigel2: React.FC = () => (
  <>
    <TranscriptProvider transcript={transcript}>
      <Track>
        <Scene from="in this video" focus={[960, 400]}>
          <Intro />
        </Scene>
        <Scene from="make it with one">
          <Tools />
        </Scene>
        <Scene from="claude code needs">
          <Renderer />
        </Scene>
        <Scene from="step one" focus={COPY_BTN}>
          <StepOne />
        </Scene>
        <Scene from="what makes it">
          <ThePrompt />
        </Scene>
        <Scene from="step two">
          <InClaude />
        </Scene>
        <Scene from="going one change">
          <ThreeVersions />
        </Scene>
        <Scene from="here's where we started">
          <SideBySide />
        </Scene>
        <Scene from="and that's it">
          <Outro />
        </Scene>
      </Track>
    </TranscriptProvider>
    <Audio src={staticFile(`films/${SLUG}/voice.wav`)} />
  </>
);
