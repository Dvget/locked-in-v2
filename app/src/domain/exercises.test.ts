import { describe, expect, it } from 'vitest';
import {
  allLibraryExercises,
  defaultFullBodyPlan,
  defaultIncrement,
  exerciseDefinition,
  exerciseMatchesQuery,
  isRepsOnlyExercise,
  muscleGroup,
  searchExercises,
  setCustomExercises,
  newCustomExercise,
} from './exercises';
import { validatePlans } from './plans';

describe('exercise library', () => {
  it('loads the library incl. variants', () => {
    expect(allLibraryExercises.length).toBeGreaterThan(800);
  });

  it('resolves historical ids with German names and stable ids', () => {
    const def = exerciseDefinition('library:Incline_Dumbbell_Press');
    expect(def?.id).toBe('db_bench_flat');
    expect(def?.name).toBe('Kurzhantelschrägbankdrücken');
    expect(exerciseDefinition('db_bench_flat')?.name).toBe('Kurzhantelschrägbankdrücken');
    expect(exerciseDefinition('pullup_narrow')?.name).toBe('Klimmzüge – enger Griff');
    expect(exerciseDefinition('does-not-exist')).toBeNull();
  });

  it('knows reps-only exercises and increments', () => {
    expect(isRepsOnlyExercise('pullup_straight')).toBe(true);
    expect(isRepsOnlyExercise('plank')).toBe(true);
    expect(isRepsOnlyExercise('leg_press')).toBe(false);
    expect(defaultIncrement('db_bench_flat')).toBe(2);
    expect(defaultIncrement('barbell_squat')).toBe(5);
    expect(defaultIncrement('row_wide')).toBe(2.5);
    expect(muscleGroup('lats')).toBe('Rücken');
  });

  it('searches in German and English', () => {
    expect(exerciseMatchesQuery('kniebeuge', 'library:Barbell_Squat', 'Barbell Squat', 'Beine & Gesäß', 'Langhantel')).toBe(true);
    expect(exerciseMatchesQuery('lh squat', 'library:Barbell_Squat', 'Barbell Squat', 'Beine & Gesäß', 'Langhantel')).toBe(true);
    expect(exerciseMatchesQuery('curl', 'x', 'Leg Press', 'Beine', 'Maschine')).toBe(false);
    expect(searchExercises('klimmzug').some((d) => d.id === 'pullup_straight')).toBe(true);
  });

  it('supports custom exercises (D-043)', () => {
    const custom = newCustomExercise('Meine Übung', null, 'chest', true);
    setCustomExercises([custom]);
    expect(exerciseDefinition(custom.id)?.isCustom).toBe(true);
    expect(isRepsOnlyExercise(custom.id)).toBe(true);
    expect(searchExercises('meine')[0].id).toBe(custom.id);
    setCustomExercises([]);
  });

  it('builds a valid default plan', () => {
    const plan = defaultFullBodyPlan();
    expect(() => validatePlans([plan])).not.toThrow();
    expect(plan.entries).toHaveLength(7);
    for (const e of plan.entries) expect(exerciseDefinition(e.exerciseID)).not.toBeNull();
  });
});
