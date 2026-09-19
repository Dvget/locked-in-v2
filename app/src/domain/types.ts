import type { Ms } from './dates';

// Domain records. Shapes follow the legacy BackupPayload so old backups stay importable.
// Ids are UUID strings; dates are epoch milliseconds (converted from/to seconds in backup).

export interface WorkoutRecord {
  id: string;
  startedAt: Ms;
  endedAt: Ms | null;
  isCompleted: boolean;
  isHidden: boolean;
  bodyWeightSnapshot: number;
  planID: string | null;
  planName: string | null;
  /** exerciseID -> planned set count */
  plannedSetCounts: Record<string, number> | null;
}

export interface SetRecord {
  id: string;
  workoutID: string;
  exerciseID: string;
  exerciseName: string;
  planSlot: number;
  setNumber: number;
  weight: number;
  reps: number;
  rir: number | null;
  completedAt: Ms;
}

export interface RunRecord {
  id: string;
  date: Ms;
  distanceKm: number;
  durationSeconds: number;
  source: string;
  isHidden: boolean;
  startTime: Ms | null;
  /** Elevation is intentionally not computed (Issue #19); kept only for legacy backups. */
  elevationGainMeters: number | null;
  elevationLossMeters: number | null;
  pausedDurationSeconds: number | null;
  algorithmVersion: string | null;
}

export interface RunTrackPoint {
  id: string;
  runID: string;
  sequence: number;
  timestamp: Ms;
  latitude: number;
  longitude: number;
  altitude: number;
  horizontalAccuracy: number;
  verticalAccuracy: number;
  reportedSpeed: number;
  accepted: boolean;
  rejectionReason: string | null;
  paused: boolean;
  cumulativeDistanceMeters: number;
}

export interface StepRecord {
  id: string;
  date: Ms;
  steps: number;
  source: string;
}

export interface WeightRecord {
  id: string;
  date: Ms;
  weightKg: number;
  source: string;
  isHidden: boolean;
}

export const FALLBACK_BODY_WEIGHT_KG = 90;
