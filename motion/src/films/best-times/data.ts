/**
 * Data for the best-times film. Every number and ranking below is quoted from Buffer's
 * published studies (fetched 2026-10-15). Buffer publishes rankings, not per-slot values, so
 * the grids encode ranks (best / runner-up) and the named worst windows, nothing invented.
 *
 * Instagram  https://buffer.com/resources/when-is-the-best-time-to-post-on-instagram/
 *            9.6M posts, 200k+ accounts, Jan 2024 - Dec 2025, median engagement rate
 * YouTube    https://buffer.com/resources/best-time-to-post-on-youtube/
 *            1.8M videos, median engagement (long-form rankings used)
 * LinkedIn   https://buffer.com/resources/best-time-to-post-on-linkedin/
 *            4.8M posts, reactions/comments/reposts
 * TikTok     https://buffer.com/resources/best-time-to-post-on-tiktok/
 *            7.1M posts, median engagement rate, published 2026-09-14
 *            (Metricool's 2.3M-post study also puts the peak in the evening; Sprout Social
 *            says 2-6 p.m., which is why the close says studies disagree on exact hours)
 * All times are the poster's local time (Buffer normalises them).
 */
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export interface Fact {
  /** Script mark that triggers it. */
  mark: "f1" | "f2";
  /** Chip text and the cell it sits beside. */
  chip: string;
  at: { row: number; col: number };
  /** Which side of the cell the chip sits on (chosen so it covers no ranked cell). */
  side?: "left" | "right";
  /** Cells that step dark (a named worst window). */
  lowCells?: { rows: number[]; cols: number[] };
  /** Columns highlighted as a band (a named peak window). */
  band?: { from: number; to: number };
  /** Rows dimmed (named weakest days). */
  dimRows?: number[];
  /** Framing for this fact: "wide" (whole week) or a push onto the chip. */
  shot: "wide" | "push";
}

export interface Platform {
  id: "ig" | "yt" | "li" | "tt";
  name: string;
  sample: string;
  /** Ranked best hours per day (index 0 = best), Mon..Sun. */
  ranks: number[][];
  top3: { row: number; col: number; text: string; side?: "left" | "right" }[];
  facts: Fact[];
}

const ALL = [0, 1, 2, 3, 4, 5, 6];

export const PLATFORMS: Platform[] = [
  {
    id: "ig",
    name: "Instagram",
    sample: "9.6M posts · median engagement · your local time",
    ranks: [[19, 18, 20], [19, 15, 17], [12, 18, 8], [9, 8, 7], [22, 21], [21, 22, 20], [21, 22, 20]],
    top3: [
      { row: 3, col: 9, text: "Thu 9 a.m." },
      { row: 2, col: 12, text: "Wed 12 p.m." },
      { row: 2, col: 18, text: "Wed 6 p.m." },
    ],
    facts: [
      { mark: "f1", chip: "1–5 a.m. is the worst, every day", at: { row: 6, col: 4 }, lowCells: { rows: ALL, cols: [1, 2, 3, 4] }, shot: "wide" },
      { mark: "f2", chip: "Friday and Saturday are the weakest days", at: { row: 4, col: 20 }, side: "left", dimRows: [4, 5], shot: "wide" },
    ],
  },
  {
    id: "yt",
    name: "YouTube",
    sample: "1.8M videos · long-form · your local time",
    ranks: [[9, 22, 7], [9, 11, 8], [7, 15, 17], [17, 18, 7], [12, 11, 15], [12, 10, 15], [10, 9, 12]],
    top3: [
      { row: 6, col: 10, text: "Sun 10 a.m." },
      { row: 6, col: 9, text: "Sun 9 a.m.", side: "left" },
      { row: 4, col: 12, text: "Fri 12 p.m." },
    ],
    facts: [
      { mark: "f1", chip: "Thursday 2 p.m.: one of the week's lowest", at: { row: 3, col: 14 }, side: "left", lowCells: { rows: [3], cols: [14] }, dimRows: [3], shot: "push" },
      { mark: "f2", chip: "Shorts: best 6–9 p.m.", at: { row: 1, col: 18 }, side: "left", band: { from: 18, to: 20 }, shot: "wide" },
    ],
  },
  {
    id: "li",
    name: "LinkedIn",
    sample: "4.8M posts · reactions, comments, reposts · your local time",
    ranks: [[22, 17, 21], [16, 17, 22], [16, 15, 17], [17, 19, 21], [15, 16, 17], [9, 18, 22], [22, 21, 6]],
    top3: [
      { row: 2, col: 16, text: "Wed 4 p.m." },
      { row: 4, col: 15, text: "Fri 3 p.m.", side: "left" },
      { row: 4, col: 16, text: "Fri 4 p.m." },
    ],
    facts: [
      { mark: "f1", chip: "3–8 p.m. drives the most engagement", at: { row: 2, col: 14 }, side: "left", band: { from: 15, to: 19 }, shot: "wide" },
      { mark: "f2", chip: "Monday is the weakest day", at: { row: 0, col: 12 }, side: "left", dimRows: [0], shot: "wide" },
    ],
  },
  {
    id: "tt",
    name: "TikTok",
    sample: "7.1M posts · median engagement · your local time",
    ranks: [[13, 11, 8], [6, 22, 7], [22, 6, 21], [13, 22, 6], [18, 22, 20], [17, 16, 15], [9, 13, 12]],
    top3: [
      { row: 6, col: 9, text: "Sun 9 a.m.", side: "left" },
      { row: 0, col: 13, text: "Mon 1 p.m." },
      { row: 6, col: 13, text: "Sun 1 p.m." },
    ],
    facts: [
      { mark: "f1", chip: "6–11 p.m. gets the most engagement", at: { row: 4, col: 17 }, side: "left", band: { from: 18, to: 22 }, shot: "wide" },
      { mark: "f2", chip: "Saturday is the strongest day", at: { row: 5, col: 14 }, side: "left", shot: "wide" },
    ],
  },
];

export const RECAP = [
  { mark: "ig", cells: ["Instagram", "Thu 9 a.m.", "1–5 a.m."] },
  { mark: "yt", cells: ["YouTube", "Sun 10 a.m.", "Thu 2 p.m."] },
  { mark: "li", cells: ["LinkedIn", "Wed 4 p.m.", "Mondays"] },
  { mark: "tt", cells: ["TikTok", "Sun 9 a.m.", "Wednesdays"] },
];

export const SAMPLES = [
  { mark: "ig", value: "9.6M", label: "Instagram posts" },
  { mark: "yt", value: "1.8M", label: "YouTube videos" },
  { mark: "li", value: "4.8M", label: "LinkedIn posts" },
  { mark: "tt", value: "7.1M", label: "TikTok posts" },
];

export const SOURCE = "Source: Buffer · 9.6M Instagram, 1.8M YouTube, 4.8M LinkedIn and 7.1M TikTok posts";
