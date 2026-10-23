/**
 * Design tokens for the "recreate" series. Look drawn from the user's references
 * (Extrafazant, Matthieu Givelet, Butter, a ticket-card pricing page):
 * - Mixed lines: condensed bold caps + a serif (often italic) in the same line.
 * - Media inline in type: a small picture sits between words like a word.
 * - Thick coloured frames, slightly tilted, stacked like prints on a table.
 * - Grounds: off-white paper, near-black, or a blurred sky gradient with type behind glass.
 * - Electric blue is the one UI colour (buttons, squiggle, links). Red is the ticket ink.
 *
 * Sizes are px at 1920x1080 (the series is landscape first).
 */
import { GROTESK, SERIF, SERIF_FALLBACK } from "./fonts";

const serifStack = `"${SERIF}", "${SERIF_FALLBACK}", serif`;

export const C = {
  paper: "#F3F3F1",
  paperDeep: "#E7E6E2",
  ink: "#111111",
  inkSoft: "#4A4A48",
  night: "#0D0D0D",
  white: "#FFFFFF",
  /** The UI colour: buttons, arrows, squiggles, cursor. */
  blue: "#1238FF",
  /** Ticket ink (the prompt card). */
  red: "#D21F3C",
  /** Frame colours for the stacked prints. Used as surfaces, never as text colour on paper. */
  pink: "#FF7AD1",
  orange: "#FF5A1F",
  butter: "#FFE38A",
  sky: "#7DB8F0",
} as const;

export const F = {
  /**
   * The sans line of a mixed line. Alte Haas Grotesk in sentence case (the user dropped the
   * condensed bold caps: only one sans and one serif in this series).
   */
  caps: { fontFamily: `"${GROTESK}", sans-serif`, fontWeight: 400, letterSpacing: "-0.035em", lineHeight: 0.95 },
  /** Serif partner for caps lines (regular, set at the same size as the caps). Feature Display. */
  serif: { fontFamily: serifStack, fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 0.9 },
  /** The serif line / emphasis: Feature Display, UPRIGHT (the user doesn't want the italic). */
  italic: { fontFamily: serifStack, fontWeight: 400, letterSpacing: "-0.015em" },
  /** Grotesk for long display sentences (Matthieu / Butter lines). Alte Haas Grotesk. */
  grotesk: { fontFamily: `"${GROTESK}", sans-serif`, fontWeight: 400, letterSpacing: "-0.03em", lineHeight: 1.0 },
  body: { fontFamily: `"Inter", sans-serif`, fontWeight: 420, letterSpacing: "-0.01em" },
  /** Small labels on cards. Was JetBrains Mono caps; the user finds mono AI-looking, so: plain sans. */
  mono: { fontFamily: `"${GROTESK}", sans-serif`, fontWeight: 400, letterSpacing: "-0.01em" },
} as const;
