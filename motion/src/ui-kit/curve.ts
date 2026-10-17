/**
 * SVG path maths for the charts. Pure functions, no DOM measuring, so a chart is the same
 * picture on every render of a frame.
 *
 * monotonePath() reproduces d3-shape's curveMonotoneX (ISC licence, Mike Bostock), which is
 * what Recharts' `type="monotone"` draws in Databuddy's charts. Algorithm: Steffen (1990),
 * "A simple method for monotonic interpolation in one dimension".
 */

export interface Pt {
  x: number;
  y: number;
}

const sign = (v: number) => (v < 0 ? -1 : 1);

/** Tangent at every point (d3 slope3 for interior points, slope2 at the ends). */
const tangents = (p: Pt[]): number[] => {
  const n = p.length;
  const m = new Array<number>(n).fill(0);
  if (n < 2) return m;
  if (n === 2) {
    const s = (p[1].y - p[0].y) / (p[1].x - p[0].x || 1);
    return [s, s];
  }
  for (let i = 1; i < n - 1; i++) {
    const h0 = p[i].x - p[i - 1].x;
    const h1 = p[i + 1].x - p[i].x;
    const s0 = (p[i].y - p[i - 1].y) / (h0 || 1);
    const s1 = (p[i + 1].y - p[i].y) / (h1 || 1);
    const q = (s0 * h1 + s1 * h0) / (h0 + h1 || 1);
    m[i] =
      (sign(s0) + sign(s1)) *
        Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(q)) || 0;
  }
  const hs = p[1].x - p[0].x;
  m[0] = hs ? (3 * (p[1].y - p[0].y)) / hs / 2 - m[1] / 2 : m[1];
  const he = p[n - 1].x - p[n - 2].x;
  m[n - 1] = he ? (3 * (p[n - 1].y - p[n - 2].y)) / he / 2 - m[n - 2] / 2 : m[n - 2];
  return m;
};

/** Cubic segment from point i to i+1 as an SVG "C" command. */
const segment = (p: Pt[], m: number[], i: number) => {
  const a = p[i];
  const b = p[i + 1];
  const dx = (b.x - a.x) / 3;
  return `C${a.x + dx},${a.y + dx * m[i]} ${b.x - dx},${b.y - dx * m[i + 1]} ${b.x},${b.y}`;
};

/**
 * Monotone path through points. `from`/`to` pick a sub-range of segments (indices of
 * points) so a chart can draw its last segment separately (dashed "partial period").
 */
export const monotonePath = (p: Pt[], from = 0, to = p.length - 1): string => {
  if (p.length === 0 || to <= from) return "";
  const m = tangents(p);
  let d = `M${p[from].x},${p[from].y}`;
  for (let i = from; i < to; i++) d += segment(p, m, i);
  return d;
};

/** Closed area under a monotone path, down to `baseY`. */
export const monotoneArea = (p: Pt[], baseY: number): string => {
  if (p.length < 2) return "";
  return `${monotonePath(p)}L${p[p.length - 1].x},${baseY}L${p[0].x},${baseY}Z`;
};

/**
 * Map values to points in a box. Y domain is [min, max] of the data (Databuddy's
 * "dataMin"/"dataMax") unless given. `pad` keeps the stroke from clipping at the edges.
 */
export const toPoints = (
  values: number[],
  width: number,
  height: number,
  o: { pad?: number; domain?: [number, number] } = {},
): Pt[] => {
  const pad = o.pad ?? 2;
  const lo = o.domain?.[0] ?? Math.min(...values);
  const hi = o.domain?.[1] ?? Math.max(...values);
  const span = hi - lo || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;
  return values.map((v, i) => ({
    x: i * stepX,
    y: pad + (1 - (v - lo) / span) * (height - pad * 2),
  }));
};
