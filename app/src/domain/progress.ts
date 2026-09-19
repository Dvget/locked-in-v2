// Long-term Progress view models (D-013): workouts, runs, weight. Pure and testable.
import type { AppData } from '../data/repository';
import {
  cumulativeIndex,
  exerciseBestSet,
  exerciseWorkoutMetrics,
  paceSecondsPerKm,
  runSeriesChange,
  trainingVolume,
  weightPoints,
  type Range,
  type RunSeries,
} from './analytics';
import { exerciseName, isRepsOnlyExercise } from './exercises';
import { exerciseIDsMatch, stableExerciseID, workoutProgress } from './strength';
import type { Ms } from './dates';

export interface SeriesPoint {
  date: Ms;
  value: number;
  label: string;
}

const dateLabel = (ms: number) =>
  new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });

// ---------------------------------------------------------------- workouts

export interface TrainingProgress {
  workoutCount: number;
  setCount: number;
  totalVolumeKg: number;
  totalDurationSeconds: number;
  /** cumulative index (baseline 100) after each workout that had a comparable exercise */
  indexSeries: SeriesPoint[];
  /** total weight (kg x reps of weighted sets) per completed workout */
  volumeSeries: SeriesPoint[];
  exercises: { id: string; name: string; sessions: number; lastDate: Ms }[];
}

export function buildTrainingProgress(data: AppData): TrainingProgress {
  const workouts = data.workouts.filter((w) => w.isCompleted && !w.isHidden).sort((a, b) => a.startedAt - b.startedAt);
  const ids = new Set(workouts.map((w) => w.id));
  const sets = data.sets.filter((s) => ids.has(s.workoutID) && s.reps > 0);
  const totalVolumeKg = trainingVolume(
    sets.map((s) => ({ weightKg: s.weight, reps: s.reps, repsOnly: isRepsOnlyExercise(s.exerciseID) })),
  );

  const changes: { date: Ms; change: number }[] = [];
  for (const w of workouts) {
    const change = workoutProgress(w, data.workouts, data.sets, isRepsOnlyExercise);
    if (change !== null) changes.push({ date: w.startedAt, change });
  }
  const cumulative = cumulativeIndex(changes.map((c) => c.change));
  const indexSeries: SeriesPoint[] = changes.map((c, i) => ({
    date: c.date,
    value: cumulative[i + 1],
    label: dateLabel(c.date),
  }));

  const volumeSeries: SeriesPoint[] = workouts.map((w) => ({
    date: w.startedAt,
    label: dateLabel(w.startedAt),
    value: trainingVolume(
      sets
        .filter((x) => x.workoutID === w.id)
        .map((x) => ({ weightKg: x.weight, reps: x.reps, repsOnly: isRepsOnlyExercise(x.exerciseID) })),
    ),
  }));

  const perExercise = new Map<string, { sessions: Set<string>; lastDate: Ms }>();
  for (const s of sets) {
    const id = stableExerciseID(s.exerciseID);
    const w = workouts.find((x) => x.id === s.workoutID);
    if (!w) continue;
    const entry = perExercise.get(id) ?? { sessions: new Set<string>(), lastDate: 0 };
    entry.sessions.add(w.id);
    entry.lastDate = Math.max(entry.lastDate, w.startedAt);
    perExercise.set(id, entry);
  }
  const exercises = [...perExercise.entries()]
    .map(([id, v]) => ({ id, name: exerciseName(id), sessions: v.sessions.size, lastDate: v.lastDate }))
    .sort((a, b) => b.lastDate - a.lastDate);

  return {
    workoutCount: workouts.length,
    setCount: sets.length,
    totalVolumeKg,
    totalDurationSeconds: workouts.reduce((t, w) => t + Math.max(0, ((w.endedAt ?? w.startedAt) - w.startedAt) / 1000), 0),
    indexSeries,
    volumeSeries,
    exercises,
  };
}

// ---------------------------------------------------------------- one exercise

export interface ExerciseSession {
  date: Ms;
  workoutID: string;
  maxWeightKg: number | null;
  totalReps: number;
  estimatedStrengthKg: number | null;
  best: { weightKg: number; reps: number } | null;
}

export function buildExerciseHistory(exerciseID: string, data: AppData): ExerciseSession[] {
  const repsOnly = isRepsOnlyExercise(exerciseID);
  const workouts = data.workouts.filter((w) => w.isCompleted && !w.isHidden).sort((a, b) => a.startedAt - b.startedAt);
  const out: ExerciseSession[] = [];
  for (const w of workouts) {
    const sets = data.sets
      .filter((s) => s.workoutID === w.id && exerciseIDsMatch(s.exerciseID, exerciseID))
      .map((s) => ({ weightKg: s.weight, reps: s.reps }));
    if (!sets.some((s) => s.reps > 0)) continue;
    const metrics = exerciseWorkoutMetrics(sets, repsOnly);
    const best = repsOnly ? null : exerciseBestSet(sets);
    out.push({
      date: w.startedAt,
      workoutID: w.id,
      maxWeightKg: metrics.maximumWeightKg,
      totalReps: metrics.totalReps,
      estimatedStrengthKg: best ? best.estimatedStrengthKg : null,
      best: best ? { weightKg: best.weightKg, reps: best.reps } : null,
    });
  }
  return out;
}

// ---------------------------------------------------------------- runs

export interface RunProgress {
  runCount: number;
  totalDistanceKm: number;
  totalDurationSeconds: number;
  averagePaceSecondsPerKm: number;
  distanceSeries: SeriesPoint[];
  paceSeries: SeriesPoint[];
  change: number | null;
}

export function buildRunProgress(data: AppData, series: RunSeries): RunProgress {
  const runs = data.runs
    .filter((r) => !r.isHidden && r.distanceKm > 0 && r.durationSeconds > 0)
    .sort((a, b) => a.date - b.date);
  const totalDistanceKm = runs.reduce((t, r) => t + r.distanceKm, 0);
  const totalDurationSeconds = runs.reduce((t, r) => t + r.durationSeconds, 0);
  return {
    runCount: runs.length,
    totalDistanceKm,
    totalDurationSeconds,
    averagePaceSecondsPerKm: totalDistanceKm > 0 ? totalDurationSeconds / totalDistanceKm : 0,
    distanceSeries: runs.map((r) => ({ date: r.date, value: r.distanceKm, label: dateLabel(r.date) })),
    paceSeries: runs.map((r) => ({ date: r.date, value: paceSecondsPerKm(r), label: dateLabel(r.date) })),
    change: runSeriesChange(
      runs.map((r) => ({ date: r.date, distanceKm: r.distanceKm, durationSeconds: r.durationSeconds })),
      series,
    ),
  };
}

// ---------------------------------------------------------------- weight

export interface WeightProgress {
  latestKg: number | null;
  firstKg: number | null;
  series: SeriesPoint[];
}

export function buildWeightProgress(data: AppData, range: Range, now: Ms): WeightProgress {
  const valid = data.weights.filter((w) => !w.isHidden && w.weightKg > 0).sort((a, b) => a.date - b.date);
  const points = weightPoints(
    valid.map((w) => ({ date: w.date, weightKg: w.weightKg })),
    range,
    now,
  );
  return {
    latestKg: valid.length ? valid[valid.length - 1].weightKg : null,
    firstKg: valid.length ? valid[0].weightKg : null,
    series: points.map((p) => ({ date: p.weekStart, value: p.averageKg, label: `Woche ab ${dateLabel(p.weekStart)}` })),
  };
}
