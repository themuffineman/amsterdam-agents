// Lists every composition. Use the LANDSCAPE / PORTRAIT presets from lib/presets
// so all films share the 30 fps clock the motion-craft timings assume.
import React from "react";
import "./lib/fonts"; // starts the font load before any frame renders
import { Composition } from "remotion";
import { LANDSCAPE } from "./lib/presets";
import { PROOF_WORDS_WHOLE, ProofWordsWhole } from "./compositions/ProofWordsWhole";
import { INSTAGRAM_BEST_TIMES, InstagramBestTimes } from "./compositions/InstagramBestTimes";
import { BEST_TIMES, BestTimes } from "./compositions/BestTimes";
import { CONSISTENCY, Consistency } from "./compositions/Consistency";

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
    </>
  );
};
