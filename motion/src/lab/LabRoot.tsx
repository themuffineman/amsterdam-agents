import React from "react";
import { Composition } from "remotion";
import { LANDSCAPE } from "../lib/presets";
import { GLOW_TEXT, GlowTextReveal, glowTextDefaults, glowTextSchema } from "./GlowTextReveal";

// Half size: same look, a quarter of the pixels for the filters. Use it while tuning.
const PREVIEW = { ...LANDSCAPE, width: LANDSCAPE.width / 2, height: LANDSCAPE.height / 2 };

export const LabRoot: React.FC = () => {
  return (
    <Composition
      id="Section1-Need"
      component={GlowTextReveal}
      schema={glowTextSchema}
      defaultProps={glowTextDefaults}
      {...PREVIEW}
      {...GLOW_TEXT}
    />
  );
};
