import { describe, expect, it } from 'vitest';
import { areaPath, linePath, nearestIndex, paddedRange, scalePoints, ticks } from './chartMath';

const layout = { width: 200, height: 100, padding: { top: 10, right: 10, bottom: 10, left: 10 } };

describe('chart math', () => {
  it('pads ranges and handles flat series', () => {
    const r = paddedRange([10, 20]);
    expect(r.min).toBeLessThan(10);
    expect(r.max).toBeGreaterThan(20);
    const flat = paddedRange([5, 5]);
    expect(flat.max).toBeGreaterThan(flat.min);
    expect(paddedRange([])).toEqual({ min: 0, max: 1 });
    expect(paddedRange([3, 8], true).min).toBeLessThanOrEqual(0);
  });

  it('scales points proportionally and flips y', () => {
    const scaled = scalePoints([{ x: 0, y: 0 }, { x: 10, y: 10 }], layout, { min: 0, max: 10 });
    expect(scaled[0]).toMatchObject({ px: 10, py: 90 });
    expect(scaled[1]).toMatchObject({ px: 190, py: 10 });
    expect(scalePoints([], layout)).toEqual([]);
    expect(scalePoints([{ x: 5, y: 1 }], layout)[0].px).toBe(100); // single point centered
  });

  it('builds paths and finds the nearest point', () => {
    const scaled = scalePoints([{ x: 0, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 3 }], layout);
    expect(linePath(scaled).startsWith('M10.0')).toBe(true);
    expect(areaPath(scaled, 90).endsWith('Z')).toBe(true);
    expect(nearestIndex(scaled, 12)).toBe(0);
    expect(nearestIndex(scaled, 190)).toBe(2);
    expect(ticks(0, 10, 3)).toEqual([0, 5, 10]);
  });
});
