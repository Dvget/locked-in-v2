// Weekly report (D-026): last completed week vs the week before, only comparable metrics, plus longer-term context.
import type { AppData, Settings, WeightDirection } from '../data/repository';
import { computeAchievements, formatPace, type Achievement } from './achievements';
import {
  cumulativeIndex,
  percentageChange,
  recordedStepAverage,
  runSummary,
  trainingVolume,
  preferredStepSamples,
} from './analytics';
import { addDays, addWeeks, isInside, startOfWeek, weekInterval, type Interval, type Ms } from './dates';
import { isRepsOnlyExercise } from './exercises';
import { workoutProgress } from './strength';
import type { WorkoutRecord } from './types';

export type Tone = 'positive' | 'caution' | 'negative' | 'neutral';

export interface ReportMetric {
  id: string;
  title: string;
  previous: string;
  current: string;
  changeText: string;
  tone: Tone;
}

export interface ReportCategory {
  id: 'workouts' | 'runs' | 'steps' | 'weight';
  title: string;
  metrics: ReportMetric[];
}

export interface WeeklyReport {
  weekStart: Ms;
  weekEnd: Ms;
  categories: ReportCategory[];
  /** Longer-term context: last 8 completed weeks, oldest first. */
  context: { workoutsPerWeek: number[]; runKmPerWeek: number[]; weightAverages: (number | null)[] };
  standouts: Achievement[];
  isEmpty: boolean;
}

export function isComparable(current: number | null, previous: number | null): boolean {
  return current !== null && previous !== null;
}

export function toneForChange(changePercent: number | null): Tone {
  if (changePercent === null) return 'neutral';
  if (changePercent > 0.05) return 'positive';
  if (changePercent < -0.05) return 'negative';
  return 'caution';
}

/** D-016: weight tone follows the goal direction. */
export function weightToneForGoal(changeKg: number | null, direction: WeightDirection): Tone {
  if (changeKg === null) return 'neutral';
  switch (direction) {
    case 'lose':
      return changeKg < -0.05 ? 'positive' : changeKg > 0.05 ? 'negative' : 'caution';
    case 'gain':
      return changeKg > 0.05 ? 'positive' : changeKg < -0.05 ? 'negative' : 'caution';
    case 'maintain': {
      const abs = Math.abs(changeKg);
      return abs <= 0.5 ? 'positive' : abs <= 1 ? 'caution' : 'negative';
    }
  }
}

export function percentText(change: number | null): string {
  if (change === null || !Number.isFinite(change)) return '—';
  return `${change >= 0 ? '+' : '-'}${Math.abs(change).toFixed(1).replace('.', ',')} %`;
}

export function signedKgText(value: number): string {
  if (Math.abs(value) < 0.05) return '0,0 kg';
  return `${value >= 0 ? '+' : '-'}${Math.abs(value).toFixed(1).replace('.', ',')} kg`;
}

const num1 = (v: number) => v.toFixed(1).replace('.', ',');

/** The two weeks compared: the latest completed week and the one before it. */
export function comparisonWeeks(now: Ms): { previous: Interval; current: Interval } {
  const thisWeek = startOfWeek(now);
  return {
    current: weekInterval(addWeeks(thisWeek, -1)),
    previous: weekInterval(addWeeks(thisWeek, -2)),
  };
}

/** Key of the current calendar week (Monday date) for "shown once per new week". */
export function weekKey(now: Ms): string {
  const d = new Date(startOfWeek(now));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function weeklyWorkoutIndex(inWeek: WorkoutRecord[], data: AppData): number | null {
  const ordered = inWeek.slice().sort((a, b) => a.startedAt - b.startedAt);
  if (ordered.length === 0) return null;
  const changes: number[] = [];
  for (const w of ordered) {
    const c = workoutProgress(w, data.workouts, data.sets, isRepsOnlyExercise);
    if (c !== null) changes.push(c);
  }
  const cumulative = cumulativeIndex(changes);
  return changes.length > 0 ? cumulative[cumulative.length - 1] : 100;
}

function weekVolume(inWeek: WorkoutRecord[], data: AppData): number {
  const ids = new Set(inWeek.map((w) => w.id));
  return trainingVolume(
    data.sets
      .filter((s) => ids.has(s.workoutID) && s.reps > 0)
      .map((s) => ({ weightKg: s.weight, reps: s.reps, repsOnly: isRepsOnlyExercise(s.exerciseID) })),
  );
}

export function buildWeeklyReport(data: AppData, settings: Settings, now: Ms = Date.now()): WeeklyReport {
  const { previous, current } = comparisonWeeks(now);
  const workouts = data.workouts.filter((w) => w.isCompleted && !w.isHidden);
  const runs = data.runs.filter((r) => !r.isHidden && r.distanceKm > 0 && r.durationSeconds > 0);
  const weights = data.weights.filter((w) => !w.isHidden && w.weightKg > 0);
  const categories: ReportCategory[] = [];

  // Workouts: index and total weight, only when both weeks have workouts.
  {
    const prev = workouts.filter((w) => isInside(w.startedAt, previous));
    const cur = workouts.filter((w) => isInside(w.startedAt, current));
    const metrics: ReportMetric[] = [];
    if (prev.length > 0 && cur.length > 0) {
      const pi = weeklyWorkoutIndex(prev, data);
      const ci = weeklyWorkoutIndex(cur, data);
      if (pi !== null && ci !== null) {
        const c = percentageChange(pi, ci);
        metrics.push({ id: 'workout-index', title: 'Index', previous: num1(pi), current: num1(ci), changeText: percentText(c), tone: toneForChange(c) });
      }
      const pv = weekVolume(prev, data);
      const cv = weekVolume(cur, data);
      if (pv > 0 && cv > 0) {
        const c = percentageChange(pv, cv);
        metrics.push({
          id: 'workout-weight', title: 'Gesamtgewicht',
          previous: `${Math.round(pv).toLocaleString('de-DE')} kg`, current: `${Math.round(cv).toLocaleString('de-DE')} kg`,
          changeText: percentText(c), tone: toneForChange(c),
        });
      }
    }
    if (metrics.length) categories.push({ id: 'workouts', title: 'Training', metrics });
  }

  // Runs: average distance and pace.
  {
    const toSample = (r: (typeof runs)[number]) => ({ date: r.date, distanceKm: r.distanceKm, durationSeconds: r.durationSeconds });
    const ps = runSummary(runs.filter((r) => isInside(r.date, previous)).map(toSample));
    const cs = runSummary(runs.filter((r) => isInside(r.date, current)).map(toSample));
    if (ps.count > 0 && cs.count > 0) {
      const dc = percentageChange(ps.averageDistanceKm, cs.averageDistanceKm);
      const pace = percentageChange(cs.weightedPaceSecondsPerKm, ps.weightedPaceSecondsPerKm);
      categories.push({
        id: 'runs',
        title: 'Laufen',
        metrics: [
          { id: 'run-distance', title: 'Ø Distanz', previous: `${num1(ps.averageDistanceKm)} km`, current: `${num1(cs.averageDistanceKm)} km`, changeText: percentText(dc), tone: toneForChange(dc) },
          { id: 'run-pace', title: 'Ø Pace', previous: formatPace(ps.weightedPaceSecondsPerKm), current: formatPace(cs.weightedPaceSecondsPerKm), changeText: percentText(pace), tone: toneForChange(pace) },
        ],
      });
    }
  }

  // Steps: average of recorded days.
  {
    const pref = preferredStepSamples(data.steps.map((s) => ({ date: s.date, steps: s.steps, source: s.source })));
    const pa = recordedStepAverage(pref.filter((s) => isInside(s.date, previous)));
    const ca = recordedStepAverage(pref.filter((s) => isInside(s.date, current)));
    if (pa !== null && ca !== null) {
      const c = percentageChange(pa, ca);
      categories.push({
        id: 'steps', title: 'Schritte',
        metrics: [{ id: 'steps-average', title: 'Ø Schritte', previous: pa.toLocaleString('de-DE'), current: ca.toLocaleString('de-DE'), changeText: percentText(c), tone: toneForChange(c) }],
      });
    }
  }

  // Weight: averages, goal-aware tone.
  {
    const pv = weights.filter((w) => isInside(w.date, previous)).map((w) => w.weightKg);
    const cv = weights.filter((w) => isInside(w.date, current)).map((w) => w.weightKg);
    if (pv.length > 0 && cv.length > 0) {
      const pa = pv.reduce((t, v) => t + v, 0) / pv.length;
      const ca = cv.reduce((t, v) => t + v, 0) / cv.length;
      const change = ca - pa;
      categories.push({
        id: 'weight', title: 'Gewicht',
        metrics: [{ id: 'weight-average', title: 'Ø Gewicht', previous: `${num1(pa)} kg`, current: `${num1(ca)} kg`, changeText: signedKgText(change), tone: weightToneForGoal(change, settings.weightDirection) }],
      });
    }
  }

  // Longer-term context: last 8 completed weeks.
  const workoutsPerWeek: number[] = [];
  const runKmPerWeek: number[] = [];
  const weightAverages: (number | null)[] = [];
  for (let i = 8; i >= 1; i--) {
    const w = weekInterval(addWeeks(startOfWeek(now), -i));
    workoutsPerWeek.push(workouts.filter((x) => isInside(x.startedAt, w)).length);
    runKmPerWeek.push(runs.filter((r) => isInside(r.date, w)).reduce((t, r) => t + r.distanceKm, 0));
    const ws = weights.filter((x) => isInside(x.date, w));
    weightAverages.push(ws.length ? ws.reduce((t, x) => t + x.weightKg, 0) / ws.length : null);
  }

  const standouts = computeAchievements(data.workouts, data.sets, data.runs).filter((a) => isInside(a.date, current));

  return {
    weekStart: current.start,
    weekEnd: addDays(current.end, -1),
    categories,
    context: { workoutsPerWeek, runKmPerWeek, weightAverages },
    standouts,
    isEmpty: categories.length === 0,
  };
}
