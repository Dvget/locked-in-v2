// Geometry helpers for the custom SVG charts. Pure and testable.

export interface ChartPoint {
  /** x value (any numeric axis, for example a timestamp); points are drawn proportionally */
  x: number;
  y: number;
  label?: string;
}

export interface Scaled {
  px: number;
  py: number;
  point: ChartPoint;
}

export interface Layout {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

/** Value range with 8 % headroom; a flat series still gets a visible range. */
export function paddedRange(values: number[], includeZero = false): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 1 };
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (includeZero) min = Math.min(min, 0);
  if (min === max) {
    const pad = Math.abs(min) * 0.05 || 1;
    return { min: min - pad, max: max + pad };
  }
  const pad = (max - min) * 0.08;
  return { min: includeZero && min === 0 ? 0 : min - pad, max: max + pad };
}

export function scalePoints(points: ChartPoint[], layout: Layout, range?: { min: number; max: number }): Scaled[] {
  if (points.length === 0 || layout.width <= 0) return [];
  const { padding: p } = layout;
  const innerW = Math.max(1, layout.width - p.left - p.right);
  const innerH = Math.max(1, layout.height - p.top - p.bottom);
  const xs = points.map((pt) => pt.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const { min, max } = range ?? paddedRange(points.map((pt) => pt.y));
  return points.map((point) => ({
    point,
    px: p.left + (maxX === minX ? innerW / 2 : ((point.x - minX) / (maxX - minX)) * innerW),
    py: p.top + innerH * (1 - (point.y - min) / (max - min || 1)),
  }));
}

/** SVG path for a polyline through the scaled points. */
export function linePath(scaled: Scaled[]): string {
  return scaled.map((s, i) => `${i === 0 ? 'M' : 'L'}${s.px.toFixed(1)} ${s.py.toFixed(1)}`).join(' ');
}

/** Closed path under the line down to the baseline (for the area fill). */
export function areaPath(scaled: Scaled[], baseline: number): string {
  if (scaled.length === 0) return '';
  const first = scaled[0];
  const last = scaled[scaled.length - 1];
  return `${linePath(scaled)} L${last.px.toFixed(1)} ${baseline.toFixed(1)} L${first.px.toFixed(1)} ${baseline.toFixed(1)} Z`;
}

/** Index of the point whose x position is closest to `px`. */
export function nearestIndex(scaled: Scaled[], px: number): number {
  let best = 0;
  let distance = Infinity;
  scaled.forEach((s, i) => {
    const d = Math.abs(s.px - px);
    if (d < distance) {
      distance = d;
      best = i;
    }
  });
  return best;
}

/** Evenly spaced tick values inside a range (for restrained grid lines). */
export function ticks(min: number, max: number, count = 3): number[] {
  if (count < 2 || max <= min) return [min];
  return Array.from({ length: count }, (_, i) => min + ((max - min) * i) / (count - 1));
}
