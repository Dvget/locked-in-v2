import { describe, expect, it } from 'vitest';
import * as S from './strength';
import { nextPlan, shouldAutomaticSync, shouldAttemptOpenSync, validatePlans, type TrainingPlan } from './plans';
import type { SetRecord, WorkoutRecord } from './types';

const workout = (id: string, day: number, over: Partial<WorkoutRecord> = {}): WorkoutRecord => ({
  id,
  startedAt: new Date(2026, 8, day, 10).getTime(),
  endedAt: new Date(2026, 8, day, 11).getTime(),
  isCompleted: true,
  isHidden: false,
  bodyWeightSnapshot: 90,
  planID: null,
  planName: null,
  plannedSetCounts: null,
  ...over,
});
let n = 0;
const set = (workoutID: string, exerciseID: string, weight: number, reps: number): SetRecord => ({
  id: `s${n++}`,
  workoutID,
  exerciseID,
  exerciseName: exerciseID,
  planSlot: 1,
  setNumber: 1,
  weight,
  reps,
  rir: null,
  completedAt: 0,
});

describe('StrengthProgression', () => {
  const full = Array.from({ length: 3 }, () => ({ weight: 20, reps: 12 }));

  it('requires all planned sets at the same weight for a suggestion', () => {
    expect(S.suggestedWeight(full, 3, 2)).toBe(22);
    expect(S.suggestedWeight(full.slice(0, 2), 3, 2)).toBeNull();
    expect(S.suggestedWeight([full[0], full[1], { weight: 18, reps: 12 }], 3, 2)).toBeNull();
    expect(S.suggestedWeight([full[0], full[1], { weight: 20, reps: 11 }], 3, 2)).toBeNull();
  });

  it('supports custom set counts and excludes bodyweight', () => {
    expect(S.suggestedWeight(Array.from({ length: 4 }, () => ({ weight: 60, reps: 12 })), 4, 5)).toBe(65);
    expect(S.suggestedWeight(Array.from({ length: 3 }, () => ({ weight: 0, reps: 12 })), 3, 2)).toBeNull();
  });

  it('means over every work set; incomplete is not compared', () => {
    const samples = [{ weight: 20, reps: 12 }, { weight: 20, reps: 10 }, { weight: 20, reps: 8 }];
    expect(S.performance(samples, 3)).toBeCloseTo(26.6666667, 4);
    expect(S.performance(samples.slice(0, 2), 3)).toBeNull();
    expect(S.performance([{ weight: NaN, reps: 12 }], 1)).toBeNull();
  });

  it('uses the agreed color boundaries', () => {
    expect(S.progressBand(1)).toBe('stable');
    expect(S.progressBand(1.01)).toBe('improved');
    expect(S.progressBand(-5)).toBe('stable');
    expect(S.progressBand(-5.01)).toBe('declined');
  });
});

describe('exercise identity', () => {
  it('links historical ids to library ids without merging variants', () => {
    expect(S.exerciseIDsMatch('db_bench_flat', 'library:Incline_Dumbbell_Press')).toBe(true);
    expect(S.exerciseIDsMatch('db_bench_flat', 'library:Dumbbell_Bench_Press')).toBe(false);
    expect(S.exerciseIDsMatch('pullup_narrow_angle', 'pullup_straight')).toBe(false);
    for (const key of Object.keys(S.CATALOG_LINKS)) expect(S.stableExerciseID(key)).toBe(key);
    expect(new Set(Object.values(S.CATALOG_LINKS)).size).toBe(Object.keys(S.CATALOG_LINKS).length);
  });
});

describe('workout index', () => {
  it('compares against the last execution of the same exercise, capped at 20 %', () => {
    const w1 = workout('w1', 1);
    const w2 = workout('w2', 3);
    const w3 = workout('w3', 5);
    const sets = [
      set('w1', 'leg_press', 100, 10),
      set('w2', 'leg_press', 110, 10), // +10 %
      set('w3', 'leg_press', 200, 10), // capped +20 %
    ];
    const all = [w1, w2, w3];
    expect(S.workoutProgress(w1, all, sets)).toBeNull();
    expect(S.workoutProgress(w2, all, sets)).toBeCloseTo(10, 5);
    expect(S.workoutProgress(w3, all, sets)).toBeCloseTo(20, 5);
  });

  it('ignores hidden or unfinished workouts and skips workouts without the exercise', () => {
    const w1 = workout('w1', 1);
    const w2 = workout('w2', 2); // other exercise only
    const w3 = workout('w3', 3);
    const hidden = workout('wh', 2, { isHidden: true });
    const sets = [set('w1', 'leg_press', 100, 10), set('w2', 'row_narrow', 50, 10), set('w3', 'leg_press', 105, 10), set('wh', 'leg_press', 1, 1)];
    expect(S.workoutProgress(w3, [w1, w2, w3, hidden], sets)).toBeCloseTo(5, 5);
    expect(S.workoutProgress(hidden, [w1, hidden], sets)).toBeNull();
  });

  it('adds body weight for bodyweight exercises', () => {
    const w1 = workout('w1', 1);
    const w2 = workout('w2', 3);
    const sets = [set('w1', 'pullup_straight', 0, 6), set('w2', 'pullup_straight', 0, 9)];
    const expected = ((90 * (1 + 9 / 30)) / (90 * (1 + 6 / 30)) - 1) * 100;
    expect(S.workoutProgress(w2, [w1, w2], sets)).toBeCloseTo(expected, 5);
  });

  it('averages the weekly progress', () => {
    const w1 = workout('w1', 1);
    const w2 = workout('w2', 8);
    const w3 = workout('w3', 10);
    const sets = [set('w1', 'leg_press', 100, 10), set('w2', 'leg_press', 110, 10), set('w3', 'leg_press', 121, 10)];
    expect(S.weeklyProgress([w1, w2, w3], sets, new Date(2026, 8, 9).getTime())).toBeCloseTo(10, 5);
    expect(S.weeklyProgress([w1], sets, new Date(2026, 8, 2).getTime())).toBeNull();
  });

  it('only compares fully logged exercises with equal planned set counts', () => {
    const w1 = workout('w1', 1, { plannedSetCounts: { leg_press: 2 } });
    const w2 = workout('w2', 3, { plannedSetCounts: { leg_press: 2 } });
    const sets = [set('w1', 'leg_press', 100, 10), set('w1', 'leg_press', 100, 10), set('w2', 'leg_press', 110, 10), set('w2', 'leg_press', 110, 10)];
    expect(S.exerciseProgress('leg_press', w2, [w1, w2], sets)).toBeCloseTo(10, 5);
    const partial = [...sets.slice(0, 2), set('w2', 'leg_press', 110, 10)];
    expect(S.exerciseProgress('leg_press', w2, [w1, w2], partial)).toBeNull();
  });

  it('formats German percent text', () => {
    expect(S.progressText(null)).toBe('—');
    expect(S.progressText(0.01)).toBe('0,0 %');
    expect(S.progressText(3.24)).toBe('+3,2 %');
    expect(S.progressText(-3.26)).toBe('-3,3 %');
  });
});

describe('plans', () => {
  const plan = (over: Partial<TrainingPlan> = {}): TrainingPlan => ({
    id: 'p1',
    name: 'Full Body',
    weeklyFrequency: 2,
    entries: [
      {
        id: 'e1', exerciseID: 'leg_press', alternativeIDs: [], sets: 3, startingWeight: 0,
        startingReps: 8, weightIncrement: 2.5, restSeconds: null, catalogID: null,
      },
    ],
    ...over,
  });

  it('validates plans', () => {
    expect(() => validatePlans([plan()])).not.toThrow();
    expect(() => validatePlans([plan({ name: '  ' })])).toThrow();
    expect(() => validatePlans([plan({ weeklyFrequency: 8 })])).toThrow();
    expect(() => validatePlans([plan(), plan()])).toThrow();
    const e = plan().entries[0];
    expect(() => validatePlans([plan({ entries: [{ ...e, restSeconds: 5 }] })])).toThrow();
    expect(() => validatePlans([plan({ entries: [{ ...e, alternativeIDs: ['leg_press'] }] })])).toThrow();
  });

  it('suggests A B A for 2 and 1 weekly sessions', () => {
    const targets = [{ id: 'a', weeklyFrequency: 2 }, { id: 'b', weeklyFrequency: 1 }];
    expect(nextPlan(targets, {}, null)).toBe('a');
    expect(nextPlan(targets, { a: 1 }, 'a')).toBe('b');
    expect(nextPlan(targets, { a: 1, b: 1 }, 'b')).toBe('a');
    expect(nextPlan([], {}, null)).toBeNull();
  });

  it('applies the step sync policy', () => {
    expect(shouldAttemptOpenSync(true)).toBe(true);
    expect(shouldAttemptOpenSync(false)).toBe(false);
    expect(shouldAutomaticSync({ isEnabled: false, lastSync: 0, now: 10000, minimumInterval: 1800 })).toBe(false);
    expect(shouldAutomaticSync({ isEnabled: true, lastSync: 0, now: 10000, minimumInterval: 1800 })).toBe(true);
    expect(shouldAutomaticSync({ isEnabled: true, lastSync: 9000, now: 10000, minimumInterval: 1800 })).toBe(false);
    expect(shouldAutomaticSync({ isEnabled: true, lastSync: 8000, now: 10000, minimumInterval: 1800 })).toBe(true);
  });
});
