import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';

import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { Button, Muted, SectionLabel, Sheet, Stepper } from '../../components/ui';
import { useStore } from '../../data/store';
import { newId } from '../../domain/dates';
import { exerciseDefinition, exerciseName, isRepsOnlyExercise } from '../../domain/exercises';
import { workoutProgress, progressText } from '../../domain/strength';
import { computeAchievements } from '../../domain/achievements';
import type { SetRecord, WorkoutRecord } from '../../domain/types';
import {
  ACTIVE_WORKOUT_KEY,
  chosenExercise,
  finishWorkout,
  formatClock,
  optionsForEntry,
  previousSetsFor,
  progressionHint,
  remainingSeconds,
  restSecondsFor,
  setsForSlot,
  slotProgress,
  suggestInputs,
  weightStepFor,
  workoutVolume,
  type WorkoutSessionState,
} from '../../domain/workoutSession';
import { cancelNotification, scheduleRestNotification, speak, success, tap } from '../../native/feedback';
import { colors } from '../../theme';
import { useNow } from './useNow';

type Props = {
  workout: WorkoutRecord;
  state: WorkoutSessionState;
  onState: (next: WorkoutSessionState) => void;
  onExit: () => void;
};

const cleanWeight = (w: number) => String(Math.round(w * 100) / 100).replace('.', ',');

function confirm(title: string, message: string, action: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (typeof window !== 'undefined' && window.confirm(`${title}\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Zurück', style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ]);
}

export function ActiveWorkout({ workout, state, onState, onExit }: Props) {
  useKeepAwake();
  const store = useStore();
  const { data, settings } = store;
  const now = useNow(500);
  const notificationId = useRef<string | null>(null);

  const slotIndex = Math.min(state.slotIndex, state.plan.entries.length - 1);
  const entry = state.plan.entries[slotIndex];
  const exerciseID = chosenExercise(state, slotIndex);
  const definition = exerciseDefinition(exerciseID);
  const repsOnly = definition?.repsOnly ?? isRepsOnlyExercise(exerciseID);
  const name = definition?.name ?? exerciseName(exerciseID);

  const workoutSets = useMemo(() => data.sets.filter((s) => s.workoutID === workout.id), [data.sets, workout.id]);
  const currentSets = useMemo(
    () => setsForSlot(workoutSets, workout.id, slotIndex, exerciseID),
    [workoutSets, workout.id, slotIndex, exerciseID],
  );
  const previous = useMemo(
    () => previousSetsFor(exerciseID, workout.id, data.workouts, data.sets),
    [exerciseID, workout.id, data.workouts, data.sets],
  );
  const step = weightStepFor(entry, exerciseID);
  const hint = progressionHint(previous, entry, settings, step, repsOnly);
  const targetSets = entry.sets;
  const restSeconds = restSecondsFor(entry, slotIndex, settings);

  const [weight, setWeight] = useState(0);
  const [reps, setReps] = useState(8);
  const [editing, setEditing] = useState<SetRecord | null>(null);
  const [overview, setOverview] = useState(false);
  const [picker, setPicker] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [summary, setSummary] = useState<WorkoutRecord | null>(null);

  // Suggested values follow the slot / chosen exercise (not every saved set).
  const suggestionKey = `${slotIndex}|${exerciseID}`;
  useEffect(() => {
    const s = suggestInputs(previous, currentSets.length, entry, exerciseID, repsOnly);
    setWeight(s.weight);
    setReps(s.reps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestionKey]);

  // Rest timer: wall-clock based, so it survives backgrounding and app restarts.
  const remaining = remainingSeconds(state.timerEndsAt, now);
  const timerRunning = state.timerEndsAt !== null && remaining > 0;
  useEffect(() => {
    if (state.timerEndsAt !== null && now >= state.timerEndsAt) {
      onState({ ...state, timerEndsAt: null });
      success();
      if (settings.restAudioEnabled) speak('Pause vorbei');
    }
  }, [now, state, onState, settings.restAudioEnabled]);

  const setTimer = (endsAt: number | null) => {
    cancelNotification(notificationId.current);
    notificationId.current = null;
    onState({ ...state, timerEndsAt: endsAt });
    if (endsAt !== null && settings.restAudioEnabled) {
      scheduleRestNotification((endsAt - Date.now()) / 1000).then((id) => {
        notificationId.current = id;
      });
    }
  };

  const goTo = (index: number) => {
    cancelNotification(notificationId.current);
    onState({ ...state, slotIndex: index, timerEndsAt: null });
    setOverview(false);
  };

  const saveSet = async (repsOverride?: number) => {
    const record: SetRecord = {
      id: newId(),
      workoutID: workout.id,
      exerciseID,
      exerciseName: name,
      planSlot: slotIndex + 1,
      setNumber: currentSets.length + 1,
      weight: repsOnly ? 0 : weight,
      reps: repsOverride ?? reps,
      rir: null,
      completedAt: Date.now(),
    };
    tap();
    await store.saveSet(record);
    setTimer(Date.now() + restSeconds * 1000);
  };

  const removeSet = async (set: SetRecord) => {
    await store.deleteSet(set.id);
    const rest = currentSets.filter((s) => s.id !== set.id);
    for (let i = 0; i < rest.length; i++) {
      if (rest[i].setNumber !== i + 1) await store.saveSet({ ...rest[i], setNumber: i + 1 });
    }
    setEditing(null);
  };

  const advance = () => {
    if (slotIndex >= state.plan.entries.length - 1) setFinishing(true);
    else goTo(slotIndex + 1);
  };

  const abort = () =>
    confirm('Training abbrechen?', 'Das laufende Training und alle gespeicherten Sätze werden gelöscht.', 'Training löschen', async () => {
      cancelNotification(notificationId.current);
      await store.deleteWorkout(workout.id);
      await store.setKV(ACTIVE_WORKOUT_KEY, null);
      onExit();
    });

  const complete = async () => {
    const finished = finishWorkout(workout, state, Date.now());
    cancelNotification(notificationId.current);
    await store.saveWorkout(finished);
    await store.markPlanCompleted(state.plan.id);
    await store.setKV(ACTIVE_WORKOUT_KEY, null);
    success();
    setFinishing(false);
    setSummary(finished);
  };

  const elapsed = Math.floor((now - workout.startedAt) / 1000);
  const allDone = currentSets.length >= targetSets;
  const isLast = slotIndex >= state.plan.entries.length - 1;
  const alternatives = optionsForEntry(entry);
  const weightColor = hint !== null ? (weight < hint ? colors.warn : colors.good) : colors.text;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.sub}>
            Übung {slotIndex + 1} von {state.plan.entries.length} · {formatClock(elapsed)}
          </Text>
        </View>
        <Pressable accessibilityLabel="Übungen" onPress={() => setOverview(true)} style={styles.iconButton}>
          <Text style={styles.iconText}>≡</Text>
        </Pressable>
      </View>

      <Card>
        <SectionLabel>Pause</SectionLabel>
        <Text style={[styles.clock, timerRunning && { color: colors.accent }]}>
          {formatClock(timerRunning ? remaining : restSeconds)}
        </Text>
        <View style={styles.timerButtons}>
          <SmallButton label="−30" onPress={() => adjust(-30)} />
          <SmallButton label={timerRunning ? 'Überspringen' : 'Start'} onPress={() => setTimer(timerRunning ? null : Date.now() + restSeconds * 1000)} />
          <SmallButton label="+30" onPress={() => adjust(30)} />
        </View>
      </Card>

      <Card>
        <SectionLabel>Letztes Mal</SectionLabel>
        {previous.length === 0 ? (
          <Muted>Noch keine Vergleichsdaten für diese Übung.</Muted>
        ) : (
          previous.map((s, i) => {
            const active = i === Math.min(currentSets.length, previous.length - 1);
            return (
              <Text key={s.id} style={[styles.prevRow, active && { color: colors.text, fontWeight: '600' }]}>
                Satz {s.setNumber}: {repsOnly ? `${s.reps} Wdh.` : `${cleanWeight(s.weight)} kg × ${s.reps}`}
              </Text>
            );
          })
        )}
        {hint !== null ? (
          <Text style={[styles.hint, { color: colors.good }]}>Bereit für {cleanWeight(hint)} kg</Text>
        ) : null}
      </Card>

      <View style={styles.inputs}>
        {!repsOnly ? (
          <Stepper
            title="Gewicht"
            value={cleanWeight(weight)}
            unit="kg"
            color={weightColor}
            onMinus={() => setWeight(Math.max(0, Math.round((weight - step) * 100) / 100))}
            onPlus={() => {
              setWeight(Math.round((weight + step) * 100) / 100);
              if (hint !== null) setReps(settings.repRangeMin);
            }}
          />
        ) : null}
        <Stepper
          title="Wiederholungen"
          value={String(reps)}
          unit="Wdh."
          onMinus={() => setReps(Math.max(0, reps - 1))}
          onPlus={() => setReps(reps + 1)}
        />
      </View>

      {allDone ? (
        <Button label={isLast ? 'Training abschließen' : 'Weiter zur nächsten Übung'} variant="primary" onPress={advance} />
      ) : (
        <>
          <Button label={`Satz ${currentSets.length + 1} speichern`} variant="primary" onPress={() => saveSet()} />
          <Button label="Satz überspringen · 0 Wiederholungen" onPress={() => saveSet(0)} />
        </>
      )}

      {currentSets.length > 0 ? (
        <Card>
          <SectionLabel color={colors.accent}>Heutige Sätze</SectionLabel>
          {currentSets.map((s) => (
            <Pressable key={s.id} onPress={() => setEditing(s)} style={styles.setRow}>
              <Text style={styles.setText}>
                Satz {s.setNumber}: {s.reps === 0 ? 'übersprungen' : repsOnly ? `${s.reps} Wdh.` : `${cleanWeight(s.weight)} kg × ${s.reps}`}
              </Text>
              <Text style={styles.edit}>Bearbeiten</Text>
            </Pressable>
          ))}
        </Card>
      ) : null}

      <View style={styles.footer}>
        {alternatives.length > 1 ? <Button label="Übung wechseln" onPress={() => setPicker(true)} style={{ flex: 1 }} /> : null}
        {slotIndex > 0 ? <Button label="Zurück" onPress={() => goTo(slotIndex - 1)} style={{ flex: 1 }} /> : null}
        {!allDone && !isLast ? <Button label="Übung überspringen" onPress={advance} style={{ flex: 1 }} /> : null}
      </View>
      <Button label="Training abbrechen" variant="danger" onPress={abort} />

      {/* Exercise overview: skip, revisit and jump (D-021) */}
      <Sheet visible={overview} title="Übungen" onClose={() => setOverview(false)}>
        {slotProgress(state, workoutSets).map((p) => (
          <Pressable key={p.index} onPress={() => goTo(p.index)} style={[styles.overviewRow, p.index === slotIndex && { borderColor: colors.accent }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.setText}>{exerciseName(p.exerciseID)}</Text>
              <Muted>
                {p.done} von {p.planned} Sätzen
              </Muted>
            </View>
            <Text style={[styles.edit, p.done >= p.planned && { color: colors.good }]}>{p.done >= p.planned ? '✓' : p.done > 0 ? '…' : ''}</Text>
          </Pressable>
        ))}
        <Button label="Training abschließen" variant="primary" onPress={() => { setOverview(false); setFinishing(true); }} />
      </Sheet>

      {/* Alternatives keep their own history (D-022) */}
      <Sheet visible={picker} title="Übung wechseln" onClose={() => setPicker(false)}>
        {alternatives
          .filter((id) => !state.plan.entries.some((_, i) => i !== slotIndex && chosenExercise(state, i) === id))
          .map((id) => (
            <Pressable
              key={id}
              style={[styles.overviewRow, id === exerciseID && { borderColor: colors.accent }]}
              onPress={() => {
                onState({ ...state, chosen: { ...state.chosen, [slotIndex]: id } });
                setPicker(false);
              }}
            >
              <Text style={styles.setText}>{exerciseName(id)}</Text>
              {id === exerciseID ? <Text style={styles.edit}>✓</Text> : null}
            </Pressable>
          ))}
      </Sheet>

      <EditSetSheet
        set={editing}
        repsOnly={repsOnly}
        step={step}
        onClose={() => setEditing(null)}
        onSave={async (s) => {
          await store.saveSet(s);
          setEditing(null);
        }}
        onDelete={removeSet}
      />

      <Sheet visible={finishing} title="Training abschließen?" onClose={() => setFinishing(false)}>
        <Card>
          <Text style={styles.setText}>Dauer {formatClock(elapsed)}</Text>
          <Text style={styles.setText}>{workoutSets.filter((s) => s.reps > 0).length} Sätze</Text>
          <Text style={styles.setText}>Volumen {Math.round(workoutVolume(workoutSets)).toLocaleString('de-DE')} kg</Text>
        </Card>
        <Button label="Abschließen" variant="primary" onPress={complete} />
        <Button label="Zurück zum Training" onPress={() => setFinishing(false)} />
      </Sheet>

      <SummarySheet workout={summary} onDone={onExit} />
    </Screen>
  );

  function adjust(delta: number) {
    if (timerRunning && state.timerEndsAt !== null) {
      const next = state.timerEndsAt + delta * 1000;
      setTimer(next <= Date.now() ? null : next);
    }
  }
}

function SmallButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.small}>
      <Text style={styles.smallText}>{label}</Text>
    </Pressable>
  );
}

function EditSetSheet({
  set,
  repsOnly,
  step,
  onClose,
  onSave,
  onDelete,
}: {
  set: SetRecord | null;
  repsOnly: boolean;
  step: number;
  onClose: () => void;
  onSave: (s: SetRecord) => void;
  onDelete: (s: SetRecord) => void;
}) {
  const [weight, setWeight] = useState(0);
  const [reps, setReps] = useState(0);
  useEffect(() => {
    if (set) {
      setWeight(set.weight);
      setReps(set.reps);
    }
  }, [set]);
  return (
    <Sheet visible={set !== null} title={set ? `Satz ${set.setNumber} bearbeiten` : ''} onClose={onClose}>
      <View style={styles.inputs}>
        {!repsOnly ? (
          <Stepper
            title="Gewicht"
            value={cleanWeight(weight)}
            unit="kg"
            onMinus={() => setWeight(Math.max(0, Math.round((weight - step) * 100) / 100))}
            onPlus={() => setWeight(Math.round((weight + step) * 100) / 100)}
          />
        ) : null}
        <Stepper title="Wiederholungen" value={String(reps)} unit="Wdh." onMinus={() => setReps(Math.max(0, reps - 1))} onPlus={() => setReps(reps + 1)} />
      </View>
      <Button label="Speichern" variant="primary" onPress={() => set && onSave({ ...set, weight: repsOnly ? 0 : weight, reps })} />
      <Button label="Satz löschen" variant="danger" onPress={() => set && onDelete(set)} />
    </Sheet>
  );
}

function SummarySheet({ workout, onDone }: { workout: WorkoutRecord | null; onDone: () => void }) {
  const { data } = useStore();
  const info = useMemo(() => {
    if (!workout) return null;
    const sets = data.sets.filter((s) => s.workoutID === workout.id);
    const index = workoutProgress(workout, data.workouts, data.sets, isRepsOnlyExercise);
    const earned = computeAchievements(data.workouts, data.sets, data.runs).filter((a) => a.id.includes(workout.id));
    return {
      duration: ((workout.endedAt ?? workout.startedAt) - workout.startedAt) / 1000,
      sets: sets.filter((s) => s.reps > 0).length,
      volume: workoutVolume(sets),
      index,
      earned,
    };
  }, [workout, data]);
  return (
    <Sheet visible={workout !== null} title="Training geschafft" onClose={onDone}>
      {info ? (
        <>
          <Card>
            <Text style={styles.setText}>Dauer {formatClock(info.duration)}</Text>
            <Text style={styles.setText}>{info.sets} Sätze · {Math.round(info.volume).toLocaleString('de-DE')} kg Volumen</Text>
            <Text style={styles.setText}>Trainings-Index {progressText(info.index)}</Text>
            {info.index === null ? <Muted>Noch kein Vergleich möglich.</Muted> : null}
          </Card>
          {info.earned.length > 0 ? (
            <Card>
              <SectionLabel color={colors.accent}>Neue Bestwerte</SectionLabel>
              {info.earned.map((a) => (
                <Text key={a.id} style={styles.setText}>
                  {a.title}: {a.value}
                </Text>
              ))}
            </Card>
          ) : null}
        </>
      ) : null}
      <Button label="Fertig" variant="primary" onPress={onDone} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  sub: { color: colors.accent, fontSize: 14, fontWeight: '600', marginTop: 2 },
  iconButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: colors.text, fontSize: 22 },
  clock: { color: colors.text, fontSize: 44, fontWeight: '700', fontVariant: ['tabular-nums'], textAlign: 'center', paddingVertical: 4 },
  timerButtons: { flexDirection: 'row', gap: 8 },
  small: { flex: 1, height: 42, borderRadius: 12, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' },
  smallText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  prevRow: { color: colors.textMuted, fontSize: 14, paddingVertical: 2 },
  hint: { fontSize: 13, fontWeight: '600', marginTop: 6 },
  inputs: { flexDirection: 'row', gap: 12 },
  setRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  setText: { color: colors.text, fontSize: 15 },
  edit: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  footer: { flexDirection: 'row', gap: 8 },
  overviewRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: 'transparent',
  },
});
