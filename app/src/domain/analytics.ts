// Ported behavior of the legacy TrackingAnalytics.swift and DashboardAnalytics.swift.
import {
  addDays,
  addWeeks,
  daysBetween,
  isInside,
  MONTH_LABELS_DE,
  monthInterval,
  startOfDay,
  startOfWeek,
  weekInterval,
  WEEKDAY_LABELS_DE,
  yearInterval,
  type Interval,
  type Ms,
} from './dates';

export type Status = 'red' | 'yellow' | 'green';
export type Range = 'week' | 'month' | 'year' | 'all';
export type RunSeries = 'overall' | 'distance' | 'pace';

export interface RunSample {
  date: Ms;
  distanceKm: number;
  durationSeconds: number;
}

export interface RunSummary {
  count: number;
  totalDistanceKm: number;
  averageDistanceKm: number;
  weightedPaceSecondsPerKm: number;
}

export interface StepSample {
  date: Ms;
  steps: number;
  source: string;
}

export interface WeightSample {
  date: Ms;
  weightKg: number;
}

export interface WeightPoint {
  weekStart: Ms;
  averageKg: number;
}

export interface StepBucket {
  date: Ms;
  label: string;
  steps: number;
}

export interface StrengthSetSample {
  weightKg: number;
  reps: number;
  repsOnly: boolean;
}

export interface ExerciseSetSample {
  weightKg: number;
  reps: number;
}

export interface ExerciseBestSet {
  weightKg: number;
  reps: number;
  estimatedStrengthKg: number;
}

export const EMPTY_RUN_SUMMARY: RunSummary = {
  count: 0,
  totalDistanceKm: 0,
  averageDistanceKm: 0,
  weightedPaceSecondsPerKm: 0,
};

export function paceSecondsPerKm(sample: { distanceKm: number; durationSeconds: number }): number {
  return sample.distanceKm > 0 ? sample.durationSeconds / sample.distanceKm : 0;
}

export function percentageChange(from: number, to: number): number | null {
  if (!(from > 0)) return null;
  return (to / from - 1) * 100;
}

// ---------------------------------------------------------------- runs

export function runSummary(samples: RunSample[], rollingDays?: number, now: Ms = Date.now()): RunSummary {
  const valid = samples.filter((s) => s.distanceKm > 0 && s.durationSeconds > 0);
  let filtered = valid;
  if (rollingDays !== undefined) {
    const today = startOfDay(now);
    const cutoff = addDays(today, -(Math.max(1, rollingDays) - 1));
    const end = addDays(today, 1);
    filtered = valid.filter((s) => s.date >= cutoff && s.date < end);
  }
  if (filtered.length === 0) return EMPTY_RUN_SUMMARY;
  const distance = filtered.reduce((t, s) => t + s.distanceKm, 0);
  const duration = filtered.reduce((t, s) => t + s.durationSeconds, 0);
  return {
    count: filtered.length,
    totalDistanceKm: distance,
    averageDistanceKm: distance / filtered.length,
    weightedPaceSecondsPerKm: distance > 0 ? duration / distance : 0,
  };
}

export function runChange(current: RunSample, previous: RunSample): number | null {
  if (
    !(current.distanceKm > 0 && current.durationSeconds > 0 && previous.distanceKm > 0 && previous.durationSeconds > 0)
  ) {
    return null;
  }
  const distanceRatio = current.distanceKm / previous.distanceKm;
  const paceRatio = paceSecondsPerKm(previous) / paceSecondsPerKm(current);
  return (Math.sqrt(distanceRatio * paceRatio) - 1) * 100;
}

export function weeklyRunChange(samples: RunSample[], now: Ms = Date.now()): number | null {
  const current = weekInterval(now);
  const previous = weekInterval(addDays(current.start, -7));
  const cur = runSummary(samples.filter((s) => isInside(s.date, current)));
  const prev = runSummary(samples.filter((s) => isInside(s.date, previous)));
  if (
    cur.count === 0 ||
    prev.count === 0 ||
    !(cur.averageDistanceKm > 0) ||
    !(prev.averageDistanceKm > 0) ||
    !(cur.weightedPaceSecondsPerKm > 0) ||
    !(prev.weightedPaceSecondsPerKm > 0)
  ) {
    return null;
  }
  const distanceIndex = cur.averageDistanceKm / prev.averageDistanceKm;
  const paceIndex = prev.weightedPaceSecondsPerKm / cur.weightedPaceSecondsPerKm;
  return (Math.sqrt(distanceIndex * paceIndex) - 1) * 100;
}

/** First vs last valid run; faster pace counts as positive. */
export function runSeriesChange(samples: RunSample[], series: RunSeries): number | null {
  const valid = samples
    .filter((s) => s.distanceKm > 0 && s.durationSeconds > 0)
    .sort((a, b) => a.date - b.date);
  if (valid.length < 2) return null;
  const first = valid[0];
  const last = valid[valid.length - 1];
  switch (series) {
    case 'overall':
      return runChange(last, first);
    case 'distance':
      return (last.distanceKm / first.distanceKm - 1) * 100;
    case 'pace':
      return (paceSecondsPerKm(first) / paceSecondsPerKm(last) - 1) * 100;
  }
}

// ---------------------------------------------------------------- steps

/** One sample per day; automatic (pedometer) samples win over manual ones, highest count wins. */
export function preferredStepSamples(samples: StepSample[]): StepSample[] {
  const grouped = new Map<Ms, StepSample[]>();
  for (const s of samples) {
    const day = startOfDay(s.date);
    const list = grouped.get(day);
    if (list) list.push(s);
    else grouped.set(day, [s]);
  }
  const result: StepSample[] = [];
  for (const [day, values] of grouped) {
    const automatic = values.filter((v) => v.source === 'coremotion' || v.source === 'pedometer');
    const pool = automatic.length > 0 ? automatic : values;
    let selected = pool[0];
    for (const v of pool) if (v.steps > selected.steps) selected = v;
    result.push({ date: day, steps: Math.max(0, selected.steps), source: selected.source });
  }
  return result.sort((a, b) => a.date - b.date);
}

export function recordedStepAverage(samples: StepSample[]): number | null {
  const preferred = preferredStepSamples(samples);
  if (preferred.length === 0) return null;
  return Math.trunc(preferred.reduce((t, s) => t + s.steps, 0) / preferred.length);
}

/** Average over completed days only; today is still accumulating. */
export function completedDayStepAverage(samples: StepSample[], now: Ms = Date.now()): number | null {
  const today = startOfDay(now);
  return recordedStepAverage(samples.filter((s) => startOfDay(s.date) < today));
}

export function rollingCompletedStepAverage(samples: StepSample[], days = 28, now: Ms = Date.now()): number | null {
  const today = startOfDay(now);
  const start = addDays(today, -(Math.max(1, days) - 1));
  return recordedStepAverage(
    samples.filter((s) => {
      const day = startOfDay(s.date);
      return day >= start && day < today;
    }),
  );
}

function groupedStepBuckets(samples: StepSample[], keyOf: (d: Date) => Ms, labelOf: (ms: Ms) => string): StepBucket[] {
  const grouped = new Map<Ms, number>();
  for (const s of samples) {
    const key = keyOf(new Date(s.date));
    grouped.set(key, (grouped.get(key) ?? 0) + s.steps);
  }
  return [...grouped.entries()]
    .map(([date, steps]) => ({ date, label: labelOf(date), steps }))
    .sort((a, b) => a.date - b.date);
}

export function stepBuckets(samples: StepSample[], range: Range, now: Ms = Date.now()): StepBucket[] {
  const preferred = preferredStepSamples(samples);
  const daily = new Map<Ms, number>(preferred.map((s) => [startOfDay(s.date), s.steps]));
  const today = startOfDay(now);
  const monthKey = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const yearKey = (d: Date) => new Date(d.getFullYear(), 0, 1).getTime();

  switch (range) {
    case 'week': {
      const { start } = weekInterval(now);
      return WEEKDAY_LABELS_DE.map((label, offset) => {
        const day = addDays(start, offset);
        return { date: day, label, steps: daily.get(day) ?? 0 };
      });
    }
    case 'month': {
      const { start } = monthInterval(now);
      const days = Math.max(0, daysBetween(start, today));
      const out: StepBucket[] = [];
      for (let offset = 0; offset <= days; offset++) {
        const day = addDays(start, offset);
        out.push({ date: day, label: String(new Date(day).getDate()), steps: daily.get(day) ?? 0 });
      }
      return out;
    }
    case 'year': {
      const interval = yearInterval(now);
      return groupedStepBuckets(
        preferred.filter((s) => isInside(s.date, interval)),
        monthKey,
        (ms) => MONTH_LABELS_DE[new Date(ms).getMonth()],
      );
    }
    case 'all': {
      if (preferred.length === 0) return [];
      const span = daysBetween(preferred[0].date, preferred[preferred.length - 1].date);
      if (span > 730) return groupedStepBuckets(preferred, yearKey, (ms) => String(new Date(ms).getFullYear()));
      return groupedStepBuckets(
        preferred,
        monthKey,
        (ms) => `${MONTH_LABELS_DE[new Date(ms).getMonth()]} ${String(new Date(ms).getFullYear()).slice(2)}`,
      );
    }
  }
}

export function stepProgressStatus(steps: number, elapsedDays: number, weeklyGoal = 70_000): Status {
  const expected = (weeklyGoal * Math.min(7, Math.max(1, elapsedDays))) / 7;
  const ratio = Math.max(0, steps) / expected;
  if (ratio < 0.7) return 'red';
  if (ratio < 1) return 'yellow';
  return 'green';
}

export function stepChartMaximum(steps: number[]): number {
  const highest = Math.max(0, ...steps);
  if (highest <= 10_000) return 10_000;
  return Math.ceil((highest * 1.1) / 2_500) * 2_500;
}

export function dailyStepStatus(steps: number): Status {
  if (steps <= 4_000) return 'red';
  if (steps < 7_500) return 'yellow';
  return 'green';
}

// ---------------------------------------------------------------- goals / strength helpers

export function weeklyGoalStatus(args: {
  completed: number;
  otherCompleted: number;
  remainingDays: number;
  target?: number;
  otherTarget?: number;
}): Status {
  const target = args.target ?? 2;
  if (args.completed >= target) return 'green';
  const ownMissing = Math.max(0, target - args.completed);
  const otherMissing = Math.max(0, (args.otherTarget ?? target) - args.otherCompleted);
  const totalMissing = ownMissing + otherMissing;
  const days = Math.max(0, args.remainingDays);
  if (totalMissing > days) return 'red';
  if (totalMissing === days) return 'yellow';
  return 'green';
}

export function cumulativeIndex(changes: number[], baseline = 100): number[] {
  const result = [baseline];
  let current = baseline;
  for (const change of changes) {
    current *= Math.max(0, 1 + change / 100);
    result.push(current);
  }
  return result;
}

export function trainingVolume(samples: StrengthSetSample[]): number {
  return samples.reduce((total, s) => {
    if (s.repsOnly || !(s.weightKg > 0) || !(s.reps > 0)) return total;
    return total + s.weightKg * s.reps;
  }, 0);
}

export function exerciseWorkoutMetrics(
  samples: ExerciseSetSample[],
  repsOnly: boolean,
): { maximumWeightKg: number | null; totalReps: number } {
  const completed = samples.filter((s) => s.reps > 0);
  const weights = repsOnly ? [] : completed.map((s) => s.weightKg).filter((w) => w > 0);
  return {
    maximumWeightKg: weights.length > 0 ? Math.max(...weights) : null,
    totalReps: completed.reduce((t, s) => t + s.reps, 0),
  };
}

/** Best set by estimated strength (Epley: weight * (1 + reps / 30)); ties go to the heavier set. */
export function exerciseBestSet(samples: ExerciseSetSample[]): ExerciseBestSet | null {
  let best: ExerciseBestSet | null = null;
  for (const s of samples) {
    if (!(s.weightKg > 0) || !(s.reps > 0)) continue;
    const candidate = { weightKg: s.weightKg, reps: s.reps, estimatedStrengthKg: s.weightKg * (1 + s.reps / 30) };
    if (
      best === null ||
      candidate.estimatedStrengthKg > best.estimatedStrengthKg ||
      (candidate.estimatedStrengthKg === best.estimatedStrengthKg && candidate.weightKg > best.weightKg)
    ) {
      best = candidate;
    }
  }
  return best;
}

// ---------------------------------------------------------------- weight

export function defaultWeightRange(samples: WeightSample[]): Range {
  const valid = samples.filter((s) => s.weightKg > 0).sort((a, b) => a.date - b.date);
  if (valid.length === 0) return 'week';
  const days = daysBetween(valid[0].date, valid[valid.length - 1].date);
  if (days < 7) return 'week';
  if (days < 31) return 'month';
  if (days < 366) return 'year';
  return 'all';
}

function rollingCutoff(range: Range, now: Ms): Ms | null {
  const today = startOfDay(now);
  switch (range) {
    case 'week':
      return addDays(today, -6);
    case 'month':
      return addDays(today, -30);
    case 'year':
      return addDays(today, -365);
    case 'all':
      return null;
  }
}

/** Weekly average points (Monday-first weeks), restricted to the rolling range ending at the latest sample. */
export function weightPoints(samples: WeightSample[], range: Range, now: Ms = Date.now()): WeightPoint[] {
  const valid = samples.filter((s) => s.weightKg > 0);
  const grouped = new Map<Ms, number[]>();
  for (const s of valid) {
    const key = startOfWeek(s.date);
    const list = grouped.get(key);
    if (list) list.push(s.weightKg);
    else grouped.set(key, [s.weightKg]);
  }
  const points: WeightPoint[] = [...grouped.entries()]
    .map(([weekStart, values]) => ({ weekStart, averageKg: values.reduce((t, v) => t + v, 0) / values.length }))
    .sort((a, b) => a.weekStart - b.weekStart);

  if (range === 'all') return points;
  const upToNow = valid.filter((s) => s.date <= now).map((s) => s.date);
  if (upToNow.length === 0) return points;
  const latest = Math.max(...upToNow);
  const cutoff = rollingCutoff(range, latest);
  if (cutoff === null) return points;
  const end = addDays(startOfDay(latest), 1);
  return points.filter((p) => weekInterval(p.weekStart).end > cutoff && p.weekStart < end);
}

// ---------------------------------------------------------------- dashboard / weekly comparisons

export interface WeeklyCountComparison {
  current: number;
  previous: number;
}

export function countChange(c: WeeklyCountComparison): number | null {
  if (c.previous <= 0) return c.current === 0 ? 0 : null;
  return percentageChange(c.previous, c.current);
}

export interface WeeklyStepComparison {
  currentAverage: number | null;
  previousAverage: number | null;
}

export function stepComparisonChange(c: WeeklyStepComparison): number | null {
  if (c.currentAverage === null || c.previousAverage === null || c.previousAverage <= 0) return null;
  return percentageChange(c.previousAverage, c.currentAverage);
}

export interface WeeklyRunComparison {
  current: RunSummary;
  previous: RunSummary;
}

export function runCountChange(c: WeeklyRunComparison): number | null {
  if (c.previous.count <= 0) return c.current.count === 0 ? 0 : null;
  return percentageChange(c.previous.count, c.current.count);
}

export function runAverageDistanceChange(c: WeeklyRunComparison): number | null {
  if (!(c.previous.averageDistanceKm > 0) || !(c.current.averageDistanceKm > 0)) return null;
  return percentageChange(c.previous.averageDistanceKm, c.current.averageDistanceKm);
}

/** Positive means faster, because fewer seconds per km are better. */
export function runPaceImprovement(c: WeeklyRunComparison): number | null {
  if (!(c.previous.weightedPaceSecondsPerKm > 0) || !(c.current.weightedPaceSecondsPerKm > 0)) return null;
  return percentageChange(c.current.weightedPaceSecondsPerKm, c.previous.weightedPaceSecondsPerKm);
}

export interface WeeklyWeightComparison {
  currentAverageKg: number | null;
  previousAverageKg: number | null;
}

export function weightComparisonChangeKg(c: WeeklyWeightComparison): number | null {
  if (c.currentAverageKg === null || c.previousAverageKg === null) return null;
  return c.currentAverageKg - c.previousAverageKg;
}

/** Values inside the rolling calendar-day window ending today (28 days = today + previous 27). */
export function rollingWindow<T>(values: T[], dateOf: (v: T) => Ms, days = 28, now: Ms = Date.now()): T[] {
  const today = startOfDay(now);
  const start = addDays(today, -(Math.max(1, days) - 1));
  const end = addDays(today, 1);
  return values.filter((v) => {
    const d = dateOf(v);
    return d >= start && d < end;
  });
}

/**
 * Chart domain for the dashboard: capped to the rolling window, but sparse data may use the full chart width.
 * Once data reaches close to the start of the window the normal window is used.
 */
export function adaptiveRollingDomain(dates: Ms[], days = 28, now: Ms = Date.now()): Interval {
  const windowDays = Math.max(1, days);
  const today = startOfDay(now);
  const fullStart = addDays(today, -(windowDays - 1));
  const fullEnd = addDays(today, 1);
  const visible = dates
    .map(startOfDay)
    .filter((d) => d >= fullStart && d < fullEnd)
    .sort((a, b) => a - b);
  if (visible.length === 0) return { start: fullStart, end: fullEnd };
  const first = visible[0];
  const last = visible[visible.length - 1];
  const nearStart = addDays(fullStart, Math.min(2, windowDays - 1));
  if (first <= nearStart) return { start: fullStart, end: fullEnd };
  if (first === last) {
    const start = Math.max(fullStart, addDays(first, -3));
    const end = Math.min(fullEnd, addDays(last, 3));
    return { start, end: Math.max(start + 86_400_000, end) };
  }
  const start = Math.max(fullStart, addDays(first, -1));
  const end = Math.min(fullEnd, addDays(last, 1));
  return { start, end: Math.max(start + 86_400_000, end) };
}

/** Current week so far vs the same span of the previous week (fair mid-week comparison). */
export function matchedWeekToDateWindows(now: Ms = Date.now()): { current: Interval; previous: Interval } {
  const week = weekInterval(now);
  const previousStart = addWeeks(week.start, -1);
  const previousEnd = addWeeks(now, -1);
  return {
    current: { start: week.start, end: Math.max(week.start, now) },
    previous: { start: previousStart, end: Math.max(previousStart, previousEnd) },
  };
}

export function weekToDateCountComparison(dates: Ms[], now: Ms = Date.now()): WeeklyCountComparison {
  const w = matchedWeekToDateWindows(now);
  return {
    current: dates.filter((d) => isInside(d, w.current)).length,
    previous: dates.filter((d) => isInside(d, w.previous)).length,
  };
}

/** Steps for the dashboard: completed days only, previous week matched to the same weekdays. */
export function completedWeekToDateStepComparison(samples: StepSample[], now: Ms = Date.now()): WeeklyStepComparison {
  const week = weekInterval(now);
  const today = startOfDay(now);
  if (today <= week.start) return { currentAverage: null, previousAverage: null };
  const previousStart = addWeeks(week.start, -1);
  const previousEnd = addWeeks(today, -1);
  const preferred = preferredStepSamples(samples);
  return {
    currentAverage: recordedStepAverage(preferred.filter((s) => isInside(s.date, { start: week.start, end: today }))),
    previousAverage: recordedStepAverage(
      preferred.filter((s) => isInside(s.date, { start: previousStart, end: previousEnd })),
    ),
  };
}

function previousWeekOf(now: Ms): { current: Interval; previous: Interval } {
  const current = weekInterval(now);
  return { current, previous: weekInterval(addWeeks(current.start, -1)) };
}

export function weeklyCountComparison(dates: Ms[], now: Ms = Date.now()): WeeklyCountComparison {
  const { current, previous } = previousWeekOf(now);
  return {
    current: dates.filter((d) => isInside(d, current)).length,
    previous: dates.filter((d) => isInside(d, previous)).length,
  };
}

export function weeklyStepComparison(samples: StepSample[], now: Ms = Date.now()): WeeklyStepComparison {
  const { current, previous } = previousWeekOf(now);
  const preferred = preferredStepSamples(samples);
  return {
    currentAverage: recordedStepAverage(preferred.filter((s) => isInside(s.date, current))),
    previousAverage: recordedStepAverage(preferred.filter((s) => isInside(s.date, previous))),
  };
}

export function weeklyRunComparison(samples: RunSample[], now: Ms = Date.now()): WeeklyRunComparison {
  const { current, previous } = previousWeekOf(now);
  return {
    current: runSummary(samples.filter((s) => isInside(s.date, current))),
    previous: runSummary(samples.filter((s) => isInside(s.date, previous))),
  };
}

export function weeklyWeightComparison(samples: WeightSample[], now: Ms = Date.now()): WeeklyWeightComparison {
  const { current, previous } = previousWeekOf(now);
  const valid = samples.filter((s) => s.weightKg > 0 && Number.isFinite(s.weightKg));
  const average = (values: number[]) => (values.length === 0 ? null : values.reduce((t, v) => t + v, 0) / values.length);
  return {
    currentAverageKg: average(valid.filter((s) => isInside(s.date, current)).map((s) => s.weightKg)),
    previousAverageKg: average(valid.filter((s) => isInside(s.date, previous)).map((s) => s.weightKg)),
  };
}
