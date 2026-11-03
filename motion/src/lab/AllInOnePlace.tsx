// Lab: section 5 of the reference clip (60 fps, 1280x720): the changing headline and the wheel of products. Not a film.
// The tables are measured from the clip's frames, so they replace eases on purpose. They are keyed by the
// clip's frame number (this section runs f392-f539), positions in its 720p pixels, multiplied by K for 1920x1080.
//
// Plan as events:
// - f392-f416: the words drop into line one after another from below (All, your, favourites), blue and blurred,
//   turning black. Five product cards sweep down a curved path, like items on a wheel, smeared by their speed.
// - f416-f480: the wheel slows and stops. The line drifts left and grows as the cards do.
// - f442-f445: the text blinks off for single frames and "your" snaps to "in".
// - f482-f489: it blinks again and snaps to "one place", stretching to 1.7x wide for three frames.
// - f488-f538: the wheel runs backward, faster and faster. The frame flashes white and the text fades.
// - Screenshot frame: f487, the stretched line beside the settled cards.
import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { FONT_FAMILY } from "../lib/fonts";

const K = 1.5;
export const FIRST_FRAME = 392;
export const LAST_FRAME = 539;
export const ALL_IN_ONE_PLACE = { durationInFrames: LAST_FRAME - FIRST_FRAME + 1, fps: 60 };

type Row = readonly number[];
const clamped = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const at = (f: number, rows: readonly Row[], column = 1) =>
  interpolate(f, rows.map((r) => r[0]), rows.map((r) => r[column]), clamped);

const BACKGROUND = [
  [401, 255, 255, 255], [402, 255, 254, 255], [403, 251, 252, 255], [404, 249, 250, 255], [405, 248, 249, 254], [407, 247, 248, 253], [408, 246, 247, 252],
  [409, 244, 245, 250], [410, 243, 244, 249], [522, 243, 244, 249], [524, 247, 248, 253], [526, 250, 251, 254], [528, 253, 253, 253], [530, 255, 255, 255],
] as const;

// The line of text.
const LINE_LEFT = [
  [432, 212], [436, 206], [440, 202], [444, 188], [448, 171], [452, 165], [456, 162], [460, 160], [468, 160], [472, 162], [476, 167], [480, 176], [483, 195],
  [484, 204], [485, 128], [488, 128], [489, 240], [492, 247], [496, 252], [500, 256], [504, 258], [508, 260], [516, 260], [520, 259], [524, 258], [528, 256],
  [532, 253], [536, 247], [538, 243],
] as const;
const LINE_TOP = [
  [392, 484], [393, 460], [394, 440], [395, 426], [396, 414], [397, 404], [398, 396], [399, 389], [400, 384], [401, 378], [402, 374], [403, 369], [404, 367],
  [405, 363], [406, 361], [407, 358], [408, 356], [409, 354], [410, 352], [411, 349], [412, 347], [414, 347], [415, 346], [417, 345], [420, 343], [424, 341],
  [428, 340], [432, 339], [436, 339], [444, 337], [452, 336], [480, 336], [484, 338], [492, 339], [500, 336], [508, 336], [512, 333], [516, 330], [520, 325],
  [524, 318], [528, 308], [532, 293], [536, 268], [538, 245],
] as const;
// How far each later word still sits below the line as it drops in.
const WORD_TWO_DROP = [[394, 41], [395, 31], [396, 24], [397, 20], [398, 16], [399, 13], [400, 10], [402, 8], [404, 6], [406, 4], [410, 3], [416, 0]] as const;
const WORD_THREE_DROP = [[396, 68], [397, 54], [398, 43], [399, 35], [400, 28], [401, 24], [402, 21], [403, 19], [404, 17], [405, 15], [406, 12], [408, 10], [410, 8], [413, 6], [416, 3], [420, 1], [424, 0]] as const;
const WORD_TWO_FROM = 394;
const WORD_THREE_FROM = 396;
const LINE_SCALE = [[440, 1], [444, 1.06], [448, 1.1], [452, 1.11], [456, 1.12], [468, 1.13], [476, 1.12], [480, 1.1], [484, 1.03], [489, 1.02], [512, 1], [524, 1.02], [534, 1.05], [538, 1.08]] as const;
const LINE_BLUR = [[392, 3], [396, 1.5], [400, 0.8], [404, 0.4], [408, 0], [528, 0], [532, 0.5], [536, 1.2], [538, 2]] as const;
const LINE_OPACITY = [[526, 1], [530, 0.75], [532, 0.66], [534, 0.58], [536, 0.47], [538, 0.42]] as const;
const TEXT_COLOUR = [
  [392, 90, 155, 224], [396, 90, 159, 232], [398, 79, 133, 204], [399, 75, 124, 187], [400, 69, 100, 156], [401, 44, 83, 136], [402, 22, 55, 101], [403, 0, 23, 58], [404, 0, 0, 23], [406, 0, 0, 0],
] as const;
const FONT_SIZE = 46;
const WORD_GAP = 13;

const wordsAt = (f: number) => {
  if (f < 444) return ["All", "your", "favourites"];
  if (f < 484) return ["All", "in", "favourites"];
  return ["All", "in", "one", "place"];
};
const BLINK_FRAMES = [442, 445, 482, 485];
const STRETCH_FRAMES = [486, 487, 488];

const CARD_BLUR = [[392, 6], [396, 3], [400, 1.5], [404, 0.6], [408, 0], [522, 0], [530, 1], [538, 3], [539, 6]] as const;
const CARD_SHOW = [[392, 0.6], [396, 1]] as const;

// Cards: [frame, left, top, size] of the card, in the order they sit on the wheel.
const CARDS: { src: string; name: string; price: string; path: readonly Row[] }[] = [
  {
    src: "product-a",
    name: "Graphic print tee",
    price: "$420",
    path: [
      [398, 1100, -220, 110], [400, 1026, -80, 118], [401, 991, -62, 118], [402, 956, -44, 120], [403, 932, -18, 122], [404, 905, 8, 124], [405, 885, 20, 125], [406, 865, 24, 126], [407, 850, 38, 127],
      [409, 838, 66, 128], [410, 826, 78, 128], [412, 810, 100, 128], [414, 795, 120, 128], [416, 784, 138, 128], [420, 767, 168, 129], [424, 756, 194, 131], [428, 748, 215, 133],
      [432, 745, 232, 133], [436, 741, 243, 135], [440, 742, 252, 136], [444, 742, 259, 146], [448, 745, 263, 149], [452, 747, 267, 150], [456, 747, 271, 152], [460, 747, 273, 154],
      [472, 749, 274, 154], [476, 750, 273, 154], [480, 753, 271, 154], [484, 763, 270, 149], [488, 775, 268, 142], [492, 779, 262, 139], [496, 782, 254, 138], [500, 786, 242, 137],
      [504, 790, 228, 135], [508, 796, 208, 134], [512, 805, 182, 131], [516, 818, 150, 132], [520, 839, 109, 129], [524, 871, 58, 133], [526, 898, 29, 129], [528, 931, -2, 121], [530, 990, -60, 110], [532, 1050, -220, 105],
    ],
  },
  {
    src: "product-b",
    name: "Blue dot shirt",
    price: "$950",
    path: [
      [394, 1100, -220, 100], [396, 987, -60, 110], [397, 933, -12, 118], [398, 880, 34, 125], [399, 850, 66, 128], [400, 826, 97, 130], [401, 806, 127, 132], [402, 793, 155, 136], [403, 783, 181, 139],
      [404, 776, 203, 141], [405, 768, 221, 143], [409, 766, 282, 148], [410, 765, 298, 149], [412, 771, 346, 150], [414, 776, 369, 151], [416, 781, 385, 152], [420, 795, 422, 153],
      [424, 807, 446, 154], [428, 819, 464, 155], [432, 832, 480, 157], [436, 843, 492, 158], [440, 852, 502, 161], [444, 864, 513, 166], [448, 876, 524, 171], [452, 881, 528, 175],
      [456, 885, 530, 176], [460, 889, 533, 177], [464, 889, 537, 174], [472, 889, 537, 173], [476, 890, 535, 175], [480, 892, 529, 176], [484, 894, 519, 172], [488, 895, 509, 166],
      [492, 892, 503, 163], [496, 886, 495, 160], [500, 879, 486, 159], [504, 870, 472, 159], [508, 859, 454, 158], [512, 847, 432, 154], [516, 828, 400, 153], [520, 814, 355, 151],
      [523, 811, 303, 148], [526, 808, 250, 146], [528, 815, 203, 144], [530, 829, 144, 142], [532, 855, 76, 139], [534, 903, -6, 135], [536, 970, -80, 130], [538, 1040, -260, 125],
    ],
  },
  {
    src: "product-c",
    name: "Copper bomber jacket",
    price: "$900",
    path: [
      [392, 1100, -240, 125], [394, 948, -45, 130], [395, 880, 62, 135], [396, 834, 150, 140], [397, 806, 222, 145], [398, 797, 268, 148], [399, 797, 312, 152], [400, 798, 350, 155], [401, 807, 384, 158],
      [402, 816, 412, 161], [403, 831, 439, 165], [404, 845, 461, 168], [405, 861, 480, 171], [406, 873, 494, 174], [407, 887, 510, 176], [408, 901, 522, 178], [409, 917, 532, 180],
      [410, 931, 543, 182], [412, 957, 557, 185], [414, 980, 566, 187], [416, 1001, 575, 190], [420, 1039, 586, 194], [424, 1068, 588, 198], [428, 1092, 593, 201], [432, 1117, 592, 204],
      [436, 1134, 594, 207], [440, 1154, 598, 209], [444, 1182, 606, 212], [448, 1211, 613, 215], [452, 1225, 617, 215], [456, 1233, 619, 215], [460, 1239, 620, 215], [468, 1244, 622, 215],
      [476, 1243, 619, 215], [480, 1237, 615, 215], [484, 1226, 607, 210], [488, 1212, 596, 205], [492, 1202, 594, 202], [496, 1189, 593, 200], [500, 1174, 593, 195], [504, 1156, 591, 190],
      [508, 1133, 589, 185], [512, 1105, 582, 180], [516, 1069, 572, 178], [520, 1027, 553, 175], [524, 971, 516, 165], [526, 943, 489, 160], [528, 928, 456, 155], [530, 902, 404, 150],
      [532, 879, 350, 148], [534, 867, 248, 140], [536, 866, 120, 138], [538, 878, -20, 135], [539, 900, -240, 130],
    ],
  },
  {
    src: "product-d",
    name: "Black logo tee",
    price: "$380",
    path: [
      [392, 1000, -200, 145], [393, 852, -30, 150], [394, 791, 205, 155], [395, 788, 323, 160], [396, 804, 409, 165], [397, 831, 472, 170], [398, 864, 518, 175], [399, 898, 552, 180], [400, 934, 577, 183],
      [401, 971, 593, 185], [402, 1005, 584, 187], [403, 1039, 612, 188], [404, 1068, 598, 190], [405, 1102, 599, 192], [406, 1102, 598, 193], [407, 1123, 598, 195], [408, 1142, 608, 197],
      [409, 1181, 608, 199], [410, 1198, 601, 200], [412, 1230, 610, 205], [414, 1260, 620, 210], [416, 1300, 640, 215], [522, 1300, 640, 215], [526, 1177, 591, 190], [528, 1135, 587, 185],
      [530, 1071, 571, 178], [532, 996, 536, 170], [534, 921, 466, 160], [536, 855, 337, 150], [538, 867, 306, 148], [539, 900, 120, 145],
    ],
  },
  {
    src: "product-e",
    name: "Black tee",
    price: "$190",
    path: [
      [392, 897, 40, 145], [393, 795, 245, 155], [394, 830, 429, 170], [395, 896, 528, 180], [396, 969, 581, 188], [397, 1044, 606, 192], [398, 1107, 614, 196], [399, 1161, 610, 200], [400, 1205, 601, 204],
      [401, 1250, 610, 208], [403, 1320, 640, 215], [530, 1320, 640, 215], [533, 1205, 578, 190], [534, 1153, 553, 180], [536, 1011, 500, 165], [538, 880, 330, 150], [539, 900, 240, 148],
    ],
  },
];
// Card sizes in the table are at the clip's 720p; the label scales with its card.
const LABEL_BASE_SIZE = 155;

const Card: React.FC<{ f: number; index: number }> = ({ f, index }) => {
  const card = CARDS[index];
  const x = at(f, card.path, 1) * K;
  const y = at(f, card.path, 2) * K;
  const size = at(f, card.path, 3) * K;
  const vx = (at(f + 0.5, card.path, 1) - at(f - 0.5, card.path, 1)) * K;
  const vy = (at(f + 0.5, card.path, 2) - at(f - 0.5, card.path, 2)) * K;
  const speed = Math.hypot(vx, vy);
  const angle = (Math.atan2(vy, vx) * 180) / Math.PI;
  const base = at(f, CARD_BLUR);
  const along = base + speed * 0.2;
  const labelScale = size / (LABEL_BASE_SIZE * K);
  const id = `card-blur-${index}`;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        opacity: at(f, CARD_SHOW),
        transform: `rotate(${angle}deg)`,
      }}
    >
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id={id} x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation={`${along} ${base}`} />
        </filter>
      </svg>
      <div style={{ width: "100%", height: "100%", filter: along > 0.05 ? `url(#${id})` : undefined }}>
        <div style={{ width: "100%", height: "100%", position: "relative", transform: `rotate(${-angle}deg)` }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "#f7f7f8",
              boxShadow: "0 6px 20px rgba(40, 50, 90, 0.08)",
              overflow: "hidden",
            }}
          >
            <Img
              src={staticFile(`lab/fashion/${card.src}.jpg`)}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: "brightness(1.05)" }}
            />
          </div>
          <div
            style={{
              position: "absolute",
              left: size + 9 * K * labelScale,
              top: 8 * K * labelScale,
              fontFamily: FONT_FAMILY,
              fontWeight: 450,
              fontSize: 20 * K * labelScale,
              lineHeight: 1.55,
              letterSpacing: -0.2,
              whiteSpace: "nowrap",
              color: "#111",
            }}
          >
            {card.name}
            <br />
            {card.price}
          </div>
        </div>
      </div>
    </div>
  );
};

const Line: React.FC<{ f: number }> = ({ f }) => {
  if (BLINK_FRAMES.includes(f)) return null;
  const stretched = STRETCH_FRAMES.includes(f);
  const scale = at(f, LINE_SCALE);
  const blur = at(f, LINE_BLUR) * K;
  const words = wordsAt(f);
  const dropOf = (i: number) => {
    if (i === 1) return at(f, WORD_TWO_DROP) * K;
    if (i === 2 && f < 444) return at(f, WORD_THREE_DROP) * K;
    return 0;
  };
  const showing = (i: number) => (i === 1 ? f >= WORD_TWO_FROM : i === 2 && f < 444 ? f >= WORD_THREE_FROM : true);
  return (
    <div
      style={{
        position: "absolute",
        left: at(f, LINE_LEFT) * K,
        top: (at(f, LINE_TOP) + 19) * K,
        display: "flex",
        gap: WORD_GAP * K,
        transform: `translateY(-50%) scale(${stretched ? 1.67 : scale}, ${stretched ? 0.75 : scale})`,
        transformOrigin: "left center",
        fontFamily: FONT_FAMILY,
        fontWeight: 520,
        fontSize: FONT_SIZE * K,
        lineHeight: 1,
        letterSpacing: FONT_SIZE * K * -0.02,
        whiteSpace: "nowrap",
        color: `rgb(${at(f, TEXT_COLOUR, 1)}, ${at(f, TEXT_COLOUR, 2)}, ${at(f, TEXT_COLOUR, 3)})`,
        opacity: at(f, LINE_OPACITY),
        filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
      }}
    >
      {words.map((word, i) => (
        <span key={word} style={{ display: "inline-block", transform: `translateY(${dropOf(i)}px)`, opacity: showing(i) ? 1 : 0 }}>
          {word}
        </span>
      ))}
    </div>
  );
};

export const AllInOnePlace: React.FC = () => {
  const f = useCurrentFrame() + FIRST_FRAME;
  return (
    <AbsoluteFill style={{ background: `rgb(${at(f, BACKGROUND, 1)}, ${at(f, BACKGROUND, 2)}, ${at(f, BACKGROUND, 3)})`, overflow: "hidden" }}>
      <Line f={f} />
      {CARDS.map((card, i) => (
        <Card key={card.src} f={f} index={i} />
      ))}
    </AbsoluteFill>
  );
};
