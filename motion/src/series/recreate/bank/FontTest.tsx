/**
 * RecreateFontTest: font experiment on the MediaSentence (Butter) beat only.
 * Props pick the sentence font (`sans`) and the kicker font (`serif`) by name from SANS / SERIF.
 * The kicker's last two words ("small parts.") are set in the serif's italic.
 *
 * Every font except Archivo / Instrument Serif / Alte Haas Grotesk is a trial, demo or
 * proprietary file kept LOCALLY in public/fonts/experiment/ and gitignored (this repo is
 * public). Fonts load inside the component when it renders, never at bundle time, so a clone
 * without them only breaks this composition.
 */
import React, { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import { MediaSentence, type FlowItem } from "../bank";
import type { TemplateId } from "../templates";
import { Scene, TranscriptProvider, Track, lengthOf, useWords } from "../timing";
import { C, F } from "../tokens";
import transcript from "./transcript.json";

export const FONT_TEST = { durationInFrames: lengthOf(transcript) } as const;

type Face = [file: string, desc?: FontFaceDescriptors];
type FontSpec = { css: React.CSSProperties; faces?: Face[] };

const fam = (name: string, extra: React.CSSProperties = {}): React.CSSProperties => ({ fontFamily: `"${name}"`, fontWeight: 400, ...extra });

/** Sentence fonts. */
export const SANS: Record<string, FontSpec> = {
  archivo: { css: F.grotesk },
  alteHaas: { css: fam("Alte Haas Grotesk", { letterSpacing: "-0.03em" }), faces: [["AlteHaasGroteskRegular.ttf"]] },
  aeonik: { css: fam("Aeonik", { letterSpacing: "-0.03em" }), faces: [["AeonikTRIAL-Regular.otf"]] },
  mluvka: { css: fam("Mluvka", { letterSpacing: "-0.03em" }), faces: [["Mluvka-Regular-BF65518ac8463f5.otf"]] },
  productSans: { css: fam("Product Sans", { letterSpacing: "-0.03em" }), faces: [["ProductSansInfanity.ttf"]] },
  sfPro: { css: fam("SF Pro Display", { letterSpacing: "-0.03em" }), faces: [["SFPRODISPLAYREGULAR.OTF"]] },
  violet: { css: fam("Violet Sans", { letterSpacing: "-0.03em" }), faces: [["VioletSans-Regular.otf"]] },
  megion: { css: fam("Megion", { letterSpacing: "-0.02em" }), faces: [["MegionDemo-Bold-BF6a3e22559c1df.otf"]] },
  vasted: { css: fam("Vasted", { letterSpacing: "-0.01em" }), faces: [["Vasted.otf"]] },
  wemberly: { css: fam("Wemberly", { letterSpacing: "-0.02em" }), faces: [["WemberlyRegular-OG66A-BF6a5b632bba4c9.ttf"]] },
};

/** Kicker fonts (need an italic for "small parts."; ones without get the browser's slant). */
export const SERIF: Record<string, FontSpec> = {
  instrument: { css: F.serif },
  featureDisplay: {
    css: fam("Feature Display", { letterSpacing: "-0.01em" }),
    faces: [["FeatureDisplay-Regular-Trial.otf"], ["FeatureDisplay-RegularItalic-Trial.otf", { style: "italic" }]],
  },
  modern20: { css: fam("Modern No 20"), faces: [["MOD20.TTF"]] },
  recoleta: { css: fam("Recoleta", { letterSpacing: "-0.01em" }), faces: [["Recoleta-RegularDEMO.otf"]] },
  appleGaramond: { css: fam("Apple Garamond", { letterSpacing: "-0.01em" }), faces: [["AppleGaramond.ttf"], ["AppleGaramond-Italic.ttf", { style: "italic" }]] },
};

/** Loads one spec's faces when this composition renders (never at bundle time). */
const useSpecFonts = (specs: FontSpec[]) => {
  const [handle] = useState(() => delayRender("Loading experiment fonts"));
  useEffect(() => {
    const loads = specs.flatMap((s) =>
      (s.faces ?? []).map(([file, desc]) => {
        const family = String(s.css.fontFamily).replace(/"/g, "");
        return new FontFace(family, `url(${staticFile(`fonts/experiment/${file}`)})`, desc).load().then((f) => document.fonts.add(f));
      }),
    );
    Promise.all(loads)
      .then(() => continueRender(handle))
      .catch((err) => cancelRender(err));
  }, [handle, specs]);
};

const CHIP_AFTER: Record<string, TemplateId> = {
  "headline,": "glow-headline-reveal",
  "highlight,": "marker-highlight-title",
  "caption,": "serif-emphasis-captions",
  "move.": "camera-bullet-list",
};

const Parts: React.FC<{ sans: FontSpec; serif: FontSpec }> = ({ sans, serif }) => {
  const words = useWords("a", "move");
  const kicker = useWords("each", "parts");
  const items: FlowItem[] = words.flatMap((w) => {
    const chip = CHIP_AFTER[w.text.toLowerCase()];
    return chip ? [{ text: w.text, at: w.at }, { chip, at: w.at + 6 }] : [{ text: w.text, at: w.at }];
  });
  const kickerSpecs = kicker.map((w, i) => ({ ...w, style: i >= kicker.length - 2 ? { fontStyle: "italic" as const } : undefined }));
  return <MediaSentence ink={C.white} kicker={kickerSpecs} items={items} size={96} maxWidth={1760} wordFont={{ ...sans.css, lineHeight: 1.0 }} kickerFont={serif.css} />;
};

export const RecreateFontTest: React.FC<{ sans: string; serif: string }> = ({ sans, serif }) => {
  const s = SANS[sans];
  const k = SERIF[serif];
  if (!s || !k) throw new Error(`unknown font: sans=${sans} serif=${serif}`);
  const [specs] = useState(() => [s, k]);
  useSpecFonts(specs);
  return (
    <TranscriptProvider transcript={transcript}>
      <Track>
        <Scene from="each template is" ground="sky">
          <Parts sans={s} serif={k} />
        </Scene>
      </Track>
    </TranscriptProvider>
  );
};
