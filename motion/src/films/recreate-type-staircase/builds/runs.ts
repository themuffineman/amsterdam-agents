/**
 * The steps of the Claude Code conversation in the video, as Staircase props (Staircase.tsx):
 * run 1 = the prompt as is; each later run = the previous one plus that message's change.
 */
import { staircaseDefaultProps, type StaircaseProps } from "./Staircase";

const SLIDE = { ...staircaseDefaultProps, entrance: "slide" as const };
const CLIMB = { ...SLIDE, climb: true };

export const RUNS: { label: string; ask: string; reply: string; props: StaircaseProps }[] = [
  { label: "Original", ask: "", reply: "Built the staircase from the prompt. Here's the first render.", props: staircaseDefaultProps },
  {
    label: "Slide in",
    ask: "Instead of springing up out of a blur, slide each word in from the right on a smooth ease, no bounce.",
    reply: "Each word now glides in from the right and settles without overshooting. The blur is gone.",
    props: SLIDE,
  },
  {
    label: "Climb up",
    ask: "Make the staircase climb up the screen instead of stepping down. The camera should follow it.",
    reply: "Each new row now sits above the last one, still stepped to the right, and the camera climbs with it.",
    props: CLIMB,
  },
  {
    label: "Yellow, my sentence",
    ask: "Yellow background, navy text, the small rows in a softer blue. And use my sentence: The first second decides if people stay or scroll right past your video.",
    reply: "Yellow and navy now, with the small rows in a lighter blue, and it's your sentence.",
    props: {
      ...CLIMB,
      rows: ["The first", "second", "decides if", "people stay", "or scroll", "right past", "your video."],
      colors: { background: "#ffd84a", backgroundEdge: "#f6c21c", text: "#14204a" },
      smallText: "#3d5aa8",
    },
  },
];
