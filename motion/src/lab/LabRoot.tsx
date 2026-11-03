import React from "react";
import { Composition, Folder } from "remotion";
import { LANDSCAPE } from "../lib/presets";
import { GLOW_TEXT, GlowTextReveal, glowTextDefaults, glowTextSchema } from "./GlowTextReveal";
import { NEED_BETTER_STYLE, NeedBetterStyle, needBetterStyleDefaults, needBetterStyleSchema } from "./NeedBetterStyle";

// Half size: same look, a quarter of the pixels for the filters. Use it while tuning.
const PREVIEW = { ...LANDSCAPE, width: LANDSCAPE.width / 2, height: LANDSCAPE.height / 2 };

export const LabRoot: React.FC = () => {
  return (
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
    </Folder>
  );
};
