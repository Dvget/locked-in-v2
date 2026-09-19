import type { TrainingPlan } from '../domain/plans';
import type { RunRecord, RunTrackPoint, SetRecord, StepRecord, WeightRecord, WorkoutRecord } from '../domain/types';
import {
  DEFAULT_SETTINGS,
  EMPTY_DATA,
  type AppData,
  type FullData,
  type Repository,
  type Settings,
} from './repository';

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const index = list.findIndex((x) => x.id === item.id);
  if (index < 0) return [...list, item];
  const copy = list.slice();
  copy[index] = item;
  return copy;
}

/** In-memory repository for tests and the web preview. */
export class MemoryRepository implements Repository {
  private data: AppData;
  private points = new Map<string, RunTrackPoint[]>();
  private settings: Settings = { ...DEFAULT_SETTINGS };
  private kv = new Map<string, string>();

  constructor(initial: Partial<AppData> = {}) {
    this.data = { ...EMPTY_DATA, ...initial };
  }

  async init(): Promise<void> {}

  async loadAll(): Promise<AppData> {
    return { ...this.data };
  }

  async saveWorkout(w: WorkoutRecord): Promise<void> {
    this.data = { ...this.data, workouts: upsert(this.data.workouts, w) };
  }
  async deleteWorkout(id: string): Promise<void> {
    this.data = {
      ...this.data,
      workouts: this.data.workouts.filter((w) => w.id !== id),
      sets: this.data.sets.filter((s) => s.workoutID !== id),
    };
  }
  async saveSet(s: SetRecord): Promise<void> {
    this.data = { ...this.data, sets: upsert(this.data.sets, s) };
  }
  async deleteSet(id: string): Promise<void> {
    this.data = { ...this.data, sets: this.data.sets.filter((s) => s.id !== id) };
  }

  async saveRun(r: RunRecord): Promise<void> {
    this.data = { ...this.data, runs: upsert(this.data.runs, r) };
  }
  async deleteRun(id: string): Promise<void> {
    this.data = { ...this.data, runs: this.data.runs.filter((r) => r.id !== id) };
    this.points.delete(id);
  }
  async saveTrackPoints(runID: string, points: RunTrackPoint[]): Promise<void> {
    this.points.set(runID, points.slice());
  }
  async getTrackPoints(runID: string): Promise<RunTrackPoint[]> {
    return (this.points.get(runID) ?? []).slice().sort((a, b) => a.sequence - b.sequence);
  }

  async saveStep(s: StepRecord): Promise<void> {
    this.data = { ...this.data, steps: upsert(this.data.steps, s) };
  }
  async saveWeight(w: WeightRecord): Promise<void> {
    this.data = { ...this.data, weights: upsert(this.data.weights, w) };
  }

  async savePlans(plans: TrainingPlan[], lastCompletedPlanID: string | null): Promise<void> {
    this.data = { ...this.data, plans: plans.slice(), lastCompletedPlanID };
  }

  async getSettings(): Promise<Settings> {
    return { ...this.settings };
  }
  async saveSettings(settings: Settings): Promise<void> {
    this.settings = { ...settings };
  }

  async getKV(key: string): Promise<string | null> {
    return this.kv.get(key) ?? null;
  }
  async setKV(key: string, value: string | null): Promise<void> {
    if (value === null) this.kv.delete(key);
    else this.kv.set(key, value);
  }

  async exportAll(): Promise<FullData> {
    return { ...this.data, trackPoints: [...this.points.values()].flat() };
  }
  async replaceAll(full: FullData): Promise<void> {
    const { trackPoints, ...data } = full;
    this.data = { ...data };
    this.points = new Map();
    for (const p of trackPoints) {
      const list = this.points.get(p.runID);
      if (list) list.push(p);
      else this.points.set(p.runID, [p]);
    }
  }
}
