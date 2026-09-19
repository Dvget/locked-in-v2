import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';

import { Card } from '../components/Card';
import { LineChart } from '../components/charts';
import { Screen } from '../components/Screen';
import { Button, Heading, Muted, Row, SectionLabel } from '../components/ui';
import { useStore } from '../data/store';
import { computeAchievements, formatPace } from '../domain/achievements';
import { paceSecondsPerKm } from '../domain/analytics';
import { exerciseName, isRepsOnlyExercise } from '../domain/exercises';
import { buildExerciseHistory } from '../domain/progress';
import { computeSplits, type Split } from '../domain/running';
import { progressText, stableExerciseID, workoutProgress } from '../domain/strength';
import { formatClock, workoutVolume } from '../domain/workoutSession';
import { saveAndShareText } from '../native/files';
import { runToGpx } from '../domain/gpx';
import { colors } from '../theme';
import type { RootStackParamList } from '../types/navigation';

const fmt = (ms: number) =>
  new Date(ms).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
const cleanWeight = (w: number) => String(Math.round(w * 100) / 100).replace('.', ',');

function confirmDelete(title: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(title)) onConfirm();
    return;
  }
  Alert.alert(title, 'Das lässt sich nicht rückgängig machen.', [
    { text: 'Abbrechen', style: 'cancel' },
    { text: 'Löschen', style: 'destructive', onPress: onConfirm },
  ]);
}

// ---------------------------------------------------------------- workout

export function WorkoutDetailScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'WorkoutDetail'>) {
  const store = useStore();
  const { data } = store;
  const workout = data.workouts.find((w) => w.id === route.params.workoutId);
  const sets = useMemo(() => data.sets.filter((s) => s.workoutID === route.params.workoutId), [data.sets, route.params.workoutId]);
  const earned = useMemo(
    () => computeAchievements(data.workouts, data.sets, data.runs).filter((a) => a.id.includes(route.params.workoutId)),
    [data],
  );
  if (!workout) return <Screen><Muted>Training nicht gefunden.</Muted></Screen>;

  const groups = new Map<string, typeof sets>();
  for (const s of sets.slice().sort((a, b) => a.planSlot - b.planSlot || a.setNumber - b.setNumber)) {
    const key = `${s.planSlot}|${stableExerciseID(s.exerciseID)}`;
    const list = groups.get(key);
    if (list) list.push(s);
    else groups.set(key, [s]);
  }
  const index = workoutProgress(workout, data.workouts, data.sets, isRepsOnlyExercise);

  return (
    <Screen>
      <Heading>{fmt(workout.startedAt)}</Heading>
      <Card>
        <Text style={{ color: colors.text, fontSize: 15 }}>{workout.planName ?? 'Training'}</Text>
        <Muted>
          {formatClock(((workout.endedAt ?? workout.startedAt) - workout.startedAt) / 1000)} · Volumen {Math.round(workoutVolume(sets)).toLocaleString('de-DE')} kg · Index {progressText(index)}
        </Muted>
      </Card>
      {earned.length > 0 ? (
        <Card>
          <SectionLabel color={colors.accent}>Bestwerte</SectionLabel>
          {earned.map((a) => (
            <Text key={a.id} style={{ color: colors.text, fontSize: 15 }}>{a.title}: {a.value}</Text>
          ))}
        </Card>
      ) : null}
      {[...groups.entries()].map(([key, list]) => {
        const id = list[0].exerciseID;
        const repsOnly = isRepsOnlyExercise(id);
        return (
          <Card key={key}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{exerciseName(id, list[0].exerciseName)}</Text>
            {list.map((s) => (
              <Muted key={s.id}>
                Satz {s.setNumber}: {s.reps === 0 ? 'übersprungen' : repsOnly ? `${s.reps} Wdh.` : `${cleanWeight(s.weight)} kg × ${s.reps}`}
              </Muted>
            ))}
          </Card>
        );
      })}
      <Button label={workout.isHidden ? 'Wieder einblenden' : 'Ausblenden'} onPress={() => store.saveWorkout({ ...workout, isHidden: !workout.isHidden })} />
      <Button
        label="Training löschen"
        variant="danger"
        onPress={() =>
          confirmDelete('Training löschen?', async () => {
            await store.deleteWorkout(workout.id);
            navigation.goBack();
          })
        }
      />
    </Screen>
  );
}

// ---------------------------------------------------------------- run

export function RunDetailScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'RunDetail'>) {
  const store = useStore();
  const run = store.data.runs.find((r) => r.id === route.params.runId);
  const [splits, setSplits] = useState<Split[]>([]);
  const [hasRoute, setHasRoute] = useState(false);

  useEffect(() => {
    let alive = true;
    store.getTrackPoints(route.params.runId).then((points) => {
      if (!alive) return;
      setSplits(computeSplits(points));
      setHasRoute(points.some((p) => p.accepted));
    });
    return () => {
      alive = false;
    };
  }, [store, route.params.runId]);

  if (!run) return <Screen><Muted>Lauf nicht gefunden.</Muted></Screen>;
  const earned = computeAchievements(store.data.workouts, store.data.sets, store.data.runs).filter((a) => a.id.includes(run.id));

  return (
    <Screen>
      <Heading>{fmt(run.date)}</Heading>
      <Card>
        <Text style={{ color: colors.running, fontSize: 28, fontWeight: '700' }}>{run.distanceKm.toFixed(2).replace('.', ',')} km</Text>
        <Muted>
          {formatClock(run.durationSeconds)} · {formatPace(paceSecondsPerKm(run))}
        </Muted>
        <Muted>Höhenmeter: –</Muted>
      </Card>
      {earned.length > 0 ? (
        <Card>
          <SectionLabel color={colors.running}>Bestwerte</SectionLabel>
          {earned.map((a) => (
            <Text key={a.id} style={{ color: colors.text, fontSize: 15 }}>{a.title}: {a.value}</Text>
          ))}
        </Card>
      ) : null}
      {splits.length > 0 ? (
        <Card>
          <SectionLabel color={colors.running}>Kilometer-Splits</SectionLabel>
          <LineChart
            color={colors.running}
            height={110}
            points={splits.map((s) => ({ x: s.index, y: s.paceSecondsPerKm, label: `km ${s.index}` }))}
            format={(y) => formatPace(y)}
          />
          {splits.map((s) => (
            <Row key={s.index} style={{ paddingVertical: 8, backgroundColor: 'transparent', padding: 0 }}>
              <Text style={{ color: colors.textMuted, fontSize: 14 }}>{s.partial ? `${s.distanceKm.toFixed(2).replace('.', ',')} km` : `km ${s.index}`}</Text>
              <Text style={{ color: colors.text, fontSize: 14, fontVariant: ['tabular-nums'] }}>{formatPace(s.paceSecondsPerKm)}</Text>
            </Row>
          ))}
        </Card>
      ) : null}
      {hasRoute ? (
        <Button
          label="Als GPX exportieren"
          onPress={async () => {
            const gpx = runToGpx(run, await store.getTrackPoints(run.id));
            if (gpx) await saveAndShareText(`Lauf-${new Date(run.date).toISOString().slice(0, 10)}.gpx`, gpx, 'application/gpx+xml');
          }}
        />
      ) : null}
      <Button label={run.isHidden ? 'Wieder einblenden' : 'Ausblenden'} onPress={() => store.saveRun({ ...run, isHidden: !run.isHidden })} />
      <Button
        label="Lauf löschen"
        variant="danger"
        onPress={() =>
          confirmDelete('Lauf löschen?', async () => {
            await store.deleteRun(run.id);
            navigation.goBack();
          })
        }
      />
    </Screen>
  );
}

// ---------------------------------------------------------------- exercise stats

export function ExerciseStatsScreen({ route }: NativeStackScreenProps<RootStackParamList, 'ExerciseStats'>) {
  const { data } = useStore();
  const id = route.params.exerciseId;
  const repsOnly = isRepsOnlyExercise(id);
  const history = useMemo(() => buildExerciseHistory(id, data), [id, data]);
  const bestEver = history.reduce<(typeof history)[number] | null>(
    (best, s) => (!best || (s.estimatedStrengthKg ?? 0) > (best.estimatedStrengthKg ?? 0) ? s : best),
    null,
  );

  return (
    <Screen>
      <Heading>{exerciseName(id)}</Heading>
      <Card>
        <SectionLabel>{repsOnly ? 'Wiederholungen gesamt pro Training' : 'Geschätzte Kraft pro Training'}</SectionLabel>
        <LineChart
          points={history.map((s) => ({
            x: s.date,
            y: repsOnly ? s.totalReps : (s.estimatedStrengthKg ?? 0),
            label: new Date(s.date).toLocaleDateString('de-DE'),
          }))}
          format={(y) => (repsOnly ? `${Math.round(y)} Wdh.` : `${cleanWeight(Math.round(y * 10) / 10)} kg`)}
          emptyText="Noch keine Daten."
        />
      </Card>
      {!repsOnly && bestEver?.best ? (
        <Card>
          <SectionLabel color={colors.accent}>Bester Satz</SectionLabel>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>
            {cleanWeight(bestEver.best.weightKg)} kg × {bestEver.best.reps}
          </Text>
          <Muted>{new Date(bestEver.date).toLocaleDateString('de-DE')}</Muted>
        </Card>
      ) : null}
      <SectionLabel>Trainings</SectionLabel>
      {history
        .slice()
        .reverse()
        .map((s) => (
          <Row key={s.workoutID}>
            <Text style={{ color: colors.text, fontSize: 14 }}>{new Date(s.date).toLocaleDateString('de-DE')}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>
              {repsOnly ? `${s.totalReps} Wdh.` : s.best ? `${cleanWeight(s.best.weightKg)} kg × ${s.best.reps}` : '–'}
            </Text>
          </Row>
        ))}
    </Screen>
  );
}

// ---------------------------------------------------------------- achievements (D-029)

export function AchievementsScreen() {
  const { data } = useStore();
  const list = useMemo(
    () => computeAchievements(data.workouts, data.sets, data.runs).slice().reverse(),
    [data],
  );
  return (
    <Screen>
      <Heading>Bestwerte</Heading>
      {list.length === 0 ? <Muted>Noch keine Bestwerte. Sie erscheinen nur, wenn du wirklich etwas übertriffst.</Muted> : null}
      {list.map((a) => (
        <Row key={a.id}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{a.title}</Text>
            <Muted>{new Date(a.date).toLocaleDateString('de-DE')}</Muted>
          </View>
          <Text style={{ color: a.kind === 'strength' ? colors.accent : colors.running, fontSize: 16, fontWeight: '600' }}>{a.value}</Text>
        </Row>
      ))}
    </Screen>
  );
}
