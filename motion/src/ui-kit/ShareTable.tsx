/**
 * Data table (5-8 rows) with a "share" bar painted behind each row and a percentage badge.
 *
 * Derived from Databuddy (https://github.com/databuddy-analytics/Databuddy), files
 * apps/dashboard/components/table/table-content.tsx (header/row layout, getShareBarStyle),
 * apps/dashboard/components/table/rows/page-row.tsx and metric-row.tsx (column set), and
 * packages/ui/src/components/badge.tsx (PercentageBadge thresholds).
 * Copyright Databuddy contributors. Licensed AGPL-3.0-only (see _reference/databuddy/LICENSE).
 * Personal, local video rendering only: do not serve this code to users over a network.
 *
 * Changes from the original: TanStack Table, tabs, expandable sub-rows, keyboard handling,
 * hover/focus styles and CSS transitions removed; plain columns + rows props; all colours
 * via UiTheme. Row height (36 px), header height (32 px), the share-bar gradient stops
 * (solid to pct-6, soft to pct+2, clear by pct+8) and badge thresholds follow the original.
 *
 * Animation: none inside. `rowStyle(i)` lets the composition apply frame-driven entry
 * transforms per row; `shareScale` (0-1) grows every share bar from the left.
 */
import React from "react";
import { defaultTheme, withAlpha, type UiTheme } from "./theme";

export interface ShareTableColumn {
  /** Header text. */
  header: string;
  /** Fixed width in px; one column may omit it to take the remaining width. */
  width?: number;
  /** Right-align (numbers). */
  numeric?: boolean;
}

export interface ShareTableRow {
  /** One pre-formatted string per column, in column order. */
  cells: string[];
  /** Share of total, 0-100. Paints the row bar and the badge. */
  percentage: number;
}

export interface ShareTableProps {
  columns: ShareTableColumn[];
  rows: ShareTableRow[];
  width: number;
  /** Show the percentage badge as a last column. */
  showBadge?: boolean;
  badgeHeader?: string;
  /** 0-1 multiplier on every share bar's length. */
  shareScale?: number;
  rowStyle?: (index: number) => React.CSSProperties | undefined;
  theme?: UiTheme;
  style?: React.CSSProperties;
}

/** Badge colour by share, thresholds from Databuddy's percentageVariant(). */
const badgeColors = (pct: number, theme: UiTheme) => {
  if (pct >= 50) return { fg: theme.positive, bg: withAlpha(theme.positive, 0.15) };
  if (pct >= 25) return { fg: theme.surface, bg: theme.ink };
  if (pct >= 10) return { fg: theme.warning, bg: withAlpha(theme.warning, 0.15) };
  return { fg: theme.inkMuted, bg: theme.surfaceSunken };
};

const shareBar = (pct: number, theme: UiTheme): React.CSSProperties | undefined => {
  if (pct <= 0) return undefined;
  const solidEnd = Math.max(0, pct - 6);
  const softEnd = Math.min(100, pct + 2);
  const fadeEnd = Math.min(100, pct + 8);
  const strong = withAlpha(theme.shareTint, 0.1);
  const soft = withAlpha(theme.shareTint, 0.04);
  return {
    backgroundImage: `linear-gradient(to right, ${strong} 0%, ${strong} ${solidEnd}%, ${soft} ${softEnd}%, transparent ${fadeEnd}%)`,
  };
};

export const ShareTable: React.FC<ShareTableProps> = ({
  columns,
  rows,
  width,
  showBadge = true,
  badgeHeader = "Share",
  shareScale = 1,
  rowStyle,
  theme = defaultTheme,
  style,
}) => {
  const allCols: ShareTableColumn[] = showBadge
    ? [...columns, { header: badgeHeader, width: 72, numeric: true }]
    : columns;

  const cellBase = (col: ShareTableColumn): React.CSSProperties => ({
    width: col.width,
    flex: col.width ? `0 0 ${col.width}px` : "1 1 0",
    minWidth: 0,
    padding: "0 12px",
    textAlign: col.numeric ? "right" : "left",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  });

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
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: 32,
          borderBottom: `1px solid ${theme.line}`,
          fontSize: theme.textSmall,
          fontWeight: 500,
          color: theme.inkMuted,
        }}
      >
        {allCols.map((c, i) => (
          <div key={i} style={cellBase(c)}>
            {c.header}
          </div>
        ))}
      </div>

      {rows.map((r, ri) => {
        const badge = badgeColors(r.percentage, theme);
        return (
          <div
            key={ri}
            style={{
              display: "flex",
              alignItems: "center",
              height: 36,
              borderBottom: ri === rows.length - 1 ? undefined : `1px solid ${withAlpha(theme.line, 0.6)}`,
              background: theme.surface,
              ...shareBar(r.percentage * shareScale, theme),
              fontSize: theme.textBase,
              color: theme.ink,
              ...rowStyle?.(ri),
            }}
          >
            {columns.map((c, ci) => (
              <div
                key={ci}
                style={{
                  ...cellBase(c),
                  fontWeight: ci === 0 ? 500 : 400,
                  fontVariantNumeric: c.numeric ? "tabular-nums" : undefined,
                }}
              >
                {r.cells[ci]}
              </div>
            ))}
            {showBadge ? (
              <div style={cellBase(allCols[allCols.length - 1])}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 500,
                    fontVariantNumeric: "tabular-nums",
                    color: badge.fg,
                    background: badge.bg,
                  }}
                >
                  {r.percentage.toFixed(1)}%
                </span>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
