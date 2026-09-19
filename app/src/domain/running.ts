// Run tracking core, ported from the legacy RunTrackingCore.swift / RunSessionState.swift (validated Sept 2026:
// ~0.02 % distance difference to Polar). Pure TypeScript, no native code.
// Elevation gain/loss is intentionally NOT ported (Issue #19); raw altitude is kept in the samples.
import type { Ms } from './dates';
import type { RunTrackPoint } from './types';

/** KV key of the crash-safe run checkpoint; also marks an unfinished run on the dashboard. */
export const ACTIVE_RUN_KEY = 'activeRun';

export interface RunTrackingConfiguration {
  algorithmVersion: string;
  /** seconds */
  maximumSampleAge: number;
  maximumFutureOffset: number;
  maximumHorizontalAccuracy: number;
  /** m/s */
  maximumPlausibleSpeed: number;
  /** seconds */
  rollingPaceWindow: number;
  /** meters */
  minimumPaceDistance: number;
}

/** Same filter thresholds as legacy lockedIn-gps-v1/v2; the version name marks the missing elevation logic. */
export const CONFIG_V3: RunTrackingConfiguration = {
  algorithmVersion: 'lockedIn-rn-gps-v3',
  maximumSampleAge: 10,
  maximumFutureOffset: 1,
  maximumHorizontalAccuracy: 25,
  maximumPlausibleSpeed: 12,
  rollingPaceWindow: 30,
  minimumPaceDistance: 20,
};

export interface RunLocationSample {
  /** epoch ms */
  timestamp: Ms;
  latitude: number;
  longitude: number;
  altitude: number;
  horizontalAccuracy: number;
  verticalAccuracy: number;
  reportedSpeed: number;
}

export type RejectionReason =
  | 'stale'
  | 'future'
  | 'invalidCoordinate'
  | 'horizontalAccuracy'
  | 'duplicate'
  | 'nonIncreasingTime'
  | 'implausibleSpeed';

export interface RunLocationDecision {
  sample: RunLocationSample;
  accepted: boolean;
  rejectionReason: RejectionReason | null;
  cumulativeDistanceMeters: number;
  paused: boolean;
}

export interface RunSplit {
  kilometre: number;
  durationSeconds: number;
  paceSecondsPerKm: number;
  cumulativeDurationSeconds: number;
  cumulativeDistanceMeters: number;
}

export interface RunMetricsSnapshot {
  distanceMeters: number;
  activeDurationSeconds: number;
  currentPaceSecondsPerKm: number | null;
  averagePaceSecondsPerKm: number | null;
  splits: RunSplit[];
}

// ---------------------------------------------------------------- geometry and filter

export function distanceMeters(a: RunLocationSample, b: RunLocationSample): number {
  const R = 6_371_000;
  const rad = Math.PI / 180;
  const lat1 = a.latitude * rad;
  const lat2 = b.latitude * rad;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Classifies one sample: age, coordinates, accuracy, duplicate/time order and plausible speed. */
export function evaluateSample(
  sample: RunLocationSample,
  receivedAt: Ms,
  previousAccepted: RunLocationSample | null,
  config: RunTrackingConfiguration = CONFIG_V3,
): RejectionReason | null {
  const age = (receivedAt - sample.timestamp) / 1000;
  if (age > config.maximumSampleAge) return 'stale';
  if (age < -config.maximumFutureOffset) return 'future';
  if (
    !Number.isFinite(sample.latitude) ||
    !Number.isFinite(sample.longitude) ||
    sample.latitude < -90 ||
    sample.latitude > 90 ||
    sample.longitude < -180 ||
    sample.longitude > 180
  ) {
    return 'invalidCoordinate';
  }
  if (!(sample.horizontalAccuracy > 0) || sample.horizontalAccuracy > config.maximumHorizontalAccuracy) {
    return 'horizontalAccuracy';
  }
  if (previousAccepted) {
    const elapsed = (sample.timestamp - previousAccepted.timestamp) / 1000;
    const identical = sample.latitude === previousAccepted.latitude && sample.longitude === previousAccepted.longitude;
    if (elapsed === 0 && identical) return 'duplicate';
    if (!(elapsed > 0)) return 'nonIncreasingTime';
    if (distanceMeters(previousAccepted, sample) / elapsed > config.maximumPlausibleSpeed) return 'implausibleSpeed';
  }
  return null;
}

// ---------------------------------------------------------------- metrics calculator

interface PaceSegment {
  endedAt: Ms;
  distanceMeters: number;
  durationSeconds: number;
}

export interface CalculatorCheckpoint {
  route: RunLocationDecision[];
  splits: RunSplit[];
  previousAccepted: RunLocationSample | null;
  previousActive: RunLocationSample | null;
  wasPaused: boolean;
  distanceMeters: number;
  activeDurationSeconds: number;
  paceSegments: PaceSegment[];
  lastSplitDuration: number;
}

/** Turns filtered GPS samples into distance, rolling pace, average pace and km splits. */
export class RunMetricsCalculator {
  private route: RunLocationDecision[] = [];
  private splits: RunSplit[] = [];
  private previousAccepted: RunLocationSample | null = null;
  private previousActive: RunLocationSample | null = null;
  private wasPaused = false;
  private distance = 0;
  private activeDuration = 0;
  private paceSegments: PaceSegment[] = [];
  private lastSplitDuration = 0;

  constructor(
    readonly config: RunTrackingConfiguration = CONFIG_V3,
    checkpoint?: CalculatorCheckpoint,
  ) {
    if (checkpoint) {
      this.route = checkpoint.route.slice();
      this.splits = checkpoint.splits.slice();
      this.previousAccepted = checkpoint.previousAccepted;
      this.previousActive = checkpoint.previousActive;
      this.wasPaused = checkpoint.wasPaused;
      this.distance = checkpoint.distanceMeters;
      this.activeDuration = checkpoint.activeDurationSeconds;
      this.paceSegments = checkpoint.paceSegments.slice();
      this.lastSplitDuration = checkpoint.lastSplitDuration;
    }
  }

  /** Rebuilds the calculator from stored decisions without re-classifying rejected ones. */
  static replay(decisions: RunLocationDecision[], config: RunTrackingConfiguration = CONFIG_V3): RunMetricsCalculator {
    const calc = new RunMetricsCalculator(config);
    for (const decision of decisions) {
      if (decision.accepted) calc.ingestAccepted(decision.sample, decision.paused, decision);
      else calc.route.push(decision);
    }
    return calc;
  }

  checkpoint(): CalculatorCheckpoint {
    return {
      route: this.route.slice(),
      splits: this.splits.slice(),
      previousAccepted: this.previousAccepted,
      previousActive: this.previousActive,
      wasPaused: this.wasPaused,
      distanceMeters: this.distance,
      activeDurationSeconds: this.activeDuration,
      paceSegments: this.paceSegments.slice(),
      lastSplitDuration: this.lastSplitDuration,
    };
  }

  get decisions(): RunLocationDecision[] {
    return this.route;
  }

  /** An explicit pause breaks continuity so resume never bridges the gap. */
  beginPause(): void {
    this.previousActive = null;
    this.paceSegments = [];
    this.wasPaused = true;
  }

  endPause(): void {
    this.previousActive = null;
    this.paceSegments = [];
    this.wasPaused = false;
  }

  ingest(sample: RunLocationSample, receivedAt: Ms = Date.now(), isPaused = false): RunMetricsSnapshot {
    const reason = evaluateSample(sample, receivedAt, this.previousAccepted, this.config);
    if (reason !== null) {
      this.route.push({
        sample,
        accepted: false,
        rejectionReason: reason,
        cumulativeDistanceMeters: this.distance,
        paused: isPaused,
      });
      return this.snapshot();
    }
    return this.ingestAccepted(sample, isPaused);
  }

  private ingestAccepted(sample: RunLocationSample, isPaused: boolean, persisted?: RunLocationDecision): RunMetricsSnapshot {
    this.previousAccepted = sample;

    if (isPaused) {
      this.route.push(
        persisted ?? { sample, accepted: true, rejectionReason: null, cumulativeDistanceMeters: this.distance, paused: true },
      );
      this.beginPause();
      return this.snapshot();
    }
    if (this.wasPaused) this.endPause();

    const distanceBefore = this.distance;
    const durationBefore = this.activeDuration;
    if (this.previousActive) {
      const segmentDuration = (sample.timestamp - this.previousActive.timestamp) / 1000;
      if (segmentDuration > 0) {
        const segmentDistance = distanceMeters(this.previousActive, sample);
        this.distance += segmentDistance;
        this.activeDuration += segmentDuration;
        this.paceSegments.push({ endedAt: sample.timestamp, distanceMeters: segmentDistance, durationSeconds: segmentDuration });
        this.createCompletedSplits(distanceBefore, durationBefore, segmentDistance, segmentDuration);
      }
    }
    this.previousActive = sample;
    const cutoff = sample.timestamp - this.config.rollingPaceWindow * 1000;
    this.paceSegments = this.paceSegments.filter((s) => s.endedAt >= cutoff);
    this.route.push(
      persisted ?? { sample, accepted: true, rejectionReason: null, cumulativeDistanceMeters: this.distance, paused: false },
    );
    return this.snapshot();
  }

  private createCompletedSplits(distanceBefore: number, durationBefore: number, segmentDistance: number, segmentDuration: number): void {
    if (!(segmentDistance > 0)) return;
    let next = this.splits.length + 1;
    let boundary = next * 1000;
    while (this.distance >= boundary) {
      const fraction = Math.min(1, Math.max(0, (boundary - distanceBefore) / segmentDistance));
      const boundaryDuration = durationBefore + segmentDuration * fraction;
      const splitDuration = boundaryDuration - this.lastSplitDuration;
      this.splits.push({
        kilometre: next,
        durationSeconds: splitDuration,
        paceSecondsPerKm: splitDuration,
        cumulativeDurationSeconds: boundaryDuration,
        cumulativeDistanceMeters: boundary,
      });
      this.lastSplitDuration = boundaryDuration;
      next += 1;
      boundary = next * 1000;
    }
  }

  snapshot(): RunMetricsSnapshot {
    const rollingDistance = this.paceSegments.reduce((t, s) => t + s.distanceMeters, 0);
    const rollingDuration = this.paceSegments.reduce((t, s) => t + s.durationSeconds, 0);
    return {
      distanceMeters: this.distance,
      activeDurationSeconds: this.activeDuration,
      currentPaceSecondsPerKm:
        rollingDistance >= this.config.minimumPaceDistance && rollingDuration > 0 ? rollingDuration / (rollingDistance / 1000) : null,
      averagePaceSecondsPerKm: this.distance > 0 && this.activeDuration > 0 ? this.activeDuration / (this.distance / 1000) : null,
      splits: this.splits,
    };
  }
}

/** Shows a new pace value at most every `interval` seconds so the display does not flicker. */
export class PaceDisplayThrottle {
  value: number | null;
  private lastUpdatedAt: Ms | null = null;
  constructor(
    readonly interval: number,
    initial: number | null = null,
  ) {
    this.value = initial;
  }
  ingest(candidate: number | null, at: Ms): number | null {
    if (candidate === null || !Number.isFinite(candidate) || !(candidate > 0)) return this.value;
    if (this.lastUpdatedAt !== null && (at - this.lastUpdatedAt) / 1000 < this.interval) return this.value;
    this.value = candidate;
    this.lastUpdatedAt = at;
    return this.value;
  }
}

// ---------------------------------------------------------------- stored points -> splits

export interface Split {
  index: number;
  distanceKm: number;
  durationSeconds: number;
  paceSecondsPerKm: number;
  partial: boolean;
}

/** Points are stored raw with accept/reject flag (D-044), so km splits can be rebuilt at any time. */
export function pointsToDecisions(points: RunTrackPoint[]): RunLocationDecision[] {
  return points
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .map((p) => ({
      sample: {
        timestamp: p.timestamp,
        latitude: p.latitude,
        longitude: p.longitude,
        altitude: p.altitude,
        horizontalAccuracy: p.horizontalAccuracy,
        verticalAccuracy: p.verticalAccuracy,
        reportedSpeed: p.reportedSpeed,
      },
      accepted: p.accepted,
      rejectionReason: (p.rejectionReason as RejectionReason | null) ?? null,
      cumulativeDistanceMeters: p.cumulativeDistanceMeters,
      paused: p.paused,
    }));
}

export function decisionsToPoints(runID: string, decisions: RunLocationDecision[], newId: () => string): RunTrackPoint[] {
  return decisions.map((d, sequence) => ({
    id: newId(),
    runID,
    sequence,
    timestamp: d.sample.timestamp,
    latitude: d.sample.latitude,
    longitude: d.sample.longitude,
    altitude: d.sample.altitude,
    horizontalAccuracy: d.sample.horizontalAccuracy,
    verticalAccuracy: d.sample.verticalAccuracy,
    reportedSpeed: d.sample.reportedSpeed,
    accepted: d.accepted,
    rejectionReason: d.rejectionReason,
    paused: d.paused,
    cumulativeDistanceMeters: d.cumulativeDistanceMeters,
  }));
}

/** Full-km splits plus a trailing partial split (>= 50 m) from stored points. */
export function computeSplits(points: RunTrackPoint[]): Split[] {
  if (points.length === 0) return [];
  const snapshot = RunMetricsCalculator.replay(pointsToDecisions(points)).snapshot();
  const out: Split[] = snapshot.splits.map((s) => ({
    index: s.kilometre,
    distanceKm: 1,
    durationSeconds: s.durationSeconds,
    paceSecondsPerKm: s.paceSecondsPerKm,
    partial: false,
  }));
  const lastCumulative = snapshot.splits.length ? snapshot.splits[snapshot.splits.length - 1].cumulativeDurationSeconds : 0;
  const remainingMeters = snapshot.distanceMeters - snapshot.splits.length * 1000;
  const remainingSeconds = snapshot.activeDurationSeconds - lastCumulative;
  if (remainingMeters >= 50 && remainingSeconds > 0) {
    out.push({
      index: snapshot.splits.length + 1,
      distanceKm: remainingMeters / 1000,
      durationSeconds: remainingSeconds,
      paceSecondsPerKm: remainingSeconds / (remainingMeters / 1000),
      partial: true,
    });
  }
  return out;
}

// ---------------------------------------------------------------- session clock

export type RunPhase = 'preparing' | 'countdown' | 'recording' | 'paused' | 'finishing' | 'saved' | 'discarded';

export const COUNTDOWN_OPTIONS = [0, 3, 5, 10] as const;
export const DEFAULT_COUNTDOWN = 3;

/** Wall-clock state machine; paused time never counts as active duration. Immutable (returns new state or null). */
export interface RunClock {
  phase: RunPhase;
  startedAt: Ms | null;
  pausedAt: Ms | null;
  finishedAt: Ms | null;
  accumulatedPausedSeconds: number;
}

export const newClock = (): RunClock => ({
  phase: 'preparing',
  startedAt: null,
  pausedAt: null,
  finishedAt: null,
  accumulatedPausedSeconds: 0,
});

export const clock = {
  beginCountdown(c: RunClock): RunClock | null {
    return c.phase === 'preparing' ? { ...c, phase: 'countdown' } : null;
  },
  cancelCountdown(c: RunClock): RunClock | null {
    return c.phase === 'countdown' ? { ...c, phase: 'preparing' } : null;
  },
  start(c: RunClock, at: Ms): RunClock | null {
    if (c.phase !== 'preparing' && c.phase !== 'countdown') return null;
    return { phase: 'recording', startedAt: at, pausedAt: null, finishedAt: null, accumulatedPausedSeconds: 0 };
  },
  pause(c: RunClock, at: Ms): RunClock | null {
    if (c.phase !== 'recording' || c.startedAt === null || at < c.startedAt) return null;
    return { ...c, phase: 'paused', pausedAt: at };
  },
  resume(c: RunClock, at: Ms): RunClock | null {
    if (c.phase !== 'paused' || c.pausedAt === null || at < c.pausedAt) return null;
    return { ...c, phase: 'recording', pausedAt: null, accumulatedPausedSeconds: c.accumulatedPausedSeconds + (at - c.pausedAt) / 1000 };
  },
  finish(c: RunClock, at: Ms): RunClock | null {
    if ((c.phase !== 'recording' && c.phase !== 'paused') || c.startedAt === null || at < c.startedAt) return null;
    const extra = c.pausedAt !== null ? Math.max(0, (at - c.pausedAt) / 1000) : 0;
    return { ...c, phase: 'finishing', pausedAt: null, finishedAt: at, accumulatedPausedSeconds: c.accumulatedPausedSeconds + extra };
  },
  continueAfterFinish(c: RunClock, at: Ms): RunClock | null {
    if (c.phase !== 'finishing' || c.finishedAt === null || at < c.finishedAt) return null;
    return {
      ...c,
      phase: 'recording',
      finishedAt: null,
      pausedAt: null,
      accumulatedPausedSeconds: c.accumulatedPausedSeconds + Math.max(0, (at - c.finishedAt) / 1000),
    };
  },
  markSaved(c: RunClock): RunClock | null {
    return c.phase === 'finishing' ? { ...c, phase: 'saved' } : null;
  },
  discard(c: RunClock): RunClock | null {
    return c.phase === 'saved' || c.phase === 'discarded' ? null : { ...c, phase: 'discarded' };
  },
  activeDuration(c: RunClock, at: Ms): number {
    if (c.startedAt === null) return 0;
    let endpoint: Ms;
    if (c.finishedAt !== null) endpoint = c.finishedAt;
    else if (c.phase === 'paused' && c.pausedAt !== null) endpoint = c.pausedAt;
    else endpoint = Math.max(at, c.startedAt);
    return Math.max(0, (endpoint - c.startedAt) / 1000 - c.accumulatedPausedSeconds);
  },
  pausedDuration(c: RunClock, at: Ms): number {
    let total = c.accumulatedPausedSeconds;
    if (c.phase === 'paused' && c.pausedAt !== null) total += Math.max(0, (at - c.pausedAt) / 1000);
    return total;
  },
};
