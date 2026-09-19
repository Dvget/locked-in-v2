// Live run tracking: GPS (foreground + background task), pure calculator from src/domain/running.ts,
// spoken km cues and crash-safe checkpoints. Everything that touches the device is here; the maths is not.
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import {
  ACTIVE_RUN_KEY,
  CONFIG_V3,
  RunMetricsCalculator,
  clock,
  newClock,
  type CalculatorCheckpoint,
  type RunClock,
  type RunLocationDecision,
  type RunLocationSample,
  type RunMetricsSnapshot,
} from '../domain/running';
import { speak, stopSpeaking } from './feedback';

export const LOCATION_TASK = 'lockedin-run-location';
/** A checkpoint older than this is not offered for restore. */
export const RESTORABLE_WINDOW_MS = 12 * 3_600_000;

export interface RunCheckpoint {
  runID: string;
  clock: RunClock;
  calculator: CalculatorCheckpoint;
  speechEnabled: boolean;
  spokenKm: number;
  savedAt: number;
}

export function isCheckpointRestorable(cp: RunCheckpoint, now: number): boolean {
  return cp.clock.phase !== 'saved' && cp.clock.phase !== 'discarded' && now - cp.savedAt <= RESTORABLE_WINDOW_MS;
}

export interface RunView {
  active: boolean;
  runID: string | null;
  clock: RunClock;
  snapshot: RunMetricsSnapshot;
  gpsAccuracy: number | null;
  speechEnabled: boolean;
}

type Listener = (view: RunView) => void;
type Persist = (json: string | null) => Promise<void> | void;

function toSample(l: Location.LocationObject): RunLocationSample {
  return {
    timestamp: l.timestamp,
    latitude: l.coords.latitude,
    longitude: l.coords.longitude,
    altitude: l.coords.altitude ?? Number.NaN,
    horizontalAccuracy: l.coords.accuracy ?? -1,
    verticalAccuracy: l.coords.altitudeAccuracy ?? -1,
    reportedSpeed: l.coords.speed ?? -1,
  };
}

class RunEngine {
  private calc = new RunMetricsCalculator(CONFIG_V3);
  private state: RunClock = newClock();
  private runID: string | null = null;
  private speechEnabled = true;
  private spokenKm = 0;
  private persist: Persist = () => undefined;
  private listeners = new Set<Listener>();
  private lastAccuracy: number | null = null;
  private lastCheckpointAt = 0;
  private webWatch: Location.LocationSubscription | null = null;

  setPersist(fn: Persist): void {
    this.persist = fn;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.view());
    return () => this.listeners.delete(fn);
  }

  view(): RunView {
    return {
      active: this.runID !== null && this.state.phase !== 'saved' && this.state.phase !== 'discarded',
      runID: this.runID,
      clock: this.state,
      snapshot: this.calc.snapshot(),
      gpsAccuracy: this.lastAccuracy,
      speechEnabled: this.speechEnabled,
    };
  }

  get decisions(): RunLocationDecision[] {
    return this.calc.decisions;
  }

  private emit(): void {
    const v = this.view();
    this.listeners.forEach((l) => l(v));
  }

  private checkpoint(force = false): void {
    const now = Date.now();
    if (!force && now - this.lastCheckpointAt < 15_000) return;
    this.lastCheckpointAt = now;
    if (!this.runID) return;
    const cp: RunCheckpoint = {
      runID: this.runID,
      clock: this.state,
      calculator: this.calc.checkpoint(),
      speechEnabled: this.speechEnabled,
      spokenKm: this.spokenKm,
      savedAt: now,
    };
    Promise.resolve(this.persist(JSON.stringify(cp))).catch(() => undefined);
  }

  // ------------------------------------------------------------ permissions and GPS

  async requestPermissions(): Promise<'granted' | 'foreground-only' | 'denied'> {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== 'granted') return 'denied';
    if (Platform.OS === 'web') return 'granted';
    const bg = await Location.requestBackgroundPermissionsAsync();
    return bg.status === 'granted' ? 'granted' : 'foreground-only';
  }

  private async startGps(): Promise<void> {
    if (Platform.OS === 'web') {
      this.webWatch = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 0, timeInterval: 1000 },
        (l) => this.ingestLocations([l]),
      );
      return;
    }
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false)) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK).catch(() => undefined);
    }
    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      activityType: Location.ActivityType.Fitness,
      distanceInterval: 0,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'LOCKED IN 2',
        notificationBody: 'Lauf wird aufgezeichnet',
      },
    });
  }

  private async stopGps(): Promise<void> {
    this.webWatch?.remove();
    this.webWatch = null;
    if (Platform.OS === 'web') return;
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false)) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK).catch(() => undefined);
    }
  }

  /** Entry point for GPS batches (foreground callback and background task). */
  ingestLocations(locations: Location.LocationObject[]): void {
    if (!this.runID) return;
    const recording = this.state.phase === 'recording' || this.state.phase === 'paused';
    if (!recording) return;
    const now = Date.now();
    // Batched background deliveries: judge staleness relative to the newest sample of the batch.
    const newest = Math.min(now, Math.max(...locations.map((l) => l.timestamp)));
    for (const l of locations.slice().sort((a, b) => a.timestamp - b.timestamp)) {
      const sample = toSample(l);
      this.lastAccuracy = sample.horizontalAccuracy > 0 ? sample.horizontalAccuracy : null;
      const before = this.calc.snapshot().splits.length;
      const snap = this.calc.ingest(sample, newest, this.state.phase === 'paused');
      if (snap.splits.length > before) this.announceSplit(snap);
    }
    this.checkpoint();
    this.emit();
  }

  private announceSplit(snap: RunMetricsSnapshot): void {
    const km = snap.splits.length;
    if (km <= this.spokenKm) return;
    this.spokenKm = km;
    if (!this.speechEnabled) return;
    const split = snap.splits[km - 1];
    const pace = Math.round(split.paceSecondsPerKm);
    const text = `Kilometer ${km}. ${Math.floor(pace / 60)} Minuten ${pace % 60} Sekunden.`;
    speak(text);
  }

  // ------------------------------------------------------------ session control

  async start(runID: string, speechEnabled: boolean): Promise<void> {
    this.calc = new RunMetricsCalculator(CONFIG_V3);
    this.runID = runID;
    this.speechEnabled = speechEnabled;
    this.spokenKm = 0;
    this.state = clock.start(newClock(), Date.now())!;
    await this.startGps();
    this.checkpoint(true);
    this.emit();
  }

  setSpeech(enabled: boolean): void {
    this.speechEnabled = enabled;
    if (!enabled) stopSpeaking();
    this.checkpoint(true);
    this.emit();
  }

  pause(): void {
    const next = clock.pause(this.state, Date.now());
    if (!next) return;
    this.state = next;
    this.calc.beginPause();
    this.checkpoint(true);
    this.emit();
  }

  resume(): void {
    const next = clock.resume(this.state, Date.now());
    if (!next) return;
    this.state = next;
    this.calc.endPause();
    this.checkpoint(true);
    this.emit();
  }

  async finish(): Promise<void> {
    const next = clock.finish(this.state, Date.now());
    if (!next) return;
    this.state = next;
    await this.stopGps();
    this.checkpoint(true);
    this.emit();
  }

  /** User keeps running after pressing end (legacy "continue"). */
  async continueAfterFinish(): Promise<void> {
    const next = clock.continueAfterFinish(this.state, Date.now());
    if (!next) return;
    this.state = next;
    this.calc.endPause();
    await this.startGps();
    this.checkpoint(true);
    this.emit();
  }

  /** After the record was saved or discarded: forget the session. */
  async clear(): Promise<void> {
    await this.stopGps();
    stopSpeaking();
    this.runID = null;
    this.state = newClock();
    this.calc = new RunMetricsCalculator(CONFIG_V3);
    this.spokenKm = 0;
    await Promise.resolve(this.persist(null)).catch(() => undefined);
    this.emit();
  }

  /** Restores a session after the app was killed. Samples during the gap are lost, so continuity is cut. */
  async restore(cp: RunCheckpoint): Promise<void> {
    this.calc = new RunMetricsCalculator(CONFIG_V3, cp.calculator);
    this.calc.beginPause();
    this.calc.endPause();
    this.runID = cp.runID;
    this.state = cp.clock;
    this.speechEnabled = cp.speechEnabled;
    this.spokenKm = cp.spokenKm;
    if (this.state.phase === 'recording' || this.state.phase === 'paused') await this.startGps();
    this.emit();
  }
}

export const runEngine = new RunEngine();

// Must be defined at module scope so the background task can find it after a cold start.
if (Platform.OS !== 'web') {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(LOCATION_TASK, async ({ data, error }) => {
    if (error || !data) return;
    runEngine.ingestLocations(data.locations);
  });
}
