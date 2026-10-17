/**
 * Tick gauge: a ring (or arc) of short radial ticks, the first N lit in a rating colour,
 * value + unit in the centre.
 *
 * Derived from Databuddy (https://github.com/databuddy-analytics/Databuddy), file
 * apps/dashboard/components/charts/gauge-chart.tsx (GaugeChart). Copyright Databuddy
 * contributors. Licensed AGPL-3.0-only (see _reference/databuddy/LICENSE). Personal, local
 * video rendering only: do not serve this code to users over a network.
 *
 * Changes from the original: framer-motion springs (useSpring, motion.line) and the
 * useEffect/useState that fed them are removed. The lit fraction is the explicit `progress`
 * prop, so a frame always draws the same picture. Rating colours come from UiTheme instead of
 * hardcoded Tailwind emerald/amber/red. Geometry (8 px padding, tick length 12% of size,
 * width 2.5% of size, round caps, inactive ticks at 35% opacity, centre font sizing) follows
 * the original.
 *
 * Animation: none inside. Drive `progress` and `displayValue` from the composition
 * (progress with tween(); the number with authored steps, see ui-demo.md section 9).
 */
import React from "react";
import { clamp01, defaultTheme, type UiTheme } from "./theme";

export type GaugeRating = "good" | "needs-improvement" | "poor";

export interface TickGaugeProps {
  /** 0-1 fraction of ticks lit. */
  progress: number;
  /** Pre-formatted centre value, e.g. "1.8". */
  displayValue: string;
  unit?: string;
  rating?: GaugeRating;
  /** Overrides the rating colour. */
  color?: string;
  size?: number;
  tickCount?: number;
  /** Degrees; -90 = 12 o'clock. */
  startAngle?: number;
  sweepAngle?: number;
  theme?: UiTheme;
  style?: React.CSSProperties;
}

export const TickGauge: React.FC<TickGaugeProps> = ({
  progress,
  displayValue,
  unit,
  rating = "good",
  color,
  size = 120,
  tickCount = 36,
  startAngle = -90,
  sweepAngle = 360,
  theme = defaultTheme,
  style,
}) => {
  const ratingColor = { good: theme.positive, "needs-improvement": theme.warning, poor: theme.negative }[rating];
  const active = color ?? ratingColor;

  const padding = 8;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - padding;
  const tickLength = size * 0.12;
  const tickWidth = Math.max(2, size * 0.025);
  const lit = Math.floor(clamp01(progress) * tickCount);

  // Centre text sized to fit inside the ring (same rule as the original).
  const innerRadius = radius - tickLength - 4;
  const maxTextWidth = innerRadius * 1.4;
  const charCount = displayValue.length + (unit ? unit.length * 0.6 : 0);
  const valueFont = Math.round(Math.max(12, Math.min(size * 0.22, maxTextWidth / (charCount * 0.55))));

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: theme.fontFamily,
        ...style,
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute", inset: 0 }} aria-hidden>
        {Array.from({ length: tickCount }).map((_, i) => {
          const t = tickCount > 1 ? i / (tickCount - 1) : 0;
          const a = ((startAngle + t * sweepAngle) * Math.PI) / 180;
          const on = i < lit;
          return (
            <line
              key={i}
              x1={cx + (radius - tickLength) * Math.cos(a)}
              y1={cy + (radius - tickLength) * Math.sin(a)}
              x2={cx + radius * Math.cos(a)}
              y2={cy + radius * Math.sin(a)}
              stroke={on ? active : theme.line}
              strokeOpacity={on ? 1 : 0.9}
              strokeWidth={tickWidth}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <div style={{ position: "relative", display: "flex", alignItems: "baseline", gap: 2 }}>
        <span style={{ fontSize: valueFont, lineHeight: 1, fontWeight: theme.valueWeight, color: theme.ink, fontVariantNumeric: "tabular-nums" }}>
          {displayValue}
        </span>
        {unit ? <span style={{ fontSize: Math.round(valueFont * 0.5), lineHeight: 1, color: theme.inkMuted }}>{unit}</span> : null}
      </div>
    </div>
  );
};
