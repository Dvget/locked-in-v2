// Ported behavior of TrainingPlans.swift (model + validation), PlanSchedule.swift and StepSyncPolicy.swift.

export interface PlannedExercise {
  id: string;
  exerciseID: string;
  alternativeIDs: string[];
  sets: number;
  startingWeight: number;
  startingReps: number;
  weightIncrement: number;
  restSeconds: number | null;
  catalogID: string | null;
  /** D-018: per-exercise override of the global target rep range. */
  repRangeMin?: number | null;
  repRangeMax?: number | null;
}

export interface TrainingPlan {
  id: string;
  name: string;
  weeklyFrequency: number;
  entries: PlannedExercise[];
  /** D-017: workout type, free label such as "Push" or "Ganzkörper". */
  workoutType?: string | null;
}

export class PlanError extends Error {
  constructor(public readonly kind: 'invalid' | 'unreadable') {
    super(
      kind === 'invalid'
        ? 'Bitte Name, Wochenhäufigkeit und Übungswerte prüfen.'
        : 'Die vorhandenen Trainingspläne konnten nicht gelesen werden. Sie wurden nicht überschrieben. Bitte ein Backup wiederherstellen.',
    );
  }
}

export function validatePlans(plans: TrainingPlan[]): void {
  const inRange = (v: number, lo: number, hi: number) => Number.isInteger(v) && v >= lo && v <= hi;
  if (new Set(plans.map((p) => p.id)).size !== plans.length) throw new PlanError('invalid');
  for (const plan of plans) {
    if (
      plan.name.trim().length === 0 ||
      !inRange(plan.weeklyFrequency, 1, 7) ||
      new Set(plan.entries.map((e) => e.id)).size !== plan.entries.length ||
      new Set(plan.entries.map((e) => e.exerciseID)).size !== plan.entries.length
    ) {
      throw new PlanError('invalid');
    }
    for (const e of plan.entries) {
      const rest = e.restSeconds ?? 150;
      if (
        e.exerciseID.length === 0 ||
        !inRange(e.sets, 1, 10) ||
        !inRange(e.startingReps, 1, 100) ||
        !Number.isFinite(e.startingWeight) ||
        e.startingWeight < 0 ||
        !Number.isFinite(e.weightIncrement) ||
        e.weightIncrement <= 0 ||
        e.weightIncrement > 100 ||
        !inRange(rest, 15, 600) ||
        e.alternativeIDs.includes(e.exerciseID) ||
        new Set(e.alternativeIDs).size !== e.alternativeIDs.length
      ) {
        throw new PlanError('invalid');
      }
    }
  }
}

export interface PlanTarget {
  id: string;
  weeklyFrequency: number;
}

/**
 * Suggests the next plan: the pending plan (done < weekly frequency) with the lowest completion ratio;
 * ties avoid repeating the last plan, then keep list order. When all are done, round-robin after the last.
 */
export function nextPlan(targets: PlanTarget[], completed: Record<string, number>, last: string | null): string | null {
  if (targets.length === 0) return null;
  const done = (id: string) => completed[id] ?? 0;
  const pending = targets.map((t, offset) => ({ t, offset })).filter(({ t }) => done(t.id) < t.weeklyFrequency);
  if (pending.length > 0) {
    const ratio = (t: PlanTarget) => done(t.id) / Math.max(1, t.weeklyFrequency);
    const best = pending.reduce((a, b) => {
      const l = ratio(a.t);
      const r = ratio(b.t);
      if (l !== r) return l < r ? a : b;
      if (a.t.id === last) return b;
      if (b.t.id === last) return a;
      return a.offset <= b.offset ? a : b;
    });
    return best.t.id;
  }
  const index = targets.findIndex((t) => t.id === last);
  return targets[(index + 1) % targets.length].id;
}

// ------------------------------------------------------------ step sync policy

export function shouldAttemptOpenSync(isAvailable: boolean): boolean {
  return isAvailable;
}

export function shouldAutomaticSync(args: {
  isEnabled: boolean;
  lastSync: number;
  now: number;
  minimumInterval: number;
}): boolean {
  if (!args.isEnabled) return false;
  if (args.lastSync === 0) return true;
  return args.now - args.lastSync >= args.minimumInterval;
}
