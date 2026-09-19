import { describe, expect, it } from 'vitest';
import { base64Decode, base64Encode, buildBackup, parseBackup, serializeBackup, BackupError } from './backup';
import { MemoryRepository } from './memoryRepository';
import type { FullData } from './repository';

const sample = (): FullData => ({
  workouts: [
    {
      id: 'W1', startedAt: 1_788_000_000_000, endedAt: 1_788_003_600_000, isCompleted: true, isHidden: false,
      bodyWeightSnapshot: 88.5, planID: 'P1', planName: 'Full Body', plannedSetCounts: { leg_press: 3 },
    },
  ],
  sets: [
    { id: 'S1', workoutID: 'W1', exerciseID: 'leg_press', exerciseName: 'Beinpresse', planSlot: 1, setNumber: 1, weight: 100, reps: 10, rir: 2, completedAt: 1_788_000_600_000 },
  ],
  runs: [
    { id: 'R1', date: 1_788_100_000_000, distanceKm: 5, durationSeconds: 1500, source: 'native', isHidden: false, startTime: 1_788_099_000_000, elevationGainMeters: null, elevationLossMeters: null, pausedDurationSeconds: 30, algorithmVersion: 'lockedIn-gps-v2' },
  ],
  steps: [{ id: 'T1', date: 1_788_000_000_000, steps: 9000, source: 'pedometer' }],
  weights: [{ id: 'G1', date: 1_788_000_000_000, weightKg: 88.2, source: 'manual', isHidden: false }],
  trackPoints: [
    { id: 'X1', runID: 'R1', sequence: 0, timestamp: 1_788_099_001_000, latitude: 52.5, longitude: 13.4, altitude: 34, horizontalAccuracy: 5, verticalAccuracy: 4, reportedSpeed: 3, accepted: true, rejectionReason: null, paused: false, cumulativeDistanceMeters: 0 },
  ],
  plans: [
    { id: 'P1', name: 'Full Body', weeklyFrequency: 2, entries: [{ id: 'E1', exerciseID: 'leg_press', alternativeIDs: [], sets: 3, startingWeight: 80, startingReps: 8, weightIncrement: 5, restSeconds: 150, catalogID: null }] },
  ],
  lastCompletedPlanID: 'P1',
});

describe('base64', () => {
  it('round-trips unicode', () => {
    const text = '{"Schrägbank":3,"Übung":"ß €"}';
    expect(base64Decode(base64Encode(text))).toBe(text);
    expect(base64Encode('Man')).toBe('TWFu');
  });
});

describe('backup', () => {
  it('writes the legacy shape with seconds and a schema version', () => {
    const json = buildBackup(sample(), 1_788_200_000_000) as any;
    expect(json.schemaVersion).toBe(2);
    expect(json.exportedAt).toBe(1_788_200_000);
    expect(json.workouts[0].startedAt).toBe(1_788_000_000);
    expect(typeof json.workouts[0].plannedSetCountsData).toBe('string');
    expect(json.runTrackPoints).toHaveLength(1);
  });

  it('round-trips all data', () => {
    const data = sample();
    expect(parseBackup(serializeBackup(data))).toEqual({ ...data, plans: [{ ...data.plans[0], workoutType: null, entries: [{ ...data.plans[0].entries[0], repRangeMin: null, repRangeMax: null }] }] });
  });

  it('imports a legacy file without schema version and with ISO dates', () => {
    const legacy = JSON.stringify({
      exportedAt: 1_788_200_000,
      workouts: [{ id: 'A', startedAt: '2026-09-01T10:00:00.000Z', isCompleted: true }],
      sets: [{ id: 'B', workoutID: 'A', exerciseID: 'x', exerciseName: 'X', planSlot: 1, setNumber: 1, weight: 10, reps: 5, completedAt: 1_788_000_600 }],
      runs: [
        {
          id: 'R', date: 1_788_100_000, distanceKm: 5, durationSeconds: 1500, source: 'native',
          nativeArchive: { route: [{ sample: { timestamp: 1_788_099_001, latitude: 1, longitude: 2, altitude: 3, horizontalAccuracy: 5, verticalAccuracy: 4, reportedSpeed: 3 }, accepted: true, paused: false, cumulativeDistanceMeters: 0 }] },
        },
      ],
    });
    const parsed = parseBackup(legacy);
    expect(parsed.workouts[0].startedAt).toBe(Date.parse('2026-09-01T10:00:00.000Z'));
    expect(parsed.workouts[0].bodyWeightSnapshot).toBe(90);
    expect(parsed.trackPoints).toHaveLength(1);
    expect(parsed.trackPoints[0].runID).toBe('R');
    expect(parsed.weights).toEqual([]);
  });

  it('rejects invalid files', () => {
    expect(() => parseBackup('nope')).toThrow(BackupError);
    expect(() => parseBackup('{"a":1}')).toThrow(BackupError);
    expect(() => parseBackup(JSON.stringify({ schemaVersion: 99, workouts: [], sets: [] }))).toThrow(BackupError);
  });
});

describe('MemoryRepository', () => {
  it('replaces everything on import and exports it again', async () => {
    const repo = new MemoryRepository();
    await repo.replaceAll(sample());
    const all = await repo.loadAll();
    expect(all.workouts).toHaveLength(1);
    expect((await repo.getTrackPoints('R1'))).toHaveLength(1);
    await repo.deleteWorkout('W1');
    expect((await repo.loadAll()).sets).toHaveLength(0);
    expect((await repo.exportAll()).trackPoints).toHaveLength(1);
  });
});
