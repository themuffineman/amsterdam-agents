/**
 * Funnel: stacked steps, each with a step disc, name, user count, a comb of 1 px ticks as
 * the progress bar and the share of step 1; drop-off strips between steps; an overall
 * conversion footer.
 *
 * Derived from Databuddy (https://github.com/databuddy-analytics/Databuddy), file
 * apps/dashboard/app/(main)/websites/[id]/funnels/_components/funnel-flow.tsx
 * (FunnelFlow, LineProgress). Copyright Databuddy contributors. Licensed AGPL-3.0-only
 * (see _reference/databuddy/LICENSE). Personal, local video rendering only: do not serve this
 * code to users over a network.
 *
 * Changes from the original: the tick count is computed from a `width` prop instead of
 * measuring the DOM in useLayoutEffect (which would change after the first frame); the
 * error tooltip, next/link and route params are removed; CSS transitions on ticks removed;
 * phosphor icons replaced by inline SVG; colours via UiTheme. Tick geometry (1 px wide,
 * 2 px gap, 12 px tall, inactive ticks at half height) follows the original.
 *
 * Animation: none inside. `fill` (0-1, one value or one per step) scales how many ticks are
 * active, so the composition can sweep the combs with eases. `stepStyle(i)` for entries.
 */
import React from "react";
import { clamp01, defaultTheme, withAlpha, type UiTheme } from "./theme";

export interface FunnelStep {
  name: string;
  users: number;
  /** Average seconds to complete this step from the previous one; 0/omit hides it. */
  avgSeconds?: number;
}

export interface FunnelFlowProps {
  steps: FunnelStep[];
  width: number;
  /** 0-1 tick fill per step (or one value for all). 1 = true conversion. */
  fill?: number | number[];
  /** Locale for number formatting (fixed, so renders never depend on the machine). */
  locale?: string;
  showOverall?: boolean;
  stepStyle?: (index: number) => React.CSSProperties | undefined;
  theme?: UiTheme;
  style?: React.CSSProperties;
}

const LINE_WIDTH = 1;
const LINE_GAP = 2;

const formatTime = (s: number) => {
  if (!s || s <= 0) return "";
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${Math.round(s / 3600)}h`;
};

const Check: React.FC<{ color: string }> = ({ color }) => (
  <svg width={20} height={20} viewBox="0 0 20 20" aria-hidden>
    <circle cx={10} cy={10} r={8} fill="none" stroke={color} strokeWidth={1.6} />
    <path d="M6.5 10.2 L9 12.6 L13.6 7.6" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Caret: React.FC<{ color: string }> = ({ color }) => (
  <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden>
    <path d="M3 4.5 L6 7.5 L9 4.5" fill="none" stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Comb of 1 px ticks; `active` of them lit. Width-driven, no DOM measuring. */
const TickComb: React.FC<{ width: number; percentage: number; color: string; theme: UiTheme }> = ({
  width,
  percentage,
  color,
  theme,
}) => {
  const inner = width - 8;
  const count = Math.max(0, Math.floor(inner / (LINE_WIDTH + LINE_GAP)));
  const active = Math.floor((clamp01(percentage / 100)) * count);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: LINE_GAP,
        height: 20,
        padding: "0 4px",
        borderRadius: 4,
        background: theme.surfaceSunken,
        width,
        boxSizing: "border-box",
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            width: LINE_WIDTH,
            height: 12,
            flexShrink: 0,
            borderRadius: 1,
            background: i < active ? color : theme.line,
            transform: i < active ? undefined : "scaleY(0.5)",
          }}
        />
      ))}
    </div>
  );
};

export const FunnelFlow: React.FC<FunnelFlowProps> = ({
  steps,
  width,
  fill = 1,
  locale = "en-US",
  showOverall = true,
  stepStyle,
  theme = defaultTheme,
  style,
}) => {
  if (steps.length === 0) return null;
  const fmt = (n: number) => n.toLocaleString(locale);
  const first = steps[0].users || 1;
  const last = steps[steps.length - 1];
  // Row content width: padding 16*2, disc 40, gaps 16*2, percentage column 64.
  const combWidth = width - 32 - 40 - 32 - 64;

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
      {steps.map((step, i) => {
        const prev = i > 0 ? steps[i - 1] : null;
        const dropped = prev ? prev.users - step.users : 0;
        const stepConv = prev && prev.users > 0 ? (step.users / prev.users) * 100 : 100;
        const total = (step.users / first) * 100;
        const isLast = i === steps.length - 1;
        const f = Array.isArray(fill) ? fill[i] ?? 1 : fill;
        const time = formatTime(step.avgSeconds ?? 0);

        return (
          <div key={`${step.name}-${i}`} style={stepStyle?.(i)}>
            {i !== 0 ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  padding: "8px 0",
                  borderTop: `1px solid ${theme.line}`,
                  borderBottom: `1px solid ${theme.line}`,
                  background: withAlpha(theme.surfaceSunken, 0.5),
                  fontSize: theme.textSmall,
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Caret color={theme.inkMuted} />
                  <span style={{ color: theme.inkMuted }}>{fmt(dropped)} left</span>
                  <span style={{ color: theme.negative, fontWeight: 500 }}>−{(100 - stepConv).toFixed(0)}%</span>
                </span>
                {time ? <span style={{ color: theme.inkMuted }}>· avg {time}</span> : null}
              </div>
            ) : null}

            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 16 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                  borderRadius: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: theme.textBase,
                  fontWeight: 500,
                  background: isLast ? withAlpha(theme.positive, 0.15) : theme.surfaceSunken,
                  color: isLast ? theme.positive : theme.inkMuted,
                }}
              >
                {isLast ? <Check color={theme.positive} /> : i + 1}
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: theme.textBase + 2, fontWeight: 500, color: theme.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {step.name}
                  </span>
                  <span style={{ fontSize: theme.textSmall, color: theme.inkMuted, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                    {fmt(step.users)} users
                  </span>
                </div>
                <TickComb width={combWidth} percentage={total * clamp01(f)} color={isLast ? theme.positive : theme.series} theme={theme} />
              </div>

              <div
                style={{
                  width: 64,
                  flexShrink: 0,
                  textAlign: "right",
                  fontSize: 18,
                  fontWeight: theme.valueWeight,
                  fontVariantNumeric: "tabular-nums",
                  color: isLast ? theme.positive : theme.ink,
                }}
              >
                {total.toFixed(0)}%
              </div>
            </div>
          </div>
        );
      })}

      {showOverall && steps.length > 1 ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderTop: `1px solid ${theme.line}`,
            background: withAlpha(theme.surfaceSunken, 0.5),
          }}
        >
          <span style={{ fontSize: theme.textBase, color: theme.inkMuted }}>Overall conversion</span>
          <span style={{ fontWeight: theme.valueWeight, color: theme.positive, fontVariantNumeric: "tabular-nums" }}>
            {((last.users / first) * 100).toFixed(1)}%
            <span style={{ marginLeft: 6, fontWeight: 400, fontSize: theme.textBase, color: theme.inkMuted }}>
              ({fmt(last.users)} of {fmt(first)})
            </span>
          </span>
        </div>
      ) : null}
    </div>
  );
};
