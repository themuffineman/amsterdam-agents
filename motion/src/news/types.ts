// Types for the AI news series (src/series/news/PLAN.md).
//
// PageData is what scripts/news-page.mjs writes to public/films/<film>/pages/<name>/page.json.
// Every box is in the page's CSS px (the capture is 1280 CSS px wide at `scale` 1.5, so the
// page is exactly 1920 film px wide at zoom 1). Story is src/films/<film>/story.json: the
// narration, one segment per sentence, each tied to one shot on one captured page.

export type Box = { x: number; y: number; w: number; h: number };
export type Marked = { text: string; rects: Box[]; table?: Box };

export interface PageData {
  url: string;
  title: string;
  width: number;
  viewportHeight: number;
  height: number;
  scale: number;
  page: string; // public-relative path of page.png
  bar: { file: string; h: number } | null;
  headings: (Box & { tag: string; text: string })[];
  highlights: Marked[];
  columns: Marked[];
  rows: Marked[];
  videos: (Box & { src: string; poster: string; file: string })[];
  images: (Box & { src: string; alt: string })[];
}

/** Where a scroll lands: a heading's (or highlight's) text, or a page y in CSS px. */
export type Target = string | number;

export type Shot =
  /** Pan the page to a heading (reading scroll, the length of the sentence). */
  | { type: "scroll"; page: string; to?: Target; from?: Target; zoom?: number }
  /** Zoom to a captured --highlight and sweep the blue selection over it. `at`: seconds into the segment. */
  | { type: "highlight"; page: string; highlight: string; at?: number }
  /** Frame the table and outline a captured --column / --row. */
  | { type: "column"; page: string; column: string; at?: number }
  | { type: "row"; page: string; row: string; at?: number }
  /** Play the page's video n (1-based, page.json order) in place, or growing to full screen. */
  | { type: "clip"; page: string; video: number; full?: boolean; from?: number; sound?: boolean };

export interface Segment {
  id: string;
  /** The narration sentence. Empty = the voice pauses and the shot (a clip) plays alone. */
  text: string;
  shot: Shot;
  /** Length when there is no voice clip (a voiceless clip), or a minimum. */
  seconds?: number;
  /** Silence after the sentence (s), default 0.35. */
  pause?: number;
}

export interface Story {
  film: string;
  title: string;
  /** Every page the story shows, and anything else the narration relies on. */
  sources: string[];
  voice?: string;
  model?: string;
  prompt?: string;
  segments: Segment[];
}

/** src/films/<film>/voice.json as `npm run voice` writes it. */
export interface Voice {
  segments: Record<string, { file: string; durationSec: number }>;
}
