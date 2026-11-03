// Lab: the second scene of the reference clip (60 fps, 1280x720), played after GlowTextReveal. Not a film.
// The tables are measured from the clip's frames, so they replace eases on purpose. They are keyed by the
// clip's frame number (the scene starts at f29), positions in its 720p pixels, multiplied by K for 1920x1080.
//
// Plan as events:
// - f29-f32: the first scene's fade finishes on the light background. Six photo tiles whip in from the edges,
//   smeared along their paths.
// - f31-f42: the words blur in one after another, two frames apart: Need, better, style?
// - f32-f80: the line slides left and its gaps close while the tiles swing round and settle, both slowing together.
// - f96-f134: everything speeds up again. The tiles spin away, the text grows and turns blue, the background
//   floods cyan. Hard cut at f135.
// - f135-f160: the shirt card arrives out of focus and grows. Blue corner arcs draw on, a callout appears,
//   and a soft blue ring opens across the card, then fades out by f175.
// - f184-f195: the card whips left, blurring with colour fringes, and is gone at f196.
// - Screenshot frame: f150, the ring at its strongest with the card nearly sharp.
import React from "react";
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { FONT_FAMILY } from "../lib/fonts";
import { GlowTextReveal, glowTextDefaults, glowTextSchema } from "./GlowTextReveal";

const K = 1.5;
const FIRST_FRAME = 29;
const LAST_FRAME = 195;
export const SECTION_TWO_LAST_FRAME = LAST_FRAME;

export const NEED_BETTER_STYLE = { durationInFrames: LAST_FRAME, fps: 60 };

export const needBetterStyleSchema = glowTextSchema.extend({
  productName: z.string(),
  price: z.string(),
  tileMotionBlur: z.number().min(0).max(0.6).step(0.01),
});
export type NeedBetterStyleProps = z.infer<typeof needBetterStyleSchema>;
export const needBetterStyleDefaults: NeedBetterStyleProps = {
  ...glowTextDefaults,
  productName: "Orange crew sweatshirt",
  price: "$48",
  tileMotionBlur: 0.15,
};

type Row = readonly number[];
const clamped = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
// A table is rows of [frame, ...values]; returns the column at this frame.
const at = (f: number, rows: readonly Row[], column = 1) =>
  interpolate(f, rows.map((r) => r[0]), rows.map((r) => r[column]), clamped);

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const colourAt = (f: number, rows: readonly (readonly [number, string])[]) => {
  const table = rows.map(([frame, hex]) => [frame, ...rgb(hex)]);
  return `rgb(${at(f, table, 1)}, ${at(f, table, 2)}, ${at(f, table, 3)})`;
};

const BACKGROUND = [
  [29, "#96979a"], [30, "#c3c4c7"], [31, "#e6e7ec"], [32, "#f3f4f9"], [116, "#f3f4f9"], [118, "#f6f7fc"], [120, "#f6fafe"],
  [122, "#f7fbfd"], [124, "#f6ffff"], [126, "#f4fffe"], [128, "#efffff"], [130, "#e4fffe"], [132, "#d2f9fe"], [134, "#c4f4fd"],
  [136, "#c4f4fc"], [140, "#d4f7fe"], [144, "#e4f9ff"], [148, "#e9f6ff"], [152, "#eef3fb"], [156, "#f0f3fa"], [160, "#f3f4f9"],
] as const;

// Tiles: [frame, left, top] of the white border's box, and the settled size.
const TILES: { src: string; size: number; path: readonly Row[] }[] = [
  {
    src: "tile-a",
    size: 106,
    path: [
      [29, 1045, -90], [30, 1015, -64], [31, 974, -43], [32, 966, -29], [33, 958, -17], [34, 950, -8], [35, 943, 1], [36, 937, 8],
      [37, 932, 10], [38, 927, 18], [39, 923, 24], [40, 921, 30], [41, 918, 34], [42, 916, 38], [43, 914, 40], [44, 913, 43],
      [45, 912, 45], [46, 910, 48], [48, 907, 52], [52, 904, 58], [56, 902, 62], [60, 899, 66], [64, 899, 68], [68, 898, 70],
      [72, 898, 71], [76, 897, 72], [92, 897, 73], [96, 897, 75], [100, 898, 77], [104, 898, 81], [108, 899, 85], [112, 900, 91],
      [116, 901, 100], [120, 902, 112], [124, 906, 131], [128, 915, 167], [132, 924, 224], [133, 928, 249], [134, 934, 286],
    ],
  },
  {
    src: "tile-b",
    size: 106,
    path: [
      [29, 1135, -70], [30, 1120, -26], [31, 1109, 19], [32, 1099, 69], [33, 1089, 95], [34, 1080, 116], [35, 1072, 134], [36, 1065, 149],
      [37, 1057, 161], [38, 1053, 173], [39, 1049, 183], [40, 1045, 192], [41, 1042, 200], [42, 1039, 207], [43, 1035, 214], [44, 1033, 219],
      [45, 1031, 224], [46, 1028, 230], [48, 1024, 239], [52, 1019, 253], [56, 1015, 264], [60, 1011, 271], [64, 1010, 276], [68, 1008, 280],
      [72, 1006, 283], [76, 1006, 285], [80, 1005, 286], [92, 1005, 287], [96, 1005, 290], [100, 1005, 294], [104, 1004, 299], [108, 1003, 306],
      [112, 1002, 317], [116, 999, 330], [120, 996, 349], [124, 992, 379], [128, 986, 423], [132, 969, 503], [133, 960, 537], [134, 946, 585],
    ],
  },
  {
    src: "tile-c",
    size: 106,
    path: [
      [29, 1300, 240], [30, 1208, 293], [31, 1149, 342], [32, 1120, 369], [33, 1096, 390], [34, 1077, 404], [35, 1060, 416], [36, 1046, 428],
      [37, 1034, 435], [38, 1024, 442], [39, 1014, 451], [40, 1007, 457], [41, 999, 460], [42, 994, 464], [43, 987, 468], [44, 982, 472],
      [45, 978, 475], [46, 974, 478], [48, 966, 484], [52, 954, 492], [56, 945, 498], [60, 940, 501], [64, 935, 504], [68, 932, 507],
      [72, 930, 508], [76, 929, 509], [92, 928, 510], [96, 927, 512], [100, 925, 514], [104, 923, 517], [108, 921, 522], [112, 917, 528],
      [116, 912, 537], [120, 906, 548], [124, 897, 567], [128, 887, 598], [132, 862, 644], [133, 850, 664], [134, 836, 692],
    ],
  },
  {
    src: "tile-d",
    size: 74,
    path: [
      [29, 408, 530], [30, 510, 545], [31, 558, 540], [32, 590, 533], [33, 613, 541], [34, 630, 539], [35, 644, 536], [36, 656, 533],
      [37, 666, 530], [38, 675, 527], [39, 684, 524], [40, 691, 521], [41, 698, 516], [42, 704, 513], [43, 709, 511], [44, 714, 508],
      [45, 717, 505], [46, 721, 502], [48, 727, 498], [52, 737, 490], [56, 743, 485], [60, 748, 481], [64, 751, 479], [68, 754, 476],
      [72, 755, 475], [76, 757, 474], [88, 758, 473], [96, 759, 471], [100, 762, 469], [104, 765, 465], [108, 769, 460], [112, 775, 453],
      [116, 782, 443], [120, 791, 428], [124, 804, 407], [128, 816, 370], [132, 811, 290], [134, 775, 200],
    ],
  },
  {
    src: "tile-e",
    size: 71,
    path: [
      [29, 460, 480], [30, 590, 540], [31, 640, 536], [32, 670, 530], [33, 694, 516], [34, 716, 506], [35, 731, 496], [36, 745, 487],
      [37, 755, 477], [38, 765, 468], [39, 772, 460], [40, 778, 452], [41, 784, 445], [42, 786, 438], [43, 790, 432], [44, 794, 425],
      [45, 797, 420], [46, 798, 416], [48, 802, 407], [52, 808, 392], [56, 812, 382], [60, 814, 374], [64, 815, 369], [68, 816, 365],
      [72, 817, 362], [80, 817, 361], [92, 817, 359], [96, 817, 358], [100, 818, 355], [104, 818, 351], [108, 819, 347], [112, 820, 341],
      [116, 820, 333], [120, 820, 320], [124, 821, 304], [128, 822, 277], [132, 818, 250], [134, 790, 215],
    ],
  },
  {
    src: "tile-f",
    size: 67,
    path: [
      [29, 510, 416], [30, 650, 519], [31, 700, 522], [32, 735, 496], [33, 760, 472], [34, 776, 450], [35, 790, 430], [36, 807, 411],
      [37, 814, 395], [38, 819, 381], [39, 823, 368], [40, 824, 357], [41, 826, 347], [42, 826, 338], [43, 825, 329], [44, 824, 321],
      [45, 823, 313], [46, 822, 306], [48, 818, 290], [52, 815, 272], [56, 811, 260], [60, 808, 250], [64, 806, 244], [68, 804, 240],
      [72, 803, 237], [76, 802, 235], [80, 802, 234], [92, 801, 233], [96, 801, 232], [104, 799, 230], [108, 798, 227], [112, 797, 225],
      [116, 795, 220], [120, 791, 213], [124, 788, 205], [128, 783, 198], [132, 775, 190], [134, 732, 151],
    ],
  },
];
const TILE_SCALE = [[29, 0.85], [36, 0.92], [43, 1], [120, 1], [128, 0.92], [134, 0.9]] as const;
const TILE_BLUR = [[29, 5], [34, 2], [38, 0.8], [44, 0], [116, 0], [124, 1], [130, 2], [134, 4]] as const;
const TILE_OPACITY = [[29, 0.7], [31, 1]] as const;

// Words: [frame, left] of each, and the frame it starts to appear.
const WORDS: { text: string; delay: number; left: readonly Row[] }[] = [
  {
    text: "Need",
    delay: 0,
    left: [
      [31, 410], [32, 390], [33, 372], [34, 357], [35, 344], [36, 333], [37, 323], [38, 315], [39, 308], [40, 301], [41, 296], [42, 290],
      [43, 285], [44, 280], [45, 275], [46, 271], [48, 264], [52, 251], [56, 242], [60, 234], [64, 228], [68, 223], [72, 219], [76, 216],
      [80, 213], [84, 211], [88, 209], [92, 207], [96, 205], [100, 203], [104, 200], [108, 196], [112, 191], [116, 184], [120, 174],
      [124, 161], [128, 140], [132, 103], [133, 89], [134, 65],
    ],
  },
  {
    text: "better",
    delay: 2,
    left: [
      [33, 544], [34, 518], [35, 499], [36, 484], [37, 472], [38, 461], [39, 452], [40, 444], [41, 437], [42, 431], [43, 425], [44, 419],
      [45, 414], [46, 409], [48, 401], [52, 387], [56, 376], [60, 367], [64, 360], [68, 354], [72, 351], [76, 347], [80, 344], [84, 342],
      [88, 340], [92, 338], [96, 337], [100, 335], [104, 334], [108, 331], [112, 329], [116, 326], [120, 321], [124, 314], [128, 305],
      [132, 290], [133, 283], [134, 273],
    ],
  },
  {
    text: "style?",
    delay: 4,
    left: [
      [35, 687], [36, 662], [37, 642], [38, 629], [39, 617], [40, 607], [41, 598], [42, 590], [43, 582], [44, 576], [45, 570], [46, 564],
      [48, 554], [52, 537], [56, 525], [60, 516], [64, 508], [68, 502], [72, 497], [76, 493], [80, 490], [84, 488], [88, 486], [92, 484],
      [96, 483], [116, 484], [120, 485], [124, 486], [128, 489], [132, 497], [133, 501], [134, 506],
    ],
  },
];
// These three run on frames since the word's own start, shifted by its delay.
const WORD_OPACITY = [[31, 0.12], [33, 0.35], [35, 0.6], [37, 0.85], [39, 1]] as const;
const WORD_ENTRY_BLUR = [[31, 3.5], [33, 2.6], [35, 1.8], [37, 1.1], [39, 0.6], [42, 0.2], [46, 0]] as const;
const WORD_EXIT_BLUR = [[116, 0], [120, 0.6], [124, 1.4], [128, 2.6], [130, 3.2], [132, 4.5], [134, 5.6]] as const;
const WORD_SCALE = [[104, 1], [112, 1.04], [116, 1.06], [120, 1.1], [124, 1.15], [128, 1.22], [132, 1.33], [134, 1.42]] as const;
const LINE_CENTRE_Y = [[96, 351], [100, 349.5], [104, 348.5], [108, 347], [112, 345.5], [116, 343], [120, 339.5], [124, 335], [128, 327], [132, 313], [134, 298]] as const;
const TEXT_COLOUR = [
  [108, "#000000"], [112, "#00020a"], [114, "#000510"], [116, "#010c19"], [118, "#001729"], [120, "#05283f"], [122, "#103856"],
  [124, "#1d5479"], [126, "#2c6ea1"], [128, "#3e8ac3"], [130, "#59a9e7"], [132, "#4abafb"], [134, "#48c3f9"],
] as const;
const FONT_SIZE = 72;
const FONT_WEIGHT = 550;

// Card: [frame, left, top, right, bottom].
const CARD = [
  [135, 508, 197, 770, 522], [136, 480, 170, 800, 548], [138, 450, 151, 827, 569], [141, 439, 135, 842, 584], [144, 431, 125, 851, 596],
  [147, 425, 118, 856, 600], [150, 420, 114, 859, 605], [153, 416, 110, 862, 609], [156, 413, 107, 864, 612], [160, 408, 103, 865, 616],
  [166, 401, 100, 863, 619], [172, 390, 98, 857, 621], [178, 375, 97, 843, 622], [184, 354, 102, 816, 616], [186, 345, 104, 802, 614],
  [188, 331, 108, 781, 610], [190, 315, 114, 755, 604], [192, 293, 122, 722, 596], [193, 275, 130, 693, 588], [194, 255, 139, 661, 579],
  [195, 221, 148, 612, 570],
] as const;
const CARD_DESIGN_W = 476 * K;
const CARD_DESIGN_H = 526 * K;
const CARD_BLUR_X = [[135, 12], [138, 6], [141, 3.5], [144, 2], [147, 1], [150, 0.4], [153, 0], [181, 0], [184, 1.2], [187, 3.5], [190, 7], [193, 12], [195, 18]] as const;
const CARD_BLUR_Y = [[135, 12], [138, 6], [141, 3.5], [144, 2], [147, 1], [150, 0.4], [153, 0], [181, 0], [184, 0.8], [187, 1.8], [190, 3.5], [193, 5.5], [195, 7]] as const;
const CARD_SPLIT = [[182, 0], [184, 1.5], [187, 3], [190, 5], [193, 7], [195, 9]] as const;
const IMAGE_WASH = [[135, 0.3], [141, 0.2], [147, 0.08], [153, 0], [181, 0], [187, 0.06], [190, 0.14], [193, 0.28], [195, 0.42]] as const; // white over the photo as it arrives and leaves
const ARC_DRAW = [[136, 0.1], [138, 0.3], [141, 0.65], [144, 0.82], [147, 0.92], [150, 1]] as const;
const RING_RADIUS = [[141, 90], [147, 170], [150, 190], [156, 205], [160, 215], [166, 235], [172, 250]] as const;
const RING_OPACITY = [[139, 0], [141, 0.2], [147, 0.45], [153, 0.6], [160, 0.5], [166, 0.3], [172, 0.06], [175, 0]] as const;
const CALLOUT_OPACITY = [[137, 0], [139, 0.35], [144, 0.8], [150, 1]] as const;
const CALLOUT_BLUR = [[137, 5], [141, 3], [147, 1], [153, 0]] as const;
const LINE_DRAW = [[138, 0.25], [141, 0.55], [147, 0.9], [150, 1]] as const;

const ARC_COLOUR = "#3f9fe3";
const ARC_WIDTH = 3 * K;
const ARC_OUTSET = 4 * K;

const Tile: React.FC<{ f: number; index: number; motionBlur: number }> = ({ f, index, motionBlur }) => {
  const tile = TILES[index];
  const x = at(f, tile.path, 1) * K;
  const y = at(f, tile.path, 2) * K;
  const vx = (at(f + 0.5, tile.path, 1) - at(f - 0.5, tile.path, 1)) * K;
  const vy = (at(f + 0.5, tile.path, 2) - at(f - 0.5, tile.path, 2)) * K;
  const speed = Math.hypot(vx, vy);
  const angle = (Math.atan2(vy, vx) * 180) / Math.PI;
  const base = at(f, TILE_BLUR);
  const along = base + speed * motionBlur;
  const size = tile.size * K * at(f, TILE_SCALE);
  const id = `tile-blur-${index}`;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        opacity: at(f, TILE_OPACITY),
        transform: `rotate(${angle}deg)`,
      }}
    >
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id={id} x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation={`${along} ${base}`} />
        </filter>
      </svg>
      <div style={{ width: "100%", height: "100%", filter: along > 0.05 ? `url(#${id})` : undefined }}>
        <div
          style={{
            width: "100%",
            height: "100%",
            transform: `rotate(${-angle}deg)`,
            boxSizing: "border-box",
            borderRadius: "26%",
            border: `${3 * K}px solid #fff`,
            overflow: "hidden",
            boxShadow: "0 8px 24px rgba(40, 50, 90, 0.14)",
            background: "#fff",
          }}
        >
          <Img
            src={staticFile(`lab/fashion/${tile.src}.jpg`)}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 20%", display: "block", filter: "saturate(0.8)" }}
          />
        </div>
      </div>
    </div>
  );
};

const Headline: React.FC<{ f: number }> = ({ f }) => {
  const centreY = at(f, LINE_CENTRE_Y) * K;
  const scale = at(f, WORD_SCALE);
  const colour = colourAt(f, TEXT_COLOUR);
  return (
    <>
      {WORDS.map((word) => {
        const own = f - word.delay;
        if (own < 31) return null;
        const blur = (at(own, WORD_ENTRY_BLUR) + at(f, WORD_EXIT_BLUR)) * K;
        return (
          <div
            key={word.text}
            style={{
              position: "absolute",
              left: at(f, word.left) * K,
              top: centreY,
              transform: `translateY(-50%) scale(${scale})`,
              transformOrigin: "left center",
              fontFamily: FONT_FAMILY,
              fontWeight: FONT_WEIGHT,
              fontSize: FONT_SIZE,
              lineHeight: 1,
              letterSpacing: FONT_SIZE * -0.01,
              whiteSpace: "nowrap",
              color: colour,
              opacity: at(own, WORD_OPACITY),
              filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
            }}
          >
            {word.text}
          </div>
        );
      })}
    </>
  );
};

const Card: React.FC<{ f: number; productName: string; price: string }> = ({ f, productName, price }) => {
  const left = at(f, CARD, 1) * K;
  const top = at(f, CARD, 2) * K;
  const right = at(f, CARD, 3) * K;
  const bottom = at(f, CARD, 4) * K;
  const w = CARD_DESIGN_W;
  const h = CARD_DESIGN_H;
  const blurX = at(f, CARD_BLUR_X);
  const blurY = at(f, CARD_BLUR_Y);
  const split = at(f, CARD_SPLIT);
  const useFilter = blurX > 0.05 || blurY > 0.05 || split > 0.05;

  const r = 85 * K;
  const arc = at(f, ARC_DRAW);
  const o = ARC_OUTSET;
  const armY = 10 * K;
  const armX = 75 * K;
  const topLeft = `M ${-o} ${r + armY} V ${r} A ${r + o} ${r + o} 0 0 1 ${r} ${-o} H ${r + armX}`;
  const bottomRight = `M ${w + o} ${h - r - armY} V ${h - r} A ${r + o} ${r + o} 0 0 1 ${w - r} ${h + o} H ${w - r - armX}`;

  const ring = at(f, RING_RADIUS) * K;
  const lineLength = at(f, LINE_DRAW);

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: w,
        height: h,
        transformOrigin: "0 0",
        transform: `scale(${(right - left) / w}, ${(bottom - top) / h})`,
      }}
    >
      <svg width={0} height={0} style={{ position: "absolute" }}>
        {/* Wide enough that the edges, where the colour split leaves a coloured line, are off screen. */}
        <filter id="card-whip" x="-300%" y="-100%" width="700%" height="300%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation={`${blurX} ${blurY}`} result="soft" />
          {/* Flatten onto the scene's background first: splitting see-through edges turns them dark. */}
          <feFlood floodColor={colourAt(f, BACKGROUND)} result="backdrop" />
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
      <div style={{ position: "absolute", inset: 0, filter: useFilter ? "url(#card-whip)" : undefined }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: r,
            overflow: "hidden",
            background: "#f8f8fb",
            boxShadow: "0 24px 70px rgba(90, 110, 170, 0.22)",
          }}
        >
          <Img
            src={staticFile("lab/fashion/hero.jpg")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "50% 100%",
              display: "block",
              filter: "brightness(1.1)",
              transform: "scale(1.18)", // crops the photo at the neck, like the clip
              transformOrigin: "50% 100%",
            }}
          />
          <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: at(f, IMAGE_WASH) }} />
          <div
            style={{
              position: "absolute",
              left: w / 2 - ring,
              top: h / 2 - ring,
              width: ring * 2,
              height: ring * 2,
              boxSizing: "border-box",
              borderRadius: "50%",
              border: `${40 * K}px solid #7fbde8`,
              filter: `blur(${14 * K}px)`,
              opacity: at(f, RING_OPACITY),
            }}
          />
        </div>

        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: at(f, CALLOUT_OPACITY),
            filter: at(f, CALLOUT_BLUR) > 0.05 ? `blur(${at(f, CALLOUT_BLUR) * K}px)` : undefined,
            fontFamily: FONT_FAMILY,
            color: "#111",
          }}
        >
          <div style={{ position: "absolute", left: 25 * K, top: 34 * K, fontSize: 9 * K, fontWeight: 500, whiteSpace: "nowrap" }}>
            {productName}
          </div>
          <div
            style={{
              position: "absolute",
              left: 25 * K,
              top: 46 * K,
              width: 100 * K,
              height: 105 * K,
              background: "#fff",
              overflow: "hidden",
              boxShadow: "0 4px 14px rgba(40, 50, 90, 0.12)",
            }}
          >
            <Img
              src={staticFile("lab/fashion/hero.jpg")}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "50% 58%",
                display: "block",
                filter: "brightness(1.1)",
                transform: "scale(1.5)",
                transformOrigin: "62% 55%",
              }}
            />
          </div>
          <div
            style={{ position: "absolute", left: 95 * K, top: 154 * K, width: 30 * K, textAlign: "right", fontSize: 8 * K, fontWeight: 500 }}
          >
            {price}
          </div>
          <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            <path
              d={`M ${74 * K} ${151 * K} L ${102 * K} ${189 * K} H ${227 * K}`}
              fill="none"
              stroke="#111"
              strokeWidth={1.5 * K}
              pathLength={1}
              strokeDasharray={`${lineLength} 1`}
            />
          </svg>
        </div>

        <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {[topLeft, bottomRight].map((d) => (
            <path key={d} d={d} fill="none" stroke={ARC_COLOUR} strokeWidth={ARC_WIDTH} pathLength={1} strokeDasharray={`${arc} 1`} />
          ))}
        </svg>
      </div>
    </div>
  );
};

const SceneTwo: React.FC<NeedBetterStyleProps> = ({ productName, price, tileMotionBlur }) => {
  const f = useCurrentFrame() + FIRST_FRAME;
  return (
    <AbsoluteFill style={{ background: colourAt(f, BACKGROUND), overflow: "hidden" }}>
      {f < 135 ? (
        <>
          <Headline f={f} />
          {TILES.map((tile, i) => (
            <Tile key={tile.src} f={f} index={i} motionBlur={tileMotionBlur} />
          ))}
        </>
      ) : (
        <Card f={f} productName={productName} price={price} />
      )}
    </AbsoluteFill>
  );
};

// Scene one runs to f28, then scene two takes over. The stage is 1920x1080, scaled to the composition's size.
export const NeedBetterStyle: React.FC<NeedBetterStyleProps> = (props) => {
  const { width } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Sequence durationInFrames={FIRST_FRAME - 1}>
        <GlowTextReveal {...props} />
      </Sequence>
      <Sequence from={FIRST_FRAME - 1}>
        <div style={{ position: "absolute", width: 1920, height: 1080, transformOrigin: "0 0", transform: `scale(${width / 1920})` }}>
          <SceneTwo {...props} />
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};
