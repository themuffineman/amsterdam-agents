/**
 * MacBookLab: the MacBook on its own, for getting the object right before it goes into films.
 * 0-60: the lid opens (ramp); then holds open with the template playing.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { tween } from "../../lib/eases";
import { TemplateClip } from "./bank";
import { SkyGround } from "./kit";
import { MacBookModel } from "./macbook";
import { ramp } from "./moves";

export const MACBOOK_LAB = { durationInFrames: 120 } as const;

export const MacBookLab: React.FC = () => {
  const frame = useCurrentFrame();
  const open = ramp(frame, 6, 40, 0).p;
  const on = tween(frame, 34, 14, 0, 1, "softInOut");
  return (
    <AbsoluteFill>
      <SkyGround />
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <MacBookModel width={1100} open={open} screenOn={on}>
          <TemplateClip id="type-staircase" trim={22} />
        </MacBookModel>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
