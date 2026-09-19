import { describe, expect, it } from 'vitest';
import * as A from './analytics';
import { addDays, startOfWeek } from './dates';

const d = (iso: string): number => {
  const [y, m, day] = iso.split('-').map(Number);
  return new Date(y, m - 1, day).getTime();
};
const step = (iso: string, steps: number, source = 'pedometer'): A.StepSample => ({ date: d(iso), steps, source });

describe('weeks', () => {
  it('starts on Monday', () => {
    expect(startOfWeek(d('2026-09-06'))).toBe(d('2026-08-31')); // Sunday -> Monday before
    expect(startOfWeek(d('2026-08-31'))).toBe(d('2026-08-31'));
    expect(addDays(d('2026-08-31'), 7)).toBe(d('2026-09-07'));
  });
});

describe('runs', () => {
  it('summarizes rolling 28 days with distance-weighted pace', () => {
    const s = A.runSummary(
      [
        { date: d('2026-08-05'), distanceKm: 5, durationSeconds: 1500 },
        { date: d('2026-08-06'), distanceKm: 10, durationSeconds: 3600 },
        { date: d('2026-08-04'), distanceKm: 20, durationSeconds: 7200 },
      ],
      28,
      d('2026-09-01'),
    );
    expect(s.count).toBe(2);
    expect(s.totalDistanceKm).toBeCloseTo(15);
    expect(s.averageDistanceKm).toBeCloseTo(7.5);
    expect(s.weightedPaceSecondsPerKm).toBeCloseTo(340);
  });

  it('combines distance and pace in the weekly change', () => {
    const change = A.weeklyRunChange(
      [
        { date: d('2026-08-25'), distanceKm: 5, durationSeconds: 1800 },
        { date: d('2026-09-01'), distanceKm: 5.5, durationSeconds: 1800 },
      ],
      d('2026-09-01'),
    );
    expect(change).toBeCloseTo(10, 0);
  });

  it('uses raw distance and treats faster pace as positive', () => {
    const samples = [
      { date: d('2026-08-01'), distanceKm: 5, durationSeconds: 1800 },
      { date: d('2026-08-08'), distanceKm: 7.5, durationSeconds: 3150 },
    ];
    expect(A.runSeriesChange(samples, 'distance')).toBeCloseTo(50);
    expect(A.runSeriesChange(samples, 'pace')).toBeCloseTo(-14.285, 2);
    expect(A.runSeriesChange(samples, 'overall')).toBeCloseTo(13.389, 2);
    const faster = [samples[0], { date: d('2026-08-08'), distanceKm: 5, durationSeconds: 1500 }];
    expect(A.runSeriesChange(faster, 'pace')).toBeCloseTo(20);
  });

  it('compares a run with the previous run', () => {
    const previous = { date: d('2026-08-01'), distanceKm: 5, durationSeconds: 1800 };
    const current = { date: d('2026-08-08'), distanceKm: 6, durationSeconds: 1800 };
    expect(A.runChange(current, previous)).toBeCloseTo(20);
  });
});

describe('steps', () => {
  it('prefers one automatic value per day', () => {
    const day = d('2026-09-01');
    const preferred = A.preferredStepSamples([
      { date: day, steps: 8000, source: 'manual' },
      { date: day, steps: 9000, source: 'coremotion' },
      { date: day, steps: 10000, source: 'coremotion' },
    ]);
    expect(preferred).toHaveLength(1);
    expect(preferred[0].steps).toBe(10000);
    expect(preferred[0].source).toBe('coremotion');
  });

  it('averages only days with samples', () => {
    expect(A.recordedStepAverage([step('2026-08-31', 10000), step('2026-09-01', 4000)])).toBe(7000);
    expect(
      A.recordedStepAverage([
        step('2026-08-31', 8000, 'manual'),
        step('2026-08-31', 10000),
        step('2026-09-01', 4000),
      ]),
    ).toBe(7000);
  });

  it('excludes today from the completed-day average', () => {
    const now = d('2026-09-02');
    expect(A.completedDayStepAverage([step('2026-08-31', 10000), step('2026-09-01', 4000), step('2026-09-02', 0)], now)).toBe(7000);
    expect(A.completedDayStepAverage([step('2026-09-01', 8000), step('2026-09-02', 3000)], now)).toBe(8000);
    expect(A.completedDayStepAverage([step('2026-09-02', 3000)], now)).toBeNull();
  });

  it('uses the elapsed weekly target for progress status', () => {
    expect(A.stepProgressStatus(10000, 2)).toBe('red');
    expect(A.stepProgressStatus(18000, 2)).toBe('yellow');
    expect(A.stepProgressStatus(20000, 2)).toBe('green');
  });

  it('keeps headroom on the chart maximum', () => {
    expect(A.stepChartMaximum([])).toBe(10000);
    expect(A.stepChartMaximum([10000])).toBe(10000);
    expect(A.stepChartMaximum([10001])).toBe(12500);
    expect(A.stepChartMaximum([13100])).toBe(15000);
    expect(A.stepChartMaximum([18600])).toBe(22500);
  });

  it('applies the agreed daily thresholds', () => {
    expect(A.dailyStepStatus(4000)).toBe('red');
    expect(A.dailyStepStatus(4001)).toBe('yellow');
    expect(A.dailyStepStatus(7499)).toBe('yellow');
    expect(A.dailyStepStatus(7500)).toBe('green');
  });

  it('builds week buckets Monday to Sunday', () => {
    const buckets = A.stepBuckets([step('2026-09-01', 5000)], 'week', d('2026-09-02'));
    expect(buckets.map((b) => b.label)).toEqual(['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']);
    expect(buckets[1].steps).toBe(5000);
    expect(buckets[0].steps).toBe(0);
  });
});

describe('goals and strength helpers', () => {
  it('accounts for both goals and remaining days', () => {
    expect(A.weeklyGoalStatus({ completed: 1, otherCompleted: 1, remainingDays: 4 })).toBe('green');
    expect(A.weeklyGoalStatus({ completed: 1, otherCompleted: 1, remainingDays: 2 })).toBe('yellow');
    expect(A.weeklyGoalStatus({ completed: 1, otherCompleted: 0, remainingDays: 2 })).toBe('red');
    expect(A.weeklyGoalStatus({ completed: 2, otherCompleted: 0, remainingDays: 1 })).toBe('green');
  });

  it('builds a cumulative index', () => {
    const points = A.cumulativeIndex([10, -5]);
    expect(points[0]).toBeCloseTo(100);
    expect(points[1]).toBeCloseTo(110);
    expect(points[2]).toBeCloseTo(104.5);
  });

  it('sums only weighted completed repetitions as volume', () => {
    expect(
      A.trainingVolume([
        { weightKg: 60, reps: 8, repsOnly: false },
        { weightKg: 20, reps: 10, repsOnly: false },
        { weightKg: 0, reps: 50, repsOnly: true },
        { weightKg: 100, reps: 0, repsOnly: false },
      ]),
    ).toBeCloseTo(680);
  });

  it('uses highest weight and total reps per exercise', () => {
    const m = A.exerciseWorkoutMetrics(
      [
        { weightKg: 60, reps: 8 },
        { weightKg: 62, reps: 7 },
        { weightKg: 60, reps: 6 },
        { weightKg: 100, reps: 0 },
      ],
      false,
    );
    expect(m.maximumWeightKg).toBe(62);
    expect(m.totalReps).toBe(21);
    const r = A.exerciseWorkoutMetrics([{ weightKg: 20, reps: 5 }, { weightKg: 20, reps: 4 }], true);
    expect(r.maximumWeightKg).toBeNull();
    expect(r.totalReps).toBe(9);
  });

  it('picks the best set by estimated strength', () => {
    const best = A.exerciseBestSet([
      { weightKg: 60, reps: 8 },
      { weightKg: 65, reps: 5 },
      { weightKg: 62, reps: 7 },
    ]);
    expect(best?.weightKg).toBe(62);
    expect(best?.reps).toBe(7);
    expect(best?.estimatedStrengthKg).toBeCloseTo(76.466, 2);
    expect(A.exerciseBestSet([{ weightKg: 0, reps: 12 }, { weightKg: 60, reps: 0 }])).toBeNull();
    expect(A.exerciseBestSet([{ weightKg: 0, reps: 12 }, { weightKg: 50, reps: 10 }])?.estimatedStrengthKg).toBeCloseTo(66.666, 2);
  });

  it('computes percentage change', () => {
    expect(A.percentageChange(50, 60)).toBeCloseTo(20);
    expect(A.percentageChange(10, 8)).toBeCloseTo(-20);
    expect(A.percentageChange(0, 10)).toBeNull();
  });
});

describe('weight', () => {
  it('picks the default range from the history span', () => {
    expect(A.defaultWeightRange([{ date: d('2026-08-28'), weightKg: 94 }, { date: d('2026-09-01'), weightKg: 93.5 }])).toBe('week');
    expect(A.defaultWeightRange([{ date: d('2026-06-01'), weightKg: 96 }, { date: d('2026-09-01'), weightKg: 93.5 }])).toBe('year');
    expect(A.defaultWeightRange([{ date: d('2025-01-01'), weightKg: 100 }, { date: d('2026-09-01'), weightKg: 93.5 }])).toBe('all');
  });

  it('averages measurements by Monday-first week', () => {
    const points = A.weightPoints(
      [
        { date: d('2026-08-31'), weightKg: 94 },
        { date: d('2026-09-01'), weightKg: 93 },
        { date: d('2026-08-24'), weightKg: 95 },
      ],
      'all',
      d('2026-09-01'),
    );
    expect(points).toHaveLength(2);
    expect(points[0].averageKg).toBeCloseTo(95);
    expect(points[1].averageKg).toBeCloseTo(93.5);
  });
});

describe('dashboard windows', () => {
  const now = d('2026-09-01');

  it('keeps exactly the latest 28 calendar days', () => {
    const dates = [d('2026-08-04'), d('2026-08-05'), d('2026-09-01'), d('2026-09-02')];
    const kept = A.rollingWindow(dates, (x) => x, 28, now);
    expect(kept).toEqual([d('2026-08-05'), d('2026-09-01')]);
  });

  it('excludes today from the rolling completed step average', () => {
    const samples = [step('2026-08-04', 1000), step('2026-08-05', 6000), step('2026-08-31', 8000), step('2026-09-01', 100)];
    expect(A.rollingCompletedStepAverage(samples, 28, now)).toBe(7000);
  });

  it('expands sparse data across the chart width', () => {
    const domain = A.adaptiveRollingDomain([d('2026-08-30'), d('2026-09-01')], 28, now);
    expect(domain.start).toBe(d('2026-08-29'));
    expect(domain.end).toBe(d('2026-09-02'));
  });

  it('keeps the full window when data spans most of it', () => {
    const domain = A.adaptiveRollingDomain([d('2026-08-06'), d('2026-09-01')], 28, now);
    expect(domain.start).toBe(d('2026-08-05'));
    expect(domain.end).toBe(d('2026-09-02'));
  });

  it('compares matched week-to-date windows', () => {
    // Wed 2026-09-02: this week Mon..Wed vs previous week Mon..Wed
    const dates = [d('2026-08-31'), d('2026-09-02'), d('2026-08-25'), d('2026-08-27'), d('2026-08-30')];
    const c = A.weekToDateCountComparison(dates, new Date(2026, 8, 2, 12).getTime());
    expect(c.current).toBe(2);
    expect(c.previous).toBe(1);
  });

  it('compares completed week-to-date steps only', () => {
    const samples = [step('2026-08-31', 10000), step('2026-09-01', 6000), step('2026-09-02', 100), step('2026-08-24', 5000), step('2026-08-25', 7000)];
    const c = A.completedWeekToDateStepComparison(samples, new Date(2026, 8, 2, 12).getTime());
    expect(c.currentAverage).toBe(8000);
    expect(c.previousAverage).toBe(6000);
    expect(A.stepComparisonChange(c)).toBeCloseTo(33.33, 1);
    expect(A.completedWeekToDateStepComparison(samples, new Date(2026, 8, 7, 8).getTime()).currentAverage).toBeNull();
  });

  it('builds weekly comparisons', () => {
    const c = A.weeklyCountComparison([d('2026-09-01'), d('2026-08-25'), d('2026-08-26')], now);
    expect(c).toEqual({ current: 1, previous: 2 });
    expect(A.countChange(c)).toBeCloseTo(-50);
    expect(A.countChange({ current: 0, previous: 0 })).toBe(0);
    expect(A.countChange({ current: 2, previous: 0 })).toBeNull();

    const w = A.weeklyWeightComparison(
      [
        { date: d('2026-09-01'), weightKg: 90 },
        { date: d('2026-08-25'), weightKg: 91 },
        { date: d('2026-08-26'), weightKg: 93 },
      ],
      now,
    );
    expect(A.weightComparisonChangeKg(w)).toBeCloseTo(-2);
  });

  it('compares runs week over week', () => {
    const c = A.weeklyRunComparison(
      [
        { date: d('2026-09-01'), distanceKm: 6, durationSeconds: 1800 },
        { date: d('2026-08-25'), distanceKm: 5, durationSeconds: 1800 },
      ],
      now,
    );
    expect(A.runAverageDistanceChange(c)).toBeCloseTo(20);
    expect(A.runPaceImprovement(c)).toBeCloseTo(20);
    expect(A.runCountChange(c)).toBeCloseTo(0);
  });
});
