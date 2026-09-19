// Light achievements (D-027..D-029): only genuinely earned personal bests, with a persistent history.
import { paceSecondsPerKm } from './analytics';
import type { Ms } from './dates';
import { exerciseName, isRepsOnlyExercise } from './exercises';
import { stableExerciseID } from './strength';
import type { RunRecord, SetRecord, WorkoutRecord } from './types';

export type AchievementKind = 'strength' | 'run-distance' | 'run-pace';

export interface Achievement {
  id: string;
  kind: AchievementKind;
  date: Ms;
  title: string;
  value: string;
  /** exercise id for strength bests, so the history can be grouped */
  subject: string;
}

export const MIN_PACE_RUN_KM = 3;

export function formatPace(secondsPerKm: number): string {
  if (!(secondsPerKm > 0) || !Number.isFinite(secondsPerKm)) return '–';
  const total = Math.round(secondsPerKm);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')} /km`;
}

export function formatKg(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return String(rounded).replace('.', ',');
}

/** Personal-best events in chronological order. The very first value of a subject is a baseline, not a record. */
export function computeAchievements(workouts: WorkoutRecord[], sets: SetRecord[], runs: RunRecord[]): Achievement[] {
  const out: Achievement[] = [];

  // Strength: best estimated strength per exercise (weight * (1 + reps / 30)); reps-only: best reps in one set.
  const done = workouts.filter((w) => w.isCompleted && !w.isHidden).sort((a, b) => a.startedAt - b.startedAt);
  const setsByWorkout = new Map<string, SetRecord[]>();
  for (const s of sets) {
    const list = setsByWorkout.get(s.workoutID);
    if (list) list.push(s);
    else setsByWorkout.set(s.workoutID, [s]);
  }
  const best = new Map<string, number>();
  for (const w of done) {
    const perExercise = new Map<string, { score: number; set: SetRecord }>();
    for (const s of setsByWorkout.get(w.id) ?? []) {
      if (!(s.reps > 0)) continue;
      const exercise = stableExerciseID(s.exerciseID);
      const repsOnly = isRepsOnlyExercise(exercise);
      if (!repsOnly && !(s.weight > 0)) continue;
      const score = repsOnly ? s.reps : s.weight * (1 + s.reps / 30);
      const current = perExercise.get(exercise);
      if (!current || score > current.score) perExercise.set(exercise, { score, set: s });
    }
    for (const [exercise, { score, set }] of perExercise) {
      const previous = best.get(exercise);
      if (previous !== undefined && score > previous + 1e-9) {
        const repsOnly = isRepsOnlyExercise(exercise);
        out.push({
          id: `strength-${w.id}-${exercise}`,
          kind: 'strength',
          date: w.startedAt,
          title: `Bestwert ${exerciseName(exercise, set.exerciseName)}`,
          value: repsOnly ? `${set.reps} Wdh.` : `${formatKg(set.weight)} kg × ${set.reps}`,
          subject: exercise,
        });
      }
      if (previous === undefined || score > previous) best.set(exercise, score);
    }
  }

  // Runs: longest distance and fastest average pace (runs of at least 3 km).
  const valid = runs
    .filter((r) => !r.isHidden && r.distanceKm > 0 && r.durationSeconds > 0)
    .sort((a, b) => a.date - b.date);
  let longest: number | null = null;
  let fastest: number | null = null;
  for (const r of valid) {
    if (longest !== null && r.distanceKm > longest + 1e-9) {
      out.push({
        id: `run-distance-${r.id}`, kind: 'run-distance', date: r.date, title: 'Längster Lauf',
        value: `${r.distanceKm.toFixed(2).replace('.', ',')} km`, subject: 'run-distance',
      });
    }
    if (longest === null || r.distanceKm > longest) longest = r.distanceKm;
    if (r.distanceKm >= MIN_PACE_RUN_KM) {
      const pace = paceSecondsPerKm(r);
      if (fastest !== null && pace < fastest - 1e-9) {
        out.push({
          id: `run-pace-${r.id}`, kind: 'run-pace', date: r.date, title: 'Schnellstes Tempo',
          value: formatPace(pace), subject: 'run-pace',
        });
      }
      if (fastest === null || pace < fastest) fastest = pace;
    }
  }

  return out.sort((a, b) => a.date - b.date);
}

/** Achievements earned by one workout or run (for the completion screens). */
export function achievementsFor(all: Achievement[], id: string): Achievement[] {
  return all.filter((a) => a.id.includes(id));
}
