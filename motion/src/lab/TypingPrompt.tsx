// Lab: section 3 of the reference clip (60 fps, 1280x720): the prompt typing into a pill. Not a film.
// The tables are measured from the clip's frames, so they replace eases on purpose. They are keyed by the
// clip's frame number (this section runs f196-f322), positions in its 720p pixels, multiplied by K for 1920x1080.
//
// Plan as events:
// - f196-f207: the pill slides in from the right, smeared sideways with colour fringes, already typing.
//   The cursor flies in from above and rotates as it comes.
// - f197-f280: the text types out unevenly, in small bursts with pauses. Typing past "clothes" wraps to a second
//   line, which makes the pill grow taller from f233 to f260.
// - f207-f300: the pill keeps drifting left, slowing, then speeds up again. The cursor settles at the pill's lower
//   edge, still turning.
// - f300-f322: the pill accelerates left, the background tints blue, the text blurs, the cursor shrinks away.
// - Screenshot frame: f280, the sentence just finished, the cursor resting on the pill's edge.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { z } from "zod";
import { FONT_FAMILY } from "../lib/fonts";

const K = 1.5;
export const FIRST_FRAME = 196;
export const LAST_FRAME = 322;
export const TYPING_PROMPT = { durationInFrames: LAST_FRAME - FIRST_FRAME + 1, fps: 60 };

export const typingPromptSchema = z.object({
  prompt: z.string(),
  firstLineLength: z.number().int().min(1).max(60),
});
export type TypingPromptProps = z.infer<typeof typingPromptSchema>;
export const typingPromptDefaults: TypingPromptProps = {
  prompt: "Find me clothes similar to this tee",
  firstLineLength: 15,
};

type Row = readonly number[];
const clamped = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const at = (f: number, rows: readonly Row[], column = 1) =>
  interpolate(f, rows.map((r) => r[0]), rows.map((r) => r[column]), clamped);

// The frame each character of the prompt first shows.
const TYPED_AT = [
  197, 200, 203, 205, 207, 210, 213, 216, 219, 221, 223, 225, 229, 231, 233, 235, 236, 238, 240, 242, 246, 248, 250, 254, 256, 258,
  260, 262, 266, 268, 270, 273, 276, 278, 280,
];

const PILL_LEFT = [
  [196, 991], [197, 906], [198, 868], [199, 842], [200, 821], [201, 805], [202, 789], [203, 775], [204, 763], [205, 751], [206, 740],
  [207, 730], [208, 721], [209, 712], [210, 704], [211, 696], [212, 689], [213, 682], [214, 676], [215, 669], [216, 664], [217, 658],
  [218, 653], [219, 648], [220, 643], [221, 638], [222, 634], [223, 630], [224, 626], [225, 622], [226, 618], [227, 615], [228, 611],
  [229, 608], [230, 605], [231, 602], [232, 600], [233, 597], [234, 594], [235, 592], [236, 589], [238, 585], [240, 581], [244, 573],
  [248, 566], [252, 561], [256, 556], [260, 551], [264, 547], [268, 544], [272, 540], [276, 537], [280, 533], [284, 530], [288, 526],
  [292, 522], [296, 516], [300, 510], [304, 501], [308, 490], [312, 476], [314, 466], [316, 454], [318, 439], [319, 430], [320, 419],
  [321, 404], [322, 376],
] as const;
// The pill is centred on y=360, so its top gives its height.
const PILL_TOP = [
  [207, 281], [210, 280], [215, 278], [220, 276], [224, 273], [228, 268], [232, 262], [236, 254], [240, 246], [244, 241], [248, 237],
  [252, 235], [256, 233], [260, 232], [268, 231], [276, 230],
] as const;
const ONE_LINE_TOP = 281;
const TWO_LINE_TOP = 230;
const BORDER = 18;
const RADIUS = 62;
const PLUS_FROM_LEFT = 63;
const TEXT_FROM_LEFT = 106;
const FONT_SIZE = 51;
const LINE_GAP = 65;

const BACKGROUND = [
  [313, 243, 244, 249], [314, 243, 243, 251], [315, 240, 243, 250], [316, 237, 242, 250], [317, 232, 240, 249], [318, 226, 237, 250],
  [319, 221, 236, 250], [320, 215, 233, 250], [321, 212, 231, 250], [322, 209, 230, 249],
] as const;

const BLUR_X = [[196, 10], [199, 6.5], [201, 4], [203, 2.6], [205, 1.3], [207, 0.6], [210, 0], [310, 0], [314, 0.5], [316, 0.8], [318, 1.3], [320, 1.9], [322, 3.6]] as const;
const BLUR_Y = [[196, 3], [199, 2], [201, 1.2], [203, 0.8], [205, 0.5], [207, 0.2], [210, 0], [310, 0], [316, 0.5], [318, 0.9], [320, 1.2], [322, 1.6]] as const;
const SPLIT = [[196, 5.5], [199, 5], [201, 3.5], [203, 2.2], [205, 0.8], [207, 0]] as const;
const TEXT_OPACITY = [[312, 1], [318, 0.92], [322, 0.8]] as const;

// Cursor: [frame, centre x, centre y, direction it points in degrees (0 = right, 270 = up), scale, blur].
const CURSOR = [
  [196, 641, 273, 95, 0.55, 4], [197, 661, 348, 110, 0.65, 2.5], [198, 679, 379, 136, 0.75, 2], [199, 693, 398, 151, 0.82, 1.5],
  [200, 705, 411, 161, 0.88, 1.2], [201, 715, 421, 172, 0.92, 1], [202, 724, 429, 184, 0.95, 0.8], [203, 732, 435, 192, 0.97, 0.6],
  [205, 746, 445, 201, 1, 0.4], [207, 758, 452, 212, 1, 0.2], [210, 772, 460, 223, 1, 0], [213, 784, 465, 234, 1, 0], [216, 794, 469, 241, 1, 0],
  [222, 810, 473, 256, 1, 0], [228, 823, 476, 264, 1, 0], [234, 833, 479, 272, 1, 0], [243, 845, 480, 280, 0.95, 0], [255, 855, 481, 287, 0.88, 0],
  [270, 864, 481, 293, 0.82, 0], [284, 867, 481, 296, 0.8, 0], [296, 862, 481, 298, 0.78, 0], [304, 849, 482, 300, 0.74, 0],
  [310, 834, 482, 300, 0.62, 0], [316, 804, 484, 300, 0.48, 0.3], [320, 766, 485, 300, 0.36, 0.6], [322, 726, 486, 300, 0.3, 1],
] as const;

const CURSOR_SIZE = 1.7;

const Cursor: React.FC<{ f: number }> = ({ f }) => {
  const x = at(f, CURSOR, 1) * K;
  const y = at(f, CURSOR, 2) * K;
  const direction = at(f, CURSOR, 3);
  const scale = at(f, CURSOR, 4);
  const blur = at(f, CURSOR, 5) * K;
  return (
    <svg
      width={120}
      height={120}
      viewBox="-60 -60 120 120"
      style={{
        position: "absolute",
        left: x - 60,
        top: y - 60,
        overflow: "visible",
        filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
      }}
    >
      {/* The arrow's tip points up before rotating; 270 degrees is up. */}
      <path transform={`rotate(${direction - 270}) scale(${scale * K * CURSOR_SIZE})`} d="M 0 -22 L 15 16 L 3 9 L 3 20 L -3 20 L -3 9 L -15 16 Z" fill="#000" />
    </svg>
  );
};

export const TypingPrompt: React.FC<TypingPromptProps> = ({ prompt, firstLineLength }) => {
  const f = useCurrentFrame() + FIRST_FRAME;
  const left = at(f, PILL_LEFT);
  const top = at(f, PILL_TOP);
  const height = 720 - top * 2;
  const grown = (ONE_LINE_TOP - top) / (ONE_LINE_TOP - TWO_LINE_TOP);

  const shown = TYPED_AT.filter((frame) => frame <= f).length;
  const typed = prompt.slice(0, shown);
  const lineOne = typed.slice(0, firstLineLength);
  const lineTwo = typed.slice(firstLineLength + 1);

  const blurX = at(f, BLUR_X) * K;
  const blurY = at(f, BLUR_Y) * K;
  const split = at(f, SPLIT) * K;
  const useFilter = blurX > 0.05 || blurY > 0.05 || split > 0.05;
  const background = `rgb(${at(f, BACKGROUND, 1)}, ${at(f, BACKGROUND, 2)}, ${at(f, BACKGROUND, 3)})`;

  const textStyle: React.CSSProperties = {
    position: "absolute",
    left: (left + TEXT_FROM_LEFT) * K,
    transform: "translateY(-50%)",
    fontFamily: FONT_FAMILY,
    fontWeight: 450,
    fontSize: FONT_SIZE * K,
    lineHeight: 1,
    letterSpacing: FONT_SIZE * K * -0.016,
    whiteSpace: "pre",
    color: "#050505",
    opacity: at(f, TEXT_OPACITY),
  };

  return (
    <AbsoluteFill style={{ background, overflow: "hidden" }}>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id="pill-whip" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation={`${blurX} ${blurY}`} result="soft" />
          {/* Flatten onto the background first: splitting see-through edges turns them dark. */}
          <feFlood floodColor={background} result="backdrop" />
          <feComposite in="soft" in2="backdrop" operator="over" result="flat" />
          <feColorMatrix in="flat" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r0" />
          <feColorMatrix in="flat" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
          <feColorMatrix in="flat" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b0" />
          <feOffset in="r0" dx={split} result="r" />
          <feOffset in="b0" dx={-split} result="b" />
          <feBlend in="r" in2="g" mode="screen" result="rg" />
          <feBlend in="rg" in2="b" mode="screen" />
        </filter>
      </svg>
      <AbsoluteFill style={{ filter: useFilter ? "url(#pill-whip)" : undefined }}>
        <div
          style={{
            position: "absolute",
            left: left * K,
            top: top * K,
            width: 2400,
            height: height * K,
            boxSizing: "border-box",
            borderRadius: Math.min(RADIUS, height / 2) * K,
            border: `${BORDER * K}px solid #e3e2df`,
            background: "#f3f3f3",
          }}
        />
        {/* The plus is drawn, so it stays centred on the pill whatever the font does. */}
        <div style={{ position: "absolute", left: (left + PLUS_FROM_LEFT) * K - 15 * K, top: 360 * K - 2.5 * K, width: 30 * K, height: 5 * K, background: "#050505" }} />
        <div style={{ position: "absolute", left: (left + PLUS_FROM_LEFT) * K - 2.5 * K, top: 360 * K - 15 * K, width: 5 * K, height: 30 * K, background: "#050505" }} />
        <div style={{ ...textStyle, top: (360 - (grown * LINE_GAP) / 2) * K }}>{lineOne}</div>
        <div style={{ ...textStyle, top: (360 + LINE_GAP / 2) * K }}>{lineTwo}</div>
      </AbsoluteFill>
      <Cursor f={f} />
    </AbsoluteFill>
  );
};
