import React from "react";
import { Composition, Folder } from "remotion";
import { LANDSCAPE } from "../lib/presets";
import { ALL_IN_ONE_PLACE } from "./AllInOnePlace";
import { BAIXO_WORDMARK } from "./BaixoWordmark";
import {
  AllInOnePlaceSection,
  BaixoWordmarkSection,
  FULL_VIDEO,
  FullVideo,
  IcyEndCardSection,
  TypingPromptSection,
  ZoomAndSendSection,
} from "./FullVideo";
import { GLOW_TEXT, GlowTextReveal, glowTextDefaults, glowTextSchema } from "./GlowTextReveal";
import { ICY_END_CARD } from "./IcyEndCard";
import { NEED_BETTER_STYLE, NeedBetterStyle, needBetterStyleDefaults, needBetterStyleSchema } from "./NeedBetterStyle";
import { TYPING_PROMPT } from "./TypingPrompt";
import { ZOOM_AND_SEND } from "./ZoomAndSend";

// Half size: same look, a quarter of the pixels for the filters. Use it while tuning.
const PREVIEW = { ...LANDSCAPE, width: LANDSCAPE.width / 2, height: LANDSCAPE.height / 2 };

export const LabRoot: React.FC = () => {
  return (
    <>
      <Composition id="FullVideoPreview" component={FullVideo} {...PREVIEW} {...FULL_VIDEO} />
      <Composition id="FullVideo" component={FullVideo} {...LANDSCAPE} {...FULL_VIDEO} />
      <Folder name="Sections">
        <Composition
          id="Section1-Need"
          component={GlowTextReveal}
          schema={glowTextSchema}
          defaultProps={glowTextDefaults}
          {...PREVIEW}
          {...GLOW_TEXT}
        />
        <Composition
          id="Sections1and2-NeedBetterStyle"
          component={NeedBetterStyle}
          schema={needBetterStyleSchema}
          defaultProps={needBetterStyleDefaults}
          {...PREVIEW}
          {...NEED_BETTER_STYLE}
        />
        <Composition id="Section3-TypingPrompt" component={TypingPromptSection} {...PREVIEW} {...TYPING_PROMPT} />
        <Composition id="Section4-ZoomAndSend" component={ZoomAndSendSection} {...PREVIEW} {...ZOOM_AND_SEND} />
        <Composition id="Section5-AllInOnePlace" component={AllInOnePlaceSection} {...PREVIEW} {...ALL_IN_ONE_PLACE} />
        <Composition id="Section6-BaixoWordmark" component={BaixoWordmarkSection} {...PREVIEW} {...BAIXO_WORDMARK} />
        <Composition id="Section7-IcyEndCard" component={IcyEndCardSection} {...PREVIEW} {...ICY_END_CARD} />
      </Folder>
    </>
  );
};
