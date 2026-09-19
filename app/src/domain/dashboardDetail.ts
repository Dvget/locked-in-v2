// Data for the four dashboard detail screens (legacy Workout/Run/Steps/Weight detail views): the graph shows only the
// rolling last 28 days, the KPI card compares this week so far with the same span of the previous week.
import type { AppData } from '../data/repository';
import {
  adaptiveRollingDomain,
  completedDayStepAverage,
  completedWeekToDateStepComparison,
  matchedWeekToDateWindows,
  paceSecondsPerKm,
  percentageChange,
  preferredStepSamples,
  rollingCompletedStepAverage,
  rollingWindow,
  runAverageDistanceChange,
  runPaceImprovement,
  stepChartMaximum,
  stepComparisonChange,
  trainingVolume,
  weeklyRunComparison,
  weeklyWeightComparison,
  weightComparisonChangeKg,
  type WeeklyRunComparison,
} from './analytics';
import { addDays, isInside, startOfDay, weekInterval, WEEKDAY_LABELS_DE, type Interval, type Ms } from './dates';
import { isRepsOnlyExercise } from './exercises';
import { workoutProgress } from './strength';

export interface DetailPoint {
  id: string;
  date: Ms;
  value: number;
  detail?: string;
}

const de1 = (v: number) => v.toFixed(1).replace('.', ',');

// ---------------------------------------------------------------- workouts

export type WorkoutMetric = 'index' | 'weight';

function completed(data: AppData) {
  return data.workouts.filter((w) => w.isCompleted && !w.isHidden).sort((a, b) => a.startedAt - b.startedAt);
}

function volumeOf(data: AppData, workoutID: string): number {
  return trainingVolume(
    data.sets
      .filter((s) => s.workoutID === workoutID && s.reps > 0)
      .map((s) => ({ weightKg: s.weight, reps: s.reps, repsOnly: isRepsOnlyExercise(s.exerciseID) })),
  );
}

/** All-time series: the index starts at 100 with the very first workout and follows every comparable change. */
export function workoutSeries(data: AppData, metric: WorkoutMetric): DetailPoint[] {
  const done = completed(data);
  if (metric === 'weight') {
    return done
      .map((w) => ({ id: w.id, date: w.startedAt, value: volumeOf(data, w.id) }))
      .filter((p) => p.value > 0);
  }
  if (done.length === 0) return [];
  let index = 100;
  const out: DetailPoint[] = [{ id: done[0].id, date: done[0].startedAt, value: index }];
  for (const w of done.slice(1)) {
    const change = workoutProgress(w, data.workouts, data.sets, isRepsOnlyExercise);
    if (change !== null) index *= Math.max(0, 1 + change / 100);
    out.push({ id: w.id, date: w.startedAt, value: index });
  }
  return out;
}

export function lastFourWeeks(points: DetailPoint[], now: Ms): DetailPoint[] {
  return rollingWindow(points, (p) => p.date, 28, now);
}

/** First to last value inside the window; needs at least two points. */
export function windowChange(points: DetailPoint[]): number | null {
  if (points.length < 2) return null;
  return percentageChange(points[0].value, points[points.length - 1].value);
}

export interface Kpi {
  current: number | null;
  previous: number | null;
  change: number | null;
}

function kpi(current: number | null, previous: number | null): Kpi {
  return {
    current,
    previous,
    change: current !== null && previous !== null && previous > 0 ? percentageChange(previous, current) : null,
  };
}

export function workoutKpis(data: AppData, now: Ms): { index: Kpi; totalWeight: Kpi } {
  const windows = matchedWeekToDateWindows(now);
  const series = workoutSeries(data, 'index');
  const latestIndex = (interval: Interval) => {
    const inside = series.filter((p) => isInside(p.date, interval));
    return inside.length ? inside[inside.length - 1].value : null;
  };
  const total = (interval: Interval) => {
    const ws = completed(data).filter((w) => isInside(w.startedAt, interval));
    return ws.length ? ws.reduce((t, w) => t + volumeOf(data, w.id), 0) : null;
  };
  return {
    index: kpi(latestIndex(windows.current), latestIndex(windows.previous)),
    totalWeight: kpi(total(windows.current), total(windows.previous)),
  };
}

// ---------------------------------------------------------------- runs

export type RunMetric = 'distance' | 'pace' | 'index';

function validRuns(data: AppData) {
  return data.runs
    .filter((r) => !r.isHidden && r.distanceKm > 0 && r.durationSeconds > 0)
    .sort((a, b) => a.date - b.date);
}

function paceLabel(seconds: number): string {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Run series of the last 28 days. The index (geometric mean of distance and pace index) is relative to the first run ever. */
export function runSeries(data: AppData, metric: RunMetric, now: Ms): DetailPoint[] {
  const runs = validRuns(data);
  const baseline = runs[0];
  const points: DetailPoint[] = runs.map((r) => {
    const pace = paceSecondsPerKm(r);
    const detail = `${de1(r.distanceKm)} km · ${paceLabel(pace)} /km`;
    if (metric === 'distance') return { id: r.id, date: r.date, value: r.distanceKm, detail };
    if (metric === 'pace') return { id: r.id, date: r.date, value: pace, detail };
    const distanceIndex = (r.distanceKm / Math.max(0.01, baseline.distanceKm)) * 100;
    const paceIndex = (Math.max(1, paceSecondsPerKm(baseline)) / Math.max(1, pace)) * 100;
    const overall = Math.sqrt(Math.max(0.01, distanceIndex) * Math.max(0.01, paceIndex));
    return { id: r.id, date: r.date, value: overall, detail: `Index ${de1(overall)} · ${detail}` };
  });
  return lastFourWeeks(points, now);
}

export function runKpis(
  data: AppData,
  now: Ms,
): { comparison: WeeklyRunComparison; averageDistanceChange: number | null; paceImprovement: number | null } {
  const comparison = weeklyRunComparison(
    validRuns(data).map((r) => ({ date: r.date, distanceKm: r.distanceKm, durationSeconds: r.durationSeconds })),
    now,
  );
  return {
    comparison,
    averageDistanceChange: comparison.current.count > 0 ? runAverageDistanceChange(comparison) : null,
    paceImprovement: comparison.current.count > 0 ? runPaceImprovement(comparison) : null,
  };
}

// ---------------------------------------------------------------- weight

export function weightSeries28(data: AppData, now: Ms): DetailPoint[] {
  const points = data.weights
    .filter((w) => !w.isHidden && w.weightKg > 0)
    .sort((a, b) => a.date - b.date)
    .map((w) => ({ id: w.id, date: w.date, value: w.weightKg }));
  return lastFourWeeks(points, now);
}

export function weightKpis(data: AppData, now: Ms) {
  const valid = data.weights.filter((w) => !w.isHidden && w.weightKg > 0);
  const comparison = weeklyWeightComparison(
    valid.map((w) => ({ date: w.date, weightKg: w.weightKg })),
    now,
  );
  const week = weekInterval(now);
  return {
    currentAverageKg: comparison.currentAverageKg,
    previousAverageKg: comparison.previousAverageKg,
    changeKg: weightComparisonChangeKg(comparison),
    measurementsThisWeek: valid.filter((w) => isInside(w.date, week)).length,
  };
}

// ---------------------------------------------------------------- steps

export interface DayBar {
  index: number;
  label: string;
  date: Ms;
  steps: number;
}

export function stepsDetail(data: AppData, dailyGoal: number, now: Ms) {
  const samples = data.steps.map((s) => ({ date: s.date, steps: s.steps, source: s.source }));
  const preferred = preferredStepSamples(samples);
  const week = weekInterval(now);
  const bars: DayBar[] = WEEKDAY_LABELS_DE.map((label, index) => {
    const day = addDays(week.start, index);
    const found = preferred.find((s) => startOfDay(s.date) === day);
    return { index, label, date: day, steps: found?.steps ?? 0 };
  });
  const fourWeekAverage = rollingCompletedStepAverage(preferred, 28, now);
  const comparison = completedWeekToDateStepComparison(preferred, now);
  return {
    bars,
    weekAverage: completedDayStepAverage(
      preferred.filter((s) => isInside(s.date, week)),
      now,
    ),
    fourWeekAverage,
    comparison,
    change: stepComparisonChange(comparison),
    goal: dailyGoal,
    chartMaximum: stepChartMaximum([...bars.map((b) => b.steps), dailyGoal, fourWeekAverage ?? 0]),
  };
}

export { adaptiveRollingDomain };
