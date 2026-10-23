/**
 * Fonts for the "recreate" series (prompt -> motion graphic tutorials). All SIL OFL 1.1,
 * vendored latin woff2 from Google Fonts (public/fonts/), loaded like lib/fonts.ts:
 * - Archivo, variable weight AND width: the condensed bold caps (font-stretch ~68-75%).
 * - Instrument Serif, regular + italic: the serif half of every mixed line.
 * - JetBrains Mono: ticket labels, prompt text, small print.
 * Body text stays Inter (lib/fonts.ts).
 */
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";

export const SANS = "Archivo";
export const SERIF = "Instrument Serif";
export const MONO = "JetBrains Mono";

const FACES: [string, string, FontFaceDescriptors][] = [
  [SANS, "fonts/Archivo-Variable-latin.woff2", { weight: "100 900", stretch: "62% 125%" }],
  [SERIF, "fonts/InstrumentSerif-Regular-latin.woff2", { style: "normal" }],
  [SERIF, "fonts/InstrumentSerif-Italic-latin.woff2", { style: "italic" }],
  [MONO, "fonts/JetBrainsMono-Variable-latin.woff2", { weight: "100 800" }],
];

let started = false;

export const loadSeriesFonts = () => {
  if (started || typeof document === "undefined") return;
  started = true;
  const handle = delayRender("Loading recreate series fonts");
  Promise.all(
    FACES.map(([family, file, desc]) =>
      new FontFace(family, `url(${staticFile(file)}) format("woff2")`, desc).load().then((f) => document.fonts.add(f)),
    ),
  )
    .then(() => continueRender(handle))
    .catch((err) => cancelRender(err));
};

loadSeriesFonts();
