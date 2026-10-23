/**
 * RecreateReel: the first ~45 s of a "recreate" video (intro -> look breakdown -> segue ->
 * prompt), built as VIDEO, not as web pages: one focal object per beat, everything arriving on
 * the spoken word, the camera doing the transitions, no page chrome (nav, buttons, badges).
 *
 * Clock: transcript.json (FAKE timings from script.txt via codemotion's fake-transcript.mjs;
 * swap in the real voiceover's word timestamps and the whole reel re-times itself).
 *
 * Beats
 * 1 "this is template"   night  the template plays full-frame; camera snaps back on "watch" and
 *                               it becomes a tilted print; the ease graph draws beside it; tags
 *                               land on "expo", "six hundred", "forty".     carried: the template
 * 2 "here's the thing"   paper  mixed line builds word by word.
 * 3 "it came from"       paper  "one [ticket chip] prompt": the chip opens a gap in the line.
 * 4 "and you can"        paper  title line, the template returns as the chip.  (hero frame)
 * 5 "every template"     sky    the ticket rises in 3D; "Copy the / whole prompt" behind glass;
 *                               word count runs up on "almost two thousand".
 */
import React from "react";
import { useCurrentFrame } from "remotion";
import { cameraSnap, enter, tween } from "../../../lib/eases";
import { Barcode, Print, PromptTicket } from "../kit";
import { EaseGraph, LiquidType, OpeningChip, Tag, Words, type WordSpec } from "../moves";
import { Scene, TranscriptProvider, Track, lengthOf, useCue, useWords } from "../timing";
import { C, F } from "../tokens";
import transcript from "./transcript.json";

export const REEL = { durationInFrames: lengthOf(transcript) } as const;

/** Spoken words -> WordSpecs, with an optional style per word index. */
const spoken = (ws: { text: string; at: number }[], style?: (i: number) => React.CSSProperties | undefined): WordSpec[] =>
  ws.map((w, i) => ({ text: w.text.replace(/[.,]$/, (m) => (m === "." ? "." : ",")), at: w.at, style: style?.(i) }));

// ---------------------------------------------------------------- 1. the template + its look

const MEDIA_W = 640;
const MEDIA_H = 360;
const BORDER = 20;

const TheLook: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const pull = cue("watch");
  // camera: the print starts at 3x (its picture fills the frame exactly), snaps back on "watch"
  const cam = (f: number) => ({
    s: cameraSnap(f, pull, 3, 1, { tail: 20 }),
    x: cameraSnap(f, pull, 0, -360, { tail: 20 }),
    r: cameraSnap(f, pull, 0, -3, { tail: 20 }),
  });
  const now = cam(frame);
  const prev = cam(frame - 1);
  const blur = Math.min(10, Math.abs(now.s - prev.s) * 9);
  const graph = tween(frame, cue("easing"), 22, 0, 1, "softLand");
  const ride = tween(frame, cue("fast"), cue("slow", { edge: "end" }) - cue("fast"), 0, 1, "cruise");
  const caption = useWords("comes", "slow");
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 960 - (MEDIA_W + BORDER * 2) / 2,
          top: 540 - (MEDIA_H + BORDER * 2) / 2,
          transform: `translateX(${now.x}px) scale(${now.s}) rotate(${now.r}deg)`,
          filter: blur > 0.4 ? `blur(${blur}px)` : undefined,
        }}
      >
        <Print color={C.blue} width={MEDIA_W + BORDER * 2} height={MEDIA_H} border={BORDER} style={{ position: "relative" }}>
          <LiquidType t={frame + 8} size={150} />
        </Print>
      </div>
      {/* the ease, drawn */}
      <div style={{ position: "absolute", left: 1150, top: 300, opacity: graph > 0 ? 1 : 0 }}>
        <EaseGraph draw={graph} ride={ride} w={520} h={300} />
        <div style={{ marginTop: 44, color: C.white, width: 620 }}>
          <Words size={72} base={{}} words={spoken(caption, (i) => (i < 3 ? F.caps : { ...F.italic, fontSize: 84 }))} />
        </div>
      </div>
      {/* the numbers, as tags on the print */}
      <div style={{ position: "absolute", left: 250, top: 750, display: "flex", gap: 18 }}>
        <Tag at={cue("expo")} tilt={-4}>
          expo-out
        </Tag>
        <Tag at={cue("six")} tilt={2}>
          600 ms
        </Tag>
        <Tag at={cue("forty")} tilt={-2} dot={C.orange}>
          40 ms stagger
        </Tag>
      </div>
      <div style={{ position: "absolute", left: 64, bottom: 56, opacity: frame < pull ? 1 : 0 }}>
        <Tag at={cue("fourteen")} tilt={0}>
          Template Nº 014
        </Tag>
      </div>
    </>
  );
};

// ---------------------------------------------------------------- 2-4. the segue lines

const Center: React.FC<{ children: React.ReactNode; scale?: number }> = ({ children, scale = 1 }) => (
  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: C.ink, transform: `scale(${scale})` }}>
    {children}
  </div>
);

const NotByHand: React.FC = () => {
  const kicker = useWords("here's", "thing");
  const main = useWords("i", "animate");
  const tail = useWords("any", "hand");
  return (
    <Center>
      <Words size={64} base={F.serif} words={spoken(kicker)} />
      <div style={{ height: 30 }} />
      <Words size={210} base={F.caps} words={spoken(main)} />
      <Words size={200} base={{ ...F.italic, lineHeight: 1 }} words={spoken(tail)} />
    </Center>
  );
};

const TicketChip: React.FC = () => (
  <div style={{ position: "absolute", inset: 0, background: C.white, padding: "18px 22px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
    <div style={{ ...F.mono, fontSize: 20, color: C.red, display: "flex", justifyContent: "space-between" }}>
      <span>Prompt</span>
      <span>Nº 014</span>
    </div>
    <Barcode width={236} height={70} />
  </div>
);

const OnePrompt: React.FC = () => {
  const cue = useCue();
  const a = useWords("it", "from");
  const one = useWords("one", "one");
  const prompt = useWords("prompt", "prompt");
  return (
    <Center>
      <Words size={210} base={F.caps} words={spoken(a)} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Words size={230} base={{ ...F.italic, lineHeight: 1.05 }} words={spoken(one)} />
        <OpeningChip at={cue("one") + 5} w={280} h={170} tilt={-5}>
          <TicketChip />
        </OpeningChip>
        <Words size={230} base={{ ...F.italic, lineHeight: 1.05 }} words={spoken(prompt)} />
      </div>
    </Center>
  );
};

const Recreate: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const kicker = useWords("and", "can");
  const rec = useWords("recreate", "recreate");
  const any = useWords("any", "any");
  const look = useWords("motion", "look");
  const tool = useWords("with", "code");
  const creep = tween(frame, 0, 150, 1, 1.03, "cruise");
  return (
    <Center scale={creep}>
      <Words size={64} base={F.serif} words={spoken(kicker)} />
      <div style={{ height: 10 }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Words size={230} base={F.caps} words={spoken(rec)} />
        <OpeningChip at={cue("recreate") + 7} w={300} h={176} tilt={-4}>
          <LiquidType t={Math.min(frame - cue("recreate"), 50)} size={92} />
        </OpeningChip>
        <Words size={230} base={F.caps} words={spoken(any)} />
      </div>
      <Words size={236} base={{ ...F.serif, textTransform: "uppercase", lineHeight: 0.92, letterSpacing: "-0.035em" }} words={spoken(look)} />
      <div style={{ height: 34 }} />
      <Words size={64} base={F.serif} words={spoken(tool, (i) => (i > 0 ? F.italic : undefined))} />
    </Center>
  );
};

// ---------------------------------------------------------------- 5. the prompt

const ThePrompt: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const inAt = cue("every");
  const e = enter(frame, inAt, { from: { y: 520, blur: 8 }, easing: "snapSettle", frames: 16 });
  const lean = tween(frame, inAt, 26, 38, 14, "softLand");
  const copyAt = cue("copy");
  const wholeAt = cue("whole");
  const count = Math.round(tween(frame, cue("almost"), cue("words", { edge: "end" }) - cue("almost"), 0, 1842, "glide"));
  // camera: focus pulls to the ticket on "not a summary", then pushes into the word count
  const notAt = cue("not");
  const almostAt = cue("almost");
  const key = (a: number, b: number, c: number) => (frame < almostAt ? cameraSnap(frame, notAt, a, b, { tail: 18 }) : cameraSnap(frame, almostAt, b, c, { tail: 18 }));
  const cam = { x: key(0, 380, 470), y: key(0, -60, -170), s: key(1, 1.18, 1.75) };
  const rack = tween(frame, notAt, 12, 0, 12, "softInOut");
  const bgIn = (at: number) => enter(frame, at, { from: { y: 80, blur: 14 }, frames: 14 });
  const copy = bgIn(copyAt);
  const whole = bgIn(wholeAt);
  return (
    <>
      <div style={{ position: "absolute", left: 760, top: 230, width: 1080, textAlign: "center", color: C.white, filter: rack > 0.2 ? `blur(${rack}px)` : undefined, transform: `translateX(${cam.x * 0.4}px)` }}>
        <div style={{ ...F.grotesk, fontSize: 190, filter: `blur(${9 + copy.blur}px)`, opacity: copy.visible ? 0.9 * copy.opacity : 0, transform: `translateY(${copy.y}px)` }}>Copy the</div>
        <div style={{ ...F.italic, fontSize: 230, lineHeight: 0.95, filter: whole.blur > 0.3 ? `blur(${whole.blur}px)` : undefined, opacity: whole.visible ? whole.opacity : 0, transform: `translateY(${whole.y}px)` }}>
          whole prompt
        </div>
      </div>
      {e.visible && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            transformOrigin: "500px 700px",
            transform: `translate(${cam.x}px, ${e.y + cam.y}px) scale(${cam.s})`,
            filter: e.blur > 0.3 ? `blur(${e.blur}px)` : undefined,
          }}
        >
          <PromptTicket
            width={600}
            rotY={lean}
            rotZ={-2}
            style={{ left: 200, top: 130 }}
            title="Liquid Type"
            body={["A big serif headline that ", { em: "melts in" }, " letter by letter on a ", { em: "soft blue" }, " ground, holds for a beat, then ", { em: "wipes" }, " away."]}
            bullets={[["1920×1080 · 30 fps · 6 s"], ["Instrument Serif + Archivo"], ["Easing: ", { em: "expo out, 600 ms" }]]}
            stubLeft="Prompt length:"
            stubRight={frame < cue("almost") ? "— words" : `${count.toLocaleString("en-US")} words`}
            footer="Paste into Claude Code"
          />
        </div>
      )}
    </>
  );
};

// ---------------------------------------------------------------- the reel

export const RecreateReel: React.FC = () => (
  <TranscriptProvider transcript={transcript}>
    <Track>
      <Scene from="this is template" ground="night">
        <TheLook />
      </Scene>
      <Scene from="here's the thing" ground="paper">
        <NotByHand />
      </Scene>
      <Scene from="it came from" ground="paper">
        <OnePrompt />
      </Scene>
      <Scene from="and you can recreate" ground="paper">
        <Recreate />
      </Scene>
      <Scene from="every template comes" ground="sky">
        <ThePrompt />
      </Scene>
    </Track>
  </TranscriptProvider>
);
