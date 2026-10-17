/**
 * Area/line chart card: header strip, dotted plot region, monotone area with a vertical
 * gradient, optional dashed last segment for an unfinished period.
 *
 * Derived from Databuddy (https://github.com/databuddy-analytics/Databuddy), files
 * apps/dashboard/components/ui/composables/chart.tsx (ChartRoot, ChartHeader, ChartPlot,
 * ChartSingleSeries / ChartCartesianArea) and apps/dashboard/lib/chart-presentation.ts.
 * Copyright Databuddy contributors. Licensed AGPL-3.0-only (see _reference/databuddy/LICENSE).
 * Personal, local video rendering only: do not serve this code to users over a network.
 *
 * Changes from the original: Recharts + ResponsiveContainer replaced by a static SVG with a
 * fixed size (curve maths in ./curve.ts); tooltips, legends, brush, loading/empty/error
 * states, query plumbing and hover styles removed; all colours via UiTheme. The gradient
 * stops (0.3 -> 0.02), 2.5 px area stroke, dashed grid "2 4" at 0.35 opacity, 5-3 dash on
 * the partial segment and the 8 px dotted plot ground follow the original.
 *
 * Animation: none inside. `reveal` (0-1) wipes the plot left to right; drive it from
 * useCurrentFrame() with tween() in the composition.
 */
import React, { useId } from "react";
import { monotoneArea, monotonePath, toPoints } from "./curve";
import { clamp01, defaultTheme, dottedBackground, safeId, type UiTheme } from "./theme";

export interface AreaChartCardProps {
  title: string;
  description?: string;
  /** Values in order (oldest first). */
  values: number[];
  /** Optional labels under the plot, e.g. ["Mon", "Tue", ...]; first/last/middle shown. */
  xLabels?: string[];
  /** Plot size in px (real UI size). */
  width: number;
  plotHeight?: number;
  /** Area (default) or bare line. */
  kind?: "area" | "line";
  /** Draw the last segment dashed (period still in progress). */
  partialLastSegment?: boolean;
  /** Number of horizontal dashed grid lines. 0 = none. */
  gridLines?: number;
  /** Fixed y domain; default is min/max of the data. */
  domain?: [number, number];
  /** 0-1: left-to-right wipe of the plot. 1 = fully drawn. */
  reveal?: number;
  /** Optional element on the right of the header (a value, a range label). */
  headerRight?: React.ReactNode;
  theme?: UiTheme;
  style?: React.CSSProperties;
}

export const AreaChartCard: React.FC<AreaChartCardProps> = ({
  title,
  description,
  values,
  xLabels,
  width,
  plotHeight = 220,
  kind = "area",
  partialLastSegment = false,
  gridLines = 4,
  domain,
  reveal = 1,
  headerRight,
  theme = defaultTheme,
  style,
}) => {
  const gid = `area-${safeId(useId())}`;
  const clipId = `${gid}-clip`;
  const pad = 16;
  const innerW = width - pad * 2;
  const points = toPoints(values, innerW, plotHeight, { pad: 4, domain });
  const n = points.length;
  const solidEnd = partialLastSegment && n > 2 ? n - 2 : n - 1;
  const stroke = kind === "area" ? 2.5 : 1.5;

  return (
    <div
      style={{
        width,
        fontFamily: theme.fontFamily,
        background: theme.surface,
        border: `1px solid ${theme.line}`,
        borderRadius: theme.radius,
        overflow: "hidden",
        ...style,
      }}
    >
      {/* Header strip: title + description left, optional extra right. */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          padding: "12px 16px",
          borderBottom: `1px solid ${theme.line}`,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: theme.textBase, fontWeight: 500, color: theme.ink }}>{title}</div>
          {description ? (
            <div style={{ marginTop: 2, fontSize: theme.textSmall, color: theme.inkMuted }}>
              {description}
            </div>
          ) : null}
        </div>
        {headerRight}
      </div>

      {/* Plot region: dotted sunken ground with the curve on top. */}
      <div style={{ ...dottedBackground(theme), padding: `${pad}px ${pad}px ${xLabels ? 8 : pad}px` }}>
        <svg width={innerW} height={plotHeight} style={{ display: "block", overflow: "visible" }}>
          <defs>
            <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={theme.series} stopOpacity={0.3} />
              <stop offset="100%" stopColor={theme.series} stopOpacity={0.02} />
            </linearGradient>
            <clipPath id={clipId}>
              <rect x={-stroke} y={-stroke} width={(innerW + stroke * 2) * clamp01(reveal)} height={plotHeight + stroke * 2} />
            </clipPath>
          </defs>

          {/* Dashed horizontal grid, like chartCartesianGridDefault. */}
          {Array.from({ length: gridLines }).map((_, i) => {
            const y = ((i + 1) / (gridLines + 1)) * plotHeight;
            return (
              <line
                key={i}
                x1={0}
                x2={innerW}
                y1={y}
                y2={y}
                stroke={theme.line}
                strokeOpacity={0.9}
                strokeDasharray="2 4"
              />
            );
          })}

          <g clipPath={`url(#${clipId})`}>
            {kind === "area" ? <path d={monotoneArea(points, plotHeight)} fill={`url(#${gid})`} /> : null}
            <path
              d={monotonePath(points, 0, solidEnd)}
              fill="none"
              stroke={theme.series}
              strokeWidth={stroke}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {solidEnd < n - 1 ? (
              <path
                d={monotonePath(points, solidEnd, n - 1)}
                fill="none"
                stroke={theme.series}
                strokeWidth={stroke}
                strokeDasharray="5 3"
              />
            ) : null}
          </g>
        </svg>

        {xLabels && xLabels.length > 1 ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 8,
              fontSize: 11,
              color: theme.inkMuted,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <span>{xLabels[0]}</span>
            <span>{xLabels[Math.floor((xLabels.length - 1) / 2)]}</span>
            <span>{xLabels[xLabels.length - 1]}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};
