import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useScreenAwake } from '../native/useScreenAwake';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';

import { Card } from '../components/Card';
import { LineChart } from '../components/charts';
import { Screen } from '../components/Screen';
import { Button, Muted, SectionLabel, Segmented } from '../components/ui';
import { useStore } from '../data/store';
import { computeAchievements, formatPace } from '../domain/achievements';
import { newId } from '../domain/dates';
import {
  ACTIVE_RUN_KEY,
  CONFIG_V3,
  COUNTDOWN_OPTIONS,
  clock,
  decisionsToPoints,
  type RunSplit,
} from '../domain/running';
import { formatClock } from '../domain/workoutSession';
import { runAutoBackup } from '../native/autoBackup';
import { speak, success, tap } from '../native/feedback';
import { isCheckpointRestorable, runEngine, type RunCheckpoint, type RunView } from '../native/runEngine';
import { colors } from '../theme';
import type { RootStackParamList } from '../types/navigation';
import { useNow } from './workout/useNow';

type Props = NativeStackScreenProps<RootStackParamList, 'Running'>;

function ask(title: string, message: string, action: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Zurück', style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ]);
}

export function RunningScreen({ navigation }: Props) {
  const store = useStore();
  const [view, setView] = useState<RunView>(runEngine.view());
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [checkpoint, setCheckpoint] = useState<RunCheckpoint | null>(null);
  const cancelled = useRef(false);
  const now = useNow(500);

  useEffect(() => runEngine.subscribe(setView), []);

  // Offer to restore a run after the app was killed.
  useEffect(() => {
    if (runEngine.view().active) return;
    store.getKV(ACTIVE_RUN_KEY).then((raw) => {
      if (!raw) return;
      try {
        const cp = JSON.parse(raw) as RunCheckpoint;
        if (isCheckpointRestorable(cp, Date.now())) setCheckpoint(cp);
        else store.setKV(ACTIVE_RUN_KEY, null);
      } catch {
        store.setKV(ACTIVE_RUN_KEY, null);
      }
    });
  }, [store]);

  const speechEnabled = store.settings.runSpeechEnabled;
  const phase = view.active ? view.clock.phase : 'preparing';
  useScreenAwake();

  const begin = async () => {
    setPermissionMessage(null);
    const permission = await runEngine.requestPermissions();
    if (permission === 'denied') {
      setPermissionMessage('Ohne Standortzugriff kann kein Lauf aufgezeichnet werden. Bitte in den iPhone-Einstellungen erlauben.');
      return;
    }
    if (permission === 'foreground-only') {
      setPermissionMessage('Hinweis: Ohne „Immer“-Zugriff stoppt die Aufzeichnung, wenn der Bildschirm gesperrt wird.');
    }
    const seconds = store.settings.runCountdownSeconds;
    cancelled.current = false;
    for (let s = seconds; s > 0; s--) {
      setCountdown(s);
      tap();
      await new Promise((r) => setTimeout(r, 1000));
      if (cancelled.current) {
        setCountdown(null);
        return;
      }
    }
    setCountdown(null);
    await runEngine.start(newId(), speechEnabled);
    success();
    if (speechEnabled) speak('Los geht’s');
  };

  const restore = async () => {
    if (!checkpoint) return;
    await runEngine.restore(checkpoint);
    setCheckpoint(null);
  };

  const discard = () =>
    ask('Lauf verwerfen?', 'Die Aufzeichnung wird gelöscht.', 'Verwerfen', async () => {
      await runEngine.clear();
      setCheckpoint(null);
      navigation.goBack();
    });

  const save = async () => {
    if (!view.runID) return;
    const c = view.clock;
    const distanceKm = view.snapshot.distanceMeters / 1000;
    const duration = clock.activeDuration(c, now);
    await store.saveRun(
      {
        id: view.runID,
        date: c.startedAt ?? Date.now(),
        distanceKm,
        durationSeconds: Math.round(duration),
        source: 'native',
        isHidden: false,
        startTime: c.startedAt,
        elevationGainMeters: null,
        elevationLossMeters: null,
        pausedDurationSeconds: Math.round(clock.pausedDuration(c, now)),
        algorithmVersion: CONFIG_V3.algorithmVersion,
      },
      decisionsToPoints(view.runID, runEngine.decisions, newId),
    );
    await runEngine.clear();
    runAutoBackup(store);
    navigation.goBack();
  };

  // ---------------------------------------------------------------- preparation

  if (checkpoint && phase === 'preparing') {
    return (
      <Screen>
        <Card title="Unfertiger Lauf gefunden" description="Die App wurde beendet, während ein Lauf aufgezeichnet wurde. Beim Fortsetzen fehlen nur die Sekunden ohne Ortung.">
          <View style={{ gap: 8, marginTop: 12 }}>
            <Button label="Lauf fortsetzen" variant="primary" accent={colors.running} onPress={restore} />
            <Button label="Verwerfen" variant="danger" onPress={discard} />
          </View>
        </Card>
      </Screen>
    );
  }

  if (phase === 'preparing') {
    return (
      <Screen>
        {countdown !== null ? (
          <View style={styles.countdown}>
            <Text style={styles.countdownText}>{countdown}</Text>
            <Button
              label="Abbrechen"
              onPress={() => {
                cancelled.current = true;
              }}
            />
          </View>
        ) : (
          <>
            <Text style={styles.title}>Lauf vorbereiten</Text>
            <Card>
              <SectionLabel color={colors.running}>Countdown</SectionLabel>
              <Segmented
                accent={colors.running}
                options={COUNTDOWN_OPTIONS.map((s) => ({ value: String(s), label: s === 0 ? 'Ohne' : `${s} s` }))}
                value={String(store.settings.runCountdownSeconds)}
                onChange={(v) => store.updateSettings({ runCountdownSeconds: Number(v) })}
              />
            </Card>
            <Card>
              <SectionLabel color={colors.running}>Ansage pro Kilometer</SectionLabel>
              <Segmented
                accent={colors.running}
                options={[
                  { value: 'on', label: 'An' },
                  { value: 'off', label: 'Aus' },
                ]}
                value={speechEnabled ? 'on' : 'off'}
                onChange={(v) => store.updateSettings({ runSpeechEnabled: v === 'on' })}
              />
              <Muted>Kurz genug, um neben Musik zu funktionieren.</Muted>
            </Card>
            {permissionMessage ? <Text style={styles.warning}>{permissionMessage}</Text> : null}
            <Button label="Lauf starten" variant="primary" accent={colors.running} onPress={begin} />
            <Muted>Stelle das Handy danach weg. Die Aufzeichnung läuft auch bei gesperrtem Bildschirm.</Muted>
          </>
        )}
      </Screen>
    );
  }

  // ---------------------------------------------------------------- recording / paused

  const snap = view.snapshot;
  const elapsed = clock.activeDuration(view.clock, now);

  if (phase === 'recording' || phase === 'paused') {
    return (
      <Screen>
        <Text style={[styles.status, { color: phase === 'paused' ? colors.warn : colors.running }]}>
          {phase === 'paused' ? 'PAUSIERT' : 'LÄUFT'}
        </Text>
        <Text style={styles.distance}>{(snap.distanceMeters / 1000).toFixed(2).replace('.', ',')}</Text>
        <Text style={styles.unit}>Kilometer</Text>
        <View style={styles.grid}>
          <Big label="Zeit" value={formatClock(elapsed)} />
          <Big label="Aktuell" value={snap.currentPaceSecondsPerKm ? formatPace(snap.currentPaceSecondsPerKm) : '–'} />
          <Big label="Ø Pace" value={snap.averagePaceSecondsPerKm ? formatPace(snap.averagePaceSecondsPerKm) : '–'} />
        </View>
        <Muted>
          GPS: {view.gpsAccuracy === null ? 'sucht …' : `± ${Math.round(view.gpsAccuracy)} m`} · Höhe: –
        </Muted>
        <View style={{ gap: 8 }}>
          {phase === 'paused' ? (
            <Button label="Fortsetzen" variant="primary" accent={colors.running} onPress={() => runEngine.resume()} />
          ) : (
            <Button label="Pause" onPress={() => runEngine.pause()} />
          )}
          <Button
            label={view.speechEnabled ? 'Ansagen aus' : 'Ansagen an'}
            onPress={() => {
              runEngine.setSpeech(!view.speechEnabled);
              store.updateSettings({ runSpeechEnabled: !view.speechEnabled });
            }}
          />
          <Button
            label="Lauf beenden"
            variant="danger"
            onPress={() => ask('Lauf beenden?', 'Du siehst danach die Zusammenfassung und kannst speichern.', 'Beenden', () => runEngine.finish())}
          />
        </View>
      </Screen>
    );
  }

  // ---------------------------------------------------------------- finishing: summary

  return (
    <Summary
      view={view}
      duration={elapsed}
      onSave={save}
      onContinue={() => runEngine.continueAfterFinish()}
      onDiscard={discard}
    />
  );
}

function Summary({
  view,
  duration,
  onSave,
  onContinue,
  onDiscard,
}: {
  view: RunView;
  duration: number;
  onSave: () => void;
  onContinue: () => void;
  onDiscard: () => void;
}) {
  const { data } = useStore();
  const snap = view.snapshot;
  const distanceKm = snap.distanceMeters / 1000;
  const tooShort = snap.distanceMeters < 10;
  const pace = distanceKm > 0 ? duration / distanceKm : 0;

  // Preview of bests this run would earn (computed on a temporary record).
  const earned = useMemo(() => {
    if (tooShort || !view.runID) return [];
    const temp = {
      id: view.runID, date: view.clock.startedAt ?? 0, distanceKm, durationSeconds: Math.round(duration), source: 'native',
      isHidden: false, startTime: null, elevationGainMeters: null, elevationLossMeters: null,
      pausedDurationSeconds: null, algorithmVersion: null,
    };
    return computeAchievements(data.workouts, data.sets, [...data.runs, temp]).filter((a) => a.id.includes(view.runID!));
  }, [data, view.runID, distanceKm, duration, tooShort, view.clock.startedAt]);

  return (
    <Screen>
      <Text style={styles.title}>Lauf geschafft</Text>
      <Card>
        <Text style={[styles.distance, { fontSize: 44 }]}>{distanceKm.toFixed(2).replace('.', ',')} km</Text>
        <View style={styles.grid}>
          <Big label="Zeit" value={formatClock(duration)} />
          <Big label="Ø Pace" value={pace > 0 ? formatPace(pace) : '–'} />
          <Big label="Höhe" value="–" />
        </View>
      </Card>
      {earned.length > 0 ? (
        <Card>
          <SectionLabel color={colors.running}>Neue Bestwerte</SectionLabel>
          {earned.map((a) => (
            <Text key={a.id} style={{ color: colors.text, fontSize: 15 }}>{a.title}: {a.value}</Text>
          ))}
        </Card>
      ) : null}
      {snap.splits.length > 0 ? <SplitsCard splits={snap.splits} /> : null}
      {tooShort ? <Text style={styles.warning}>Zu kurz zum Speichern (unter 10 m).</Text> : null}
      <Button label="Speichern" variant="primary" accent={colors.running} disabled={tooShort} onPress={onSave} />
      <Button label="Weiterlaufen" onPress={onContinue} />
      <Button label="Verwerfen" variant="danger" onPress={onDiscard} />
    </Screen>
  );
}

function SplitsCard({ splits }: { splits: RunSplit[] }) {
  return (
    <Card>
      <SectionLabel color={colors.running}>Kilometer-Splits</SectionLabel>
      <LineChart
        color={colors.running}
        height={110}
        points={splits.map((s) => ({ x: s.kilometre, y: s.paceSecondsPerKm, label: `km ${s.kilometre}` }))}
        format={(y) => formatPace(y)}
      />
      {splits.map((s) => (
        <View key={s.kilometre} style={styles.splitRow}>
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>km {s.kilometre}</Text>
          <Text style={{ color: colors.text, fontSize: 14 }}>{formatPace(s.paceSecondsPerKm)}</Text>
        </View>
      ))}
    </Card>
  );
}

function Big({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={styles.bigLabel}>{label}</Text>
      <Text style={styles.bigValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 22, fontWeight: '600' },
  status: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textAlign: 'center' },
  distance: { color: colors.text, fontSize: 72, fontWeight: '700', textAlign: 'center', fontVariant: ['tabular-nums'] },
  unit: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: -8 },
  grid: { flexDirection: 'row', gap: 12 },
  bigLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' },
  bigValue: { color: colors.text, fontSize: 24, fontWeight: '600', fontVariant: ['tabular-nums'] },
  warning: { color: colors.warn, fontSize: 14 },
  countdown: { alignItems: 'center', gap: 24, paddingVertical: 64 },
  countdownText: { color: colors.running, fontSize: 120, fontWeight: '800' },
  splitRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
});
