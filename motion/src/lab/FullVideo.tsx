// Lab: every finished section of the reference clip, played in order on the clip's own frame numbers.
// Add a section here when it's built; each one also has its own composition in LabRoot.
import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { NeedBetterStyle, needBetterStyleDefaults, SECTION_TWO_LAST_FRAME } from "./NeedBetterStyle";
import { FIRST_FRAME as SECTION_THREE_FIRST, TYPING_PROMPT, TypingPrompt, typingPromptDefaults } from "./TypingPrompt";
import { FIRST_FRAME as SECTION_FOUR_FIRST, LAST_FRAME as SECTION_FOUR_LAST, ZoomAndSend } from "./ZoomAndSend";

export const FULL_VIDEO = { durationInFrames: SECTION_FOUR_LAST, fps: 60 };

// The sections are laid out at 1920x1080; this fits them to the composition's size.
export const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { width } = useVideoConfig();
  return (
    <div style={{ position: "absolute", width: 1920, height: 1080, transformOrigin: "0 0", transform: `scale(${width / 1920})` }}>
      {children}
    </div>
  );
};

export const FullVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Sequence durationInFrames={SECTION_TWO_LAST_FRAME}>
        <NeedBetterStyle {...needBetterStyleDefaults} />
      </Sequence>
      <Sequence from={SECTION_THREE_FIRST - 1} durationInFrames={TYPING_PROMPT.durationInFrames}>
        <Stage>
          <TypingPrompt {...typingPromptDefaults} />
        </Stage>
      </Sequence>
      <Sequence from={SECTION_FOUR_FIRST - 1}>
        <Stage>
          <ZoomAndSend />
        </Stage>
      </Sequence>
    </AbsoluteFill>
  );
};

export const TypingPromptSection: React.FC = () => (
  <Stage>
    <TypingPrompt {...typingPromptDefaults} />
  </Stage>
);

export const ZoomAndSendSection: React.FC = () => (
  <Stage>
    <ZoomAndSend />
  </Stage>
);
