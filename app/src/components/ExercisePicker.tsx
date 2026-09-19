import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { saveCustomExercises } from '../data/Bootstrap';
import { useStore } from '../data/store';
import {
  exerciseDefinition,
  getCustomExercises,
  MUSCLE_GROUPS,
  newCustomExercise,
  searchExercises,
  type ExerciseDefinition,
} from '../domain/exercises';
import { colors } from '../theme';
import { Button, Field, Muted, Segmented, Sheet } from './ui';

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (exercise: ExerciseDefinition) => void;
  /** Exercise ids that cannot be picked again (already in the plan). */
  exclude?: string[];
};

const GROUP_TO_MUSCLE: Record<string, string> = {
  Brust: 'chest',
  Rücken: 'lats',
  Schultern: 'shoulders',
  Arme: 'biceps',
  'Beine & Gesäß': 'quadriceps',
  Bauch: 'abdominals',
  Weitere: 'neck',
};

export function ExercisePicker({ visible, onClose, onPick, exclude = [] }: Props) {
  const store = useStore();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [group, setGroup] = useState<string>('Brust');
  const [repsOnly, setRepsOnly] = useState<'weight' | 'reps'>('weight');

  const results = useMemo(
    () => searchExercises(query, 50).filter((e) => !exclude.includes(e.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, exclude.join('|'), visible],
  );

  const createCustom = async () => {
    if (name.trim().length === 0) return;
    const created = newCustomExercise(name, null, GROUP_TO_MUSCLE[group] ?? 'neck', repsOnly === 'reps');
    await saveCustomExercises(store, [...getCustomExercises(), created]);
    const def = exerciseDefinition(created.id);
    setCreating(false);
    setName('');
    if (def) onPick(def);
  };

  return (
    <Sheet visible={visible} title={creating ? 'Eigene Übung' : 'Übung wählen'} onClose={onClose}>
      {creating ? (
        <>
          <Field label="Name" value={name} onChangeText={setName} placeholder="z. B. Kabel-Rudern einarmig" />
          <Text style={styles.label}>MUSKELGRUPPE</Text>
          <View style={styles.chips}>
            {MUSCLE_GROUPS.map((g) => (
              <Pressable key={g} onPress={() => setGroup(g)} style={[styles.chip, group === g && styles.chipActive]}>
                <Text style={[styles.chipText, group === g && { color: '#000' }]}>{g}</Text>
              </Pressable>
            ))}
          </View>
          <Segmented
            options={[
              { value: 'weight', label: 'Mit Gewicht' },
              { value: 'reps', label: 'Nur Wiederholungen' },
            ]}
            value={repsOnly}
            onChange={setRepsOnly}
          />
          <Button label="Übung anlegen" variant="primary" disabled={name.trim().length === 0} onPress={createCustom} />
          <Button label="Zurück zur Suche" onPress={() => setCreating(false)} />
        </>
      ) : (
        <>
          <Field label="Suche" value={query} onChangeText={setQuery} placeholder="Deutsch oder Englisch, z. B. Kniebeuge" autoCorrect={false} />
          <Button label="Eigene Übung anlegen" onPress={() => setCreating(true)} />
          {results.length === 0 ? <Muted>Keine Treffer.</Muted> : null}
          {results.map((e) => (
            <Pressable key={e.id} onPress={() => onPick(e)} style={styles.result}>
              <Text style={styles.resultName}>{e.name}</Text>
              <Muted>
                {e.group} · {e.equipment}
                {e.isCustom ? ' · eigene' : ''}
              </Muted>
            </Pressable>
          ))}
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 0.8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.card },
  chipActive: { backgroundColor: colors.accent },
  chipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  result: { backgroundColor: colors.card, borderRadius: 14, padding: 14, gap: 2 },
  resultName: { color: colors.text, fontSize: 16, fontWeight: '600' },
});
