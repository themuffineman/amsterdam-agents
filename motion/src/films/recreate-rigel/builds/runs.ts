/**
 * The steps of the Claude Code conversation in the video, as Rigel props (Run1.tsx):
 * run 1 = the prompt as is; each later run = the previous one plus that message's change.
 */
import { rigelDefaultProps, type RigelProps } from "./Run1";

const DARK = { background: "#16120f", backgroundEdge: "#070605", text: "#f4efe8" };

export const RUNS: { label: string; ask: string; reply: string; props: RigelProps }[] = [
  { label: "Original", ask: "", reply: "Built Rigel from the prompt. Here's the first render.", props: rigelDefaultProps },
  {
    label: "Dark, orange",
    ask: "Make the background dark and the big words orange.",
    reply: "Dark background now, and the big rows are orange.",
    props: { ...rigelDefaultProps, colors: DARK, accent: "#ff7a2e" },
  },
  {
    label: "Drop in",
    ask: "Instead of rising out of a blur, drop each word in from above with a bouncy spring.",
    reply: "Words now fall in from above and tip into place on a looser spring. No blur.",
    props: { ...rigelDefaultProps, colors: DARK, accent: "#ff7a2e", entrance: "drop" },
  },
  {
    label: "Tilt, my sentence",
    ask: "Tilt the camera a little into each new row, and use my sentence: Good captions keep people watching longer than you think.",
    reply: "The camera rolls a few degrees into each row, and it's your sentence now.",
    props: {
      rows: ["Good captions", "keep people", "watching", "longer than", "you think."],
      colors: DARK,
      accent: "#ff7a2e",
      entrance: "drop",
      tilt: 4,
    },
  },
];
