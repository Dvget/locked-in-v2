import { useEffect, useRef, type ReactNode } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, View } from 'react-native';

import { defaultFullBodyPlan, setCustomExercises, type CustomExercise } from '../domain/exercises';
import { colors } from '../theme';
import { ACTIVE_RUN_KEY } from '../domain/running';
import { runEngine } from '../native/runEngine';
import { syncStepsIfNeeded } from '../native/steps';
import { useStore } from './store';

const CUSTOM_EXERCISES_KEY = 'customExercises';
const PLANS_SEEDED_KEY = 'plansSeeded';

/** Loads custom exercises, seeds the default plan once, and shows a loading/error state until ready. */
export function Bootstrap({ children }: { children: ReactNode }) {
  const store = useStore();
  const done = useRef(false);

  useEffect(() => {
    if (!store.ready || store.error || done.current) return;
    done.current = true;
    // Crash-safe checkpoints of a running run go to the same store.
    runEngine.setPersist((json) => store.setKV(ACTIVE_RUN_KEY, json));
    (async () => {
      const raw = await store.getKV(CUSTOM_EXERCISES_KEY);
      if (raw) {
        try {
          setCustomExercises(JSON.parse(raw) as CustomExercise[]);
        } catch {
          // Ignore unreadable custom exercises; history keeps working through stored names.
        }
      }
      const seeded = await store.getKV(PLANS_SEEDED_KEY);
      if (!seeded) {
        if (store.data.plans.length === 0) await store.savePlan(defaultFullBodyPlan());
        await store.setKV(PLANS_SEEDED_KEY, '1');
      }
    })().catch(() => undefined);
  }, [store]);

  // Steps: sync when the app opens and each time it returns to the foreground (at most every 30 minutes).
  const storeRef = useRef(store);
  storeRef.current = store;
  useEffect(() => {
    if (!store.ready || store.error) return;
    syncStepsIfNeeded(storeRef.current).catch(() => undefined);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncStepsIfNeeded(storeRef.current).catch(() => undefined);
    });
    return () => sub.remove();
  }, [store.ready, store.error]);

  if (!store.ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  if (store.error) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Daten konnten nicht geladen werden</Text>
        <Text style={styles.body}>{store.error}</Text>
      </View>
    );
  }
  return <>{children}</>;
}

export async function saveCustomExercises(
  store: { setKV(key: string, value: string | null): Promise<void> },
  list: CustomExercise[],
): Promise<void> {
  setCustomExercises(list);
  await store.setKV(CUSTOM_EXERCISES_KEY, JSON.stringify(list));
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24, backgroundColor: colors.background },
  title: { color: colors.text, fontSize: 17, fontWeight: '600' },
  body: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
});
