// Presentational UI pieces derived from Databuddy (AGPL-3.0, attribution in each file).
// AGPL-3.0 (LICENSE-AGPL-3.0 here). All are frame-deterministic: no effects, no transitions,
// no randomness; animation is driven by props from the composition.
export { AreaChartCard } from "./AreaChartCard";
export type { AreaChartCardProps } from "./AreaChartCard";
export { StatRow, StatTile } from "./StatRow";
export type { StatRowProps, StatTileData } from "./StatRow";
export { ShareTable } from "./ShareTable";
export type { ShareTableColumn, ShareTableProps, ShareTableRow } from "./ShareTable";
export { FunnelFlow } from "./FunnelFlow";
export type { FunnelFlowProps, FunnelStep } from "./FunnelFlow";
export { TickGauge } from "./TickGauge";
export type { GaugeRating, TickGaugeProps } from "./TickGauge";
export { defaultTheme, dottedBackground, withAlpha } from "./theme";
export type { UiTheme } from "./theme";
export { SlotGrid, slotGridGeometry } from "./SlotGrid";
export type { SlotGridProps, SlotGridRow, SlotLevel } from "./SlotGrid";
