import { describe, expect, it } from 'vitest';
import { computeAchievements, formatPace } from './achievements';
import { buildDashboard, formatSignedKg, formatSteps, weightTone } from './dashboard';
import { buildDemoData } from '../data/demoData';
import { DEFAULT_SETTINGS, EMPTY_DATA } from '../data/repository';

const now = new Date(2026, 8, 17, 12).getTime(); // Thursday

describe('dashboard', () => {
  it('is empty without data', () => {
    const m = buildDashboard(EMPTY_DATA, DEFAULT_SETTINGS, now);
    expect(m.hasAnyData).toBe(false);
    expect(m.workoutsThisWeek).toBe(0);
    expect(m.latestWeightKg).toBeNull();
    expect(m.lastAchievement).toBeNull();
    expect(m.trainingTrend).toBe('none');
  });

  it('summarizes demo data', () => {
    const m = buildDashboard(buildDemoData(now), DEFAULT_SETTINGS, now);
    expect(m.hasAnyData).toBe(true);
    expect(m.workoutsThisWeek).toBe(1);
    expect(m.runsThisWeek).toBe(1);
    expect(m.trainingCounts4Weeks).toEqual([2, 2, 2, 1]);
    expect(m.latestWeightKg).not.toBeNull();
    expect(m.weightSeries.length).toBeGreaterThan(1);
    expect(m.stepsThisWeek).toBeGreaterThan(0);
  });

  it('judges weight change by goal direction (D-016)', () => {
    expect(weightTone(-1, 'lose')).toBe('green');
    expect(weightTone(0.3, 'lose')).toBe('yellow');
    expect(weightTone(0.6, 'lose')).toBe('red');
    expect(weightTone(0.4, 'maintain')).toBe('green');
    expect(weightTone(-1.2, 'maintain')).toBe('red');
    expect(weightTone(1, 'gain')).toBe('green');
    expect(weightTone(-0.3, 'gain')).toBe('yellow');
    expect(weightTone(-2, 'gain')).toBe('red');
  });

  it('formats German numbers', () => {
    expect(formatSteps(54280)).toBe('54.280');
    expect(formatSignedKg(-0.64)).toBe('-0,6');
    expect(formatSignedKg(0.01)).toBe('±0,0');
    expect(formatPace(348)).toBe('5:48 /km');
    expect(formatPace(0)).toBe('–');
  });
});

describe('achievements', () => {
  it('reports only real personal bests, not baselines', () => {
    const data = buildDemoData(now);
    const list = computeAchievements(data.workouts, data.sets, data.runs);
    expect(list.length).toBeGreaterThan(0);
    const dates = list.map((a) => a.date);
    expect(dates).toEqual([...dates].sort((a, b) => a - b));
    expect(computeAchievements([], [], [])).toEqual([]);
    // one workout only: baseline, nothing earned
    const single = computeAchievements(data.workouts.slice(0, 1), data.sets, []);
    expect(single).toEqual([]);
  });
});
