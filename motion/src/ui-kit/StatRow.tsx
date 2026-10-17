/**
 * Stat row: a row of stat tiles. Each tile = optional sparkline over a dotted plot, then a
 * footer with icon box, value, label and a trend arrow + percentage.
 *
 * Derived from Databuddy (https://github.com/databuddy-analytics/Databuddy), file
 * apps/dashboard/components/analytics/stat-card.tsx (StatCard, TrendIndicator, MiniChart),
 * with chart surfaces from apps/dashboard/components/ui/composables/chart.tsx.
 * Copyright Databuddy contributors. Licensed AGPL-3.0-only (see _reference/databuddy/LICENSE).
 * Personal, local video rendering only: do not serve this code to users over a network.
 *
 * Changes from the original: removed HoverCard period comparison, loading skeletons,
 * formatters and dayjs; value is a pre-formatted string prop; Recharts mini chart replaced by
 * a static SVG; phosphor trend icons replaced by inline SVG arrows; weights brought into the
 * skill's 400-550 range; colours via UiTheme. Mini chart height (102 px) and gradient
 * (0.4 -> 0) follow the original.
 *
 * Animation: none inside. Per-tile `reveal` wipes the sparkline; animate tile entry and
 * value counting from the composition (authored steps, never a linear tween of digits).
 */
import React, { useId } from "react";
import { monotoneArea, monotonePath, toPoints } from "./curve";
import { clamp01, defaultTheme, dottedBackground, safeId, type UiTheme } from "./theme";

export interface StatTileData {
  /** Label under the value, e.g. "Visitors". */
  label: string;
  /** Pre-formatted value, e.g. "12,408" or "2m 14s". */
  value: string;
  /** Change in percent vs previous period, e.g. 12.4 or -3. Omit for none. */
  trend?: number;
  /** Treat a rise as bad (e.g. bounce rate). */
  invertTrend?: boolean;
  /** Sparkline values; omit for a compact tile with no plot. */
  series?: number[];
  /** Optional 16 px icon (an <svg>) shown in the footer box. */
  icon?: React.ReactNode;
}

const MINI_CHART_HEIGHT = 102;

const TrendArrow: React.FC<{ up: boolean; color: string }> = ({ up, color }) => (
  <svg width={14} height={14} viewBox="0 0 16 16" aria-hidden>
    <path
      d={up ? "M2 11 L6.5 6.5 L9 9 L14 4 M10 4 H14 V8" : "M2 5 L6.5 9.5 L9 7 L14 12 M10 12 H14 V8"}
      fill="none"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const StatTile: React.FC<{
  data: StatTileData;
  width: number;
  reveal?: number;
  theme?: UiTheme;
  style?: React.CSSProperties;
}> = ({ data, width, reveal = 1, theme = defaultTheme, style }) => {
  const gid = `stat-${safeId(useId())}`;
  const hasTrend = data.trend !== undefined && !Number.isNaN(data.trend);
  const good = hasTrend && (data.invertTrend ? data.trend! < 0 : data.trend! > 0);
  const trendColor = !hasTrend || data.trend === 0 ? theme.inkMuted : good ? theme.positive : theme.negative;

  const series = data.series && data.series.length > 1 ? data.series : null;
  const flat = series ? series.every((v) => v === series[0]) : false;
  const points = series ? toPoints(series, width, MINI_CHART_HEIGHT, { pad: 3 }) : [];

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
      {series ? (
        <div style={{ ...dottedBackground(theme), paddingTop: 8 }}>
          <svg width={width} height={MINI_CHART_HEIGHT} style={{ display: "block" }}>
            <defs>
              <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={theme.series} stopOpacity={0.4} />
                <stop offset="100%" stopColor={theme.series} stopOpacity={0} />
              </linearGradient>
              <clipPath id={`${gid}-clip`}>
                <rect x={0} y={0} width={width * clamp01(reveal)} height={MINI_CHART_HEIGHT} />
              </clipPath>
            </defs>
            {flat ? (
              <line x1={0} x2={width} y1={MINI_CHART_HEIGHT / 2} y2={MINI_CHART_HEIGHT / 2} stroke={theme.series} strokeOpacity={0.3} />
            ) : (
              <g clipPath={`url(#${gid}-clip)`}>
                <path d={monotoneArea(points, MINI_CHART_HEIGHT)} fill={`url(#${gid})`} />
                <path d={monotonePath(points)} fill="none" stroke={theme.series} strokeWidth={1.5} />
              </g>
            )}
          </svg>
        </div>
      ) : null}

      {/* Footer: icon box, value + label, trend. */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10 }}>
        {data.icon ? (
          <div
            style={{
              width: 28,
              height: 28,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: theme.radius - 2,
              background: theme.surfaceSunken,
              color: theme.inkMuted,
            }}
          >
            {data.icon}
          </div>
        ) : null}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 16,
              lineHeight: 1.2,
              fontWeight: theme.valueWeight,
              color: theme.ink,
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {data.value}
          </div>
          <div style={{ fontSize: theme.textSmall, color: theme.inkMuted, whiteSpace: "nowrap" }}>{data.label}</div>
        </div>
        {hasTrend ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4, color: trendColor, flexShrink: 0 }}>
            {data.trend !== 0 ? <TrendArrow up={data.trend! > 0} color={trendColor} /> : null}
            <span style={{ fontSize: theme.textSmall, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
              {data.trend! > 0 ? "+" : data.trend! < 0 ? "−" : ""}
              {Math.abs(data.trend!).toFixed(0)}%
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export interface StatRowProps {
  tiles: StatTileData[];
  /** Width of each tile in px. */
  tileWidth: number;
  gap?: number;
  /** Per-tile sparkline reveal 0-1 (same length as tiles), or one value for all. */
  reveal?: number | number[];
  /** Per-tile style hook, e.g. entry transforms computed from the frame by the caller. */
  tileStyle?: (index: number) => React.CSSProperties | undefined;
  theme?: UiTheme;
  style?: React.CSSProperties;
}

export const StatRow: React.FC<StatRowProps> = ({
  tiles,
  tileWidth,
  gap = 12,
  reveal = 1,
  tileStyle,
  theme = defaultTheme,
  style,
}) => (
  <div style={{ display: "flex", gap, alignItems: "flex-start", ...style }}>
    {tiles.map((t, i) => (
      <StatTile
        key={`${t.label}-${i}`}
        data={t}
        width={tileWidth}
        reveal={Array.isArray(reveal) ? reveal[i] ?? 1 : reveal}
        theme={theme}
        style={tileStyle?.(i)}
      />
    ))}
  </div>
);
