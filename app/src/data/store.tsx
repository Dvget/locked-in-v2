import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { PLAN_HISTORY_KEY, parseHistory, withSnapshot } from '../domain/planHistory';
import { validatePlans, type TrainingPlan } from '../domain/plans';
import type { RunRecord, RunTrackPoint, SetRecord, StepRecord, WeightRecord, WorkoutRecord } from '../domain/types';
import { parseBackup, serializeBackup } from './backup';
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

export interface Store {
  ready: boolean;
  error: string | null;
  data: AppData;
  settings: Settings;

  saveWorkout(w: WorkoutRecord): Promise<void>;
  deleteWorkout(id: string): Promise<void>;
  saveSet(s: SetRecord): Promise<void>;
  deleteSet(id: string): Promise<void>;
  saveRun(r: RunRecord, points?: RunTrackPoint[]): Promise<void>;
  deleteRun(id: string): Promise<void>;
  getTrackPoints(runID: string): Promise<RunTrackPoint[]>;
  saveWeight(w: WeightRecord): Promise<void>;
  saveStep(s: StepRecord): Promise<void>;
  savePlan(plan: TrainingPlan): Promise<void>;
  removePlan(id: string): Promise<void>;
  restorePlans(plans: TrainingPlan[]): Promise<void>;
  markPlanCompleted(id: string): Promise<void>;
  updateSettings(patch: Partial<Settings>): Promise<void>;
  exportBackupText(): Promise<string>;
  importBackupText(text: string): Promise<void>;
  getKV(key: string): Promise<string | null>;
  setKV(key: string, value: string | null): Promise<void>;
  exportAll(): Promise<FullData>;
}

const StoreContext = createContext<Store | null>(null);

export function AppStoreProvider({ repository, children }: { repository: Repository; children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const dataRef = useRef(data);
  dataRef.current = data;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await repository.init();
        const [loaded, loadedSettings] = await Promise.all([repository.loadAll(), repository.getSettings()]);
        if (cancelled) return;
        setData(loaded);
        setSettings(loadedSettings);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repository]);

  const reload = useCallback(async () => {
    setData(await repository.loadAll());
  }, [repository]);

  /** Stores the plans as they are now (before a change) in the 30-day plan history. */
  const snapshotPlans = useCallback(async () => {
    const history = parseHistory(await repository.getKV(PLAN_HISTORY_KEY));
    await repository.setKV(PLAN_HISTORY_KEY, JSON.stringify(withSnapshot(history, dataRef.current.plans)));
  }, [repository]);

  const store = useMemo<Store>(
    () => ({
      ready,
      error,
      data,
      settings,

      async saveWorkout(w) {
        await repository.saveWorkout(w);
        setData((d) => ({ ...d, workouts: upsert(d.workouts, w) }));
      },
      async deleteWorkout(id) {
        await repository.deleteWorkout(id);
        setData((d) => ({
          ...d,
          workouts: d.workouts.filter((w) => w.id !== id),
          sets: d.sets.filter((s) => s.workoutID !== id),
        }));
      },
      async saveSet(s) {
        await repository.saveSet(s);
        setData((d) => ({ ...d, sets: upsert(d.sets, s) }));
      },
      async deleteSet(id) {
        await repository.deleteSet(id);
        setData((d) => ({ ...d, sets: d.sets.filter((s) => s.id !== id) }));
      },
      async saveRun(r, points) {
        await repository.saveRun(r);
        if (points) await repository.saveTrackPoints(r.id, points);
        setData((d) => ({ ...d, runs: upsert(d.runs, r) }));
      },
      async deleteRun(id) {
        await repository.deleteRun(id);
        setData((d) => ({ ...d, runs: d.runs.filter((r) => r.id !== id) }));
      },
      getTrackPoints: (runID) => repository.getTrackPoints(runID),
      async saveWeight(w) {
        await repository.saveWeight(w);
        setData((d) => ({ ...d, weights: upsert(d.weights, w) }));
      },
      async saveStep(s) {
        await repository.saveStep(s);
        setData((d) => ({ ...d, steps: upsert(d.steps, s) }));
      },
      async savePlan(plan) {
        const plans = upsert(dataRef.current.plans, plan);
        validatePlans(plans);
        await snapshotPlans();
        await repository.savePlans(plans, dataRef.current.lastCompletedPlanID);
        setData((d) => ({ ...d, plans }));
      },
      async removePlan(id) {
        const plans = dataRef.current.plans.filter((p) => p.id !== id);
        await snapshotPlans();
        const last = dataRef.current.lastCompletedPlanID === id ? null : dataRef.current.lastCompletedPlanID;
        await repository.savePlans(plans, last);
        setData((d) => ({ ...d, plans, lastCompletedPlanID: last }));
      },
      async restorePlans(plans) {
        validatePlans(plans);
        await snapshotPlans();
        const last = plans.some((p) => p.id === dataRef.current.lastCompletedPlanID) ? dataRef.current.lastCompletedPlanID : null;
        await repository.savePlans(plans, last);
        setData((d) => ({ ...d, plans, lastCompletedPlanID: last }));
      },
      async markPlanCompleted(id) {
        if (!dataRef.current.plans.some((p) => p.id === id)) return;
        await repository.savePlans(dataRef.current.plans, id);
        setData((d) => ({ ...d, lastCompletedPlanID: id }));
      },
      async updateSettings(patch) {
        const next = { ...settingsRef.current, ...patch };
        await repository.saveSettings(next);
        setSettings(next);
      },
      async exportBackupText() {
        return serializeBackup(await repository.exportAll());
      },
      async importBackupText(text) {
        const parsed = parseBackup(text);
        // Recovery snapshot before replacing (legacy has the building block but never used it).
        await repository.setKV('recoverySnapshot', serializeBackup(await repository.exportAll()));
        await repository.replaceAll(parsed);
        await reload();
      },
      getKV: (key) => repository.getKV(key),
      setKV: (key, value) => repository.setKV(key, value),
      exportAll: () => repository.exportAll(),
    }),
    [ready, error, data, settings, repository, reload, snapshotPlans],
  );

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside AppStoreProvider');
  return store;
}
