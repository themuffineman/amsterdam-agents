/**
 * Design tokens for every composition: palette, type scale, spacing, motion presets.
 *
 * These are NEUTRAL PLACEHOLDERS, not a brand. For a film about a real subject, build a
 * palette from brand/<slug>/brand.json and pass it down (see ui-kit/theme.ts) instead of
 * editing these values per film.
 *
 * Sizes are fractions of the frame's short side (`basis`), so the same token works for
 * 1920x1080 (basis = 1080 = H) and 1080x1920 (basis = 1080 = W). That matches the skill:
 * landscape type is sized by H, portrait type by W.
 */
import { FONT_FAMILY } from "./fonts";

// ---------------------------------------------------------------- palette

export const palette = {
  /** Light ground. A surface colour, never a flat swatch on its own (world.md). */
  ground: "#E9E8E4",
  /** One step darker ground, for a container-replacement cut (transitions.md T4). */
  groundStep: "#C4C2B1",
  /** Dark ground, for an act flip. */
  groundDark: "#121212",
  /** UI surfaces (cards, panels). */
  surface: "#FBFBFA",
  surfaceSunken: "#F2F2EF",
  surfaceDark: "#171717",
  /** Ink. Charcoal, not #000 (type.md). Pure black only on a hero figure/wordmark. */
  ink: "#20201E",
  inkSoft: "#383837",
  inkMuted: "#7E8283",
  /** Connective words ("and") that never brighten. */
  connective: "#A6A09E",
  inkOnDark: "#F2F2EF",
  /** Hairlines: 1-1.5 px. */
  line: "#DCE1DE",
  lineDark: "#262627",
  /** PLACEHOLDER accent. One hue, one meaning per film. Replace with the subject's. */
  accent: "#3D5AFE",
  /** Signal colour for "done" only. */
  signal: "#2E9E6A",
  /** Negative / drop-off. */
  negative: "#C24A3A",
  warning: "#C98A12",
} as const;

export type Palette = { [K in keyof typeof palette]: string };

// ---------------------------------------------------------------- type

export const fontFamily = `"${FONT_FAMILY}", sans-serif`;

/** em size as a fraction of the frame's short side, by role (layout.md section 3). */
export const typeScale = {
  texture: 0.016, // UI texture, unreadable on purpose
  uiCard: 0.023, // UI card text
  uiPrompt: 0.045, // the ONE readable UI object
  phrase: 0.06, // supporting phrase
  headline: 0.09, // statement line
  emphasis: 0.16, // act-two / emphasis word
  heroNumber: 0.25, // hero figure
  thesis: 0.33, // opening thesis word (once per film)
  wordmark: 0.11, // sign-off wordmark
} as const;

export type TypeRole = keyof typeof typeScale;

/** Weights. Variable font, so in-between values are real (fonts.ts loads 100-900). */
export const weight = {
  body: 400,
  paleGround: 380,
  headline: 480,
  branded: 520,
  wordmark: 600,
  singleWord: 650,
} as const;

/** Display tracking in em (type.md: -1.5% to -5.5%). */
export const tracking = {
  ui: "0em",
  phrase: "-0.02em",
  headline: "-0.03em",
  display: "-0.045em",
} as const;

// ---------------------------------------------------------------- spacing

/** Short side of the frame: the unit every size is a fraction of. */
export const basisOf = (width: number, height: number) => Math.min(width, height);

/** Font size in px for a role at the given frame size. */
export const em = (role: TypeRole, width: number, height: number) =>
  Math.round(typeScale[role] * basisOf(width, height));

/** Spacing unit: 8 px at a 1080 short side. space(3) = 24 px. */
export const space = (n: number, width: number, height: number) =>
  n * (basisOf(width, height) / 135);

/** Minimum readable text (gate G1): 0.04 of frame height, in px. */
export const minReadablePx = (height: number) => Math.ceil(0.04 * height);

// ---------------------------------------------------------------- motion

// Measured eases and helpers. Always import motion from here or ./eases, never hand-write
// an easing curve.
export {
  ease,
  easeFrames,
  tween,
  enter,
  exit,
  staggerOnsets,
  cameraSnap,
  dive,
} from "./eases";
export type { EaseName } from "./eases";

/** Ease + duration presets by job (rules.md "Which ease"). Frames at 30 fps. */
export const motion = {
  cardLand: { easing: "softLand", frames: 12 },
  heroEntry: { easing: "snapSettle", frames: 11 },
  wordArrive: { easing: "softLand", frames: 13 },
  mediumMove: { easing: "glide", frames: 10 },
  whipEntry: { easing: "whip", frames: 7 },
  leave: { easing: "accelExit", frames: 13 },
  hardExitIntoCut: { easing: "crashOut", frames: 17 },
  fade: { easing: "cruise", frames: 5 },
  ramp: { easing: "softInOut", frames: 9 },
  ambient: { easing: "cruise", frames: 26 },
  smallBounce: { easing: "popOver", frames: 15 },
  slam: { easing: "crashIn", frames: 10 },
  ctaEntry: { easing: "snapSettle", frames: 6 },
} as const;

/** Stagger gap patterns (rules.md law 5). Pass to staggerOnsets(). */
export const gaps = {
  default: [3, 2, 2, 2, 2, 2],
  headline: [6, 5, 4, 7],
  cascade: [4, 3, 3, 3, 2, 2],
  ctaStack: [8, 8, 9],
} as const;
