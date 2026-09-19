import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '../../components/Card';
import { PlayIcon } from '../../components/icons';
import { Screen } from '../../components/Screen';
import { Button, Muted, Sheet } from '../../components/ui';
import { useStore } from '../../data/store';
import { exerciseName } from '../../domain/exercises';
import { optionsForEntry, startSession, suggestedPlanID, type WorkoutSessionState } from '../../domain/workoutSession';
import type { WorkoutRecord } from '../../domain/types';
import { colors } from '../../theme';

type Props = {
  onStart: (workout: WorkoutRecord, state: WorkoutSessionState) => void;
  onManagePlans: () => void;
};

// Legacy "Dein Plan": wordmark, plan menu, one card per exercise (green number badge, set count, swap menu),
// fixed orange start button at the bottom.
export function PlanPicker({ onStart, onManagePlans }: Props) {
  const { data, settings } = useStore();
  const suggested = useMemo(
    () => suggestedPlanID(data.plans, data.workouts, data.lastCompletedPlanID),
    [data.plans, data.workouts, data.lastCompletedPlanID],
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [chosen, setChosen] = useState<Record<number, string>>({});
  const [planMenu, setPlanMenu] = useState(false);
  const [swapSlot, setSwapSlot] = useState<number | null>(null);

  // Latest visible weight entry wins; the manual setting is the fallback.
  const latestWeight = data.weights.filter((w) => !w.isHidden && w.weightKg > 0).sort((a, b) => b.date - a.date)[0];
  const bodyWeightKg = latestWeight ? latestWeight.weightKg : settings.manualBodyWeightKg;
  const planID = selected ?? suggested ?? data.plans[0]?.id ?? null;
  const plan = data.plans.find((p) => p.id === planID) ?? null;

  const exerciseFor = (slot: number) => chosen[slot] ?? plan?.entries[slot]?.exerciseID ?? '';

  const start = () => {
    if (!plan) return;
    const ids = plan.entries.map((_, i) => exerciseFor(i));
    if (new Set(ids).size !== ids.length) {
      const message = 'Bitte jede Übung nur einmal pro Training auswählen.';
      if (Platform.OS === 'web') window.alert(message);
      else Alert.alert('Training nicht gestartet', message);
      return;
    }
    const session = startSession(plan, bodyWeightKg, Date.now(), chosen);
    onStart(session.workout, session.state);
  };

  if (data.plans.length === 0) {
    return (
      <Screen>
        <Card title="Dein Trainingsplan" description="Erstelle deinen ersten Plan in den Einstellungen.">
          <Button label="Trainingsplan erstellen" onPress={onManagePlans} variant="primary" style={{ marginTop: 12 }} />
        </Card>
      </Screen>
    );
  }

  return (
    <View style={styles.root}>
      <Screen padding={16} gap={12}>
        {data.plans.length > 1 ? (
          <Pressable onPress={() => setPlanMenu(true)} style={styles.planMenu}>
            <Text style={styles.planMenuText}>{plan?.name ?? 'Trainingsplan'}</Text>
            <Text style={styles.planMenuChevron}>⌄</Text>
          </Pressable>
        ) : (
          <Text style={styles.planTitle}>{plan?.name}</Text>
        )}

        {plan?.entries.map((entry, index) => {
          const id = exerciseFor(index);
          const hasAlternatives = optionsForEntry(entry).length > 1;
          return (
            <Card key={entry.id} style={styles.slot}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{index + 1}</Text>
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.slotName}>{exerciseName(id)}</Text>
                <Text style={styles.slotSets}>{entry.sets} Sätze</Text>
              </View>
              {hasAlternatives ? (
                <Pressable accessibilityLabel="Übung wechseln" onPress={() => setSwapSlot(index)} style={styles.swap}>
                  <Text style={styles.swapText}>⇄</Text>
                </Pressable>
              ) : null}
            </Card>
          );
        })}
        {plan && plan.entries.length === 0 ? <Muted>Dieser Plan hat noch keine Übungen.</Muted> : null}
        <View style={{ height: 90 }} />
      </Screen>

      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <Button
          label="Workout starten"
          variant="primary"
          height={58}
          icon={<PlayIcon color="#000" size={20} />}
          disabled={!plan || plan.entries.length === 0}
          onPress={start}
        />
      </SafeAreaView>

      <Sheet visible={planMenu} title="Trainingsplan" onClose={() => setPlanMenu(false)}>
        {data.plans.map((p) => (
          <Pressable
            key={p.id}
            style={[styles.option, p.id === planID && { borderColor: colors.good }]}
            onPress={() => {
              setSelected(p.id);
              setChosen({});
              setPlanMenu(false);
            }}
          >
            <Text style={styles.optionText}>{p.name}</Text>
            <Muted>
              {p.entries.length} Übungen · {p.weeklyFrequency}× pro Woche{p.id === suggested ? ' · Vorschlag' : ''}
            </Muted>
          </Pressable>
        ))}
      </Sheet>

      <Sheet visible={swapSlot !== null} title="Übung wechseln" onClose={() => setSwapSlot(null)}>
        {swapSlot !== null && plan
          ? optionsForEntry(plan.entries[swapSlot]).map((id) => (
              <Pressable
                key={id}
                style={[styles.option, id === exerciseFor(swapSlot) && { borderColor: colors.good }]}
                onPress={() => {
                  setChosen((c) => ({ ...c, [swapSlot]: id }));
                  setSwapSlot(null);
                }}
              >
                <Text style={styles.optionText}>
                  {id === exerciseFor(swapSlot) ? '✓ ' : ''}
                  {exerciseName(id)}
                </Text>
              </Pressable>
            ))
          : null}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  planTitle: { color: colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  planMenu: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  planMenuText: { color: colors.good, fontSize: 17, fontWeight: '600' },
  planMenuChevron: { color: colors.good, fontSize: 16 },
  slot: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(140, 219, 79, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.good, fontSize: 17, fontWeight: '600' },
  slotName: { color: colors.text, fontSize: 17, fontWeight: '600' },
  slotSets: { color: colors.textMuted, fontSize: 12 },
  swap: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  swapText: { color: colors.textMuted, fontSize: 20 },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  option: { backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'transparent', gap: 2 },
  optionText: { color: colors.text, fontSize: 16, fontWeight: '600' },
});
