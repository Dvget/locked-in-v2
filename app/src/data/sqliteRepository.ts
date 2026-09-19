import * as SQLite from 'expo-sqlite';
import type { TrainingPlan } from '../domain/plans';
import type { RunRecord, RunTrackPoint, SetRecord, StepRecord, WeightRecord, WorkoutRecord } from '../domain/types';
import {
  DEFAULT_SETTINGS,
  type AppData,
  type FullData,
  type Repository,
  type Settings,
} from './repository';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS workouts (
  id TEXT PRIMARY KEY NOT NULL, startedAt REAL NOT NULL, endedAt REAL, isCompleted INTEGER NOT NULL,
  isHidden INTEGER NOT NULL, bodyWeightSnapshot REAL NOT NULL, planID TEXT, planName TEXT, plannedSetCounts TEXT
);
CREATE TABLE IF NOT EXISTS sets (
  id TEXT PRIMARY KEY NOT NULL, workoutID TEXT NOT NULL, exerciseID TEXT NOT NULL, exerciseName TEXT NOT NULL,
  planSlot INTEGER NOT NULL, setNumber INTEGER NOT NULL, weight REAL NOT NULL, reps INTEGER NOT NULL,
  rir INTEGER, completedAt REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS sets_workout ON sets(workoutID);
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY NOT NULL, date REAL NOT NULL, distanceKm REAL NOT NULL, durationSeconds REAL NOT NULL,
  source TEXT NOT NULL, isHidden INTEGER NOT NULL, startTime REAL, elevationGainMeters REAL,
  elevationLossMeters REAL, pausedDurationSeconds REAL, algorithmVersion TEXT
);
CREATE TABLE IF NOT EXISTS track_points (
  id TEXT PRIMARY KEY NOT NULL, runID TEXT NOT NULL, sequence INTEGER NOT NULL, timestamp REAL NOT NULL,
  latitude REAL NOT NULL, longitude REAL NOT NULL, altitude REAL NOT NULL, horizontalAccuracy REAL NOT NULL,
  verticalAccuracy REAL NOT NULL, reportedSpeed REAL NOT NULL, accepted INTEGER NOT NULL, rejectionReason TEXT,
  paused INTEGER NOT NULL, cumulativeDistanceMeters REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS track_points_run ON track_points(runID, sequence);
CREATE TABLE IF NOT EXISTS steps (
  id TEXT PRIMARY KEY NOT NULL, date REAL NOT NULL, steps INTEGER NOT NULL, source TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS weights (
  id TEXT PRIMARY KEY NOT NULL, date REAL NOT NULL, weightKg REAL NOT NULL, source TEXT NOT NULL,
  isHidden INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS plans (id TEXT PRIMARY KEY NOT NULL, position INTEGER NOT NULL, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
`;

const bool = (v: unknown): boolean => v === 1 || v === true;

type Row = Record<string, any>;

/** SQLite-backed repository for the phone (expo-sqlite). */
export class SqliteRepository implements Repository {
  private db!: SQLite.SQLiteDatabase;

  constructor(private readonly name = 'lockedin.db') {}

  async init(): Promise<void> {
    this.db = await SQLite.openDatabaseAsync(this.name);
    await this.db.execAsync('PRAGMA journal_mode = WAL;');
    await this.db.execAsync(SCHEMA);
  }

  async loadAll(): Promise<AppData> {
    const [workouts, sets, runs, steps, weights, plans, last] = await Promise.all([
      this.db.getAllAsync<Row>('SELECT * FROM workouts ORDER BY startedAt'),
      this.db.getAllAsync<Row>('SELECT * FROM sets ORDER BY completedAt'),
      this.db.getAllAsync<Row>('SELECT * FROM runs ORDER BY date'),
      this.db.getAllAsync<Row>('SELECT * FROM steps ORDER BY date'),
      this.db.getAllAsync<Row>('SELECT * FROM weights ORDER BY date'),
      this.db.getAllAsync<Row>('SELECT json FROM plans ORDER BY position'),
      this.getKV('lastCompletedPlanID'),
    ]);
    return {
      workouts: workouts.map(toWorkout),
      sets: sets.map(toSet),
      runs: runs.map(toRun),
      steps: steps.map((r) => ({ id: r.id, date: r.date, steps: r.steps, source: r.source })),
      weights: weights.map(toWeight),
      plans: plans.map((r) => JSON.parse(r.json) as TrainingPlan),
      lastCompletedPlanID: last,
    };
  }

  async saveWorkout(w: WorkoutRecord): Promise<void> {
    await this.db.runAsync(
      'INSERT OR REPLACE INTO workouts VALUES (?,?,?,?,?,?,?,?,?)',
      w.id, w.startedAt, w.endedAt, w.isCompleted ? 1 : 0, w.isHidden ? 1 : 0, w.bodyWeightSnapshot,
      w.planID, w.planName, w.plannedSetCounts ? JSON.stringify(w.plannedSetCounts) : null,
    );
  }
  async deleteWorkout(id: string): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync('DELETE FROM sets WHERE workoutID = ?', id);
      await this.db.runAsync('DELETE FROM workouts WHERE id = ?', id);
    });
  }
  async saveSet(s: SetRecord): Promise<void> {
    await this.db.runAsync(
      'INSERT OR REPLACE INTO sets VALUES (?,?,?,?,?,?,?,?,?,?)',
      s.id, s.workoutID, s.exerciseID, s.exerciseName, s.planSlot, s.setNumber, s.weight, s.reps, s.rir, s.completedAt,
    );
  }
  async deleteSet(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM sets WHERE id = ?', id);
  }

  async saveRun(r: RunRecord): Promise<void> {
    await this.db.runAsync(
      'INSERT OR REPLACE INTO runs VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      r.id, r.date, r.distanceKm, r.durationSeconds, r.source, r.isHidden ? 1 : 0, r.startTime,
      r.elevationGainMeters, r.elevationLossMeters, r.pausedDurationSeconds, r.algorithmVersion,
    );
  }
  async deleteRun(id: string): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync('DELETE FROM track_points WHERE runID = ?', id);
      await this.db.runAsync('DELETE FROM runs WHERE id = ?', id);
    });
  }
  async saveTrackPoints(runID: string, points: RunTrackPoint[]): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync('DELETE FROM track_points WHERE runID = ?', runID);
      await this.insertPoints(points);
    });
  }
  private async insertPoints(points: RunTrackPoint[]): Promise<void> {
    const stmt = await this.db.prepareAsync('INSERT OR REPLACE INTO track_points VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    try {
      for (const p of points) {
        await stmt.executeAsync(
          p.id, p.runID, p.sequence, p.timestamp, p.latitude, p.longitude, p.altitude, p.horizontalAccuracy,
          p.verticalAccuracy, p.reportedSpeed, p.accepted ? 1 : 0, p.rejectionReason, p.paused ? 1 : 0,
          p.cumulativeDistanceMeters,
        );
      }
    } finally {
      await stmt.finalizeAsync();
    }
  }
  async getTrackPoints(runID: string): Promise<RunTrackPoint[]> {
    const rows = await this.db.getAllAsync<Row>('SELECT * FROM track_points WHERE runID = ? ORDER BY sequence', runID);
    return rows.map(toPoint);
  }

  async saveStep(s: StepRecord): Promise<void> {
    await this.db.runAsync('INSERT OR REPLACE INTO steps VALUES (?,?,?,?)', s.id, s.date, s.steps, s.source);
  }
  async saveWeight(w: WeightRecord): Promise<void> {
    await this.db.runAsync(
      'INSERT OR REPLACE INTO weights VALUES (?,?,?,?,?)', w.id, w.date, w.weightKg, w.source, w.isHidden ? 1 : 0,
    );
  }

  async savePlans(plans: TrainingPlan[], lastCompletedPlanID: string | null): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync('DELETE FROM plans');
      let position = 0;
      for (const plan of plans) {
        await this.db.runAsync('INSERT INTO plans VALUES (?,?,?)', plan.id, position++, JSON.stringify(plan));
      }
      await this.setKV('lastCompletedPlanID', lastCompletedPlanID);
    });
  }

  async getSettings(): Promise<Settings> {
    const raw = await this.getKV('settings');
    if (!raw) return { ...DEFAULT_SETTINGS };
    try {
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }
  async saveSettings(settings: Settings): Promise<void> {
    await this.setKV('settings', JSON.stringify(settings));
  }

  async getKV(key: string): Promise<string | null> {
    const row = await this.db.getFirstAsync<Row>('SELECT value FROM kv WHERE key = ?', key);
    return row ? (row.value as string) : null;
  }
  async setKV(key: string, value: string | null): Promise<void> {
    if (value === null) await this.db.runAsync('DELETE FROM kv WHERE key = ?', key);
    else await this.db.runAsync('INSERT OR REPLACE INTO kv VALUES (?,?)', key, value);
  }

  async exportAll(): Promise<FullData> {
    const data = await this.loadAll();
    const points = await this.db.getAllAsync<Row>('SELECT * FROM track_points ORDER BY runID, sequence');
    return { ...data, trackPoints: points.map(toPoint) };
  }

  async replaceAll(full: FullData): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      for (const table of ['sets', 'workouts', 'track_points', 'runs', 'steps', 'weights', 'plans']) {
        await this.db.runAsync(`DELETE FROM ${table}`);
      }
      for (const w of full.workouts) await this.saveWorkout(w);
      for (const s of full.sets) await this.saveSet(s);
      for (const r of full.runs) await this.saveRun(r);
      await this.insertPoints(full.trackPoints);
      for (const s of full.steps) await this.saveStep(s);
      for (const w of full.weights) await this.saveWeight(w);
      let position = 0;
      for (const plan of full.plans) {
        await this.db.runAsync('INSERT INTO plans VALUES (?,?,?)', plan.id, position++, JSON.stringify(plan));
      }
      await this.setKV('lastCompletedPlanID', full.lastCompletedPlanID);
    });
  }
}

function toWorkout(r: Row): WorkoutRecord {
  return {
    id: r.id,
    startedAt: r.startedAt,
    endedAt: r.endedAt ?? null,
    isCompleted: bool(r.isCompleted),
    isHidden: bool(r.isHidden),
    bodyWeightSnapshot: r.bodyWeightSnapshot,
    planID: r.planID ?? null,
    planName: r.planName ?? null,
    plannedSetCounts: r.plannedSetCounts ? JSON.parse(r.plannedSetCounts) : null,
  };
}
function toSet(r: Row): SetRecord {
  return {
    id: r.id, workoutID: r.workoutID, exerciseID: r.exerciseID, exerciseName: r.exerciseName,
    planSlot: r.planSlot, setNumber: r.setNumber, weight: r.weight, reps: r.reps, rir: r.rir ?? null,
    completedAt: r.completedAt,
  };
}
function toRun(r: Row): RunRecord {
  return {
    id: r.id, date: r.date, distanceKm: r.distanceKm, durationSeconds: r.durationSeconds, source: r.source,
    isHidden: bool(r.isHidden), startTime: r.startTime ?? null, elevationGainMeters: r.elevationGainMeters ?? null,
    elevationLossMeters: r.elevationLossMeters ?? null, pausedDurationSeconds: r.pausedDurationSeconds ?? null,
    algorithmVersion: r.algorithmVersion ?? null,
  };
}
function toWeight(r: Row): WeightRecord {
  return { id: r.id, date: r.date, weightKg: r.weightKg, source: r.source, isHidden: bool(r.isHidden) };
}
function toPoint(r: Row): RunTrackPoint {
  return {
    id: r.id, runID: r.runID, sequence: r.sequence, timestamp: r.timestamp, latitude: r.latitude,
    longitude: r.longitude, altitude: r.altitude, horizontalAccuracy: r.horizontalAccuracy,
    verticalAccuracy: r.verticalAccuracy, reportedSpeed: r.reportedSpeed, accepted: bool(r.accepted),
    rejectionReason: r.rejectionReason ?? null, paused: bool(r.paused),
    cumulativeDistanceMeters: r.cumulativeDistanceMeters,
  };
}
