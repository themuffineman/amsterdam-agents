/**
 * RecreateRigel: the first full "recreate" video. Template: Type Staircase (Rigel) from
 * sycamore.to/motion. Voice: Gemini TTS (src/films/recreate-rigel/script.json -> npm run voice),
 * clips joined with pauses into public/films/recreate-rigel/voice.wav, word timings from
 * faster-whisper (transcript.json, hand-fixed: "Cloud"/"clod" -> Claude). Rules: SERIES.md.
 *
 * PLACEHOLDERS before publishing:
 * - The prompt doesn't exist yet: its word count (PROMPT_WORDS), the receipt rows, and "about
 *   ten minutes" must be made true by a real run.
 * - The site page and the Claude Code window are dummies (ui.tsx); swap in screen recordings.
 * - The remix result is the original preview colour-inverted (REMIX_FILTER), NOT a real Claude
 *   output. Replace with the real render.
 *
 * Beats (one Scene each; cuts are code-picked speed ramps)
 * 1 "this is type"     the template big on a card; on "look" it glides left and the sizing demo
 *                      builds beside it (CONTENT / SYSTEM big, the connecting words small); on
 *                      "slides" the demo racks out and the card comes forward. Leaves by zooming in.
 * 2 "here's the thing" I DIDN'T ANIMATE / any of this by hand -> IT CAME FROM / one prompt, the
 *                      prompt ticket floats up on "prompt" and the type racks out behind it.
 * 3 "and you can"      MAKE YOUR OWN / version of it, with [Claude] Claude Code.
 * 4 "go to sycamore"   the template page in a browser; URL types on "sycamore"; the camera glides
 *                      to the Copy prompt button, the cursor clicks it on "copies". Zooms into it.
 * 5 "it spells out"    the prompt as a receipt: sizes / timing / easing / camera, the count runs up.
 * 6 "now open"         Claude Code: the prompt file drops in on "paste", the remix asks arrive as
 *                      numbered lines, send on "send", working with a time skip.
 * 7 "and here's what"  original (soft) next to the remix (in focus).
 * 8 "that's the whole" THE PROMPT / does the heavy lifting; the site link chip.
 */
import React from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame } from "remotion";
import { tween } from "../lib/eases";
import { ActionChip, MediaTicket, ReceiptTicket, TemplateClip } from "../series/recreate/bank";
import { PromptTicket, TicketShell } from "../series/recreate/kit";
import { Float3D, InlineChip, Words, floatUp, glide, rackStyle, ramp } from "../series/recreate/moves";
import { Scene, TranscriptProvider, Track, lengthOf, useCue, useWords } from "../series/recreate/timing";
import { C, F } from "../series/recreate/tokens";
import { BrowserWindow, ClaudeWindow, Cursor, TemplatePage } from "../series/recreate/ui";
import transcript from "../films/recreate-rigel/transcript.json";

export const RECREATE_RIGEL = { durationInFrames: lengthOf(transcript) } as const;

const ID = "type-staircase" as const;
/** PLACEHOLDER: the real prompt's length. */
const PROMPT_WORDS = 1940;
/** PLACEHOLDER: stands in for the real remix render (dark ground, light type). */
const REMIX_FILTER = "invert(1) hue-rotate(180deg)";

type Spoken = { text: string; at: number }[];

const Column: React.FC<{ left?: number; width?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ left = 0, width = 1920, style, children }) => (
  <div style={{ position: "absolute", left, width, top: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: C.white, ...style }}>
    {children}
  </div>
);

/** A caps line over an italic serif line (the series' mixed line), with an optional serif kicker. */
const Mixed: React.FC<{ kicker?: Spoken; caps: Spoken; serif: Spoken; size?: number }> = ({ kicker, caps, serif, size = 190 }) => (
  <>
    {kicker && (
      <div style={{ marginBottom: size * 0.14 }}>
        <Words size={size * 0.32} base={F.serif} words={kicker} />
      </div>
    )}
    <Words size={size} base={F.caps} words={caps} />
    <Words size={size * 1.02} base={{ ...F.italic, lineHeight: 1 }} words={serif} />
  </>
);

// ---------------------------------------------------------------- 1. the template + its look

/** The hero card: the template playing large, codename + name under it. */
const HeroCard: React.FC<{ width: number }> = ({ width }) => {
  const pad = width * 0.035;
  return (
    <TicketShell width={width} style={{ borderRadius: 0 }}>
      <div style={{ margin: -width * 0.06 + pad, marginBottom: 0 }}>
        <div style={{ width: width - pad * 2, height: (width - pad * 2) * 0.5625, borderRadius: width * 0.015, overflow: "hidden", position: "relative" }}>
          <TemplateClip id={ID} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: pad * 0.8 }}>
          <span style={{ ...F.italic, fontSize: width * 0.05, lineHeight: 1 }}>Rigel</span>
          <span style={{ ...F.body, fontSize: width * 0.02 }}>Type Staircase · sycamore.to/motion</span>
        </div>
      </div>
    </TicketShell>
  );
};

const TheLook: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const W = 1180;
  const card = floatUp(frame, 2, { to: { rotX: 3, rotY: 0, rotZ: -1.5 }, from: { rotY: 30 } });
  const side = ramp(frame, cue("look"), 26);
  const back = ramp(frame, cue("slides"), 26);
  // card: centre -> left & smaller on "look" -> centre & bigger on "slides"
  const x = -430 * side.p + 430 * back.p;
  const s = 1 - 0.36 * side.p + 0.46 * back.p;
  const demoRack = tween(frame, cue("slides"), 18, 0, 1, "softInOut");
  return (
    <>
      <div style={{ position: "absolute", left: 960 - W / 2, top: 110, filter: side.blur + back.blur > 0.4 ? `blur(${(side.blur + back.blur) * 0.6}px)` : undefined }}>
        <Float3D pose={{ ...card, rotY: card.rotY + 10 * side.p - 10 * back.p }} x={x} scale={s}>
          <HeroCard width={W} />
        </Float3D>
      </div>
      <Column left={1060} width={800} style={rackStyle(demoRack, 16, 1)}>
        <Words size={56} base={F.serif} words={useWords("look", "sizing")} />
        <div style={{ height: 24 }} />
        <Words size={190} base={F.caps} words={useWords("content", "content").map((w) => ({ ...w, text: "content" }))} />
        <Words size={190} base={F.caps} words={useWords("system", "system").map((w) => ({ ...w, text: "system" }))} />
        <div style={{ height: 22 }} />
        <Words size={40} base={F.serif} words={useWords("little", "small")} />
      </Column>
    </>
  );
};

// ---------------------------------------------------------------- 2. the turn

const TheTurn: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const t2 = cue("it");
  const cardAt = cue("prompt") + 2;
  const rack1 = tween(frame, t2 - 2, 14, 0, 1, "softInOut");
  const rack2 = tween(frame, cardAt + 4, 26, 0, 1, "softInOut");
  const pose = floatUp(frame, cardAt);
  const cam = glide(frame, [{ at: 0, v: 1 }, { at: cardAt + 6, v: 1.08, dur: 50 }]);
  // hooks first, never inside a condition
  const w1 = { kicker: useWords("here's", "thing"), caps: useWords("i", "animate"), serif: useWords("any", "hand") };
  const w2 = { caps: useWords("it", "from"), serif: useWords("one", "prompt") };
  return (
    <AbsoluteFill style={{ transform: `scale(${cam})` }}>
      <Column style={rackStyle(rack1, 14, 1)}>
        <Mixed {...w1} size={200} />
      </Column>
      {frame >= t2 - 2 && (
        <Column style={rackStyle(rack2, 14, 0.25)}>
          <Mixed {...w2} size={210} />
        </Column>
      )}
      <div style={{ position: "absolute", left: 660, top: 170 }}>
        <Float3D pose={pose}>
          <PromptTicket
            width={600}
            style={{ position: "relative" }}
            title="Type Staircase"
            body={["One sentence, ", { em: "word by word" }, ". Key words ", { em: "big" }, ", connecting words small. Each line ", { em: "steps down" }, " and to the right."]}
            bullets={[["1920×1080 · 30 fps · 8 s"], ["Words slide in out of a blur"], ["Camera follows the newest word"]]}
            stubLeft="Prompt length:"
            stubRight={`${PROMPT_WORDS.toLocaleString("en-US")} words`}
            footer="Paste into Claude Code"
          />
        </Float3D>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 3. make your own

const MakeYourOwn: React.FC = () => {
  const cue = useCue();
  const withW = useWords("with", "with");
  const code = useWords("claude", "code");
  const how = useWords("here's", "how");
  return (
    <Column>
      <Mixed kicker={useWords("and", "can")} caps={useWords("make", "own")} serif={useWords("version", "it")} size={190} />
      <div style={{ height: 40 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 22, ...F.grotesk, fontSize: 70 }}>
        <Words size={70} base={F.grotesk} words={withW} />
        <InlineChip at={cue("claude") - 2} w={84} h={84} tilt={-6} radius={0.24}>
          <div style={{ position: "absolute", inset: 0, background: "#262624", display: "grid", placeItems: "center" }}>
            <Img src={staticFile("recreate/claude-icon.svg")} style={{ width: 54, height: 54 }} />
          </div>
        </InlineChip>
        <Words size={70} base={F.grotesk} words={code} />
      </div>
      <div style={{ height: 22 }} />
      <Words size={46} base={F.serif} words={how} />
    </Column>
  );
};

// ---------------------------------------------------------------- 4. the site

const BW = 1500;
const BH = 860;
const BL = 960 - BW / 2;
const BT = 110;
/** The Copy prompt button's centre on screen (measured on a still). */
const COPY_BTN: [number, number] = [BL + 1222, BT + 548];

const TheSite: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const pose = floatUp(frame, 2, { to: { rotX: 3, rotY: -4, rotZ: 0 }, from: { rotY: -30 } });
  const zoom = glide(frame, [{ at: 0, v: 1 }, { at: cue("under"), v: 1.45, dur: 40 }]);
  return (
    <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: `${COPY_BTN[0]}px ${COPY_BTN[1] - 120}px` }}>
      <div style={{ position: "absolute", left: BL, top: BT }}>
        <Float3D pose={pose}>
          <BrowserWindow width={BW} height={BH} url="sycamore.to/motion/type-staircase" urlAt={cue("sycamore")}>
            <TemplatePage id={ID} width={BW} copyAt={cue("copies")} promptWords={PROMPT_WORDS} />
          </BrowserWindow>
        </Float3D>
      </div>
      <Cursor
        appear={cue("under")}
        keys={[
          { at: cue("under"), x: 1180, y: 900 },
          { at: cue("copy"), x: COPY_BTN[0] - 40, y: COPY_BTN[1] - 8 },
        ]}
        clicks={[cue("copies")]}
      />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 5. the prompt, itemised

const ThePrompt: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const pose = floatUp(frame, 2, { to: { rotX: 4, rotY: 12, rotZ: -2 } });
  return (
    <div style={{ position: "absolute", left: 960 - 330, top: 120 }}>
      <Float3D pose={pose}>
        <ReceiptTicket
          width={660}
          title="Type Staircase"
          kicker="Prompt Nº 10"
          rows={[
            { label: "Sizes", value: "big for the point", at: cue("sizes") },
            { label: "Timing", value: "every word", at: cue("timing") },
            { label: "Easing", value: "slide out of a blur", at: cue("easing") },
            { label: "Camera", value: "follows the newest word", at: cue("camera") },
          ]}
          total={{ label: "Prompt length:", value: PROMPT_WORDS, unit: "words", at: cue("almost"), dur: 30 }}
          footer="Paste into Claude Code"
        />
      </Float3D>
    </div>
  );
};

// ---------------------------------------------------------------- 6. Claude Code

const CW = 1460;
const CH = 900;
const CLeft = 960 - CW / 2;
const CTop = 100;
/** The send button's centre on screen (measured on a still). */
const SEND_BTN: [number, number] = [CLeft + 1263, CTop + 778];

const InClaude: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const pose = floatUp(frame, 2, { to: { rotX: 3, rotY: 4, rotZ: 0 }, from: { rotY: 30 } });
  const sendAt = cue("send");
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: CLeft, top: CTop }}>
        <Float3D pose={pose}>
          <ClaudeWindow
            width={CW}
            height={CH}
            attachments={[{ name: "type-staircase-prompt.md", meta: `${PROMPT_WORDS.toLocaleString("en-US")} words · Markdown`, kind: "md", at: cue("paste") }]}
            lines={[
              { text: "Remix this template for my brand:", at: cue("tell") },
              { text: "Dark background", at: cue("dark"), numbered: true },
              { text: "Orange accent", at: cue("orange"), numbered: true },
              { text: "Use my own sentence", at: cue("sentence"), numbered: true },
            ]}
            sendAt={sendAt}
            workingAt={sendAt + 10}
            workMinutes={10}
            workFrames={cue("minutes", { edge: "end" }) - sendAt - 10}
            steps={[
              { text: "Read type-staircase-prompt.md", at: cue("work") },
              { text: "Wrote TypeStaircase.tsx", at: cue("took") },
              { text: "Rendered a preview", at: cue("minutes") },
            ]}
          />
        </Float3D>
      </div>
      <Cursor
        appear={cue("hit") - 6}
        keys={[
          { at: cue("hit") - 6, x: SEND_BTN[0] - 260, y: SEND_BTN[1] + 120 },
          { at: cue("hit"), x: SEND_BTN[0] - 8, y: SEND_BTN[1] - 6 },
        ]}
        clicks={[sendAt]}
      />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 7. the result

const TheResult: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const orig = floatUp(frame, 2, { to: { rotX: 3, rotY: 14, rotZ: -3 } });
  const mine = floatUp(frame, cue("came"), { to: { rotX: 3, rotY: -8, rotZ: 1.5 }, from: { rotY: -36 } });
  const f = ramp(frame, cue("mine"), 24);
  const W = 900;
  return (
    <>
      <div style={{ position: "absolute", left: 150, top: 300, ...rackStyle(f.p, 10, 0.4) }}>
        <Float3D pose={orig} x={-60 * f.p}>
          <MediaTicket id={ID} width={560} tall={false} />
        </Float3D>
      </div>
      <div style={{ position: "absolute", left: 830, top: 170, filter: f.blur > 0.4 ? `blur(${f.blur * 0.5}px)` : undefined }}>
        <Float3D pose={mine} x={-120 * f.p} scale={1 + 0.08 * f.p}>
          <TicketShell width={W} focus={f.p}>
            <div style={{ width: W * 0.88, height: W * 0.88 * 0.5625, borderRadius: W * 0.02, overflow: "hidden", position: "relative" }}>
              <div style={{ position: "absolute", inset: 0, filter: REMIX_FILTER }}>
                <TemplateClip id={ID} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: W * 0.035 }}>
              <span style={{ ...F.italic, fontSize: W * 0.07, lineHeight: 1 }}>My remix</span>
              <span style={{ ...F.mono, fontSize: W * 0.026 }}>made with Claude Code</span>
            </div>
          </TicketShell>
        </Float3D>
      </div>
    </>
  );
};

// ---------------------------------------------------------------- 8. outro

const Outro: React.FC = () => {
  const cue = useCue();
  return (
    <Column>
      <Mixed kicker={useWords("that's", "trick")} caps={useWords("the prompt", "prompt")} serif={useWords("does", "lifting")} size={200} />
      <div style={{ height: 50 }} />
      <Words size={44} base={F.serif} words={useWords("every", "one")} />
      <div style={{ marginTop: 34, height: 84 }}>
        <ActionChip label="sycamore.to/motion" at={cue("every") + 4} scale={1.3} />
      </div>
    </Column>
  );
};

export const RecreateRigel: React.FC = () => (
  <>
    <TranscriptProvider transcript={transcript}>
      <Track>
        <Scene from="this is type" focus={[960, 440]}>
          <TheLook />
        </Scene>
        <Scene from="here's the thing">
          <TheTurn />
        </Scene>
        <Scene from="and you can make">
          <MakeYourOwn />
        </Scene>
        <Scene from="go to sycamore" focus={COPY_BTN}>
          <TheSite />
        </Scene>
        <Scene from="it spells out">
          <ThePrompt />
        </Scene>
        <Scene from="now open claude">
          <InClaude />
        </Scene>
        <Scene from="and here's what">
          <TheResult />
        </Scene>
        <Scene from="that's the whole">
          <Outro />
        </Scene>
      </Track>
    </TranscriptProvider>
    <Audio src={staticFile("films/recreate-rigel/voice.wav")} />
  </>
);
