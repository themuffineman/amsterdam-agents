/**
 * RecreateReel: the segue + prompt part of a "recreate" video, as ONE continuous shot on the sky
 * ground. Type builds word by word as it's spoken (condensed caps + italic serif, white); the
 * prompt ticket floats up rotating in 3D, and the type behind it racks out of focus as it
 * arrives (the blur is the transition); the camera moves are smooth eased glides.
 *
 * Clock: transcript.json (FAKE timings from script.txt via codemotion's fake-transcript.mjs;
 * swap in the real voiceover's word timestamps and the reel re-times itself).
 *
 * Beats (all one shot)
 * 1 "here's the thing"  type: "I DIDN'T ANIMATE / any of this by hand."
 * 2 "it came from"      beat 1 racks out; "IT CAME FROM / one prompt." builds; on "prompt" the
 *                       ticket floats up rotating, the type racks out behind it, camera glides in.
 * 3 "every template"    camera glides back, ticket slides left; "EVERY TEMPLATE / comes with its
 *                       prompt." builds sharp on the right.
 * 4 "so copy"           "SO COPY THE / whole prompt." replaces it.
 * 5 "not a summary"     the type racks out again; camera glides into the ticket stub; the word
 *                       count runs up on "almost two thousand words".
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { tween } from "../../../lib/eases";
import { PromptTicket } from "../kit";
import { Words } from "../moves";
import { Scene, TranscriptProvider, Track, lengthOf, useCue, useWords } from "../timing";
import { C, F } from "../tokens";
import transcript from "./transcript.json";

export const REEL = { durationInFrames: lengthOf(transcript) } as const;

type Key = { at: number; v: number; dur?: number };

/** Chained eased glide: from each key's value to the next, softInOut over `dur` frames. */
const glide = (frame: number, keys: Key[]) => keys.slice(1).reduce((v, k) => v + (k.v - v) * tween(frame, k.at, k.dur ?? 36, 0, 1, "softInOut"), keys[0].v);

/** Focus pull: 0 = sharp, 1 = fully racked out. Blur, a slight push back, and a fade. */
const rackStyle = (k: number, blur = 14, fade = 0.25): React.CSSProperties =>
  k <= 0.001 ? {} : { filter: `blur(${k * blur}px)`, transform: `scale(${1 - k * 0.05})`, opacity: 1 - k * fade };

type Spoken = { text: string; at: number }[];

/** One block of mixed type: a caps line over an italic serif line, words on their spoken frames. */
const Block: React.FC<{ caps: Spoken; serif: Spoken; kicker?: Spoken; size?: number }> = ({ caps, serif, kicker, size = 200 }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: C.white }}>
    {kicker && (
      <div style={{ marginBottom: size * 0.16 }}>
        <Words size={size * 0.32} base={F.serif} words={kicker} />
      </div>
    )}
    <Words size={size} base={F.caps} words={caps} />
    <Words size={size * 1.02} base={{ ...F.italic, lineHeight: 1 }} words={serif} />
  </div>
);

/** A block in a box, centred, with its own focus state. Gone once fully racked out and faded. */
const Place: React.FC<{ left: number; width: number; rack: number; children: React.ReactNode; blur?: number; fade?: number }> = ({ left, width, rack, children, blur, fade = 0.25 }) =>
  rack >= 0.999 && fade >= 1 ? null : (
    <div style={{ position: "absolute", left, width, top: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", ...rackStyle(rack, blur, fade) }}>{children}</div>
  );

const Shot: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = useCue();

  // spoken words, by block
  const w1k = useWords("here's", "thing");
  const w1a = useWords("i", "animate");
  const w1b = useWords("any", "hand");
  const w2a = useWords("it", "from");
  const w2b = useWords("one", "prompt");
  const w3a = useWords("every", "template");
  const w3b = useWords("comes", "prompt");
  const w4a = useWords("so", "the");
  const w4b = useWords("whole", "prompt");

  const t2 = cue("it");
  const cardAt = cue("prompt") + 2;
  const t3 = cue("every");
  const t4 = cue("so");
  const tNot = cue("not");
  const tAlmost = cue("almost");
  const tEnd = cue("words", { edge: "end" });

  // focus: each block racks out when the next thing takes the eye
  const rack1 = tween(frame, t2 - 2, 14, 0, 1, "softInOut");
  const rack2 = Math.max(tween(frame, cardAt + 4, 26, 0, 1, "softInOut"), tween(frame, t3, 14, 0, 1));
  const rack3 = tween(frame, t4 - 2, 14, 0, 1, "softInOut");
  const rack4 = tween(frame, tNot, 22, 0, 1, "softInOut");

  // the ticket: floats up from below the frame, unwinding its 3D tilt as it rises
  const rise = tween(frame, cardAt, 34, 0, 1, "softLand");
  const turn = tween(frame, cardAt, 46, 0, 1, "softLand");
  const bob = Math.sin((frame - cardAt) / 22) * 6 * rise;
  const card = {
    y: (1 - rise) * 820 + bob,
    rotX: 26 - turn * 20,
    rotY: 46 - turn * 32 - tween(frame, t3, 90, 0, 4, "softInOut"),
    rotZ: -12 + turn * 9,
    x: glide(frame, [{ at: 0, v: 0 }, { at: t3, v: -440, dur: 32 }]),
  };

  // camera: smooth eased glides (no snap). Origin = frame centre; a point P is centred at scale s
  // by translating -(s * (P - centre)). Ticket centre ~ (960, 520); stub ~ (520, 790) once slid left.
  const cam = {
    s: glide(frame, [{ at: 0, v: 1 }, { at: cardAt + 6, v: 1.1, dur: 44 }, { at: t3, v: 1 }, { at: tNot, v: 1.5, dur: 42 }]),
    x: glide(frame, [{ at: 0, v: 0 }, { at: tNot, v: 1.5 * 440, dur: 42 }]),
    y: glide(frame, [{ at: 0, v: 0 }, { at: cardAt + 6, v: 22, dur: 44 }, { at: t3, v: 0 }, { at: tNot, v: -1.5 * 250, dur: 42 }]),
  };
  // slow creep after the push lands, so the held stub never goes still (+6% over 5 s)
  const creep = tween(frame, tNot + 42, 150, 0, 0.06, "cruise");
  cam.s += creep;
  cam.x += creep * 440;
  cam.y -= creep * 250;
  const count = Math.round(tween(frame, tAlmost, tEnd - tAlmost, 0, 1842, "glide"));

  return (
    <AbsoluteFill style={{ transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.s})` }}>
      {/* type layer (behind the ticket) */}
      <Place left={0} width={1920} rack={rack1} fade={1}>
        <Block kicker={w1k} caps={w1a} serif={w1b} />
      </Place>
      <Place left={0} width={1920} rack={rack2} fade={tween(frame, t3, 14, 0.25, 1)}>
        {frame >= t2 - 2 && <Block caps={w2a} serif={w2b} size={210} />}
      </Place>
      <Place left={760} width={1140} rack={rack3} fade={1}>
        {frame >= t3 - 2 && <Block caps={w3a} serif={w3b} size={138} />}
      </Place>
      <Place left={820} width={1040} rack={rack4} blur={16} fade={0.3}>
        {frame >= t4 - 2 && <Block caps={w4a} serif={w4b} size={170} />}
      </Place>

      {/* the ticket */}
      {frame >= cardAt && (
        <div style={{ position: "absolute", inset: 0, transform: `translate(${card.x}px, ${card.y}px)` }}>
          <PromptTicket
            width={600}
            rotX={card.rotX}
            rotY={card.rotY}
            rotZ={card.rotZ}
            style={{ left: 660, top: 165 }}
            title="Liquid Type"
            body={["A big serif headline that ", { em: "melts in" }, " letter by letter on a ", { em: "soft blue" }, " ground, holds for a beat, then ", { em: "wipes" }, " away."]}
            bullets={[["1920×1080 · 30 fps · 6 s"], ["Instrument Serif + Archivo"], ["Easing: ", { em: "expo out, 600 ms" }]]}
            stubLeft="Prompt length:"
            stubRight={frame < tAlmost ? "— words" : `${count.toLocaleString("en-US")} words`}
            footer="Paste into Claude Code"
          />
        </div>
      )}
    </AbsoluteFill>
  );
};

export const RecreateReel: React.FC = () => (
  <TranscriptProvider transcript={transcript}>
    <Track>
      <Scene from="here's the thing" ground="sky">
        <Shot />
      </Scene>
    </Track>
  </TranscriptProvider>
);
