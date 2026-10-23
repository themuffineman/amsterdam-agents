/**
 * RecreateBank: a demo of the component bank on one voice-cued track (FAKE timings from
 * script.txt via codemotion's fake-transcript.mjs). All on the sky ground; every card a ticket.
 *
 * 1 "here are three"   DealtTickets: Antares, Sirius, Deneb float up on "three templates ... site";
 *                      "pick" -> Deneb takes focus, the others part and go soft.
 * 2 "there are twelve" TicketBoard: all twelve on a tilted board that scrolls under the title.
 * 3 "this is the one"  TicketStatement: Deneb returns as the tall ticket (carried object),
 *                      action chip pressed on "motion".
 * 4 "each template"    MediaSentence: the parts, each with its template opening the line.
 * 5 "the prompt"       ReceiptTicket: palette / type / easing / timing on cue, highlight glides,
 *                      "vague vibe" row struck, total counts up on "two thousand words".
 *                      Row VALUES are placeholders until the real Deneb prompt exists.
 */
import React from "react";
import { useCurrentFrame } from "remotion";
import { DealtTickets, MediaSentence, ReceiptTicket, TicketBoard, TicketStatement, type FlowItem } from "../bank";
import { Float3D, floatUp } from "../moves";
import { TEMPLATES, type TemplateId } from "../templates";
import { Scene, TranscriptProvider, Track, lengthOf, useCue, useWords } from "../timing";
import { C } from "../tokens";
import transcript from "./transcript.json";

export const BANK_DEMO = { durationInFrames: lengthOf(transcript) } as const;

const Three: React.FC = () => {
  const cue = useCue();
  return (
    <DealtTickets
      focus={{ index: 2, at: cue("pick") }}
      items={[
        { id: "conveyor-captions", at: cue("three") },
        { id: "swipe-to-quote", at: cue("templates") },
        { id: "serif-emphasis-captions", at: cue("site") },
      ]}
    />
  );
};

const Twelve: React.FC = () => {
  const cue = useCue();
  return (
    <TicketBoard
      at={cue("every")}
      ids={Object.keys(TEMPLATES) as TemplateId[]}
      kicker={useWords("there", "are")}
      caps={useWords("twelve", "them")}
      serif={useWords("so", "far")}
    />
  );
};

const TheOne: React.FC = () => {
  const cue = useCue();
  return (
    <TicketStatement
      big={{ id: "serif-emphasis-captions", at: 2 }}
      small={{ id: "swipe-to-quote", at: cue("rebuilding"), still: true }}
      kicker={useWords("this", "today")}
      caps={useWords("serif", "emphasis")}
      serif={useWords("captions", "captions")}
      action={{ label: "sycamore.to/motion", at: cue("find"), pressAt: cue("motion") }}
    />
  );
};

const CHIP_AFTER: Record<string, TemplateId> = {
  "headline,": "glow-headline-reveal",
  "highlight,": "marker-highlight-title",
  "caption,": "serif-emphasis-captions",
  "move.": "camera-bullet-list",
};

const Parts: React.FC = () => {
  const words = useWords("a", "move");
  const items: FlowItem[] = words.flatMap((w) => {
    const chip = CHIP_AFTER[w.text.toLowerCase()];
    return chip ? [{ text: w.text, at: w.at }, { chip, at: w.at + 6 }] : [{ text: w.text, at: w.at }];
  });
  return <MediaSentence ink={C.white} kicker={useWords("each", "parts")} items={items} size={100} maxWidth={1780} />;
};

const Anatomy: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const pose = floatUp(frame, 2, { to: { rotX: 4, rotY: 12, rotZ: -2 } });
  return (
    <div style={{ position: "absolute", left: 960 - 320, top: 150 }}>
      <Float3D pose={pose}>
        <ReceiptTicket
          title="Deneb"
          kicker="Prompt Nº 12"
          rows={[
            { label: "Palette", value: "near-black + white", at: cue("palette") },
            { label: "Type", value: "sans + italic serif", at: cue("type") },
            { label: "Easing", value: "soft ease-out", at: cue("easing") },
            { label: "Timing", value: "word by word", at: cue("timing") },
            { label: "A vague vibe", at: cue("vague"), struck: cue("vibe") + 4 },
          ]}
          total={{ label: "Prompt length:", value: 1842, unit: "words", at: cue("almost"), dur: 40 }}
          footer="Paste into Claude Code"
        />
      </Float3D>
    </div>
  );
};

export const RecreateBank: React.FC = () => (
  <TranscriptProvider transcript={transcript}>
    <Track>
      <Scene from="here are three" ground="sky">
        <Three />
      </Scene>
      <Scene from="there are twelve" ground="sky">
        <Twelve />
      </Scene>
      <Scene from="this is the one" ground="sky">
        <TheOne />
      </Scene>
      <Scene from="each template is" ground="sky">
        <Parts />
      </Scene>
      <Scene from="the prompt spells" ground="sky">
        <Anatomy />
      </Scene>
    </Track>
  </TranscriptProvider>
);
