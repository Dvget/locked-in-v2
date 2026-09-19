import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { Button, Heading, Muted, Row, SectionLabel } from '../../components/ui';
import { useStore } from '../../data/store';
import { exerciseName } from '../../domain/exercises';
import { startSession, suggestedPlanID, type WorkoutSessionState } from '../../domain/workoutSession';
import type { WorkoutRecord } from '../../domain/types';
import { colors } from '../../theme';

type Props = {
  onStart: (workout: WorkoutRecord, state: WorkoutSessionState) => void;
  onManagePlans: () => void;
};

export function PlanPicker({ onStart, onManagePlans }: Props) {
  const { data, settings } = useStore();
  const suggested = useMemo(
    () => suggestedPlanID(data.plans, data.workouts, data.lastCompletedPlanID),
    [data.plans, data.workouts, data.lastCompletedPlanID],
  );
  const [selected, setSelected] = useState<string | null>(null);
  const planID = selected ?? suggested ?? data.plans[0]?.id ?? null;
  const plan = data.plans.find((p) => p.id === planID) ?? null;

  if (data.plans.length === 0) {
    return (
      <Screen>
        <Heading>Workout</Heading>
        <Card title="Noch kein Trainingsplan" description="Lege zuerst einen Plan an, dann kannst du ein Workout starten.">
          <Button label="Trainingspläne öffnen" onPress={onManagePlans} variant="primary" style={{ marginTop: 12 }} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Heading>Welches Training?</Heading>
      {data.plans.map((p) => {
        const active = p.id === planID;
        return (
          <Row
            key={p.id}
            onPress={() => setSelected(p.id)}
            style={active ? { borderWidth: 1, borderColor: colors.accent } : { borderWidth: 1, borderColor: 'transparent' }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.planName}>{p.name}</Text>
              <Muted>
                {p.entries.length} Übungen · {p.weeklyFrequency}× pro Woche
                {p.id === suggested ? ' · Vorschlag' : ''}
              </Muted>
            </View>
            {active ? <Text style={styles.check}>✓</Text> : null}
          </Row>
        );
      })}

      {plan ? (
        <Card>
          <SectionLabel>Übungen</SectionLabel>
          {plan.entries.map((e, i) => (
            <Text key={e.id} style={styles.entry}>
              {i + 1}. {exerciseName(e.exerciseID)} · {e.sets} Sätze
            </Text>
          ))}
        </Card>
      ) : null}

      <Button
        label="Workout starten"
        variant="primary"
        disabled={!plan || plan.entries.length === 0}
        onPress={() => {
          if (!plan) return;
          const session = startSession(plan, settings.manualBodyWeightKg);
          onStart(session.workout, session.state);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  planName: { color: colors.text, fontSize: 17, fontWeight: '600' },
  check: { color: colors.accent, fontSize: 20, fontWeight: '700' },
  entry: { color: colors.text, fontSize: 14, paddingVertical: 2 },
});
