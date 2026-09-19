import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '../../components/Card';
import { ExercisePicker } from '../../components/ExercisePicker';
import { Screen } from '../../components/Screen';
import { Button, Field, Muted, SectionLabel, Segmented } from '../../components/ui';
import { useStore } from '../../data/store';
import { newId } from '../../domain/dates';
import { exerciseName, type ExerciseDefinition } from '../../domain/exercises';
import { PlanError, validatePlans, type PlannedExercise, type TrainingPlan } from '../../domain/plans';
import { colors } from '../../theme';
import type { RootStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'PlanEditor'>;

const num = (text: string, fallback: number): number => {
  const v = Number(text.replace(',', '.'));
  return Number.isFinite(v) ? v : fallback;
};

function notify(message: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message);
    return;
  }
  Alert.alert('Hinweis', message);
}

function newEntry(def: ExerciseDefinition): PlannedExercise {
  return {
    id: newId(), exerciseID: def.id, alternativeIDs: [], sets: 3, startingWeight: 0, startingReps: 8,
    weightIncrement: def.defaultIncrement, restSeconds: null, catalogID: null,
  };
}

export function PlanEditorScreen({ navigation, route }: Props) {
  const store = useStore();
  const existing = store.data.plans.find((p) => p.id === route.params.planId) ?? null;
  const [plan, setPlan] = useState<TrainingPlan>(
    existing ?? { id: newId(), name: '', weeklyFrequency: 2, entries: [], workoutType: null },
  );
  const [pickerFor, setPickerFor] = useState<{ kind: 'add' } | { kind: 'alt'; entryId: string } | null>(null);

  const update = (patch: Partial<TrainingPlan>) => setPlan((p) => ({ ...p, ...patch }));
  const updateEntry = (id: string, patch: Partial<PlannedExercise>) =>
    setPlan((p) => ({ ...p, entries: p.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  const move = (index: number, delta: number) =>
    setPlan((p) => {
      const entries = p.entries.slice();
      const target = index + delta;
      if (target < 0 || target >= entries.length) return p;
      [entries[index], entries[target]] = [entries[target], entries[index]];
      return { ...p, entries };
    });

  const used = plan.entries.flatMap((e) => [e.exerciseID, ...e.alternativeIDs]);

  const save = async () => {
    try {
      validatePlans([plan]);
      await store.savePlan(plan);
      navigation.goBack();
    } catch (e) {
      notify(e instanceof PlanError ? e.message : 'Der Plan konnte nicht gespeichert werden.');
    }
  };

  const remove = () => {
    const run = async () => {
      await store.removePlan(plan.id);
      navigation.goBack();
    };
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Plan löschen?')) run();
      return;
    }
    Alert.alert('Plan löschen?', 'Trainingsdaten bleiben erhalten.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: run },
    ]);
  };

  return (
    <Screen>
      <Field label="Name" value={plan.name} onChangeText={(t) => update({ name: t })} placeholder="z. B. Push" />
      <Field
        label="Trainingsart (optional)"
        value={plan.workoutType ?? ''}
        onChangeText={(t) => update({ workoutType: t.length ? t : null })}
        placeholder="z. B. Ganzkörper, Push, Beine"
      />
      <View style={{ gap: 6 }}>
        <SectionLabel>Wochenhäufigkeit</SectionLabel>
        <Segmented
          options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n}×` }))}
          value={String(plan.weeklyFrequency)}
          onChange={(v) => update({ weeklyFrequency: Number(v) })}
        />
      </View>

      <SectionLabel>Übungen</SectionLabel>
      {plan.entries.map((entry, index) => (
        <Card key={entry.id}>
          <View style={styles.entryHeader}>
            <Text style={styles.entryName}>{index + 1}. {exerciseName(entry.exerciseID)}</Text>
            <View style={styles.moveButtons}>
              <Pressable onPress={() => move(index, -1)} style={styles.move}><Text style={styles.moveText}>↑</Text></Pressable>
              <Pressable onPress={() => move(index, 1)} style={styles.move}><Text style={styles.moveText}>↓</Text></Pressable>
            </View>
          </View>
          <View style={styles.grid}>
            <Small label="Sätze" value={String(entry.sets)} onChange={(t) => updateEntry(entry.id, { sets: Math.round(num(t, entry.sets)) })} />
            <Small label="Start-kg" value={String(entry.startingWeight)} onChange={(t) => updateEntry(entry.id, { startingWeight: num(t, entry.startingWeight) })} />
            <Small label="Start-Wdh." value={String(entry.startingReps)} onChange={(t) => updateEntry(entry.id, { startingReps: Math.round(num(t, entry.startingReps)) })} />
            <Small label="Schritt kg" value={String(entry.weightIncrement)} onChange={(t) => updateEntry(entry.id, { weightIncrement: num(t, entry.weightIncrement) })} />
            <Small label="Pause (s)" value={entry.restSeconds === null ? '' : String(entry.restSeconds)} placeholder="Auto" onChange={(t) => updateEntry(entry.id, { restSeconds: t.length ? Math.round(num(t, 150)) : null })} />
            <Small label="Max-Wdh." value={entry.repRangeMax ? String(entry.repRangeMax) : ''} placeholder="Global" onChange={(t) => updateEntry(entry.id, { repRangeMax: t.length ? Math.round(num(t, 12)) : null })} />
          </View>
          {entry.alternativeIDs.length > 0 ? (
            <Muted>Alternativen: {entry.alternativeIDs.map((id) => exerciseName(id)).join(', ')}</Muted>
          ) : null}
          <View style={styles.entryActions}>
            <Button label="Alternative +" style={styles.actionButton} onPress={() => setPickerFor({ kind: 'alt', entryId: entry.id })} />
            {entry.alternativeIDs.length > 0 ? (
              <Button label="Alternativen leeren" style={styles.actionButton} onPress={() => updateEntry(entry.id, { alternativeIDs: [] })} />
            ) : null}
            <Button label="Entfernen" variant="danger" style={styles.actionButton} onPress={() => setPlan((p) => ({ ...p, entries: p.entries.filter((e) => e.id !== entry.id) }))} />
          </View>
        </Card>
      ))}
      <Button label="Übung hinzufügen" onPress={() => setPickerFor({ kind: 'add' })} />

      <Button label="Speichern" variant="primary" onPress={save} />
      {existing ? <Button label="Plan löschen" variant="danger" onPress={remove} /> : null}

      <ExercisePicker
        visible={pickerFor !== null}
        exclude={used}
        onClose={() => setPickerFor(null)}
        onPick={(def) => {
          if (pickerFor?.kind === 'add') setPlan((p) => ({ ...p, entries: [...p.entries, newEntry(def)] }));
          if (pickerFor?.kind === 'alt') {
            const entryId = pickerFor.entryId;
            setPlan((p) => ({
              ...p,
              entries: p.entries.map((e) => (e.id === entryId ? { ...e, alternativeIDs: [...e.alternativeIDs, def.id] } : e)),
            }));
          }
          setPickerFor(null);
        }}
      />
    </Screen>
  );
}

/** Keeps the typed text locally so decimals like "2,5" can be typed; commits parsed values upward. */
function Small({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (t: string) => void; placeholder?: string }) {
  const [text, setText] = useState(value);
  return (
    <View style={styles.small}>
      <Field
        label={label}
        value={text}
        onChangeText={(t) => {
          setText(t);
          onChange(t);
        }}
        placeholder={placeholder}
        keyboardType="decimal-pad"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  entryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  entryName: { color: colors.text, fontSize: 16, fontWeight: '600', flex: 1 },
  moveButtons: { flexDirection: 'row', gap: 6 },
  move: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' },
  moveText: { color: colors.text, fontSize: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  small: { width: '31%', flexGrow: 1 },
  entryActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  actionButton: { minHeight: 40, paddingHorizontal: 12 },
});
