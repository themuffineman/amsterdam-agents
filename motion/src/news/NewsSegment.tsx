// NewsSegment: one AI news story (src/series/news/PLAN.md), played from its edit list
// src/films/<film>/story.json: each narration sentence is one segment tied to one shot on one
// captured page (scripts/news-page.mjs). Generic: nothing here knows about a particular story.
//
// Plan (director.md worksheet, for the series rather than one film):
//   PAGE        P: a week of AI releases is too much to read / A: people following AI on
//               YouTube, landscape, sound on, 1-3 min a story / G: know what came out and see it
//               working / E: "I saw the real thing, not someone's summary".
//   Shape       UI documentary of the story's own pages (the source IS the picture). Rejected:
//               montage of output (needs the cuts a page gives for context), typographic essay
//               (a news story is about the thing, not about our words).
//   Clock       smooth 30. Grammar: crisp, no blur. Type: Inter 480 (captions only).
//   World       ground = the captured page itself, lit by the screen; black only under a
//               full-screen clip. Depth = the camera's zoom. Sound = the voice; a clip's own
//               audio when the voice pauses.
//   Accent      #E5372B red = "look here" (table outlines). Selection = the browser's blue.
//   Carrier     the cursor (screen space, kept across every cut) and, at a full-screen clip,
//               the video's own rectangle growing out of the page.
//   Seams       same page: no cut, the camera travels (softInOut, length by distance). New page:
//               hard cut, the new page enters already moving (lands on softLand in 16 f).
//   Hero frame  per story: the full-screen demo clip mid-grow, or the outlined table column.
//   Holds       no dead frames: after landing every shot drifts (bounded, +1.2% scale).
//
// Timing: a sentence lasts as long as its voice clip (`npm run voice -- <film>` reads story.json)
// plus its pause. Without voice.json the length is estimated from the word count and the
// sentence is shown as a caption, so a story can be cut and reviewed before any TTS.
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, type CalculateMetadataFunction } from "remotion";
import { enter } from "../lib/eases";
import { fontFamily } from "../lib/tokens";
import { PageShot } from "./PageShot";
import { planStory } from "./plan";
import { STORIES, timeline } from "./stories";
import type { PageData } from "./types";

export type NewsProps = { film: string; pages: Record<string, PageData>; missing?: string[] };

const entryOf = (film: string) => {
  const e = STORIES.find((s) => s.id === film);
  if (!e) throw new Error(`no story src/films/${film}/story.json`);
  return e;
};

/** Loads every page.json the story uses (captured pages live in public/, gitignored). A page
 *  that isn't captured on this machine doesn't throw here, or one story would stop every other
 *  composition from listing (review, render); the story throws when it is rendered instead. */
export const newsMetadata: CalculateMetadataFunction<NewsProps> = async ({ props }) => {
  const e = entryOf(props.film);
  const names = [...new Set(e.story.segments.map((s) => s.shot.page))];
  const pages: Record<string, PageData> = {};
  const missing: string[] = [];
  for (const n of names) {
    const r = await fetch(staticFile(`films/${props.film}/pages/${n}/page.json`));
    if (r.ok) pages[n] = (await r.json()) as PageData;
    else missing.push(n);
  }
  const t = timeline(e);
  const last = t[t.length - 1];
  return { durationInFrames: last.start + last.frames, props: { ...props, pages, missing } };
};

const Caption: React.FC<{ text: string }> = ({ text }) => {
  const f = useCurrentFrame();
  const e = enter(f, 0, { from: { y: 18, blur: 0 }, frames: 10 });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 64, display: "flex", justifyContent: "center", transform: `translateY(${e.y}px)` }}>
      <div
        style={{
          maxWidth: 1480,
          padding: "14px 26px 16px",
          background: "rgba(12,12,14,0.82)",
          color: "#fff",
          fontFamily,
          fontWeight: 480,
          fontSize: 44,
          lineHeight: 1.25,
          letterSpacing: "-0.01em",
          textAlign: "center",
          borderRadius: 10,
        }}
      >
        {text}
      </div>
    </div>
  );
};

export const NewsSegment: React.FC<NewsProps> = ({ film, pages, missing }) => {
  if (missing?.length) throw new Error(`page "${missing[0]}" not captured: npm run news-page -- <url> ${film} ${missing[0]}`);
  const e = entryOf(film);
  const times = timeline(e);
  const plans = planStory(e.story.segments, pages, times);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {e.story.segments.map((seg, i) => (
        <Sequence key={seg.id} from={times[i].start} durationInFrames={times[i].frames} name={seg.id}>
          <PageShot page={pages[seg.shot.page]} plan={plans[i]} />
          {times[i].audio ? <Audio src={staticFile(times[i].audio!)} /> : seg.text ? <Caption text={seg.text} /> : null}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
