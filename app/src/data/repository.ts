import type { TrainingPlan } from '../domain/plans';
import type { RunRecord, RunTrackPoint, SetRecord, StepRecord, WeightRecord, WorkoutRecord } from '../domain/types';

/** Everything except raw GPS points (those are loaded per run). */
export interface AppData {
  workouts: WorkoutRecord[];
  sets: SetRecord[];
  runs: RunRecord[];
  steps: StepRecord[];
  weights: WeightRecord[];
  plans: TrainingPlan[];
  lastCompletedPlanID: string | null;
}

export interface FullData extends AppData {
  trackPoints: RunTrackPoint[];
}

export type WeightDirection = 'lose' | 'maintain' | 'gain';

/** D-016 goal direction, weekly targets and small preferences. */
export interface Settings {
  weightDirection: WeightDirection;
  workoutsPerWeek: number;
  runsPerWeek: number;
  weeklyStepGoal: number;
  /** D-018 global target rep range. */
  repRangeMin: number;
  repRangeMax: number;
  manualBodyWeightKg: number;
  heavyRestSeconds: number;
  lightRestSeconds: number;
  runCountdownSeconds: number;
  /** D-024: audio cues are configured inside the training/running mode. */
  restAudioEnabled: boolean;
  runSpeechEnabled: boolean;
  stepsEnabled: boolean;
  lastStepSync: number;
  lastPresentedWeeklyReport: string;
}

export const DEFAULT_SETTINGS: Settings = {
  weightDirection: 'maintain',
  workoutsPerWeek: 2,
  runsPerWeek: 2,
  weeklyStepGoal: 70_000,
  repRangeMin: 8,
  repRangeMax: 12,
  manualBodyWeightKg: 90,
  heavyRestSeconds: 150,
  lightRestSeconds: 120,
  runCountdownSeconds: 3,
  restAudioEnabled: true,
  runSpeechEnabled: true,
  stepsEnabled: false,
  lastStepSync: 0,
  lastPresentedWeeklyReport: '',
};

export const EMPTY_DATA: AppData = {
  workouts: [],
  sets: [],
  runs: [],
  steps: [],
  weights: [],
  plans: [],
  lastCompletedPlanID: null,
};

/** Storage boundary. Implementations: in-memory (tests, web preview) and SQLite (phone). */
export interface Repository {
  init(): Promise<void>;
  loadAll(): Promise<AppData>;

  saveWorkout(workout: WorkoutRecord): Promise<void>;
  /** Deletes the workout and its sets. */
  deleteWorkout(id: string): Promise<void>;
  saveSet(set: SetRecord): Promise<void>;
  deleteSet(id: string): Promise<void>;

  saveRun(run: RunRecord): Promise<void>;
  deleteRun(id: string): Promise<void>;
  saveTrackPoints(runID: string, points: RunTrackPoint[]): Promise<void>;
  getTrackPoints(runID: string): Promise<RunTrackPoint[]>;

  saveStep(step: StepRecord): Promise<void>;
  saveWeight(weight: WeightRecord): Promise<void>;

  savePlans(plans: TrainingPlan[], lastCompletedPlanID: string | null): Promise<void>;

  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<void>;

  getKV(key: string): Promise<string | null>;
  setKV(key: string, value: string | null): Promise<void>;

  /** Full export incl. GPS points (for backup). */
  exportAll(): Promise<FullData>;
  /** Replaces all tracking data and plans (backup import). Settings and KV stay. */
  replaceAll(data: FullData): Promise<void>;
}
