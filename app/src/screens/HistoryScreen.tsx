import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { Screen } from '../components/Screen';
import { Button, Field, Muted, Row, Sheet } from '../components/ui';
import { WeightEntrySheet } from '../components/WeightEntrySheet';
import { useStore } from '../data/store';
import { formatPace } from '../domain/achievements';
import { paceSecondsPerKm } from '../domain/analytics';
import { formatKgText } from '../domain/dashboard';
import { newId } from '../domain/dates';
import { isRepsOnlyExercise } from '../domain/exercises';
import { progressText, workoutProgress } from '../domain/strength';
import { formatClock } from '../domain/workoutSession';
import { colors } from '../theme';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

const fmt = (ms: number) =>
  new Date(ms).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });

export function HistoryScreen({ navigation, route }: Props) {
  const { kind } = route.params;
  const store = useStore();
  const { data } = store;
  const [showHidden, setShowHidden] = useState(false);
  const [entry, setEntry] = useState(false);

  const workouts = useMemo(
    () =>
      data.workouts
        .filter((w) => w.isCompleted && (showHidden || !w.isHidden))
        .sort((a, b) => b.startedAt - a.startedAt),
    [data.workouts, showHidden],
  );
  const runs = useMemo(
    () => data.runs.filter((r) => showHidden || !r.isHidden).sort((a, b) => b.date - a.date),
    [data.runs, showHidden],
  );
  const weights = useMemo(
    () => data.weights.filter((w) => showHidden || !w.isHidden).sort((a, b) => b.date - a.date),
    [data.weights, showHidden],
  );

  return (
    <Screen>
      {kind === 'workouts' ? (
        <>
          {workouts.length === 0 ? <Muted>Noch keine Trainings.</Muted> : null}
          {workouts.map((w) => {
            const sets = data.sets.filter((s) => s.workoutID === w.id && s.reps > 0).length;
            const index = workoutProgress(w, data.workouts, data.sets, isRepsOnlyExercise);
            return (
              <Row key={w.id} onPress={() => navigation.navigate('WorkoutDetail', { workoutId: w.id })} style={w.isHidden ? { opacity: 0.5 } : undefined}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{fmt(w.startedAt)}</Text>
                  <Muted>
                    {w.planName ?? 'Training'} · {sets} Sätze · {formatClock(((w.endedAt ?? w.startedAt) - w.startedAt) / 1000)}
                  </Muted>
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>{progressText(index)}</Text>
              </Row>
            );
          })}
        </>
      ) : null}

      {kind === 'runs' ? (
        <>
          <Button label="Lauf manuell eintragen" variant="primary" accent={colors.running} onPress={() => setEntry(true)} />
          {runs.length === 0 ? <Muted>Noch keine Läufe.</Muted> : null}
          {runs.map((r) => (
            <Row key={r.id} onPress={() => navigation.navigate('RunDetail', { runId: r.id })} style={r.isHidden ? { opacity: 0.5 } : undefined}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{fmt(r.date)}</Text>
                <Muted>
                  {r.distanceKm.toFixed(2).replace('.', ',')} km · {formatClock(r.durationSeconds)} · {formatPace(paceSecondsPerKm(r))}
                </Muted>
              </View>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>{r.source === 'manual' ? 'manuell' : 'GPS'}</Text>
            </Row>
          ))}
          <RunEntrySheet visible={entry} onClose={() => setEntry(false)} />
        </>
      ) : null}

      {kind === 'weights' ? (
        <>
          <Button label="Gewicht eintragen" variant="primary" onPress={() => setEntry(true)} />
          {weights.length === 0 ? <Muted>Noch kein Gewicht.</Muted> : null}
          {weights.map((w) => (
            <Row key={w.id} style={w.isHidden ? { opacity: 0.5 } : undefined}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{formatKgText(w.weightKg)} kg</Text>
                <Muted>{fmt(w.date)}</Muted>
              </View>
              <Button
                label={w.isHidden ? 'Einblenden' : 'Ausblenden'}
                style={{ minHeight: 40 }}
                onPress={() => store.saveWeight({ ...w, isHidden: !w.isHidden })}
              />
            </Row>
          ))}
          <WeightEntrySheet visible={entry} onClose={() => setEntry(false)} />
        </>
      ) : null}

      <Button label={showHidden ? 'Ausgeblendete verstecken' : 'Ausgeblendete anzeigen'} onPress={() => setShowHidden((v) => !v)} />
    </Screen>
  );
}

export function RunEntrySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const store = useStore();
  const [km, setKm] = useState('');
  const [minutes, setMinutes] = useState('');
  const distance = Number(km.replace(',', '.'));
  const duration = Number(minutes.replace(',', '.')) * 60;
  const valid = distance > 0 && distance < 500 && duration > 0 && duration < 86_400;
  return (
    <Sheet visible={visible} title="Lauf eintragen" onClose={onClose}>
      <Field label="Distanz in km" value={km} onChangeText={setKm} keyboardType="decimal-pad" placeholder="5,2" />
      <Field label="Dauer in Minuten" value={minutes} onChangeText={setMinutes} keyboardType="decimal-pad" placeholder="30" />
      <Button
        label="Speichern"
        variant="primary"
        accent={colors.running}
        disabled={!valid}
        onPress={async () => {
          const now = Date.now();
          await store.saveRun({
            id: newId(), date: now, distanceKm: distance, durationSeconds: Math.round(duration), source: 'manual',
            isHidden: false, startTime: null, elevationGainMeters: null, elevationLossMeters: null,
            pausedDurationSeconds: null, algorithmVersion: null,
          });
          setKm('');
          setMinutes('');
          onClose();
        }}
      />
    </Sheet>
  );
}
