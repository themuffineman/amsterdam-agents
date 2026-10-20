/**
 * Data for the three-acts film ("Storytelling for creators: the 3-act structure"). Every word,
 * number and label on screen comes from this file, and each one from a page opened on
 * 2026-10-20. Nothing here is a value a source didn't publish.
 *
 * Aristotle  Poetics, ch. VII, tr. S. H. Butcher (Project Gutenberg #1974)
 *            http://www.gutenberg.org/cache/epub/1974/pg1974.txt
 *            "A whole is that which has a beginning, a middle, and an end."
 *            (ch. XVIII: "Every tragedy falls into two parts,--Complication and Unravelling")
 * Syd Field  "Utilizing Syd Field's Screenwriting Paradigm...", Natalia Lazarus, sydfield.com,
 *            2019-06-05  https://sydfield.com/?p=1769
 *            "Act One: story set up; Act Two: confrontation; Act Three: resolution."
 *            Act One "runs about thirty pages"; Act Two "approximately sixty pages long";
 *            Plot Point Two "on or around page ninety" (of a 120-page script).
 *            Cross-check: CUNY course gloss of Field (Jim Soto), acts 1-30 / 30-90 / 90-120:
 *            https://mes153stevenson.commons.gc.cuny.edu/files/2018/08/Three-Act-Structure.Jim-Soto-glosses-SYD_FIELD.pdf
 *            (search-result summary only; the sydfield.com page is the one quoted.)
 * Paul Zak   "Why Inspiring Stories Make Us React: The Neuroscience of Narrative", Cerebrum
 *            (Dana Foundation), 2015-02-02  https://pmc.ncbi.nlm.nih.gov/articles/PMC4445577
 *            ~100-second video of a father and his 2-year-old son Ben, who has terminal brain
 *            cancer. Dramatic-arc version: cortisol and oxytocin rose. Flat version (same two
 *            at the zoo): no rise in either, no reported empathy. Attention rose and fell,
 *            peaking at the climax. A model built on physiological responses predicted who
 *            donated to a childhood-cancer charity with 82 percent accuracy. Sample sizes are
 *            not given in the article, so the film doesn't state one.
 * TikTok     "Creative best practices for performance ads", TikTok Ads Manager help, last
 *            updated June 2025  https://ads.tiktok.com/help/article/creative-best-practices
 *            "Introduce your content proposition in the first 3 seconds..."
 *            "Prioritize your hook in the first 6 seconds..." (ad guidance; the voice says so)
 * YouTube    "Measure key moments for audience retention", YouTube Help
 *            https://support.google.com/youtube/answer/9314415
 *            "Intro tells you what percentage of your audience still watched your video after
 *            the first 30 seconds." "Dips highlight moments in your video that were either
 *            skipped or moments where viewers stopped watching."
 *
 * The 15 seconds is arithmetic, not a source: Field's ~30 of 120 pages is a quarter, and a
 * quarter of 60 seconds is 15. The advice in the turns beat (raise a problem, make it harder,
 * one more turn) is the film's own reading of Zak's "rose and fell", said as advice.
 */

export const QUOTE = {
  words: ["A", "whole", "is", "that", "which", "has", "a", "beginning,", "a", "middle,", "and", "an", "end."],
  by: "Aristotle, Poetics, ch. VII",
};

/** Field's paradigm on a 120-page script. */
export const PAGES = 120;
export const FIELD = [
  { mark: "s", name: "Setup", from: 0, to: 30, label: "about 30 pages" },
  { mark: "c", name: "Confrontation", from: 30, to: 90, label: "about 60 pages" },
  { mark: "r", name: "Resolution", from: 90, to: 120, label: "the rest" },
] as const;

/** Zak's two versions of the same footage. */
export const ZAK = {
  film: "Father and son, about 100 seconds",
  rows: [
    { mark: "up", name: "Dramatic arc", result: "cortisol and oxytocin rose" },
    { mark: "flat", name: "Flat: same two at the zoo", result: "neither rose" },
  ],
  accuracy: 82,
  accuracyLine: "accuracy, predicting who would donate",
  by: "Paul Zak, Cerebrum, 2015",
};

/** The 60-second timeline. Seconds. */
export const VIDEO = 60;
export const SCALED = { setupEnd: 15 }; // a quarter of 60 (Field's proportion, see header)
export const MARKERS = [
  { mark: "t3", at: 3, label: "Your point by 3 s", by: "TikTok ad guide", level: 0 },
  { mark: "t6", at: 6, label: "Hook by 6 s", by: "TikTok ad guide", level: 1 },
  { mark: "y30", at: 30, label: "Intro: still watching at 30 s", by: "YouTube Help", level: 0 },
] as const;
/** After the squeeze: act one ends at the 3-second marker (the film's advice, from TikTok's line). */
export const SQUEEZED = { setupEnd: 3 };

export const TURNS = [
  { mark: "a", text: "Raise one problem", at: 10, level: 0 },
  { mark: "b", text: "Make it harder", at: 22, level: 1 },
  { mark: "c", text: "One more turn", at: 34, level: 0 },
] as const;
export const ANSWER = { text: "Answer it, then stop", at: 47, level: 1 } as const;
