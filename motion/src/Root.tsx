// Lists every composition. Use the LANDSCAPE / PORTRAIT presets from lib/presets
// so all films share the 30 fps clock the motion-craft timings assume.
import React from "react";
import "./lib/fonts"; // starts the font load before any frame renders
import "./series/recreate/fonts";
import { Composition } from "remotion";
import { LANDSCAPE } from "./lib/presets";
import { PROOF_WORDS_WHOLE, ProofWordsWhole } from "./compositions/ProofWordsWhole";
import { INSTAGRAM_BEST_TIMES, InstagramBestTimes } from "./compositions/InstagramBestTimes";
import { BEST_TIMES, BestTimes } from "./compositions/BestTimes";
import { CONSISTENCY, Consistency } from "./compositions/Consistency";
import { RECREATE_LOOK, RecreateLook } from "./series/recreate/LookBook";
import { REEL, RecreateReel } from "./series/recreate/reel/Reel";
import { BANK_DEMO, RecreateBank } from "./series/recreate/bank/Demo";
import { FONT_TEST, RecreateFontTest } from "./series/recreate/bank/FontTest";
import { RECREATE_RIGEL, RecreateRigel } from "./compositions/RecreateRigel";
import { MACBOOK_LAB, MacBookLab } from "./series/recreate/MacBookLab";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ProofWordsWhole"
        component={ProofWordsWhole}
        durationInFrames={PROOF_WORDS_WHOLE.durationInFrames}
        {...LANDSCAPE}
      />
      <Composition
        id="InstagramBestTimes"
        component={InstagramBestTimes}
        durationInFrames={INSTAGRAM_BEST_TIMES.durationInFrames}
        {...LANDSCAPE}
      />
      <Composition
        id="BestTimes"
        component={BestTimes}
        durationInFrames={BEST_TIMES.durationInFrames}
        {...LANDSCAPE}
      />
      <Composition
        id="Consistency"
        component={Consistency}
        durationInFrames={CONSISTENCY.durationInFrames}
        {...LANDSCAPE}
      />
      <Composition
        id="RecreateLook"
        component={RecreateLook}
        durationInFrames={RECREATE_LOOK.durationInFrames}
        {...LANDSCAPE}
      />
      <Composition
        id="RecreateReel"
        component={RecreateReel}
        durationInFrames={REEL.durationInFrames}
        {...LANDSCAPE}
      />
      <Composition
        id="RecreateBank"
        component={RecreateBank}
        durationInFrames={BANK_DEMO.durationInFrames}
        {...LANDSCAPE}
      />
      <Composition
        id="MacBookLab"
        component={MacBookLab}
        durationInFrames={MACBOOK_LAB.durationInFrames}
        {...LANDSCAPE}
      />
      <Composition
        id="RecreateRigel"
        component={RecreateRigel}
        durationInFrames={RECREATE_RIGEL.durationInFrames}
        {...LANDSCAPE}
      />
      <Composition
        id="RecreateFontTest"
        component={RecreateFontTest}
        durationInFrames={FONT_TEST.durationInFrames}
        defaultProps={{ sans: "alteHaas", serif: "featureDisplay" }}
        {...LANDSCAPE}
      />
    </>
  );
};
