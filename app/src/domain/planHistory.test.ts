import { describe, expect, it } from 'vitest';
import { defaultFullBodyPlan } from './exercises';
import { parseHistory, pruneHistory, shouldStoreSnapshot, withSnapshot } from './planHistory';

const DAY = 86_400_000;

describe('plan history', () => {
  it('skips identical snapshots', () => {
    const plan = defaultFullBodyPlan();
    expect(shouldStoreSnapshot([plan], [plan])).toBe(false);
    expect(shouldStoreSnapshot([plan], [{ ...plan, name: 'Anders' }])).toBe(true);
    expect(shouldStoreSnapshot(null, [plan])).toBe(true);
  });

  it('keeps 30 days and stores only changed states', () => {
    const now = 100 * DAY;
    const a = defaultFullBodyPlan();
    const b = { ...a, name: 'B' };
    let history = withSnapshot([], [a], now - 20 * DAY);
    history = withSnapshot(history, [a], now - 10 * DAY); // identical: not stored again
    expect(history).toHaveLength(1);
    history = withSnapshot(history, [b], now - DAY);
    expect(history).toHaveLength(2);
    expect(history[0].plans[0].name).toBe('B'); // newest first
    expect(pruneHistory(history, now + 25 * DAY)).toHaveLength(1); // the 20-day-old snapshot is now older than 30 days
  });

  it('parses broken storage as empty', () => {
    expect(parseHistory(null)).toEqual([]);
    expect(parseHistory('nope')).toEqual([]);
    expect(parseHistory('{}')).toEqual([]);
  });
});
