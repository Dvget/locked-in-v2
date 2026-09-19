import { describe, expect, it } from 'vitest';
import {
  CONFIG_V3,
  PaceDisplayThrottle,
  RunMetricsCalculator,
  clock,
  computeSplits,
  decisionsToPoints,
  evaluateSample,
  newClock,
  type RunLocationSample,
} from './running';

const t = (s: number) => s * 1000;
const sample = (over: Partial<RunLocationSample> & { timestamp: number }): RunLocationSample => ({
  latitude: 48,
  longitude: 8,
  altitude: 100,
  horizontalAccuracy: 5,
  verticalAccuracy: 5,
  reportedSpeed: 1.5,
  ...over,
});
const at = (seconds: number, lat = 48) => sample({ latitude: lat, timestamp: t(seconds) });

describe('pace display throttle', () => {
  it('updates at most every 20 seconds', () => {
    const th = new PaceDisplayThrottle(20);
    expect(th.ingest(360, t(0))).toBe(360);
    expect(th.ingest(420, t(10))).toBe(360);
    expect(th.ingest(390, t(19.9))).toBe(360);
    expect(th.ingest(400, t(20))).toBe(400);
  });

  it('keeps the last value when the candidate is missing', () => {
    const th = new PaceDisplayThrottle(20);
    th.ingest(360, t(0));
    expect(th.ingest(null, t(25))).toBe(360);
    expect(th.ingest(420, t(26))).toBe(420);
  });
});

describe('location filter', () => {
  it('rejects stale, future and inaccurate samples', () => {
    expect(evaluateSample(sample({ timestamp: t(80) }), t(100), null)).toBe('stale');
    expect(evaluateSample(sample({ timestamp: t(102) }), t(100), null)).toBe('future');
    expect(evaluateSample(sample({ horizontalAccuracy: 26, timestamp: t(100) }), t(100), null)).toBe('horizontalAccuracy');
    expect(evaluateSample(sample({ latitude: 91, timestamp: t(100) }), t(100), null)).toBe('invalidCoordinate');
    expect(evaluateSample(sample({ timestamp: t(100) }), t(100), null)).toBeNull();
  });

  it('rejects duplicates and implausible jumps', () => {
    const previous = sample({ timestamp: t(100) });
    expect(evaluateSample(previous, t(100), previous)).toBe('duplicate');
    expect(evaluateSample(sample({ latitude: 48.01, timestamp: t(101) }), t(101), previous)).toBe('implausibleSpeed');
    expect(evaluateSample(sample({ latitude: 48.0001, timestamp: t(99) }), t(100), previous)).toBe('nonIncreasingTime');
  });
});

describe('metrics calculator', () => {
  it('accumulates distance and average pace', () => {
    const c = new RunMetricsCalculator();
    c.ingest(at(0), t(0));
    const r = c.ingest(at(60, 48.000899), t(60));
    expect(r.distanceMeters).toBeCloseTo(100, 0);
    expect(r.activeDurationSeconds).toBeCloseTo(60, 3);
    expect(Math.abs((r.averagePaceSecondsPerKm ?? 0) - 600)).toBeLessThan(12);
  });

  it('keeps paused samples without adding metrics or bridging the resume', () => {
    const c = new RunMetricsCalculator();
    c.ingest(at(0), t(0));
    c.ingest(at(60, 48.000899), t(60), true);
    c.ingest(at(90, 48.001798), t(90));
    const r = c.ingest(at(150, 48.002697), t(150));
    expect(c.decisions).toHaveLength(4);
    expect(c.decisions[1].paused).toBe(true);
    expect(r.distanceMeters).toBeCloseTo(100, 0);
    expect(r.activeDurationSeconds).toBeCloseTo(60, 3);
  });

  it('does not bridge an explicit pause without location samples', () => {
    const c = new RunMetricsCalculator();
    c.ingest(at(0), t(0));
    c.beginPause();
    c.endPause();
    c.ingest(at(90, 48.001798), t(90));
    const r = c.ingest(at(150, 48.002697), t(150));
    expect(r.distanceMeters).toBeCloseTo(100, 0);
    expect(r.activeDurationSeconds).toBeCloseTo(60, 3);
  });

  it('restores from a checkpoint (JSON round trip) at a pause boundary', () => {
    const c = new RunMetricsCalculator();
    c.ingest(at(0), t(0));
    c.beginPause();
    c.endPause();
    const restored = new RunMetricsCalculator(CONFIG_V3, JSON.parse(JSON.stringify(c.checkpoint())));
    restored.ingest(at(90, 48.001798), t(90));
    const r = restored.ingest(at(150, 48.002697), t(150));
    expect(r.distanceMeters).toBeCloseTo(100, 0);
    expect(r.activeDurationSeconds).toBeCloseTo(60, 3);
  });

  it('uses a rolling window for the current pace', () => {
    const c = new RunMetricsCalculator();
    c.ingest(at(0), t(0));
    c.ingest(at(30, 48.00045), t(30));
    const r = c.ingest(at(60, 48.000899), t(60));
    expect(Math.abs((r.currentPaceSecondsPerKm ?? 0) - 600)).toBeLessThan(15);
  });

  it('creates one split when crossing a kilometre', () => {
    const c = new RunMetricsCalculator();
    c.ingest(at(0), t(0));
    const r = c.ingest(at(600, 48.00945), t(600)); // ~1050 m in 600 s
    expect(r.splits).toHaveLength(1);
    expect(r.splits[0].kilometre).toBe(1);
    expect(r.splits[0].cumulativeDistanceMeters).toBeCloseTo(1000, 3);
  });

  it('retains rejected samples without changing distance', () => {
    const c = new RunMetricsCalculator();
    c.ingest(at(0), t(0));
    const r = c.ingest(at(1, 48.01), t(1));
    expect(c.decisions).toHaveLength(2);
    expect(c.decisions[1].rejectionReason).toBe('implausibleSpeed');
    expect(r.distanceMeters).toBeCloseTo(0, 3);
  });

  it('replays stored decisions without reclassifying rejected ones', () => {
    const original = new RunMetricsCalculator();
    original.ingest(at(0), t(0));
    original.ingest(at(60, 48.000899), t(60));
    original.ingest(at(61, 48.02), t(61)); // rejected
    const replayed = RunMetricsCalculator.replay(original.decisions);
    expect(replayed.snapshot().distanceMeters).toBeCloseTo(original.snapshot().distanceMeters, 3);
    expect(replayed.decisions).toHaveLength(3);
    expect(replayed.decisions[2].accepted).toBe(false);
  });

  it('rebuilds km splits from stored track points, incl. a trailing partial split', () => {
    const c = new RunMetricsCalculator();
    // ~2.5 km at 5:00/km, one sample every 30 s (~100 m)
    for (let i = 0; i <= 75; i++) c.ingest(at(i * 30, 48 + i * 0.0003), t(i * 30));
    const points = decisionsToPoints('r1', c.decisions, () => 'id');
    const splits = computeSplits(points);
    expect(splits.filter((s) => !s.partial)).toHaveLength(2);
    expect(splits[splits.length - 1].partial).toBe(true);
    expect(splits[0].paceSecondsPerKm).toBeGreaterThan(250);
    expect(computeSplits([])).toEqual([]);
  });
});

describe('run clock', () => {
  it('excludes paused intervals from the active duration', () => {
    let c = clock.start(newClock(), t(0))!;
    c = clock.pause(c, t(60))!;
    c = clock.resume(c, t(90))!;
    expect(clock.activeDuration(c, t(120))).toBeCloseTo(90, 3);
    expect(clock.pausedDuration(c, t(120))).toBeCloseTo(30, 3);
  });

  it('cannot start twice; invalid transitions do nothing', () => {
    const started = clock.start(newClock(), t(10))!;
    expect(clock.start(started, t(20))).toBeNull();
    expect(clock.pause(newClock(), t(1))).toBeNull();
    expect(clock.resume(newClock(), t(2))).toBeNull();
    expect(clock.resume(started, t(4))).toBeNull();
  });

  it('freezes duration on finish and can continue without counting summary time', () => {
    let c = clock.start(newClock(), t(0))!;
    c = clock.pause(c, t(60))!;
    c = clock.finish(c, t(70))!;
    expect(c.phase).toBe('finishing');
    expect(clock.activeDuration(c, t(500))).toBeCloseTo(60, 3);
    c = clock.continueAfterFinish(c, t(100))!;
    expect(c.phase).toBe('recording');
    expect(clock.activeDuration(c, t(130))).toBeCloseTo(90, 3);
    expect(clock.pausedDuration(c, t(130))).toBeCloseTo(40, 3);
  });

  it('cancels a countdown before recording', () => {
    let c = clock.beginCountdown(newClock())!;
    c = clock.cancelCountdown(c)!;
    expect(c.phase).toBe('preparing');
    expect(c.startedAt).toBeNull();
  });
});
