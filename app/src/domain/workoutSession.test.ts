import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../data/repository';
import { defaultFullBodyPlan } from './exercises';
import * as W from './workoutSession';
import type { SetRecord, WorkoutRecord } from './types';

const plan = defaultFullBodyPlan();
const set = (workoutID: string, exerciseID: string, setNumber: number, weight: number, reps: number, slot = 1): SetRecord => ({
  id: `${workoutID}-${exerciseID}-${setNumber}`, workoutID, exerciseID, exerciseName: exerciseID, planSlot: slot,
  setNumber, weight, reps, rir: null, completedAt: 0,
});
const done = (id: string, startedAt: number, over: Partial<WorkoutRecord> = {}): WorkoutRecord => ({
  id, startedAt, endedAt: startedAt + 1, isCompleted: true, isHidden: false, bodyWeightSnapshot: 90,
  planID: null, planName: null, plannedSetCounts: null, ...over,
});

describe('workout session', () => {
  it('starts an unfinished workout with a plan snapshot', () => {
    const { workout, state } = W.startSession(plan, 88, 1000);
    expect(workout.isCompleted).toBe(false);
    expect(workout.bodyWeightSnapshot).toBe(88);
    expect(workout.plannedSetCounts?.db_bench_flat).toBe(3);
    expect(state.slotIndex).toBe(0);
    expect(state.plan).not.toBe(plan);
    expect(W.chosenExercise(state, 0)).toBe('db_bench_flat');
  });

  it('compares against the last completed run of the same exercise (D-020)', () => {
    const w1 = done('w1', 1);
    const w2 = done('w2', 2);
    const hidden = done('w3', 3, { isHidden: true });
    const sets = [set('w1', 'leg_press', 1, 100, 10), set('w2', 'row_narrow', 1, 50, 10), set('w3', 'leg_press', 1, 999, 1)];
    const prev = W.previousSetsFor('leg_press', 'cur', [w1, w2, hidden], sets);
    expect(prev.map((s) => s.weight)).toEqual([100]);
    expect(W.previousSetsFor('plank', 'cur', [w1], sets)).toEqual([]);
  });

  it('keeps alternatives on their own history (D-022)', () => {
    const w1 = done('w1', 1);
    const sets = [set('w1', 'goblet_squat', 1, 20, 10, 2)];
    expect(W.previousSetsFor('barbell_squat', 'cur', [w1], sets)).toEqual([]);
    expect(W.previousSetsFor('goblet_squat', 'cur', [w1], sets)).toHaveLength(1);
  });

  it('suggests inputs from the previous set at the same position', () => {
    const entry = plan.entries[1];
    const previous = [set('w', 'barbell_squat', 1, 60, 10), set('w', 'barbell_squat', 2, 60, 9), set('w', 'barbell_squat', 3, 60, 8)];
    expect(W.suggestInputs(previous, 0, entry, 'barbell_squat', false)).toEqual({ weight: 60, reps: 10 });
    expect(W.suggestInputs(previous, 5, entry, 'barbell_squat', false)).toEqual({ weight: 60, reps: 8 });
    expect(W.suggestInputs([], 0, entry, 'barbell_squat', false)).toEqual({ weight: 20, reps: 8 });
    expect(W.suggestInputs([], 0, entry, 'barbell_squat', true)).toEqual({ weight: 0, reps: 8 });
  });

  it('hints a weight increase only at the top of the rep range', () => {
    const entry = { ...plan.entries[1], sets: 3 };
    const at = (reps: number) => [1, 2, 3].map((i) => set('w', 'barbell_squat', i, 60, reps));
    expect(W.progressionHint(at(12), entry, DEFAULT_SETTINGS, 5, false)).toBe(65);
    expect(W.progressionHint(at(11), entry, DEFAULT_SETTINGS, 5, false)).toBeNull();
    expect(W.progressionHint(at(10), { ...entry, repRangeMax: 10 }, DEFAULT_SETTINGS, 5, false)).toBe(65);
    expect(W.progressionHint(at(12), entry, DEFAULT_SETTINGS, 5, true)).toBeNull();
  });

  it('uses heavy rest for the first four slots and light rest afterwards', () => {
    const entry = plan.entries[0];
    expect(W.restSecondsFor(entry, 0, DEFAULT_SETTINGS)).toBe(150);
    expect(W.restSecondsFor(entry, 4, DEFAULT_SETTINGS)).toBe(120);
    expect(W.restSecondsFor({ ...entry, restSeconds: 90 }, 0, DEFAULT_SETTINGS)).toBe(90);
  });

  it('finishes with the chosen exercises as planned counts', () => {
    const { workout, state } = W.startSession(plan, 90, 1000);
    state.chosen[1] = 'leg_press';
    const finished = W.finishWorkout(workout, state, 5000);
    expect(finished.isCompleted).toBe(true);
    expect(finished.endedAt).toBe(5000);
    expect(finished.plannedSetCounts?.leg_press).toBe(3);
    expect(finished.plannedSetCounts?.barbell_squat).toBeUndefined();
  });

  it('tracks slot progress and volume', () => {
    const { state } = W.startSession(plan, 90, 1000);
    const sets = [set(state.workoutID, 'db_bench_flat', 1, 20, 10, 1), set(state.workoutID, 'db_bench_flat', 2, 20, 8, 1)];
    const progress = W.slotProgress(state, sets);
    expect(progress[0]).toMatchObject({ done: 2, planned: 3 });
    expect(progress[1].done).toBe(0);
    expect(W.workoutVolume(sets)).toBe(360);
  });

  it('suggests the next plan by weekly completion', () => {
    const b = { ...defaultFullBodyPlan(), id: 'B', name: 'B', weeklyFrequency: 1 };
    const a = { ...plan, id: 'A', weeklyFrequency: 2 };
    const now = new Date(2026, 8, 17, 12).getTime();
    expect(W.suggestedPlanID([a, b], [], null, now)).toBe('A');
    const w = done('w', new Date(2026, 8, 15, 10).getTime(), { planID: 'A' });
    expect(W.suggestedPlanID([a, b], [w], 'A', now)).toBe('B');
  });

  it('formats the clock', () => {
    expect(W.formatClock(150)).toBe('2:30');
    expect(W.formatClock(3725)).toBe('1:02:05');
    expect(W.remainingSeconds(10_500, 10_000)).toBe(1);
    expect(W.remainingSeconds(null, 10_000)).toBe(0);
  });
});
