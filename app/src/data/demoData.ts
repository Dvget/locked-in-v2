// Deterministic demo data for the web preview and tests. Never used on the phone.
import { addDays, startOfWeek, type Ms } from '../domain/dates';
import { defaultFullBodyPlan, exerciseName } from '../domain/exercises';
import type { RunRecord, SetRecord, StepRecord, WeightRecord, WorkoutRecord } from '../domain/types';
import type { AppData } from './repository';

export function buildDemoData(now: Ms = Date.now()): AppData {
  const plan = defaultFullBodyPlan();
  const workouts: WorkoutRecord[] = [];
  const sets: SetRecord[] = [];
  const runs: RunRecord[] = [];
  const weights: WeightRecord[] = [];
  const steps: StepRecord[] = [];
  const thisWeek = startOfWeek(now);
  let n = 0;
  const id = (p: string) => `${p}-${++n}`;
  const baseWeights: Record<string, number> = {
    db_bench_flat: 24, barbell_squat: 60, pullup_straight: 0, rdl_barbell: 60,
    row_narrow: 55, lateral_dumbbell: 8, hyperextensions: 0,
  };

  for (let w = 5; w >= 0; w--) {
    const monday = addDays(thisWeek, -7 * w);
    // Two strength sessions per week (Mon, Thu), one run each on Tue and Sat.
    for (const [offset, hour] of [[0, 18], [3, 18]] as const) {
      const start = addDays(monday, offset) + hour * 3_600_000;
      if (start > now) continue;
      const wid = id('w');
      workouts.push({
        id: wid, startedAt: start, endedAt: start + 3_500_000, isCompleted: true, isHidden: false,
        bodyWeightSnapshot: 85, planID: plan.id, planName: plan.name,
        plannedSetCounts: Object.fromEntries(plan.entries.map((e) => [e.exerciseID, e.sets])),
      });
      plan.entries.forEach((entry, slot) => {
        const progress = (5 - w) * 0.02 + (offset === 3 ? 0.01 : 0);
        for (let s = 0; s < entry.sets; s++) {
          const base = baseWeights[entry.exerciseID] ?? 20;
          const weight = Math.round(base * (1 + progress) * 2) / 2;
          sets.push({
            id: id('s'), workoutID: wid, exerciseID: entry.exerciseID,
            exerciseName: exerciseName(entry.exerciseID), planSlot: slot + 1, setNumber: s + 1,
            weight: entry.exerciseID === 'pullup_straight' || entry.exerciseID === 'hyperextensions' ? 0 : weight,
            reps: 10 - s + Math.round((5 - w) / 2), rir: null, completedAt: start + (slot * 8 + s) * 120_000,
          });
        }
      });
    }
    for (const [offset, km] of [[1, 5], [5, 6.5]] as const) {
      const date = addDays(monday, offset) + 8 * 3_600_000;
      if (date > now) continue;
      const pace = 350 - (5 - w) * 4;
      runs.push({
        id: id('r'), date, distanceKm: km, durationSeconds: Math.round(km * pace), source: 'native',
        isHidden: false, startTime: date, elevationGainMeters: null, elevationLossMeters: null,
        pausedDurationSeconds: 0, algorithmVersion: 'demo',
      });
    }
  }

  for (let d = 41; d >= 0; d -= 2) {
    const date = addDays(now, -d);
    if (date > now) continue;
    weights.push({
      id: id('g'), date, weightKg: Math.round((85.6 - (41 - d) * 0.03 + Math.sin(d) * 0.2) * 10) / 10,
      source: 'manual', isHidden: false,
    });
  }
  for (let d = 13; d >= 0; d--) {
    steps.push({ id: id('t'), date: addDays(now, -d), steps: 6000 + ((d * 1237) % 5000), source: 'pedometer' });
  }
  return { workouts, sets, runs, steps, weights, plans: [plan], lastCompletedPlanID: plan.id };
}
