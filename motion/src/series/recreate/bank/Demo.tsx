/**
 * RecreateBank: a demo of the component bank on one voice-cued track (FAKE timings from
 * script.txt via codemotion's fake-transcript.mjs). One beat per component:
 *
 * 1 "here are three"   paper  DealtPrints: Antares, Sirius, Deneb deal in on "three templates ... site";
 *                             "pick" -> Deneb takes focus, the others rack out.
 * 2 "there are twelve" night  PrintStack: "TWELVE OF THEM / so far", prints pile over it.
 * 3 "this is the one"  paper  PolaroidStatement: Deneb returns as the big polaroid (carried
 *                             object), sticker on "today", action chip pressed on "motion".
 * 4 "each template"    sky    MediaSentence: the parts, each with its template opening the line.
 */
import React from "react";
import { DealtPrints, MediaSentence, PolaroidStatement, PrintStack, type FlowItem } from "../bank";
import type { TemplateId } from "../templates";
import { Scene, TranscriptProvider, Track, lengthOf, useCue, useWords } from "../timing";
import { C } from "../tokens";
import transcript from "./transcript.json";

export const BANK_DEMO = { durationInFrames: lengthOf(transcript) } as const;

const Three: React.FC = () => {
  const cue = useCue();
  return (
    <DealtPrints
      focus={{ index: 2, at: cue("pick") }}
      items={[
        { id: "conveyor-captions", color: C.blue, at: cue("three"), label: "Antares", sub: "Conveyor Captions" },
        { id: "swipe-to-quote", color: C.pink, at: cue("templates"), label: "Sirius", sub: "Swipe to Quote" },
        { id: "serif-emphasis-captions", color: C.orange, at: cue("site"), label: "Deneb", sub: "Serif Emphasis Captions" },
      ]}
    />
  );
};

const Twelve: React.FC = () => {
  const cue = useCue();
  return (
    <PrintStack
      kicker={useWords("there", "are")}
      caps={useWords("twelve", "them")}
      serif={useWords("so", "far")}
      items={[
        { id: "split-letter-headline", color: C.orange, at: cue("every") },
        { id: "glow-headline-reveal", color: C.blue, at: cue("single") },
        { id: "type-staircase", color: C.butter, at: cue("one") },
        { id: "two-part-statement", color: C.pink, at: cue("free") },
        { id: "marker-highlight-title", color: C.blue, at: cue("use") },
      ]}
    />
  );
};

const TheOne: React.FC = () => {
  const cue = useCue();
  return (
    <PolaroidStatement
      big={{ id: "serif-emphasis-captions", at: 2 }}
      small={{ id: "swipe-to-quote", at: cue("rebuilding"), still: true }}
      sticker={{ text: "Today's build", at: cue("today") }}
      kicker={useWords("this", "today")}
      caps={useWords("serif", "emphasis")}
      serif={useWords("captions", "captions")}
      action={{ label: "sycamore.to/motion", at: cue("find"), pressAt: cue("motion") }}
    />
  );
};

const Parts: React.FC = () => {
  const words = useWords("a", "move");
  // put a template chip after each part's noun
  const chipAfter: Record<string, TemplateId> = {
    "headline,": "glow-headline-reveal",
    "highlight,": "marker-highlight-title",
    "caption,": "serif-emphasis-captions",
    "move.": "camera-bullet-list",
  };
  const items: FlowItem[] = words.flatMap((w) => {
    const chip = chipAfter[w.text.toLowerCase()];
    return chip ? [{ text: w.text, at: w.at }, { chip, at: w.at + 6 }] : [{ text: w.text, at: w.at }];
  });
  return <MediaSentence ink={C.white} kicker={useWords("each", "parts")} items={items} size={100} maxWidth={1780} />;
};

export const RecreateBank: React.FC = () => (
  <TranscriptProvider transcript={transcript}>
    <Track>
      <Scene from="here are three" ground="paper">
        <Three />
      </Scene>
      <Scene from="there are twelve" ground="night">
        <Twelve />
      </Scene>
      <Scene from="this is the one" ground="paper">
        <TheOne />
      </Scene>
      <Scene from="each template is" ground="sky">
        <Parts />
      </Scene>
    </Track>
  </TranscriptProvider>
);
