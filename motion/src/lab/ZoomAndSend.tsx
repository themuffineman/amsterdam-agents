// Lab: section 4 of the reference clip (60 fps, 1280x720): the push in on the pill and the click. Not a film.
// The tables are measured from the clip's frames, so they replace eases on purpose. They are keyed by the
// clip's frame number (this section runs f323-f391), positions in its 720p pixels, multiplied by K for 1920x1080.
//
// Plan as events:
// - f323: hard cut to a much closer view of the pill's empty right end. It's moving fast and blurred. The blue
//   background of the last section fades back to the light one by f332.
// - f323-f345: the send button starts as a flat black streak and rounds out as the pill slows. Its arrow fades in.
// - f325-f365: the cursor swings up from the lower left, turning, and grows to full size.
// - f363-f376: a soft light sweeps across the button, and at f366 the cursor swaps to a hand: the hover.
// - f376-f391: the click. The button shrinks and sinks with a blue rim, the frame flashes white, the pill fades,
//   and the hand moves onto the button. Cut at f392.
// - Screenshot frame: f369, the hand on the button's corner with the light across it.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

const K = 1.5;
export const FIRST_FRAME = 323;
export const LAST_FRAME = 391;
export const ZOOM_AND_SEND = { durationInFrames: LAST_FRAME - FIRST_FRAME + 1, fps: 60 };

type Row = readonly number[];
const clamped = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const at = (f: number, rows: readonly Row[], column = 1) =>
  interpolate(f, rows.map((r) => r[0]), rows.map((r) => r[column]), clamped);

const BACKGROUND = [
  [323, 207, 228, 249], [324, 209, 230, 249], [325, 212, 231, 250], [326, 215, 233, 250], [327, 221, 236, 250], [328, 226, 237, 250],
  [329, 232, 240, 249], [330, 237, 242, 250], [331, 240, 243, 250], [332, 243, 244, 249], [372, 243, 244, 249], [373, 244, 245, 250],
  [375, 246, 247, 252], [377, 247, 248, 253], [379, 249, 250, 255], [381, 251, 252, 255], [382, 253, 255, 255], [383, 255, 255, 255],
] as const;

const PILL_RIGHT = [
  [323, 1062], [324, 975], [325, 939], [326, 917], [327, 899], [328, 885], [329, 875], [330, 865], [331, 856], [332, 849], [334, 838],
  [336, 830], [337, 825], [338, 822], [339, 819], [340, 815], [342, 810], [344, 805], [346, 802], [348, 799], [350, 796], [352, 793],
  [354, 791], [356, 789], [358, 788], [360, 787], [362, 786], [365, 785], [372, 785], [373, 784], [380, 783], [382, 776], [385, 772],
  [388, 769], [390, 763], [391, 758],
] as const;
const PILL_TOP = [[372, 133], [375, 136], [378, 138], [380, 142], [382, 150], [384, 156], [386, 161], [388, 170], [390, 183], [391, 194]] as const;
const PILL_HEIGHT = 453;
const PILL_RADIUS = 115;
const PILL_BORDER = 36;
// How far the pill has faded to white, for both its fill and its band.
const PILL_FADE = [[372, 0], [376, 0.1], [379, 0.4], [381, 0.65], [384, 1]] as const;
const BAND_FADE = [[376, 0], [382, 0.35], [386, 0.45], [391, 0.6]] as const;
const PILL_BLUR_X = [[323, 7], [324, 3.5], [325, 1.8], [327, 0.7], [330, 0], [379, 0], [384, 0.4], [391, 0.8]] as const;

const BUTTON_X = [
  [323, 326], [324, 404], [325, 437], [326, 460], [327, 477], [328, 491], [329, 503], [330, 513], [331, 523], [332, 531], [333, 538], [334, 544],
  [335, 550], [336, 556], [337, 561], [338, 565], [339, 570], [340, 574], [341, 577], [342, 581], [343, 584], [344, 587], [345, 590], [346, 593],
  [348, 598], [350, 602], [352, 606], [354, 610], [356, 613], [358, 616], [360, 618], [362, 621], [366, 626], [372, 631], [378, 633], [384, 635],
  [391, 636],
] as const;
const BUTTON_Y = [[372, 432], [373, 434], [375, 435], [378, 437], [380, 439], [382, 442], [384, 446], [386, 451], [388, 459], [390, 472], [391, 479]] as const;
const BUTTON_W = [
  [323, 130], [324, 120], [325, 112], [326, 108], [327, 103], [328, 101], [331, 100], [332, 104], [334, 107], [336, 113], [338, 118], [340, 121],
  [342, 123], [345, 121], [350, 118], [355, 116], [360, 114], [372, 111], [376, 106], [378, 99], [380, 92], [382, 85], [384, 80], [386, 75], [388, 73], [391, 71],
] as const;
const BUTTON_H = [
  [323, 32], [324, 40], [325, 44], [326, 47], [327, 50], [328, 52], [329, 56], [330, 59], [331, 63], [332, 68], [333, 74], [334, 78], [335, 82], [336, 86],
  [337, 92], [338, 96], [339, 99], [340, 102], [341, 104], [342, 106], [345, 108], [351, 109], [360, 110], [372, 111], [376, 105], [378, 99], [380, 92],
  [382, 85], [384, 80], [386, 75], [388, 73], [391, 71],
] as const;
const BUTTON_BLUR_X = [[323, 7], [324, 3], [326, 1], [329, 0.3], [332, 0], [379, 0], [384, 0.6], [391, 1.2]] as const;
const ARROW_OPACITY = [[330, 0], [331, 0.25], [333, 0.7], [336, 1], [379, 1], [384, 0.85], [391, 0.65]] as const;
const RIM_OPACITY = [[374, 0], [378, 0.5], [381, 1]] as const;
// A soft light that sweeps across the button: [frame, gradient direction in degrees, strength].
const SWEEP = [[350, 60, 0], [357, 60, 0.08], [363, 60, 0.32], [366, 120, 0.42], [369, 240, 0.5], [372, 250, 0.36], [375, 260, 0.18], [378, 270, 0]] as const;

// Cursor: [frame, centre x, centre y, direction it points (270 = up), height, blur].
const POINTER = [
  [323, 90, 520, 180, 26, 4], [324, 290, 592, 185, 24, 3], [325, 358, 612, 190, 24, 2.5], [326, 404, 615, 205, 27, 1.8], [327, 439, 614, 220, 29, 1.4], [328, 467, 611, 235, 31, 1], [329, 490, 608, 250, 33, 0.7],
  [330, 509, 605, 262, 36, 0.4], [331, 526, 601, 268, 38, 0.2], [332, 540, 597, 270, 39, 0], [334, 564, 590, 270, 45, 0], [336, 583, 584, 268, 49, 0],
  [338, 598, 577, 264, 53, 0], [340, 611, 572, 258, 56, 0], [342, 621, 567, 254, 58, 0], [344, 630, 562, 251, 58, 0], [346, 637, 558, 249, 57, 0],
  [350, 649, 551, 246, 56, 0], [355, 659, 544, 243, 55, 0], [360, 670, 540, 241, 54, 0], [362, 676, 539, 240, 54, 0], [365, 692, 539, 240, 53, 0],
] as const;
const HAND_SWAP_FRAME = 366;
const HAND = [[366, 728, 541], [367, 736, 541], [370, 762, 544], [379, 768, 541], [382, 760, 537], [385, 742, 531], [388, 710, 522], [391, 660, 510]] as const;
const HAND_OPACITY = [[366, 1], [381, 1], [385, 0.75], [388, 0.55], [391, 0.4]] as const;

const Pointer: React.FC<{ f: number }> = ({ f }) => {
  const blur = at(f, POINTER, 5) * K;
  return (
    <svg
      width={200}
      height={200}
      viewBox="-100 -100 200 200"
      style={{
        position: "absolute",
        left: at(f, POINTER, 1) * K - 100,
        top: at(f, POINTER, 2) * K - 100,
        overflow: "visible",
        filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
      }}
    >
      <path
        transform={`rotate(${at(f, POINTER, 3) - 270}) scale(${(at(f, POINTER, 4) * K) / 42})`}
        d="M 0 -22 L 15 16 L 3 9 L 3 20 L -3 20 L -3 9 L -15 16 Z"
        fill="#000"
      />
    </svg>
  );
};

const Hand: React.FC<{ f: number }> = ({ f }) => (
  <svg
    width={170}
    height={170}
    viewBox="-30 -30 60 60"
    style={{ position: "absolute", left: at(f, HAND, 1) * K - 85, top: at(f, HAND, 2) * K - 85, opacity: at(f, HAND_OPACITY), overflow: "visible" }}
  >
    <path
      transform="rotate(-42)"
      d="M -3 -2 L -3 -20 Q -3 -24 0 -24 Q 3 -24 3 -20 L 3 -6 Q 3 -9 6 -9 Q 9 -9 9 -5 Q 9 -8 12 -8 Q 15 -8 15 -4 Q 15 -6 18 -6 Q 20 -6 20 -2 L 20 8 Q 20 18 12 22 L 0 22 Q -4 20 -7 15 L -15 3 Q -17 -1 -13 -2 Q -10 -3 -7 1 L -3 5 Z"
      fill="#fff"
      stroke="#111"
      strokeWidth={1.6}
      strokeLinejoin="round"
    />
  </svg>
);

export const ZoomAndSend: React.FC = () => {
  const f = useCurrentFrame() + FIRST_FRAME;
  const right = at(f, PILL_RIGHT) * K;
  const top = at(f, PILL_TOP) * K;
  const fade = at(f, PILL_FADE);
  const bandFade = at(f, BAND_FADE);
  const fill = 243 + (255 - 243) * fade;
  const band = [227, 226, 223].map((c) => c + (255 - c) * bandFade);
  const pillBlur = `${at(f, PILL_BLUR_X) * K}px`;
  const blurX = at(f, PILL_BLUR_X);

  const w = at(f, BUTTON_W) * K;
  const h = at(f, BUTTON_H) * K;
  const buttonX = at(f, BUTTON_X) * K;
  const buttonY = at(f, BUTTON_Y) * K;
  const buttonBlur = at(f, BUTTON_BLUR_X) * K;
  const sweepAngle = at(f, SWEEP, 1);
  const sweep = at(f, SWEEP, 2);
  const rim = at(f, RIM_OPACITY);

  return (
    <AbsoluteFill style={{ background: `rgb(${at(f, BACKGROUND, 1)}, ${at(f, BACKGROUND, 2)}, ${at(f, BACKGROUND, 3)})`, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: -400,
          top,
          width: right + 400,
          height: PILL_HEIGHT * K,
          boxSizing: "border-box",
          borderRadius: PILL_RADIUS * K,
          border: `${PILL_BORDER * K}px solid rgb(${band.join(", ")})`,
          background: `rgb(${fill}, ${fill}, ${fill})`,
          boxShadow: "0 0 0 4px rgba(255, 255, 255, 0.85)",
          filter: blurX > 0.05 ? `blur(${pillBlur})` : undefined,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: buttonX - w / 2,
          top: buttonY - h / 2,
          width: w,
          height: h,
          borderRadius: "50%",
          background: sweep > 0.01 ? `linear-gradient(${sweepAngle}deg, rgb(${255 * sweep}, ${255 * sweep}, ${255 * sweep}) 0%, #000 65%)` : "#000",
          boxShadow: `0 0 5px 5px rgba(30, 150, 245, ${rim})`,
          filter: buttonBlur > 0.05 ? `blur(${buttonBlur}px)` : undefined,
        }}
      >
        <svg width={w} height={h} viewBox="-50 -50 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, opacity: at(f, ARROW_OPACITY) }}>
          <path d="M 0 26 V -26 M -19 -8 L 0 -26 L 19 -8" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {f < HAND_SWAP_FRAME ? <Pointer f={f} /> : <Hand f={f} />}
    </AbsoluteFill>
  );
};
