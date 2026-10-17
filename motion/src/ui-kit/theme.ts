/**
 * Theme for ui-kit components. Every colour and size the components draw comes from here,
 * never from hardcoded zinc/shadcn values.
 *
 * Default = neutral tokens from lib/tokens.ts. For a real subject, build one from
 * brand/<slug>/brand.json and pass it as the `theme` prop.
 *
 * Sizes are the component's REAL UI size in px (like the product at 100% zoom).
 * Make them readable with the camera group, not by inflating these numbers (ui-demo.md).
 */
import { fontFamily, palette } from "../lib/tokens";

export interface UiTheme {
  fontFamily: string;
  /** Card / panel surface. */
  surface: string;
  /** Plot region and header strips behind the surface. */
  surfaceSunken: string;
  ink: string;
  inkMuted: string;
  /** Card border and row dividers. */
  line: string;
  /** Dot colour for the dotted plot background. */
  dots: string;
  /** Primary data series. */
  series: string;
  /** Secondary series (funnel progress, comparison line). */
  series2: string;
  positive: string;
  negative: string;
  warning: string;
  /** Tint used for the table share bar. */
  shareTint: string;
  radius: number;
  /** Base UI text size (px): table cells, step names. */
  textBase: number;
  /** Small UI text size (px): labels, headers. */
  textSmall: number;
  /** Weight for values and names (skill: 400-550, never bold). */
  valueWeight: number;
}

export const defaultTheme: UiTheme = {
  fontFamily,
  surface: palette.surface,
  surfaceSunken: palette.surfaceSunken,
  ink: palette.ink,
  inkMuted: palette.inkMuted,
  line: palette.line,
  dots: "rgba(32, 32, 30, 0.10)",
  series: palette.accent,
  series2: palette.inkSoft,
  positive: palette.signal,
  negative: palette.negative,
  warning: palette.warning,
  shareTint: palette.accent,
  radius: 6,
  textBase: 14,
  textSmall: 12,
  valueWeight: 520,
};

/** Dotted plot background (Databuddy's `dotted-bg` utility, colour from the theme). */
export const dottedBackground = (theme: UiTheme, pitch = 8) => ({
  backgroundColor: theme.surfaceSunken,
  backgroundImage: `radial-gradient(circle at center, ${theme.dots} 1px, transparent 1px)`,
  backgroundSize: `${pitch}px ${pitch}px`,
});

/** CSS colour with alpha, from any CSS colour (uses color-mix, Chrome 111+). */
export const withAlpha = (color: string, alpha: number) =>
  `color-mix(in oklab, ${color} ${Math.round(alpha * 100)}%, transparent)`;

/** Turn a React useId() value into a string that is safe inside url(#...). */
export const safeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "");

/** Clamp to 0..1. */
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
