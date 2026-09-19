import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { Button, Heading, Muted, Row, SectionLabel } from '../../components/ui';
import { useStore } from '../../data/store';
import { PLAN_HISTORY_KEY, parseHistory, type PlanSnapshot } from '../../domain/planHistory';
import { colors } from '../../theme';
import type { RootStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'TrainingPlans'>;

function ask(title: string, message: string, action: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Abbrechen', style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ]);
}

const formatDate = (ms: number) =>
  new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

export function TrainingPlansScreen({ navigation }: Props) {
  const store = useStore();
  const [history, setHistory] = useState<PlanSnapshot[]>([]);

  useEffect(() => {
    store.getKV(PLAN_HISTORY_KEY).then((raw) => setHistory(parseHistory(raw)));
  }, [store, store.data.plans]);

  return (
    <Screen>
      <Heading>Trainingspläne</Heading>
      {store.data.plans.length === 0 ? <Muted>Noch kein Plan angelegt.</Muted> : null}
      {store.data.plans.map((plan) => (
        <Row key={plan.id} onPress={() => navigation.navigate('PlanEditor', { planId: plan.id })}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>{plan.name}</Text>
            <Muted>
              {plan.entries.length} Übungen · {plan.weeklyFrequency}× pro Woche
              {plan.workoutType ? ` · ${plan.workoutType}` : ''}
            </Muted>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 20 }}>›</Text>
        </Row>
      ))}
      <Button label="Neuer Plan" variant="primary" onPress={() => navigation.navigate('PlanEditor', { planId: null })} />

      {history.length > 0 ? (
        <>
          <SectionLabel>Verlauf (30 Tage)</SectionLabel>
          {history.map((snap) => (
            <Row key={snap.savedAt}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 15 }}>{formatDate(snap.savedAt)}</Text>
                <Muted>{snap.plans.map((p) => p.name).join(', ')}</Muted>
              </View>
              <Button
                label="Wiederherstellen"
                style={{ minHeight: 40 }}
                onPress={() =>
                  ask('Pläne wiederherstellen?', 'Die aktuellen Pläne werden ersetzt. Deine Trainingsdaten bleiben unberührt.', 'Wiederherstellen', () =>
                    store.restorePlans(snap.plans),
                  )
                }
              />
            </Row>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
