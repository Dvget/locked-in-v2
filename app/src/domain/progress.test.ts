import { describe, expect, it } from 'vitest';
import { buildDemoData } from '../data/demoData';
import { buildExerciseHistory, buildRunProgress, buildTrainingProgress, buildWeightProgress } from './progress';

const now = new Date(2026, 8, 17, 12).getTime();
const data = buildDemoData(now);

describe('progress', () => {
  it('summarizes training', () => {
    const p = buildTrainingProgress(data);
    expect(p.workoutCount).toBe(data.workouts.length);
    expect(p.setCount).toBeGreaterThan(50);
    expect(p.totalVolumeKg).toBeGreaterThan(1000);
    expect(p.indexSeries.length).toBeGreaterThan(3);
    expect(p.indexSeries[p.indexSeries.length - 1].value).toBeGreaterThan(100); // demo data keeps improving
    expect(p.exercises.length).toBe(7);
  });

  it('builds one exercise history in chronological order', () => {
    const h = buildExerciseHistory('barbell_squat', data);
    expect(h.length).toBe(data.workouts.length);
    expect(h[0].date).toBeLessThan(h[h.length - 1].date);
    expect(h[0].estimatedStrengthKg).not.toBeNull();
    const pullups = buildExerciseHistory('pullup_straight', data);
    expect(pullups[0].maxWeightKg).toBeNull();
    expect(pullups[0].totalReps).toBeGreaterThan(0);
  });

  it('summarizes runs and detects faster pace as positive', () => {
    const p = buildRunProgress(data, 'pace');
    expect(p.runCount).toBe(data.runs.length);
    expect(p.totalDistanceKm).toBeGreaterThan(30);
    expect(p.averagePaceSecondsPerKm).toBeGreaterThan(300);
    expect(p.change).toBeGreaterThan(0);
  });

  it('summarizes weight per week', () => {
    const w = buildWeightProgress(data, 'all', now);
    expect(w.latestKg).not.toBeNull();
    expect(w.series.length).toBeGreaterThan(3);
    expect(buildWeightProgress({ ...data, weights: [] }, 'all', now).series).toEqual([]);
  });
});
