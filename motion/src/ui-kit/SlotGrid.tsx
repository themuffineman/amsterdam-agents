/**
 * Slot grid: rows of small rounded pills (e.g. 7 days x 24 hours), each pill coloured by a
 * discrete level. Row labels on the left, sparse column labels underneath.
 *
 * Derived from Databuddy (https://github.com/databuddy-analytics/Databuddy), files
 * packages/ui/src/lib/uptime/heatmap-strip.tsx (UptimeHeatmapStrip: rounded pill segments in
 * a CSS grid, colour by severity level, 1-2 px gaps) and
 * apps/dashboard/lib/uptime/uptime-heatmap.tsx (header strip layout).
 * Copyright Databuddy contributors. Licensed AGPL-3.0-only (see _reference/databuddy/LICENSE).
 * Personal, local video rendering only: do not serve this code to users over a network.
 *
 * Changes from the original: one strip per row instead of one strip total; per-cell pills
 * instead of run-length merged segments (so cells can animate individually); tooltips,
 * portals, keyboard handling, hover state and CSS transitions removed; severity colours
 * replaced by UiTheme-driven levels.
 *
 * Levels are discrete on purpose: use it for rankings you actually have (best / runner-up /
 * worst), not to fake magnitudes you don't.
 *
 * Animation: none inside. `cellStyle(row, col)` lets the composition drive per-cell entry and
 * colour from the frame. Use `slotGridGeometry()` to place callouts on exact cells.
 */
import React from "react";
import { defaultTheme, withAlpha, type UiTheme } from "./theme";

export type SlotLevel = "base" | "low" | "good" | "best";

export interface SlotGridRow {
  label: string;
  cells: SlotLevel[];
}

export interface SlotGridProps {
  rows: SlotGridRow[];
  /** Labels under the grid as [columnIndex, text], e.g. [[0, "12 a.m."], [12, "12 p.m."]]. */
  columnLabels?: [number, string][];
  cellWidth?: number;
  cellHeight?: number;
  gap?: number;
  rowGap?: number;
  labelWidth?: number;
  cellStyle?: (row: number, col: number) => React.CSSProperties | undefined;
  rowLabelStyle?: (row: number) => React.CSSProperties | undefined;
  /** Colour per level; defaults derived from the theme. */
  levelColors?: Partial<Record<SlotLevel, string>>;
  theme?: UiTheme;
  style?: React.CSSProperties;
}

const DEFAULTS = { cellWidth: 30, cellHeight: 22, gap: 3, rowGap: 8, labelWidth: 56 };

/** Pixel position of a cell (top-left, size) inside the grid's own coordinate space. */
export const slotGridGeometry = (o: Partial<typeof DEFAULTS> = {}) => {
  const g = { ...DEFAULTS, ...o };
  return {
    ...g,
    cell: (row: number, col: number) => ({
      x: g.labelWidth + col * (g.cellWidth + g.gap),
      y: row * (g.cellHeight + g.rowGap),
      w: g.cellWidth,
      h: g.cellHeight,
    }),
    width: (cols: number) => g.labelWidth + cols * g.cellWidth + (cols - 1) * g.gap,
    height: (rows: number) => rows * g.cellHeight + (rows - 1) * g.rowGap,
  };
};

export const SlotGrid: React.FC<SlotGridProps> = ({
  rows,
  columnLabels = [],
  cellWidth = DEFAULTS.cellWidth,
  cellHeight = DEFAULTS.cellHeight,
  gap = DEFAULTS.gap,
  rowGap = DEFAULTS.rowGap,
  labelWidth = DEFAULTS.labelWidth,
  cellStyle,
  rowLabelStyle,
  levelColors,
  theme = defaultTheme,
  style,
}) => {
  const colors: Record<SlotLevel, string> = {
    base: withAlpha(theme.inkMuted, 0.16),
    low: withAlpha(theme.ink, 0.72),
    good: withAlpha(theme.series, 0.42),
    best: theme.series,
    ...levelColors,
  };
  const cols = rows[0]?.cells.length ?? 0;
  const geo = slotGridGeometry({ cellWidth, cellHeight, gap, rowGap, labelWidth });

  return (
    <div style={{ position: "relative", fontFamily: theme.fontFamily, width: geo.width(cols), ...style }}>
      {rows.map((r, ri) => (
        <div key={r.label} style={{ display: "flex", alignItems: "center", height: cellHeight, marginBottom: ri === rows.length - 1 ? 0 : rowGap }}>
          <div
            style={{
              width: labelWidth,
              flexShrink: 0,
              fontSize: theme.textSmall + 1,
              fontWeight: 500,
              color: theme.inkMuted,
              ...rowLabelStyle?.(ri),
            }}
          >
            {r.label}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${cellWidth}px)`, columnGap: gap }}>
            {r.cells.map((lvl, ci) => (
              <div
                key={ci}
                style={{
                  width: cellWidth,
                  height: cellHeight,
                  borderRadius: Math.min(cellHeight, cellWidth) / 2,
                  background: colors[lvl],
                  ...cellStyle?.(ri, ci),
                }}
              />
            ))}
          </div>
        </div>
      ))}
      {columnLabels.length ? (
        <div style={{ position: "relative", height: 24, marginTop: 10 }}>
          {columnLabels.map(([c, text]) => (
            <span
              key={c}
              style={{
                position: "absolute",
                left: geo.cell(0, c).x,
                fontSize: theme.textSmall,
                color: theme.inkMuted,
                whiteSpace: "nowrap",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {text}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
};
