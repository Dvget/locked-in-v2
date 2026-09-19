import { describe, expect, it } from 'vitest';
import { buildDemoData } from '../data/demoData';
import { EMPTY_DATA } from '../data/repository';
import * as D from './dashboardDetail';

const now = new Date(2026, 8, 17, 12).getTime(); // Thursday
const data = buildDemoData(now);

describe('workout detail', () => {
  it('starts the index at 100 with the first workout ever and keeps all workouts', () => {
    const all = D.workoutSeries(data, 'index');
    expect(all).toHaveLength(data.workouts.length);
    expect(all[0].value).toBe(100);
    expect(all[all.length - 1].value).toBeGreaterThan(100);
    expect(D.workoutSeries(EMPTY_DATA, 'index')).toEqual([]);
  });

  it('limits the graph to the last four weeks and computes the trend inside it', () => {
    const all = D.workoutSeries(data, 'index');
    const recent = D.lastFourWeeks(all, now);
    expect(recent.length).toBeLessThan(all.length);
    expect(recent.every((p) => p.date >= now - 28 * 86_400_000)).toBe(true);
    expect(D.windowChange(recent)).toBeGreaterThan(0);
    expect(D.windowChange(recent.slice(0, 1))).toBeNull();
  });

  it('total weight series only holds workouts with weighted volume', () => {
    const weight = D.workoutSeries(data, 'weight');
    expect(weight.length).toBeGreaterThan(0);
    expect(weight.every((p) => p.value > 0)).toBe(true);
  });

  it('compares week-to-date with the same span of the previous week', () => {
    const k = D.workoutKpis(data, now);
    expect(k.index.current).not.toBeNull();
    expect(k.totalWeight.previous).not.toBeNull();
    expect(D.workoutKpis(EMPTY_DATA, now).index).toEqual({ current: null, previous: null, change: null });
  });
});

describe('run, weight and steps detail', () => {
  it('builds run series per metric inside the window', () => {
    const distance = D.runSeries(data, 'distance', now);
    const index = D.runSeries(data, 'index', now);
    expect(distance.length).toBe(index.length);
    expect(distance[0].detail).toContain('km');
    expect(index[0].detail).toContain('Index');
    expect(D.runSeries(EMPTY_DATA, 'pace', now)).toEqual([]);
  });

  it('gives run KPIs only when this week has runs', () => {
    const k = D.runKpis(data, now);
    expect(k.comparison.current.count).toBeGreaterThan(0);
    expect(D.runKpis(EMPTY_DATA, now).averageDistanceChange).toBeNull();
  });

  it('gives weight points of the last 28 days and week KPIs', () => {
    const series = D.weightSeries28(data, now);
    expect(series.length).toBeGreaterThan(5);
    const k = D.weightKpis(data, now);
    expect(k.measurementsThisWeek).toBeGreaterThan(0);
    expect(k.currentAverageKg).not.toBeNull();
  });

  it('shows Monday to Sunday step bars with the goal in the chart maximum', () => {
    const s = D.stepsDetail(data, 10_000, now);
    expect(s.bars.map((b) => b.label)).toEqual(['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']);
    expect(s.chartMaximum).toBeGreaterThanOrEqual(10_000);
    expect(s.fourWeekAverage).not.toBeNull();
    expect(D.stepsDetail(EMPTY_DATA, 10_000, now).weekAverage).toBeNull();
  });
});
