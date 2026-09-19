// Steps from the iPhone motion coprocessor (CoreMotion via expo-sensors Pedometer): last 7 days, one value per day.
import { Pedometer } from 'expo-sensors';
import { Platform } from 'react-native';

import type { Store } from '../data/store';
import { addDays, startOfDay } from '../domain/dates';
import { shouldAutomaticSync } from '../domain/plans';

export const MIN_AUTO_SYNC_SECONDS = 30 * 60;
const HISTORY_DAYS = 7;

export const stepRecordId = (dayStart: number): string => `pedometer-${dayStart}`;

export async function stepsAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return await Pedometer.isAvailableAsync();
  } catch {
    return false;
  }
}

/** Asks for motion permission. Returns true when granted. */
export async function requestStepPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const result = await Pedometer.requestPermissionsAsync();
    return result.granted;
  } catch {
    return false;
  }
}

/** Reads the last 7 days and replaces each day's value (id is per day, so it never duplicates). */
export async function syncSteps(store: Pick<Store, 'saveStep' | 'updateSettings'>, now: number = Date.now()): Promise<number> {
  let saved = 0;
  const today = startOfDay(now);
  for (let offset = HISTORY_DAYS - 1; offset >= 0; offset--) {
    const dayStart = addDays(today, -offset);
    const end = offset === 0 ? new Date(now) : new Date(addDays(dayStart, 1));
    try {
      const result = await Pedometer.getStepCountAsync(new Date(dayStart), end);
      await store.saveStep({ id: stepRecordId(dayStart), date: dayStart, steps: Math.max(0, Math.round(result.steps)), source: 'pedometer' });
      saved++;
    } catch {
      // Older days can be unavailable; keep what we have.
    }
  }
  await store.updateSettings({ lastStepSync: Math.floor(now / 1000) });
  return saved;
}

/** Runs a sync when enabled and the last one is at least 30 minutes ago (or forced). */
export async function syncStepsIfNeeded(
  store: Pick<Store, 'saveStep' | 'updateSettings' | 'settings'>,
  force = false,
  now: number = Date.now(),
): Promise<void> {
  if (!(await stepsAvailable())) return;
  const should =
    force ||
    shouldAutomaticSync({
      isEnabled: store.settings.stepsEnabled,
      lastSync: store.settings.lastStepSync,
      now: Math.floor(now / 1000),
      minimumInterval: MIN_AUTO_SYNC_SECONDS,
    });
  if (should) await syncSteps(store, now);
}
