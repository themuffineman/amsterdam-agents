/**
 * The real Sycamore /motion templates (sycamore.to/motion), used as the media inside every
 * frame, print and chip in this series. Previews copied from sycamore-mono
 * frontend/public/motion/previews (made by its `npm run motion:previews`) into
 * public/recreate/templates/. Names and codenames from sycamore-mono
 * templates/src/motion-library/registry.ts.
 */
export const TEMPLATES = {
  "glow-headline-reveal": { codename: "Vega", name: "Glow Headline Reveal", sec: 3.23, vertical: false },
  "marker-highlight-title": { codename: "Polaris", name: "Marker Highlight Title", sec: 3.2, vertical: false },
  "split-letter-headline": { codename: "Nova", name: "Split Letter Headline", sec: 3.23, vertical: false },
  "three-line-stack-title": { codename: "Orion", name: "Three-Line Stack Title", sec: 4.53, vertical: true },
  "swipe-to-quote": { codename: "Sirius", name: "Swipe to Quote", sec: 5.93, vertical: true },
  "follow-line-payoff": { codename: "Altair", name: "Follow the Line Payoff", sec: 4.77, vertical: false },
  "two-part-statement": { codename: "Gemini", name: "Two-Part Statement", sec: 5.13, vertical: false },
  "camera-bullet-list": { codename: "Capella", name: "Camera Bullet List", sec: 6.8, vertical: false },
  "scattered-sentence-list": { codename: "Lyra", name: "Scattered Sentence List", sec: 9.33, vertical: false },
  "type-staircase": { codename: "Rigel", name: "Type Staircase", sec: 8.0, vertical: false },
  "conveyor-captions": { codename: "Antares", name: "Conveyor Captions", sec: 7.63, vertical: true },
  "serif-emphasis-captions": { codename: "Deneb", name: "Serif Emphasis Captions", sec: 7.4, vertical: true },
} as const;

export type TemplateId = keyof typeof TEMPLATES;
