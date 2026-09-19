// Backup JSON. Same shape as the legacy BackupPayload (dates as seconds since 1970, Data as base64),
// plus an explicit schemaVersion. Legacy files (without schemaVersion) stay importable.
import { newId } from '../domain/dates';
import { validatePlans, type PlannedExercise, type TrainingPlan } from '../domain/plans';
import type { RunRecord, RunTrackPoint, SetRecord, StepRecord, WeightRecord, WorkoutRecord } from '../domain/types';
import { FALLBACK_BODY_WEIGHT_KG } from '../domain/types';
import type { FullData } from './repository';

export const BACKUP_SCHEMA_VERSION = 2;

export class BackupError extends Error {}

type Json = Record<string, any>;

// ---------------------------------------------------------------- base64 (no Buffer in React Native)

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function utf8Bytes(text: string): number[] {
  const out: number[] = [];
  for (const ch of text) {
    const c = ch.codePointAt(0)!;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
}

export function base64Encode(text: string): string {
  const bytes = utf8Bytes(text);
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const [a, b, c] = [bytes[i], bytes[i + 1], bytes[i + 2]];
    out += B64[a >> 2] + B64[((a & 3) << 4) | ((b ?? 0) >> 4)];
    out += b === undefined ? '=' : B64[((b & 15) << 2) | ((c ?? 0) >> 6)];
    out += c === undefined ? '=' : B64[c & 63];
  }
  return out;
}

export function base64Decode(b64: string): string {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const n = [0, 1, 2, 3].map((k) => (i + k < clean.length ? B64.indexOf(clean[i + k]) : -1));
    bytes.push((n[0] << 2) | (n[1] >> 4));
    if (n[2] >= 0) bytes.push(((n[1] & 15) << 4) | (n[2] >> 2));
    if (n[3] >= 0) bytes.push(((n[2] & 3) << 6) | n[3]);
  }
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i++];
    if (b < 0x80) out += String.fromCharCode(b);
    else if (b < 0xe0) out += String.fromCharCode(((b & 31) << 6) | (bytes[i++] & 63));
    else if (b < 0xf0) out += String.fromCharCode(((b & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63));
    else {
      const cp = ((b & 7) << 18) | ((bytes[i++] & 63) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
      out += String.fromCodePoint(cp);
    }
  }
  return out;
}

// ---------------------------------------------------------------- date conversion

const toSeconds = (ms: number): number => ms / 1000;

function parseDate(value: unknown, field: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value * 1000;
  if (typeof value === 'string') {
    const ms = Date.parse(value);
    if (!Number.isNaN(ms)) return ms;
  }
  throw new BackupError(`Ungültiges Datum in "${field}".`);
}
const optDate = (value: unknown, field: string): number | null =>
  value === undefined || value === null ? null : parseDate(value, field);

const str = (v: unknown, field: string): string => {
  if (typeof v !== 'string' || v.length === 0) throw new BackupError(`Feld "${field}" fehlt.`);
  return v;
};
const num = (v: unknown, field: string): number => {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new BackupError(`Feld "${field}" ist keine Zahl.`);
  return v;
};
const optNum = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const optStr = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const list = (v: unknown): Json[] => (Array.isArray(v) ? (v as Json[]) : []);

// ---------------------------------------------------------------- export

export function buildBackup(data: FullData, exportedAt: number = Date.now()): Json {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: toSeconds(exportedAt),
    workouts: data.workouts.map((w) => ({
      id: w.id,
      startedAt: toSeconds(w.startedAt),
      ...(w.endedAt !== null ? { endedAt: toSeconds(w.endedAt) } : {}),
      isCompleted: w.isCompleted,
      isHidden: w.isHidden,
      bodyWeightSnapshot: w.bodyWeightSnapshot,
      ...(w.planID ? { planID: w.planID } : {}),
      ...(w.planName ? { planName: w.planName } : {}),
      ...(w.plannedSetCounts ? { plannedSetCountsData: base64Encode(JSON.stringify(w.plannedSetCounts)) } : {}),
    })),
    sets: data.sets.map((s) => ({
      id: s.id, workoutID: s.workoutID, exerciseID: s.exerciseID, exerciseName: s.exerciseName,
      planSlot: s.planSlot, setNumber: s.setNumber, weight: s.weight, reps: s.reps,
      ...(s.rir !== null ? { rir: s.rir } : {}), completedAt: toSeconds(s.completedAt),
    })),
    runs: data.runs.map((r) => ({
      id: r.id, date: toSeconds(r.date), distanceKm: r.distanceKm, durationSeconds: r.durationSeconds,
      source: r.source, isHidden: r.isHidden,
      ...(r.startTime !== null ? { startTime: toSeconds(r.startTime) } : {}),
      ...(r.elevationGainMeters !== null ? { elevationGainMeters: r.elevationGainMeters } : {}),
      ...(r.elevationLossMeters !== null ? { elevationLossMeters: r.elevationLossMeters } : {}),
      ...(r.pausedDurationSeconds !== null ? { pausedDurationSeconds: r.pausedDurationSeconds } : {}),
      ...(r.algorithmVersion ? { algorithmVersion: r.algorithmVersion } : {}),
    })),
    steps: data.steps.map((s) => ({ id: s.id, date: toSeconds(s.date), steps: s.steps, source: s.source })),
    weights: data.weights.map((w) => ({
      id: w.id, date: toSeconds(w.date), weightKg: w.weightKg, source: w.source, isHidden: w.isHidden,
    })),
    runTrackPoints: data.trackPoints.map((p) => ({
      id: p.id, runID: p.runID, sequence: p.sequence, timestamp: toSeconds(p.timestamp),
      latitude: p.latitude, longitude: p.longitude, altitude: p.altitude,
      horizontalAccuracy: p.horizontalAccuracy, verticalAccuracy: p.verticalAccuracy,
      reportedSpeed: p.reportedSpeed, accepted: p.accepted,
      ...(p.rejectionReason ? { rejectionReason: p.rejectionReason } : {}),
      paused: p.paused, cumulativeDistanceMeters: p.cumulativeDistanceMeters,
    })),
    trainingPlans: data.plans,
    lastCompletedPlanID: data.lastCompletedPlanID,
  };
}

export function serializeBackup(data: FullData, exportedAt?: number): string {
  return JSON.stringify(buildBackup(data, exportedAt), null, 2);
}

// ---------------------------------------------------------------- import

function parsePlan(raw: Json): TrainingPlan {
  const entries: PlannedExercise[] = list(raw.entries).map((e) => ({
    id: typeof e.id === 'string' ? e.id : newId(),
    exerciseID: str(e.exerciseID, 'exerciseID'),
    alternativeIDs: Array.isArray(e.alternativeIDs) ? e.alternativeIDs.filter((x: unknown) => typeof x === 'string') : [],
    sets: optNum(e.sets) ?? 3,
    startingWeight: optNum(e.startingWeight) ?? 0,
    startingReps: optNum(e.startingReps) ?? 8,
    weightIncrement: optNum(e.weightIncrement) ?? 2.5,
    restSeconds: optNum(e.restSeconds),
    catalogID: optStr(e.catalogID),
    repRangeMin: optNum(e.repRangeMin),
    repRangeMax: optNum(e.repRangeMax),
  }));
  return {
    id: typeof raw.id === 'string' ? raw.id : newId(),
    name: str(raw.name, 'plan name'),
    weeklyFrequency: optNum(raw.weeklyFrequency) ?? 2,
    entries,
    workoutType: optStr(raw.workoutType),
  };
}

function decodeSetCounts(data: unknown): Record<string, number> | null {
  if (typeof data !== 'string') return null;
  try {
    const parsed = JSON.parse(base64Decode(data));
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : null;
  } catch {
    return null;
  }
}

/** Legacy fallback: derive GPS points from `nativeArchive.route` decisions when no explicit points exist. */
function legacyRoutePoints(runs: Json[]): RunTrackPoint[] {
  const points: RunTrackPoint[] = [];
  for (const run of runs) {
    const route = run.nativeArchive?.route;
    if (!Array.isArray(route) || typeof run.id !== 'string') continue;
    route.forEach((decision: Json, sequence: number) => {
      const s = decision?.sample;
      if (!s) return;
      points.push({
        id: newId(), runID: run.id, sequence, timestamp: parseDate(s.timestamp, 'timestamp'),
        latitude: num(s.latitude, 'latitude'), longitude: num(s.longitude, 'longitude'),
        altitude: optNum(s.altitude) ?? 0, horizontalAccuracy: optNum(s.horizontalAccuracy) ?? -1,
        verticalAccuracy: optNum(s.verticalAccuracy) ?? -1, reportedSpeed: optNum(s.reportedSpeed) ?? -1,
        accepted: decision.accepted === true, rejectionReason: optStr(decision.rejectionReason),
        paused: decision.paused === true, cumulativeDistanceMeters: optNum(decision.cumulativeDistanceMeters) ?? 0,
      });
    });
  }
  return points;
}

export function parseBackup(text: string): FullData {
  let root: Json;
  try {
    root = JSON.parse(text);
  } catch {
    throw new BackupError('Die Datei ist keine gültige Backup-Datei (kein lesbares JSON).');
  }
  if (!root || typeof root !== 'object' || !Array.isArray(root.workouts) || !Array.isArray(root.sets)) {
    throw new BackupError('Die Datei ist kein LOCKED-IN-Backup.');
  }
  if (typeof root.schemaVersion === 'number' && root.schemaVersion > BACKUP_SCHEMA_VERSION) {
    throw new BackupError('Das Backup stammt aus einer neueren App-Version.');
  }

  const workouts: WorkoutRecord[] = list(root.workouts).map((w) => ({
    id: str(w.id, 'workout id'),
    startedAt: parseDate(w.startedAt, 'startedAt'),
    endedAt: optDate(w.endedAt, 'endedAt'),
    isCompleted: w.isCompleted === true,
    isHidden: w.isHidden === true,
    bodyWeightSnapshot: optNum(w.bodyWeightSnapshot) ?? FALLBACK_BODY_WEIGHT_KG,
    planID: optStr(w.planID),
    planName: optStr(w.planName),
    plannedSetCounts: decodeSetCounts(w.plannedSetCountsData),
  }));

  const sets: SetRecord[] = list(root.sets).map((s) => ({
    id: str(s.id, 'set id'),
    workoutID: str(s.workoutID, 'workoutID'),
    exerciseID: str(s.exerciseID, 'exerciseID'),
    exerciseName: typeof s.exerciseName === 'string' ? s.exerciseName : '',
    planSlot: optNum(s.planSlot) ?? 0,
    setNumber: optNum(s.setNumber) ?? 1,
    weight: num(s.weight, 'weight'),
    reps: num(s.reps, 'reps'),
    rir: optNum(s.rir),
    completedAt: parseDate(s.completedAt, 'completedAt'),
  }));

  const rawRuns = list(root.runs);
  const runs: RunRecord[] = rawRuns.map((r) => ({
    id: str(r.id, 'run id'),
    date: parseDate(r.date, 'date'),
    distanceKm: num(r.distanceKm, 'distanceKm'),
    durationSeconds: num(r.durationSeconds, 'durationSeconds'),
    source: typeof r.source === 'string' ? r.source : 'manual',
    isHidden: r.isHidden === true,
    startTime: optDate(r.startTime, 'startTime'),
    elevationGainMeters: optNum(r.elevationGainMeters),
    elevationLossMeters: optNum(r.elevationLossMeters),
    pausedDurationSeconds: optNum(r.pausedDurationSeconds),
    algorithmVersion: optStr(r.algorithmVersion),
  }));

  const steps: StepRecord[] = list(root.steps).map((s) => ({
    id: str(s.id, 'step id'), date: parseDate(s.date, 'date'), steps: num(s.steps, 'steps'),
    source: typeof s.source === 'string' ? s.source : 'manual',
  }));

  const weights: WeightRecord[] = list(root.weights).map((w) => ({
    id: str(w.id, 'weight id'), date: parseDate(w.date, 'date'), weightKg: num(w.weightKg, 'weightKg'),
    source: typeof w.source === 'string' ? w.source : 'manual', isHidden: w.isHidden === true,
  }));

  const trackPoints: RunTrackPoint[] = Array.isArray(root.runTrackPoints)
    ? list(root.runTrackPoints).map((p) => ({
        id: str(p.id, 'point id'), runID: str(p.runID, 'runID'), sequence: num(p.sequence, 'sequence'),
        timestamp: parseDate(p.timestamp, 'timestamp'), latitude: num(p.latitude, 'latitude'),
        longitude: num(p.longitude, 'longitude'), altitude: optNum(p.altitude) ?? 0,
        horizontalAccuracy: optNum(p.horizontalAccuracy) ?? -1, verticalAccuracy: optNum(p.verticalAccuracy) ?? -1,
        reportedSpeed: optNum(p.reportedSpeed) ?? -1, accepted: p.accepted === true,
        rejectionReason: optStr(p.rejectionReason), paused: p.paused === true,
        cumulativeDistanceMeters: optNum(p.cumulativeDistanceMeters) ?? 0,
      }))
    : legacyRoutePoints(rawRuns);

  const plans = list(root.trainingPlans).map(parsePlan);
  validatePlans(plans);

  return {
    workouts, sets, runs, steps, weights, plans, trackPoints,
    lastCompletedPlanID: optStr(root.lastCompletedPlanID),
  };
}

/** Lightweight counts for the import confirmation dialog. */
export function backupSummary(data: FullData): { workouts: number; runs: number; weights: number; steps: number; plans: number } {
  return {
    workouts: data.workouts.length,
    runs: data.runs.length,
    weights: data.weights.length,
    steps: data.steps.length,
    plans: data.plans.length,
  };
}
