/**
 * Fonts for the "recreate" series (prompt -> motion graphic tutorials), loaded like lib/fonts.ts:
 * - Archivo, variable weight AND width (SIL OFL): the condensed bold caps (font-stretch ~72%).
 * - Feature Display, regular + italic (Commercial Type, TRIAL): every serif line. Not in this
 *   public repo: it lives in public/fonts/local/ (gitignored) and in the GCS bucket
 *   (`npm run fonts -- upload | download`); the cloud film runner downloads it before every
 *   film and fails if it can't. On a fresh local clone without it, renders fall back to
 *   Instrument Serif with a warning: run `npm run fonts -- download` first.
 * - Instrument Serif, regular + italic (SIL OFL): the serif fallback.
 * - Alte Haas Grotesk (freeware, licence file alongside): long display sentences.
 * - JetBrains Mono (SIL OFL): ticket labels, small print.
 * Body text stays Inter (lib/fonts.ts).
 */
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";

export const SANS = "Archivo";
export const SERIF = "Feature Display";
export const SERIF_FALLBACK = "Instrument Serif";
export const GROTESK = "Alte Haas Grotesk";
export const MONO = "JetBrains Mono";

type Face = [family: string, file: string, desc: FontFaceDescriptors];

const REQUIRED: Face[] = [
  [SANS, "fonts/Archivo-Variable-latin.woff2", { weight: "100 900", stretch: "62% 125%" }],
  [SERIF_FALLBACK, "fonts/InstrumentSerif-Regular-latin.woff2", { style: "normal" }],
  [SERIF_FALLBACK, "fonts/InstrumentSerif-Italic-latin.woff2", { style: "italic" }],
  [GROTESK, "fonts/AlteHaasGroteskRegular.ttf", { weight: "400" }],
  [GROTESK, "fonts/AlteHaasGroteskBold.ttf", { weight: "700" }],
  [MONO, "fonts/JetBrainsMono-Variable-latin.woff2", { weight: "100 800" }],
];

const OPTIONAL: Face[] = [
  [SERIF, "fonts/local/FeatureDisplay-Regular-Trial.otf", { style: "normal" }],
  [SERIF, "fonts/local/FeatureDisplay-RegularItalic-Trial.otf", { style: "italic" }],
];

const load = ([family, file, desc]: Face) => new FontFace(family, `url(${staticFile(file)})`, desc).load().then((f) => document.fonts.add(f));

let started = false;

export const loadSeriesFonts = () => {
  if (started || typeof document === "undefined") return;
  started = true;
  const handle = delayRender("Loading recreate series fonts");
  const optional = Promise.all(OPTIONAL.map(load)).catch(() => {
    console.warn(`[recreate] ${SERIF} not found in public/fonts/local/: serif lines fall back to ${SERIF_FALLBACK}.`);
  });
  Promise.all([...REQUIRED.map(load), optional])
    .then(() => continueRender(handle))
    .catch((err) => cancelRender(err));
};

loadSeriesFonts();
