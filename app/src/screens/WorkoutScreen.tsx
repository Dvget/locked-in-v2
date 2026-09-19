import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useStore } from '../data/store';
import { ACTIVE_WORKOUT_KEY, startSession, type WorkoutSessionState } from '../domain/workoutSession';
import type { WorkoutRecord } from '../domain/types';
import { colors } from '../theme';
import type { RootStackParamList } from '../types/navigation';
import { ActiveWorkout } from './workout/ActiveWorkout';
import { PlanPicker } from './workout/PlanPicker';

type Props = NativeStackScreenProps<RootStackParamList, 'Workout'>;

interface Session {
  workout: WorkoutRecord;
  state: WorkoutSessionState;
}

export function WorkoutScreen({ navigation }: Props) {
  const store = useStore();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  // Resume an unfinished workout (legacy behavior): record from the store, extra state from KV.
  useEffect(() => {
    let alive = true;
    (async () => {
      const open = store.data.workouts.find((w) => !w.isCompleted && !w.isHidden);
      if (!open) {
        if (alive) setSession(null);
        return;
      }
      let state: WorkoutSessionState | null = null;
      const raw = await store.getKV(ACTIVE_WORKOUT_KEY);
      if (raw) {
        try {
          state = JSON.parse(raw) as WorkoutSessionState;
        } catch {
          state = null;
        }
      }
      if (!state || state.workoutID !== open.id) {
        const plan = store.data.plans.find((p) => p.id === open.planID);
        if (!plan) {
          // Plan is gone: cannot resume meaningfully; drop the empty shell.
          await store.deleteWorkout(open.id);
          if (alive) setSession(null);
          return;
        }
        state = { ...startSession(plan, open.bodyWeightSnapshot, open.startedAt).state, workoutID: open.id };
      }
      if (alive) setSession({ workout: open, state });
    })();
    return () => {
      alive = false;
    };
    // Only on mount: later changes are driven by this screen itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    navigation.setOptions({ title: session ? 'Training' : 'Workout' });
  }, [navigation, session]);

  if (session === undefined) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (session === null) {
    return (
      <PlanPicker
        onManagePlans={() => navigation.navigate('Tabs', { screen: 'Settings' })}
        onStart={async (workout, state) => {
          await store.saveWorkout(workout);
          await store.setKV(ACTIVE_WORKOUT_KEY, JSON.stringify(state));
          setSession({ workout, state });
        }}
      />
    );
  }

  return (
    <ActiveWorkout
      workout={session.workout}
      state={session.state}
      onState={(next) => {
        setSession((s) => (s ? { ...s, state: next } : s));
        store.setKV(ACTIVE_WORKOUT_KEY, JSON.stringify(next));
      }}
      onExit={() => navigation.goBack()}
    />
  );
}
