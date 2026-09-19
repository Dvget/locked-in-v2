import { describe, expect, it } from 'vitest';
import { buildDemoData } from '../data/demoData';
import { DEFAULT_SETTINGS, EMPTY_DATA } from '../data/repository';
import { buildWeeklyReport, comparisonWeeks, percentText, signedKgText, toneForChange, weekKey, weightToneForGoal } from './weeklyReport';

const now = new Date(2026, 8, 17, 12).getTime(); // Thursday 17 Sep 2026

describe('weekly report', () => {
  it('compares the last completed week with the one before', () => {
    const { current, previous } = comparisonWeeks(now);
    expect(new Date(current.start).getDate()).toBe(7); // Mon 7 Sep
    expect(new Date(previous.start).getDate()).toBe(31); // Mon 31 Aug
  });

  it('shows only comparable categories', () => {
    expect(buildWeeklyReport(EMPTY_DATA, DEFAULT_SETTINGS, now).isEmpty).toBe(true);
    const data = buildDemoData(now);
    const report = buildWeeklyReport(data, DEFAULT_SETTINGS, now);
    expect(report.isEmpty).toBe(false);
    expect(report.categories.map((c) => c.id)).toContain('workouts');
    expect(report.categories.map((c) => c.id)).toContain('runs');
    // only one week of weights -> not comparable
    const noPrevWeights = buildWeeklyReport({ ...data, weights: data.weights.filter((w) => w.date > new Date(2026, 8, 7).getTime()) }, DEFAULT_SETTINGS, now);
    expect(noPrevWeights.categories.map((c) => c.id)).not.toContain('weight');
    expect(report.context.workoutsPerWeek).toHaveLength(8);
  });

  it('maps tones', () => {
    expect(toneForChange(null)).toBe('neutral');
    expect(toneForChange(1)).toBe('positive');
    expect(toneForChange(-1)).toBe('negative');
    expect(toneForChange(0.01)).toBe('caution');
    expect(weightToneForGoal(-0.5, 'lose')).toBe('positive');
    expect(weightToneForGoal(0.5, 'lose')).toBe('negative');
    expect(weightToneForGoal(0.5, 'gain')).toBe('positive');
    expect(weightToneForGoal(0.4, 'maintain')).toBe('positive');
    expect(weightToneForGoal(1.5, 'maintain')).toBe('negative');
  });

  it('formats text and week key', () => {
    expect(percentText(null)).toBe('—');
    expect(percentText(3.14)).toBe('+3,1 %');
    expect(percentText(-3.14)).toBe('-3,1 %');
    expect(signedKgText(-0.42)).toBe('-0,4 kg');
    expect(signedKgText(0.01)).toBe('0,0 kg');
    expect(weekKey(now)).toBe('2026-09-14');
    expect(weekKey(new Date(2026, 8, 20, 23).getTime())).toBe('2026-09-14');
    expect(weekKey(new Date(2026, 8, 21, 1).getTime())).toBe('2026-09-21');
  });
});
