// Lab: every finished section of the reference clip, played in order on the clip's own frame numbers.
// Add a section here when it's built; each one also has its own composition in LabRoot.
import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { NeedBetterStyle, needBetterStyleDefaults, SECTION_TWO_LAST_FRAME } from "./NeedBetterStyle";
import { FIRST_FRAME as SECTION_THREE_FIRST, TYPING_PROMPT, TypingPrompt, typingPromptDefaults } from "./TypingPrompt";
import { FIRST_FRAME as SECTION_FOUR_FIRST, ZOOM_AND_SEND, ZoomAndSend } from "./ZoomAndSend";
import { ALL_IN_ONE_PLACE, AllInOnePlace, FIRST_FRAME as SECTION_FIVE_FIRST } from "./AllInOnePlace";
import { BAIXO_WORDMARK, BaixoWordmark, baixoWordmarkDefaults, FIRST_FRAME as SECTION_SIX_FIRST } from "./BaixoWordmark";
import { FIRST_FRAME as SECTION_SEVEN_FIRST, ICY_END_CARD, IcyEndCard, icyEndCardDefaults } from "./IcyEndCard";

// The clip's last frame, f738, is plain black.
export const FULL_VIDEO = { durationInFrames: 738, fps: 60 };

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
      <Sequence from={SECTION_FOUR_FIRST - 1} durationInFrames={ZOOM_AND_SEND.durationInFrames}>
        <Stage>
          <ZoomAndSend />
        </Stage>
      </Sequence>
      <Sequence from={SECTION_FIVE_FIRST - 1} durationInFrames={ALL_IN_ONE_PLACE.durationInFrames}>
        <Stage>
          <AllInOnePlace />
        </Stage>
      </Sequence>
      <Sequence from={SECTION_SIX_FIRST - 1} durationInFrames={BAIXO_WORDMARK.durationInFrames}>
        <Stage>
          <BaixoWordmark {...baixoWordmarkDefaults} />
        </Stage>
      </Sequence>
      <Sequence from={SECTION_SEVEN_FIRST - 1} durationInFrames={ICY_END_CARD.durationInFrames}>
        <Stage>
          <IcyEndCard {...icyEndCardDefaults} />
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

export const AllInOnePlaceSection: React.FC = () => (
  <Stage>
    <AllInOnePlace />
  </Stage>
);

export const BaixoWordmarkSection: React.FC = () => (
  <Stage>
    <BaixoWordmark {...baixoWordmarkDefaults} />
  </Stage>
);

export const IcyEndCardSection: React.FC = () => (
  <Stage>
    <IcyEndCard {...icyEndCardDefaults} />
  </Stage>
);
