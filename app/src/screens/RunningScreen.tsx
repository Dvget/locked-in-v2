import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import {
  BigCheckIcon,
  LocationIcon,
  PauseIcon,
  PlayIcon,
  RunnerIcon,
  SpeakerIcon,
  StopIcon,
  TimerIcon,
  TrashIcon,
} from '../components/icons';
import { Button, Muted, SectionLabel, Sheet } from '../components/ui';
import { useStore } from '../data/store';
import { computeAchievements, formatPace } from '../domain/achievements';
import { newId } from '../domain/dates';
import {
  ACTIVE_RUN_KEY,
  CONFIG_V3,
  COUNTDOWN_OPTIONS,
  clock,
  decisionsToPoints,
} from '../domain/running';
import { formatClock } from '../domain/workoutSession';
import { runAutoBackup } from '../native/autoBackup';
import { speak, success, tap } from '../native/feedback';
import { isCheckpointRestorable, runEngine, type RunCheckpoint, type RunView } from '../native/runEngine';
import { useScreenAwake } from '../native/useScreenAwake';
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

const km2 = (meters: number) => (meters / 1000).toFixed(2).replace('.', ',');
const paceText = (seconds: number | null | undefined) =>
  seconds && Number.isFinite(seconds) && seconds > 0 ? formatPace(seconds).replace(' /km', '') : '–:––';
const clockText = (seconds: number) => {
  const v = Math.max(0, Math.floor(seconds));
  const h = Math.floor(v / 3600);
  const m = Math.floor((v % 3600) / 60);
  const s = v % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

export function RunningScreen({ navigation }: Props) {
  const store = useStore();
  const [view, setView] = useState<RunView>(runEngine.view());
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [checkpoint, setCheckpoint] = useState<RunCheckpoint | null>(null);
  const [gpsReady, setGpsReady] = useState(false);
  const [countdownMenu, setCountdownMenu] = useState(false);
  const cancelled = useRef(false);
  const now = useNow(500);

  useEffect(() => runEngine.subscribe(setView), []);

  // "GPS ready" in preparation = location permission is granted.
  useEffect(() => {
    Location.getForegroundPermissionsAsync()
      .then((p) => setGpsReady(p.status === 'granted'))
      .catch(() => setGpsReady(false));
  }, []);

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
    setGpsReady(true);
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
    ask('Run wirklich verwerfen?', 'Die aufgezeichneten Daten dieses Laufs gehen verloren.', 'Verwerfen', async () => {
      await runEngine.clear();
      setCheckpoint(null);
      navigation.goBack();
    });

  const save = async () => {
    if (!view.runID) return;
    const c = view.clock;
    await store.saveRun(
      {
        id: view.runID,
        date: c.startedAt ?? Date.now(),
        distanceKm: view.snapshot.distanceMeters / 1000,
        durationSeconds: Math.round(clock.activeDuration(c, now)),
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

  // ---------------------------------------------------------------- unfinished run found

  if (checkpoint && phase === 'preparing') {
    return (
      <Screen>
        <DashboardHeader />
        <View style={styles.flexCenter}>
          <Text style={styles.readyText}>Unfertiger Run</Text>
          <Muted style={{ textAlign: 'center', marginTop: 8 }}>
            Die App wurde beendet, während ein Lauf aufgezeichnet wurde. Beim Fortsetzen fehlen nur die Sekunden ohne Ortung.
          </Muted>
        </View>
        <View style={styles.bottom}>
          <Button label="Run fortsetzen" variant="primary" accent={colors.accent} height={58} icon={<PlayIcon color="#000" size={20} />} onPress={restore} />
          <Button label="Run verwerfen" variant="danger" icon={<TrashIcon color={colors.bad} />} onPress={discard} />
        </View>
      </Screen>
    );
  }

  // ---------------------------------------------------------------- preparation

  if (phase === 'preparing') {
    const statusColor = gpsReady ? colors.good : '#ff9f0a';
    const option = store.settings.runCountdownSeconds;
    return (
      <Screen>
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Text style={styles.back}>Zurück</Text>
          </Pressable>
          <DashboardHeader />
          <Text style={[styles.back, { opacity: 0 }]}>Zurück</Text>
        </View>

        <View style={styles.flexCenter}>
          <View style={[styles.ringOuter, { backgroundColor: `${statusColor}21` }]}>
            <View style={[styles.ringInner, { borderColor: `${statusColor}7a` }]}>
              {countdown !== null ? (
                <Text style={styles.countdown}>{countdown}</Text>
              ) : (
                <LocationIcon color={statusColor} filled={gpsReady} />
              )}
            </View>
          </View>
          <Text style={[styles.readyText, { opacity: countdown === null ? 1 : 0 }]}>Bereit</Text>
          {permissionMessage ? <Text style={styles.warning}>{permissionMessage}</Text> : null}
        </View>

        <View style={styles.bottom}>
          {countdown === null ? (
            <>
              <Pressable onPress={() => setCountdownMenu(true)} style={styles.countdownCard}>
                <TimerIcon color={colors.good} />
                <Text style={styles.countdownTitle}>Countdown</Text>
                <View style={{ flex: 1 }} />
                <Text style={styles.countdownValue}>{option === 0 ? 'Ohne' : `${option} Sekunden`}</Text>
                <Text style={styles.updown}>⌃⌄</Text>
              </Pressable>
              <Button
                label="Lauf starten"
                variant="primary"
                height={58}
                icon={<PlayIcon color="#000" size={20} />}
                onPress={begin}
              />
            </>
          ) : (
            <Button label="Abbrechen" onPress={() => (cancelled.current = true)} />
          )}
        </View>

        <Sheet visible={countdownMenu} title="Countdown" onClose={() => setCountdownMenu(false)}>
          {COUNTDOWN_OPTIONS.map((s) => (
            <Pressable
              key={s}
              style={[styles.option, s === option && { borderColor: colors.good }]}
              onPress={() => {
                store.updateSettings({ runCountdownSeconds: s });
                setCountdownMenu(false);
              }}
            >
              <Text style={styles.optionText}>
                {s === option ? '✓ ' : ''}
                {s === 0 ? 'Ohne' : `${s} Sekunden`}
              </Text>
            </Pressable>
          ))}
        </Sheet>
      </Screen>
    );
  }

  // ---------------------------------------------------------------- recording / paused

  const snap = view.snapshot;
  const elapsed = clock.activeDuration(view.clock, now);

  if (phase === 'recording' || phase === 'paused') {
    const paused = phase === 'paused';
    return (
      <Screen tinted>
        <View style={styles.activeHeader}>
          <View style={styles.rowGap}>
            <RunnerIcon color={colors.good} size={22} />
            <Text style={styles.runningLabel}>RUNNING</Text>
          </View>
          <Pressable
            accessibilityLabel={view.speechEnabled ? 'Kilometeransagen ausschalten' : 'Kilometeransagen einschalten'}
            onPress={() => {
              runEngine.setSpeech(!view.speechEnabled);
              store.updateSettings({ runSpeechEnabled: !view.speechEnabled });
            }}
            style={styles.speaker}
          >
            <SpeakerIcon color={view.speechEnabled ? colors.good : colors.textMuted} muted={!view.speechEnabled} />
          </Pressable>
        </View>

        <View style={styles.timeBlock}>
          <Text style={[styles.tiny, paused && { color: colors.warn }]}>{paused ? 'PAUSIERT' : 'RUN-ZEIT'}</Text>
          <Text style={[styles.runTime, paused && { color: colors.warn }]}>{clockText(elapsed)}</Text>
        </View>

        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Text style={styles.bigValue}>{paceText(snap.averagePaceSecondsPerKm)}</Text>
            <Text style={styles.metricTitle}>DURCHSCHNITTLICHE PACE (min/km)</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.bigValue}>{km2(snap.distanceMeters)}</Text>
            <Text style={styles.metricTitle}>DISTANZ (km)</Text>
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={[styles.tiny, { textAlign: 'center' }]}>ZWISCHENZEITEN (KM)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
            {(snap.splits.length === 0
              ? [1, 2, 3].map((k) => ({ kilometre: k, paceSecondsPerKm: null as number | null }))
              : snap.splits
            ).map((s) => (
              <View key={s.kilometre} style={styles.splitTile}>
                <Text style={styles.splitKm}>KM {s.kilometre}</Text>
                <Text style={[styles.splitPace, s.paceSecondsPerKm === null && { color: colors.textMuted }]}>
                  {paceText(s.paceSecondsPerKm)}
                </Text>
                <Text style={styles.splitUnit}>min/km</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.bottom}>
          {paused ? (
            <View style={styles.pauseButtons}>
              <Button
                label="Fortsetzen"
                variant="primary"
                height={58}
                icon={<PlayIcon color="#000" size={20} />}
                onPress={() => runEngine.resume()}
                style={{ flex: 1 }}
              />
              <Button
                label="Run beenden"
                height={58}
                icon={<StopIcon color="#fff" size={20} />}
                onPress={() =>
                  ask(
                    'Lauf wirklich beenden?',
                    'Die Aufzeichnung wird angehalten und die Laufübersicht geöffnet.',
                    'Run beenden',
                    () => runEngine.finish(),
                  )
                }
                style={{ flex: 1, backgroundColor: 'rgba(255,69,58,0.72)', borderColor: 'transparent' }}
              />
            </View>
          ) : (
            <Button
              label="Lauf pausieren"
              height={58}
              icon={<PauseIcon color="#000" />}
              onPress={() => runEngine.pause()}
              style={{ backgroundColor: '#ffd60a', borderColor: 'transparent' }}
              labelColor="#000"
            />
          )}
        </View>
      </Screen>
    );
  }

  // ---------------------------------------------------------------- finishing: summary

  return <Summary view={view} duration={elapsed} onSave={save} onContinue={() => runEngine.continueAfterFinish()} onDiscard={discard} />;
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

  // Bests this run would earn (computed on a temporary record).
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
      <DashboardHeader />
      <View style={styles.flexCenter}>
        <View style={styles.doneBadge}>
          <BigCheckIcon color="#000" />
        </View>
        <Text style={styles.doneTitle}>Run abgeschlossen</Text>
        <View style={styles.summaryGrid}>
          <SummaryMetric title="DISTANZ" value={km2(snap.distanceMeters)} unit="km" accent />
          <SummaryMetric title="Ø PACE" value={paceText(pace)} unit="min/km" />
          <SummaryMetric title="RUN-ZEIT" value={clockText(duration)} unit="aktiv" />
          <SummaryMetric title="HÖHENMETER" value="–" unit="m" />
        </View>
        {earned.length > 0 ? (
          <View style={{ marginTop: 16, gap: 4, alignItems: 'center' }}>
            <SectionLabel color={colors.running}>Neue Bestwerte</SectionLabel>
            {earned.map((a) => (
              <Text key={a.id} style={{ color: colors.text, fontSize: 15 }}>
                {a.title}: {a.value}
              </Text>
            ))}
          </View>
        ) : null}
        {tooShort ? <Text style={styles.warning}>Zu kurz zum Speichern (unter 10 m).</Text> : null}
      </View>
      <View style={styles.bottom}>
        <Button label="Run speichern" variant="primary" height={58} disabled={tooShort} icon={<BigCheckIcon color="#000" size={20} />} onPress={onSave} />
        <Button label="Run fortsetzen" height={54} icon={<PlayIcon color="#fff" size={18} />} onPress={onContinue} />
        <Button label="Run verwerfen" variant="danger" icon={<TrashIcon color={colors.bad} />} onPress={onDiscard} />
      </View>
    </Screen>
  );
}

function SummaryMetric({ title, value, unit, accent }: { title: string; value: string; unit: string; accent?: boolean }) {
  return (
    <View style={[styles.summaryMetric, accent && { borderColor: 'rgba(140,219,79,0.3)' }]}>
      <Text style={styles.summaryTitle}>{title}</Text>
      <Text style={[styles.summaryValue, accent && { color: colors.good }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.summaryUnit}>{unit}</Text>
    </View>
  );
}

/** Full-height black screen without scrolling (legacy run screens fill the viewport). */
function Screen({ children, tinted }: { children: React.ReactNode; tinted?: boolean }) {
  return (
    <SafeAreaView style={[styles.root, tinted && { backgroundColor: '#050805' }]} edges={['top', 'bottom', 'left', 'right']}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16, gap: 8 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
  back: { color: colors.textMuted, fontSize: 17 },
  flexCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  bottom: { gap: 10, paddingBottom: 10 },
  ringOuter: { width: 190, height: 190, borderRadius: 95, alignItems: 'center', justifyContent: 'center' },
  ringInner: { width: 154, height: 154, borderRadius: 77, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  countdown: { color: colors.good, fontSize: 76, fontWeight: '800', fontVariant: ['tabular-nums'] },
  readyText: { color: colors.text, fontSize: 34, fontWeight: '800', marginTop: 24 },
  warning: { color: colors.warn, fontSize: 14, textAlign: 'center', marginTop: 8 },
  countdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  countdownTitle: { color: colors.text, fontSize: 17, fontWeight: '600' },
  countdownValue: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  updown: { color: colors.textMuted, fontSize: 12 },
  option: { backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'transparent' },
  optionText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  activeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  runningLabel: { color: colors.good, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  speaker: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBlock: { alignItems: 'center', gap: 3, paddingTop: 10 },
  tiny: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.8 },
  runTime: { color: colors.text, fontSize: 64, fontWeight: '800', fontVariant: ['tabular-nums'] },
  metrics: { flex: 1, justifyContent: 'space-evenly' },
  metric: { alignItems: 'center', gap: 3 },
  bigValue: { color: colors.text, fontSize: 70, fontWeight: '800', fontVariant: ['tabular-nums'] },
  metricTitle: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  strip: { gap: 10, paddingHorizontal: 0 },
  splitTile: {
    width: 106,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  splitKm: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  splitPace: { color: colors.text, fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  splitUnit: { color: colors.textMuted, fontSize: 11 },
  pauseButtons: { flexDirection: 'row', gap: 12 },
  doneBadge: { width: 82, height: 82, borderRadius: 24, backgroundColor: colors.good, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { color: colors.text, fontSize: 32, fontWeight: '800', marginTop: 10 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignSelf: 'stretch', marginTop: 20 },
  summaryMetric: {
    width: '47.5%',
    flexGrow: 1,
    minHeight: 96,
    gap: 5,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  summaryTitle: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.1 },
  summaryValue: { color: colors.text, fontSize: 27, fontWeight: '800', fontVariant: ['tabular-nums'] },
  summaryUnit: { color: colors.textMuted, fontSize: 12 },
});
