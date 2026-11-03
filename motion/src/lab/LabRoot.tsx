import React from "react";
import { Composition, Folder } from "remotion";
import { LANDSCAPE } from "../lib/presets";
import { FULL_VIDEO, FullVideo, TypingPromptSection, ZoomAndSendSection } from "./FullVideo";
import { GLOW_TEXT, GlowTextReveal, glowTextDefaults, glowTextSchema } from "./GlowTextReveal";
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
      </Folder>
    </>
  );
};
