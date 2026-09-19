// Pure logic of the active workout (ports WorkoutSessionStore/ActiveWorkoutView behavior; D-019..D-024).
import type { Settings } from '../data/repository';
import { newId, type Ms } from './dates';
import { exerciseDefinition } from './exercises';
import { nextPlan, type PlannedExercise, type TrainingPlan } from './plans';
import { exerciseIDsMatch, suggestedWeight } from './strength';
import { isInside, weekInterval } from './dates';
import type { SetRecord, WorkoutRecord } from './types';

export const ACTIVE_WORKOUT_KEY = 'activeWorkout';

/** Persisted (KV) so a session can be resumed after the app was closed. */
export interface WorkoutSessionState {
  workoutID: string;
  /** Snapshot of the plan at start; later plan edits do not change a running workout. */
  plan: TrainingPlan;
  slotIndex: number;
  /** slot index -> chosen exercise (main or alternative) */
  chosen: Record<number, string>;
  /** Wall-clock end of the running rest timer, or null. */
  timerEndsAt: number | null;
}

export function optionsForEntry(entry: PlannedExercise): string[] {
  return [entry.exerciseID, ...entry.alternativeIDs];
}

export function chosenExercise(state: WorkoutSessionState, slotIndex: number): string {
  const entry = state.plan.entries[slotIndex];
  return state.chosen[slotIndex] ?? entry.exerciseID;
}

/** Starts a session: the unfinished workout record plus its initial state. */
export function startSession(
  plan: TrainingPlan,
  bodyWeightKg: number,
  now: Ms = Date.now(),
): { workout: WorkoutRecord; state: WorkoutSessionState } {
  const workout: WorkoutRecord = {
    id: newId(),
    startedAt: now,
    endedAt: null,
    isCompleted: false,
    isHidden: false,
    bodyWeightSnapshot: bodyWeightKg,
    planID: plan.id,
    planName: plan.name,
    plannedSetCounts: Object.fromEntries(plan.entries.map((e) => [e.exerciseID, e.sets])),
  };
  return {
    workout,
    state: { workoutID: workout.id, plan: structuredCloneSafe(plan), slotIndex: 0, chosen: {}, timerEndsAt: null },
  };
}

function structuredCloneSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Sets logged in this workout for one slot (matches alternatives by stable id). */
export function setsForSlot(sets: SetRecord[], workoutID: string, slotIndex: number, exerciseID: string): SetRecord[] {
  return sets
    .filter((s) => s.workoutID === workoutID && s.planSlot === slotIndex + 1 && exerciseIDsMatch(s.exerciseID, exerciseID))
    .sort((a, b) => a.setNumber - b.setNumber);
}

/** D-020: the last completed, visible workout that contained this exact exercise. */
export function previousSetsFor(
  exerciseID: string,
  currentWorkoutID: string,
  workouts: WorkoutRecord[],
  sets: SetRecord[],
): SetRecord[] {
  const eligible = workouts
    .filter((w) => w.isCompleted && !w.isHidden && w.id !== currentWorkoutID)
    .sort((a, b) => b.startedAt - a.startedAt);
  for (const w of eligible) {
    const found = sets
      .filter((s) => s.workoutID === w.id && exerciseIDsMatch(s.exerciseID, exerciseID))
      .sort((a, b) => a.setNumber - b.setNumber);
    if (found.length > 0) return found;
  }
  return [];
}

/** Initial weight/reps for the next set: same set number of the last performance, else plan defaults. */
export function suggestInputs(
  previous: SetRecord[],
  setsDone: number,
  entry: PlannedExercise,
  exerciseID: string,
  repsOnly: boolean,
): { weight: number; reps: number } {
  if (previous.length > 0) {
    const index = Math.min(setsDone, Math.max(previous.length - 1, 0));
    const p = previous[index];
    return { weight: repsOnly ? 0 : p.weight, reps: p.reps > 0 ? p.reps : entry.startingReps };
  }
  const isMain = exerciseIDsMatch(entry.exerciseID, exerciseID);
  return { weight: repsOnly ? 0 : isMain ? entry.startingWeight || 20 : 20, reps: entry.startingReps };
}

/** Top of the target rep range: per-exercise override (D-018), else the global setting. */
export function topRepsFor(entry: PlannedExercise, settings: Settings): number {
  return entry.repRangeMax ?? settings.repRangeMax;
}

/** Subtle hint when every planned set reached the top of the range at the same weight. */
export function progressionHint(
  previous: SetRecord[],
  entry: PlannedExercise,
  settings: Settings,
  weightStep: number,
  repsOnly: boolean,
): number | null {
  if (repsOnly) return null;
  return suggestedWeight(
    previous.map((s) => ({ weight: s.weight, reps: s.reps })),
    entry.sets,
    weightStep,
    topRepsFor(entry, settings),
  );
}

export function weightStepFor(entry: PlannedExercise, exerciseID: string): number {
  if (exerciseIDsMatch(entry.exerciseID, exerciseID)) return entry.weightIncrement;
  return exerciseDefinition(exerciseID)?.defaultIncrement ?? 2.5;
}

/** Rest seconds: per-entry override, else heavy for the first four slots and light afterwards. */
export function restSecondsFor(entry: PlannedExercise, slotIndex: number, settings: Settings): number {
  return entry.restSeconds ?? (slotIndex < 4 ? settings.heavyRestSeconds : settings.lightRestSeconds);
}

/** Planned set counts keyed by the chosen exercise; stored on the workout for later comparisons. */
export function plannedCountsOf(state: WorkoutSessionState): Record<string, number> {
  const counts: Record<string, number> = {};
  state.plan.entries.forEach((entry, i) => {
    counts[chosenExercise(state, i)] = entry.sets;
  });
  return counts;
}

export function finishWorkout(workout: WorkoutRecord, state: WorkoutSessionState, now: Ms = Date.now()): WorkoutRecord {
  return { ...workout, endedAt: now, isCompleted: true, plannedSetCounts: plannedCountsOf(state) };
}

export interface SlotProgress {
  index: number;
  exerciseID: string;
  done: number;
  planned: number;
}

export function slotProgress(state: WorkoutSessionState, sets: SetRecord[]): SlotProgress[] {
  return state.plan.entries.map((entry, index) => {
    const exerciseID = chosenExercise(state, index);
    return {
      index,
      exerciseID,
      done: setsForSlot(sets, state.workoutID, index, exerciseID).length,
      planned: entry.sets,
    };
  });
}

/** Volume of weighted sets (bodyweight sets count 0). */
export function workoutVolume(sets: SetRecord[]): number {
  return sets.reduce((t, s) => (s.weight > 0 && s.reps > 0 ? t + s.weight * s.reps : t), 0);
}

/** Suggested plan for the next workout, based on this week's completed sessions per plan. */
export function suggestedPlanID(
  plans: TrainingPlan[],
  workouts: WorkoutRecord[],
  lastCompletedPlanID: string | null,
  now: Ms = Date.now(),
): string | null {
  const week = weekInterval(now);
  const completed = workouts
    .filter((w) => w.isCompleted && !w.isHidden && isInside(w.startedAt, week))
    .sort((a, b) => a.startedAt - b.startedAt);
  const counts: Record<string, number> = {};
  for (const w of completed) if (w.planID) counts[w.planID] = (counts[w.planID] ?? 0) + 1;
  const last = completed.length ? completed[completed.length - 1].planID ?? lastCompletedPlanID : lastCompletedPlanID;
  return nextPlan(
    plans.map((p) => ({ id: p.id, weeklyFrequency: p.weeklyFrequency })),
    counts,
    last,
  );
}

// ------------------------------------------------------------ rest timer

export function remainingSeconds(endsAt: number | null, now: Ms): number {
  if (endsAt === null) return 0;
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}
