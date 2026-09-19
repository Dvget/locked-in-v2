// Ported behavior of ExerciseIdentity.swift, StrengthProgression.swift and StrengthProgressMetric.swift.
import { isInside, weekInterval, type Ms } from './dates';
import { FALLBACK_BODY_WEIGHT_KG, type SetRecord, type WorkoutRecord } from './types';

// ------------------------------------------------------------ exercise identity

/** Historical ids stay unchanged; these links only resolve library metadata. */
export const CATALOG_LINKS: Record<string, string> = {
  db_bench_flat: 'library:Incline_Dumbbell_Press',
  bb_bench_incline: 'library:Barbell_Incline_Bench_Press_-_Medium_Grip',
  bb_bench_flat: 'library:Barbell_Bench_Press_-_Medium_Grip',
  barbell_squat: 'library:Barbell_Squat',
  leg_press: 'library:Leg_Press',
  goblet_squat: 'library:Goblet_Squat',
  pullup_straight: 'library:Pullups',
  rdl_barbell: 'library:Romanian_Deadlift',
  row_narrow: 'library:Seated_Cable_Rows',
  lateral_dumbbell: 'library:Side_Lateral_Raise',
  hyperextensions: 'library:Hyperextensions_Back_Extensions',
  cable_crunch: 'library:Cable_Crunch',
  plank: 'library:Plank',
};

const STABLE_BY_LIBRARY = new Map(Object.entries(CATALOG_LINKS).map(([stable, lib]) => [lib, stable]));

export function stableExerciseID(id: string): string {
  return STABLE_BY_LIBRARY.get(id) ?? id;
}

export function exerciseIDsMatch(a: string, b: string): boolean {
  return stableExerciseID(a) === stableExerciseID(b);
}

/** Legacy rule for exercises measured in reps only (bodyweight). Library-based override comes with the library. */
export function legacyRepsOnly(id: string): boolean {
  const stable = stableExerciseID(id);
  return stable.startsWith('pullup_') || ['hyperextensions', 'hanging_knee_raise', 'plank'].includes(stable);
}

export type RepsOnlyResolver = (exerciseID: string) => boolean;

// ------------------------------------------------------------ StrengthProgression

export interface StrengthSample {
  weight: number;
  reps: number;
}
export type ProgressBand = 'improved' | 'stable' | 'declined';

/** Mean estimated strength over all planned work sets; incomplete or invalid input is not comparable. */
export function performance(samples: StrengthSample[], requiredSets: number): number | null {
  if (
    !(requiredSets > 0) ||
    samples.length !== requiredSets ||
    !samples.every((s) => Number.isFinite(s.weight) && s.weight > 0 && s.reps > 0)
  ) {
    return null;
  }
  return samples.reduce((t, s) => t + s.weight * (1 + s.reps / 30), 0) / requiredSets;
}

/** Suggests a weight increase only when every planned set reached 12+ reps at the same weight. */
export function suggestedWeight(samples: StrengthSample[], requiredSets: number, increment: number): number | null {
  if (!(requiredSets > 0) || samples.length !== requiredSets) return null;
  const first = samples[0];
  if (!first || !Number.isFinite(first.weight) || !(first.weight > 0)) return null;
  if (!Number.isFinite(increment) || !(increment > 0)) return null;
  const ok = samples.every(
    (s) => s.reps >= 12 && Number.isFinite(s.weight) && Math.abs(s.weight - first.weight) < 0.001,
  );
  return ok ? first.weight + increment : null;
}

export function progressBand(delta: number): ProgressBand {
  if (delta > 1) return 'improved';
  if (delta < -5) return 'declined';
  return 'stable';
}

// ------------------------------------------------------------ StrengthProgressMetric

const CONTRIBUTION_CAP = 20;

export function plannedSetCount(workout: WorkoutRecord, exerciseID: string): number {
  const counts = workout.plannedSetCounts;
  if (!counts) return 3;
  if (exerciseID in counts) return counts[exerciseID];
  for (const [key, value] of Object.entries(counts)) if (exerciseIDsMatch(key, exerciseID)) return value;
  return 3;
}

function validSets(workoutID: string, sets: SetRecord[]): SetRecord[] {
  return sets.filter((s) => s.workoutID === workoutID && s.reps > 0);
}

/** Best estimated-strength set of an exercise in one workout (bodyweight adds body weight to added load). */
function bestPerformance(values: SetRecord[], bodyWeightKg: number, repsOnly: boolean): number | null {
  if (values.length === 0) return null;
  let best: number | null = null;
  for (const s of values) {
    if (!(s.reps > 0)) continue;
    let load: number;
    if (repsOnly) load = Math.max(1, bodyWeightKg + Math.max(0, s.weight));
    else if (s.weight > 0) load = s.weight;
    else continue;
    const value = load * (1 + s.reps / 30);
    if (best === null || value > best) best = value;
  }
  return best;
}

/**
 * Workout index: mean of per-exercise % change against the most recent earlier completed workout that
 * contained the same exercise, each contribution capped to +/-20 %.
 * (D-020: compares against the last execution of the same exercise.)
 */
export function workoutProgress(
  workout: WorkoutRecord,
  workouts: WorkoutRecord[],
  sets: SetRecord[],
  repsOnlyOf: RepsOnlyResolver = legacyRepsOnly,
): number | null {
  if (!workout.isCompleted || workout.isHidden) return null;
  const currentSets = validSets(workout.id, sets);
  const grouped = new Map<string, SetRecord[]>();
  for (const s of currentSets) {
    const key = stableExerciseID(s.exerciseID);
    const list = grouped.get(key);
    if (list) list.push(s);
    else grouped.set(key, [s]);
  }

  const previousCandidates = workouts
    .filter((c) => c.isCompleted && !c.isHidden && c.id !== workout.id && c.startedAt < workout.startedAt)
    .sort((a, b) => b.startedAt - a.startedAt);

  const deltas: number[] = [];
  for (const [exerciseID, values] of grouped) {
    const repsOnly = repsOnlyOf(exerciseID);
    const current = bestPerformance(values, workout.bodyWeightSnapshot, repsOnly);
    if (current === null || !(current > 0)) continue;

    const previousWorkout = previousCandidates.find((c) =>
      sets.some((s) => s.workoutID === c.id && exerciseIDsMatch(s.exerciseID, exerciseID) && s.reps > 0),
    );
    if (!previousWorkout) continue;

    const previousValues = validSets(previousWorkout.id, sets).filter((s) => exerciseIDsMatch(s.exerciseID, exerciseID));
    const previous = bestPerformance(previousValues, previousWorkout.bodyWeightSnapshot, repsOnly);
    if (previous === null || !(previous > 0)) continue;

    const raw = ((current - previous) / previous) * 100;
    deltas.push(Math.min(CONTRIBUTION_CAP, Math.max(-CONTRIBUTION_CAP, raw)));
  }
  if (deltas.length === 0) return null;
  return deltas.reduce((t, d) => t + d, 0) / deltas.length;
}

/** Mean performance over all planned sets; null when the exercise was not fully logged. */
export function exercisePerformance(
  exerciseID: string,
  workout: WorkoutRecord,
  sets: SetRecord[],
  repsOnlyOf: RepsOnlyResolver = legacyRepsOnly,
): number | null {
  if (!workout.isCompleted || workout.isHidden) return null;
  const values = sets.filter((s) => s.workoutID === workout.id && exerciseIDsMatch(s.exerciseID, exerciseID));
  const target = plannedSetCount(workout, exerciseID);
  if (values.length !== target || !values.every((s) => s.reps > 0)) return null;
  if (repsOnlyOf(exerciseID)) return values.reduce((t, s) => t + s.reps, 0) / target;
  return performance(values.map((s) => ({ weight: s.weight, reps: s.reps })), target);
}

/** Change of one exercise vs the last earlier workout with the same planned set count. */
export function exerciseProgress(
  exerciseID: string,
  workout: WorkoutRecord,
  workouts: WorkoutRecord[],
  sets: SetRecord[],
  repsOnlyOf: RepsOnlyResolver = legacyRepsOnly,
): number | null {
  const current = exercisePerformance(exerciseID, workout, sets, repsOnlyOf);
  if (current === null) return null;
  const target = plannedSetCount(workout, exerciseID);
  const previous = workouts
    .filter(
      (w) => w.isCompleted && !w.isHidden && w.startedAt < workout.startedAt && plannedSetCount(w, exerciseID) === target,
    )
    .sort((a, b) => b.startedAt - a.startedAt)
    .map((w) => exercisePerformance(exerciseID, w, sets, repsOnlyOf))
    .find((v) => v !== null);
  if (previous === undefined || previous === null || !(previous > 0)) return null;
  return (current / previous - 1) * 100;
}

export function weeklyProgress(
  workouts: WorkoutRecord[],
  sets: SetRecord[],
  referenceDate: Ms = Date.now(),
  repsOnlyOf: RepsOnlyResolver = legacyRepsOnly,
): number | null {
  const week = weekInterval(referenceDate);
  const values = workouts
    .filter((w) => w.isCompleted && !w.isHidden && isInside(w.startedAt, week))
    .map((w) => workoutProgress(w, workouts, sets, repsOnlyOf))
    .filter((v): v is number => v !== null);
  if (values.length === 0) return null;
  return values.reduce((t, v) => t + v, 0) / values.length;
}

/** German percent text, e.g. "+3,2 %"; em dash when there is no value. */
export function progressText(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (Math.abs(value) < 0.05) return '0,0 %';
  const sign = value >= 0 ? '+' : '-';
  return `${sign}${Math.abs(value).toFixed(1).replace('.', ',')} %`;
}

export { FALLBACK_BODY_WEIGHT_KG };
