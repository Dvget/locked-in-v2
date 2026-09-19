// Plan history: a snapshot before every plan change, kept for 30 days (port of PlanHistoryPolicy).
import { addDays, type Ms } from './dates';
import type { TrainingPlan } from './plans';

export const PLAN_HISTORY_KEY = 'planHistory';
export const PLAN_HISTORY_RETENTION_DAYS = 30;

export interface PlanSnapshot {
  savedAt: Ms;
  plans: TrainingPlan[];
}

export function shouldStoreSnapshot(previous: TrainingPlan[] | null, current: TrainingPlan[]): boolean {
  return previous === null || JSON.stringify(previous) !== JSON.stringify(current);
}

export function pruneHistory(history: PlanSnapshot[], now: Ms = Date.now()): PlanSnapshot[] {
  const cutoff = addDays(now, -PLAN_HISTORY_RETENTION_DAYS);
  return history.filter((s) => s.savedAt >= cutoff).sort((a, b) => b.savedAt - a.savedAt);
}

/** Adds a snapshot of `plansBeforeChange` unless it equals the newest one; returns the new history. */
export function withSnapshot(history: PlanSnapshot[], plansBeforeChange: TrainingPlan[], now: Ms = Date.now()): PlanSnapshot[] {
  if (plansBeforeChange.length === 0) return pruneHistory(history, now);
  const newest = history.slice().sort((a, b) => b.savedAt - a.savedAt)[0];
  if (!shouldStoreSnapshot(newest ? newest.plans : null, plansBeforeChange)) return pruneHistory(history, now);
  return pruneHistory([...history, { savedAt: now, plans: plansBeforeChange }], now);
}

export function parseHistory(raw: string | null): PlanSnapshot[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as PlanSnapshot[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
