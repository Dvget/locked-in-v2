import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useStore } from '../data/store';
import { addDays, newId, startOfDay } from '../domain/dates';
import { exerciseName, isRepsOnlyExercise } from '../domain/exercises';
import type { SetRecord, WorkoutRecord } from '../domain/types';
import { colors } from '../theme';
import { Button, Field, Muted, SectionLabel, Sheet, Stepper } from './ui';

type Props = { visible: boolean; onClose: () => void };

/** "Workout nachtragen": records a finished workout after the fact. Weight and reps apply to all planned sets of an exercise. */
export function WorkoutEntrySheet({ visible, onClose }: Props) {
  const store = useStore();
  const plans = store.data.plans;
  const [planID, setPlanID] = useState<string | null>(null);
  const [daysBack, setDaysBack] = useState(0);
  const [values, setValues] = useState<Record<string, { weight: string; reps: string }>>({});

  const plan = plans.find((p) => p.id === (planID ?? plans[0]?.id)) ?? null;

  useEffect(() => {
    if (visible) {
      setPlanID(null);
      setDaysBack(0);
      setValues({});
    }
  }, [visible]);

  const entries = useMemo(() => plan?.entries ?? [], [plan]);
  const set = (id: string, patch: Partial<{ weight: string; reps: string }>) =>
    setValues((v) => ({ ...v, [id]: { ...(v[id] ?? { weight: '', reps: '' }), ...patch } }));
  const num = (t: string | undefined) => Number((t ?? '').replace(',', '.'));

  const filled = entries.filter((e) => num(values[e.id]?.reps) > 0);

  const save = async () => {
    if (!plan || filled.length === 0) return;
    const startedAt = addDays(startOfDay(Date.now()), -daysBack) + 18 * 3_600_000;
    const latest = store.data.weights.filter((w) => !w.isHidden).sort((a, b) => b.date - a.date)[0];
    const workout: WorkoutRecord = {
      id: newId(),
      startedAt,
      endedAt: startedAt + 3_600_000,
      isCompleted: true,
      isHidden: false,
      bodyWeightSnapshot: latest ? latest.weightKg : store.settings.manualBodyWeightKg,
      planID: plan.id,
      planName: plan.name,
      plannedSetCounts: Object.fromEntries(filled.map((e) => [e.exerciseID, e.sets])),
    };
    await store.saveWorkout(workout);
    let slot = 0;
    for (const entry of entries) {
      slot++;
      const v = values[entry.id];
      if (!v || !(num(v.reps) > 0)) continue;
      const repsOnly = isRepsOnlyExercise(entry.exerciseID);
      for (let i = 0; i < entry.sets; i++) {
        const record: SetRecord = {
          id: newId(),
          workoutID: workout.id,
          exerciseID: entry.exerciseID,
          exerciseName: exerciseName(entry.exerciseID),
          planSlot: slot,
          setNumber: i + 1,
          weight: repsOnly ? 0 : num(v.weight) || 0,
          reps: Math.round(num(v.reps)),
          rir: null,
          completedAt: startedAt + (slot * 8 + i) * 120_000,
        };
        await store.saveSet(record);
      }
    }
    onClose();
  };

  return (
    <Sheet visible={visible} title="Workout nachtragen" onClose={onClose}>
      {plans.length === 0 ? <Muted>Lege zuerst einen Trainingsplan an.</Muted> : null}
      {plans.length > 1 ? (
        <View style={styles.chips}>
          {plans.map((p) => (
            <Pressable key={p.id} onPress={() => setPlanID(p.id)} style={[styles.chip, plan?.id === p.id && styles.chipActive]}>
              <Text style={[styles.chipText, plan?.id === p.id && { color: '#000' }]}>{p.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row' }}>
        <Stepper
          title="TAGE ZURÜCK"
          value={String(daysBack)}
          unit={daysBack === 0 ? 'heute' : daysBack === 1 ? 'gestern' : 'Tage her'}
          onMinus={() => setDaysBack(Math.max(0, daysBack - 1))}
          onPlus={() => setDaysBack(Math.min(365, daysBack + 1))}
        />
      </View>
      <SectionLabel>Übungen (leer lassen = nicht gemacht)</SectionLabel>
      {entries.map((entry) => {
        const repsOnly = isRepsOnlyExercise(entry.exerciseID);
        return (
          <View key={entry.id} style={styles.card}>
            <Text style={styles.name}>{exerciseName(entry.exerciseID)}</Text>
            <Muted>{entry.sets} Sätze</Muted>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {!repsOnly ? (
                <View style={{ flex: 1 }}>
                  <Field label="kg" keyboardType="decimal-pad" value={values[entry.id]?.weight ?? ''} onChangeText={(t) => set(entry.id, { weight: t })} />
                </View>
              ) : null}
              <View style={{ flex: 1 }}>
                <Field label="Wdh." keyboardType="number-pad" value={values[entry.id]?.reps ?? ''} onChangeText={(t) => set(entry.id, { reps: t })} />
              </View>
            </View>
          </View>
        );
      })}
      <Button label="Speichern" variant="primary" disabled={filled.length === 0} onPress={save} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.card },
  chipActive: { backgroundColor: colors.accent },
  chipText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 14, gap: 8, borderWidth: 1, borderColor: colors.border },
  name: { color: colors.text, fontSize: 16, fontWeight: '600' },
});
