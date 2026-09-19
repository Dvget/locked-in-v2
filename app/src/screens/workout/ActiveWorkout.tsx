import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useScreenAwake } from '../../native/useScreenAwake';

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
import { runAutoBackup } from '../../native/autoBackup';
import { cancelNotification, scheduleRestNotification, speak, success, tap } from '../../native/feedback';
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, EllipsisIcon, PencilIcon, ResetIcon, TrashIcon } from '../../components/icons';
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
  useScreenAwake();
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
  const [menu, setMenu] = useState(false);
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
    runAutoBackup(store);
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
    <Screen padding={16} gap={10}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.sub}>
            Übung {slotIndex + 1} von {state.plan.entries.length}
          </Text>
        </View>
        <Pressable accessibilityLabel="Menü" onPress={() => setMenu(true)} style={styles.iconButton}>
          <EllipsisIcon color={colors.text} />
        </Pressable>
      </View>

      <Card style={{ gap: 6 }}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Gesamtzeit</Text>
          <Text style={styles.totalValue}>{formatClock(elapsed)}</Text>
        </View>
        <View style={styles.timerBlock}>
          <Text style={styles.pauseLabel}>PAUSE</Text>
          <Text style={[styles.clock, timerRunning && { color: colors.accent }]}>
            {formatClock(timerRunning ? remaining : restSeconds)}
          </Text>
          <View style={styles.timerButtons}>
            <Button label="−30" onPress={() => adjust(-30)} style={styles.timerButton} />
            <Button
              label="Skip"
              variant="primary"
              onPress={() => (timerRunning ? setTimer(null) : setTimer(Date.now() + restSeconds * 1000))}
              style={styles.timerButton}
            />
            <Button
              label=""
              icon={<ResetIcon color={colors.text} />}
              onPress={() => setTimer(null)}
              style={styles.timerButton}
            />
            <Button label="+30" onPress={() => adjust(30)} style={styles.timerButton} />
          </View>
        </View>
      </Card>

      <Card style={{ gap: 12 }}>
        <SectionLabel color={colors.good}>Letztes Mal</SectionLabel>
        {previous.length === 0 ? (
          <Muted>Noch keine Daten für diese Variante</Muted>
        ) : (
          (() => {
            const targetNumber = Math.min(Math.max(currentSets.length + 1, 1), entry.sets);
            const target = previous.find((s) => s.setNumber === targetNumber) ?? previous[previous.length - 1];
            const line = (s: SetRecord) => (repsOnly ? `${s.reps} reps` : `${cleanWeight(s.weight)} kg × ${s.reps}`);
            return (
              <>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>Satz {target.setNumber} letztes Mal</Text>
                </View>
                <Text style={styles.prevMain}>{line(target)}</Text>
                <View style={styles.prevRowWrap}>
                  {previous.map((s) => {
                    const active = s.setNumber === targetNumber;
                    return (
                      <View key={s.id} style={styles.prevCell}>
                        <Text style={[styles.prevCellLabel, active && { color: colors.good }]}>Satz {s.setNumber}</Text>
                        <Text style={[styles.prevCellValue, active && { color: colors.good }]}>
                          {repsOnly ? String(s.reps) : `${cleanWeight(s.weight)} × ${s.reps}`}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </>
            );
          })()
        )}
        {hint !== null ? <Text style={[styles.hint, { color: colors.good }]}>Bereit für {cleanWeight(hint)} kg</Text> : null}
      </Card>

      <View style={styles.inputs}>
        {!repsOnly ? (
          <Stepper
            title="GEWICHT"
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
          title="WIEDERHOLUNGEN"
          value={String(reps)}
          unit="reps"
          onMinus={() => setReps(Math.max(0, reps - 1))}
          onPlus={() => setReps(reps + 1)}
        />
      </View>

      {/* Primary action: orange, 58 high, label centered, glyph on the right (legacy) */}
      <Button
        label={
          allDone
            ? isLast
              ? 'Training abschließen'
              : 'Weiter zur nächsten Übung'
            : `Satz ${currentSets.length + 1} speichern`
        }
        variant="primary"
        height={58}
        iconRight={allDone ? <ChevronRightIcon color="#000" /> : <CheckIcon color="#000" />}
        onPress={() => (allDone ? advance() : saveSet())}
      />
      {!allDone ? (
        <Button
          label="Satz überspringen · 0 Wiederholungen"
          icon={<ChevronRightIcon color={colors.text} size={16} />}
          onPress={() => saveSet(0)}
        />
      ) : null}

      {currentSets.length > 0 ? (
        <Card style={{ gap: 10 }}>
          <SectionLabel color={colors.good}>Heutige Sätze</SectionLabel>
          {currentSets.map((s, i) => (
            <View key={s.id}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <View style={styles.setRow}>
                <Text style={styles.setNumber}>{s.setNumber}</Text>
                <Text style={styles.setText}>
                  {s.reps === 0 ? 'übersprungen' : repsOnly ? `${s.reps} reps` : `${cleanWeight(s.weight)} kg × ${s.reps} reps`}
                </Text>
                <View style={{ flex: 1 }} />
                <Pressable accessibilityLabel="Satz bearbeiten" onPress={() => setEditing(s)} style={styles.rowIcon}>
                  <PencilIcon color={colors.accent} />
                </Pressable>
                <Pressable accessibilityLabel="Satz löschen" onPress={() => removeSet(s)} style={styles.rowIcon}>
                  <TrashIcon color={colors.bad} />
                </Pressable>
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      {slotIndex > 0 ? (
        <Button
          label="Zur vorherigen Übung"
          icon={<ChevronLeftIcon color={colors.text} />}
          height={54}
          onPress={() => goTo(slotIndex - 1)}
        />
      ) : null}

      <Sheet visible={menu} title="Training" onClose={() => setMenu(false)}>
        <Button label="Übersicht der Übungen" onPress={() => { setMenu(false); setOverview(true); }} />
        {alternatives.length > 1 ? (
          <Button label="Übung anpassen" onPress={() => { setMenu(false); setPicker(true); }} />
        ) : null}
        {!allDone && !isLast ? (
          <Button label="Übung überspringen" onPress={() => { setMenu(false); advance(); }} />
        ) : null}
        <Button label="Training abbrechen" variant="danger" onPress={() => { setMenu(false); abort(); }} />
      </Sheet>

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
  sub: { color: colors.good, fontSize: 15, fontWeight: '600', marginTop: 4 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  totalLabel: { color: colors.textMuted, fontSize: 11 },
  totalValue: { color: colors.textMuted, fontSize: 12, fontVariant: ['tabular-nums'] },
  timerBlock: { alignItems: 'stretch', gap: 16, paddingTop: 4 },
  pauseLabel: { color: colors.good, fontSize: 12, fontWeight: '600', letterSpacing: 1.5, textAlign: 'center' },
  clock: { color: colors.text, fontSize: 64, fontWeight: '800', fontVariant: ['tabular-nums'], textAlign: 'center' },
  timerButtons: { flexDirection: 'row', gap: 10 },
  timerButton: { flex: 1, minHeight: 48 },
  pill: {
    alignSelf: 'center',
    backgroundColor: 'rgba(140, 219, 79, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pillText: { color: colors.good, fontSize: 15, fontWeight: '500' },
  prevMain: { color: colors.text, fontSize: 40, fontWeight: '800', textAlign: 'center', fontVariant: ['tabular-nums'] },
  prevRowWrap: { flexDirection: 'row' },
  prevCell: { flex: 1, alignItems: 'center', gap: 4 },
  prevCellLabel: { color: colors.textMuted, fontSize: 15 },
  prevCellValue: { color: colors.text, fontSize: 18, fontVariant: ['tabular-nums'] },
  hint: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  inputs: { flexDirection: 'row', gap: 12 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  setNumber: { color: colors.good, width: 22, fontSize: 15 },
  setText: { color: colors.text, fontSize: 15, fontVariant: ['tabular-nums'] },
  rowIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginBottom: 10 },
  edit: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
