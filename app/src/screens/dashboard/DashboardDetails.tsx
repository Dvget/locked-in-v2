// The four detail screens behind the Dashboard cards (legacy behavior): only the last 28 days in the graph plus a
// week-to-date comparison card. The full history lives in Progress.
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { LineChart } from '../../components/charts';
import { ChartCard, ComparisonMetric, MetricValue, StepBars, TONE_COLOR, TrendMetrics } from '../../components/detail';
import { ClockIcon, DumbbellIcon, ListIcon, PlusIcon } from '../../components/icons';
import { Screen } from '../../components/Screen';
import { Button, Muted, Segmented } from '../../components/ui';
import { WeightEntrySheet } from '../../components/WeightEntrySheet';
import { WorkoutEntrySheet } from '../../components/WorkoutEntrySheet';
import { useStore } from '../../data/store';
import { formatPace } from '../../domain/achievements';
import { dailyStepStatus } from '../../domain/analytics';
import {
  adaptiveRollingDomain,
  lastFourWeeks,
  runKpis,
  runSeries,
  stepsDetail,
  weightKpis,
  weightSeries28,
  windowChange,
  workoutKpis,
  workoutSeries,
  type RunMetric,
  type WorkoutMetric,
} from '../../domain/dashboardDetail';
import { percentText, signedKgText, toneForChange, weightToneForGoal } from '../../domain/weeklyReport';
import { colors, toneColor } from '../../theme';
import type { RootStackParamList } from '../../types/navigation';
import { RunEntrySheet } from '../HistoryScreen';

const de = (n: number, digits = 0) => n.toLocaleString('de-DE', { maximumFractionDigits: digits, minimumFractionDigits: digits });
const paceShort = (s: number) => formatPace(s);
const dateShort = (ms: number) => new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
const dayLabel = (ms: number) => new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });

function domainOf(dates: number[], now: number) {
  const d = adaptiveRollingDomain(dates, 28, now);
  return { min: d.start, max: d.end };
}

// ---------------------------------------------------------------- Workouts

export function DashboardWorkoutsScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'DashboardWorkouts'>) {
  const { data } = useStore();
  const [metric, setMetric] = useState<WorkoutMetric>('index');
  const [entry, setEntry] = useState(false);
  const now = Date.now();

  const points = useMemo(() => lastFourWeeks(workoutSeries(data, metric), now), [data, metric, now]);
  const kpis = useMemo(() => workoutKpis(data, now), [data, now]);
  const trend = windowChange(points);
  const last = points.length ? points[points.length - 1].value : null;
  const format = (v: number) => (metric === 'index' ? de(v, 1) : `${de(v)} kg`);

  return (
    <Screen padding={16} gap={12}>
      <ChartCard
        eyebrow="Letzte 4 Wochen"
        controls={
          <Segmented<WorkoutMetric>
            neutral
            options={[
              { value: 'index', label: 'Index' },
              { value: 'weight', label: 'Gesamtgewicht' },
            ]}
            value={metric}
            onChange={setMetric}
          />
        }
        summary={
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <MetricValue
              title={metric === 'index' ? 'Index' : 'Gesamtgewicht'}
              value={last === null ? '—' : format(last)}
              color={colors.accent}
              prominent
            />
            <MetricValue
              title="4-Wochen-Trend"
              value={trend === null ? '—' : percentText(trend)}
              color={trend === null ? colors.textMuted : TONE_COLOR[toneForChange(trend)]}
              align="right"
            />
          </View>
        }
      >
        <LineChart
          height={250}
          readout
          points={points.map((p) => ({ x: p.date, y: p.value, label: dayLabel(p.date) }))}
          format={format}
          axis={{ yFormat: (y) => de(y, metric === 'index' ? 1 : 0), xFormat: dateShort }}
          xDomain={domainOf(points.map((p) => p.date), now)}
          emptyText="Keine Workouts in den letzten 4 Wochen"
        />
      </ChartCard>

      <TrendMetrics
        items={[
          { title: 'Index', value: kpis.index.current === null ? '—' : de(kpis.index.current, 1), change: kpis.index.change },
          {
            title: 'Gesamtgewicht',
            value: kpis.totalWeight.current === null ? '—' : `${de(kpis.totalWeight.current)} kg`,
            change: kpis.totalWeight.change,
          },
        ]}
      />

      <Button label="Workout nachtragen" variant="primary" height={48} icon={<PlusIcon color="#000" size={18} />} onPress={() => setEntry(true)} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Button label="Übungen" height={48} style={{ flex: 1 }} icon={<DumbbellIcon color={colors.text} size={18} />} onPress={() => navigation.navigate('Exercises')} />
        <Button label="Verlauf" height={48} style={{ flex: 1 }} icon={<ClockIcon color={colors.text} />} onPress={() => navigation.navigate('History', { kind: 'workouts' })} />
      </View>
      <WorkoutEntrySheet visible={entry} onClose={() => setEntry(false)} />
    </Screen>
  );
}

// ---------------------------------------------------------------- Runs

export function DashboardRunsScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'DashboardRuns'>) {
  const { data } = useStore();
  const [metric, setMetric] = useState<RunMetric>('distance');
  const [entry, setEntry] = useState(false);
  const now = Date.now();

  const points = useMemo(() => runSeries(data, metric, now), [data, metric, now]);
  const kpis = useMemo(() => runKpis(data, now), [data, now]);
  const cur = kpis.comparison.current;
  const format = (v: number) => (metric === 'distance' ? `${de(v, 2)} km` : metric === 'pace' ? `${paceShort(v)} /km` : de(v, 1));
  const axisFormat = (v: number) => (metric === 'pace' ? paceShort(v).replace(' /km', '') : de(v, metric === 'distance' ? 1 : 1));

  return (
    <Screen padding={16} gap={12}>
      <ChartCard
        eyebrow="Runs · letzte 4 Wochen"
        controls={
          <Segmented<RunMetric>
            neutral
            options={[
              { value: 'distance', label: 'Distanz' },
              { value: 'pace', label: 'Pace' },
              { value: 'index', label: 'Index' },
            ]}
            value={metric}
            onChange={setMetric}
          />
        }
      >
        <LineChart
          color={colors.running}
          height={290}
          readout
          points={points.map((p) => ({ x: p.date, y: p.value, label: p.detail ?? dayLabel(p.date) }))}
          format={format}
          axis={{ yFormat: axisFormat, xFormat: dateShort }}
          xDomain={domainOf(points.map((p) => p.date), now)}
          emptyText="Keine Runs in den letzten 4 Wochen"
        />
      </ChartCard>

      <TrendMetrics
        items={[
          {
            title: 'Ø Distanz',
            value: cur.count > 0 ? `${de(cur.averageDistanceKm, 1)} km` : '—',
            change: kpis.averageDistanceChange,
          },
          {
            title: 'Ø Pace',
            value: cur.count > 0 ? `${paceShort(cur.weightedPaceSecondsPerKm)}` : '—',
            change: kpis.paceImprovement,
          },
        ]}
      />

      <Button
        label="Run nachtragen"
        variant="primary"
        accent={colors.running}
        height={48}
        labelColor="#fff"
        icon={<PlusIcon color="#fff" size={18} />}
        onPress={() => setEntry(true)}
      />
      <Button label="Verlauf / Einzelwerte" height={48} icon={<ListIcon color={colors.text} />} onPress={() => navigation.navigate('History', { kind: 'runs' })} />
      <RunEntrySheet visible={entry} onClose={() => setEntry(false)} />
    </Screen>
  );
}

// ---------------------------------------------------------------- Steps

export function DashboardStepsScreen() {
  const { data, settings } = useStore();
  const now = Date.now();
  const detail = useMemo(() => stepsDetail(data, Math.round(settings.weeklyStepGoal / 7), now), [data, settings.weeklyStepGoal, now]);
  const status = detail.weekAverage !== null ? dailyStepStatus(detail.weekAverage) : null;
  const change = detail.change;

  return (
    <Screen padding={16} gap={12}>
      <ChartCard eyebrow="Wochenschnitt">
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Text style={{ color: status ? toneColor(status) : colors.text, fontSize: 34, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
            {detail.weekAverage !== null ? `Ø ${de(detail.weekAverage)}` : '—'}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 15, fontWeight: '600' }}>Steps</Text>
        </View>
        <StepBars bars={detail.bars} maximum={detail.chartMaximum} goal={detail.goal} average={detail.fourWeekAverage} />
      </ChartCard>

      <ChartCard eyebrow="Abgeschlossene Tage · gleicher Zeitraum Vorwoche">
        <ComparisonMetric
          title="Ø Schritte"
          current={detail.comparison.currentAverage !== null ? de(detail.comparison.currentAverage) : '—'}
          previous={detail.comparison.previousAverage !== null ? de(detail.comparison.previousAverage) : '—'}
          changeText={change !== null ? percentText(change) : null}
          changeColor={change !== null ? TONE_COLOR[toneForChange(change)] : colors.textMuted}
        />
      </ChartCard>
      {detail.weekAverage === null && detail.fourWeekAverage === null ? (
        <Muted>Noch keine Schritte. Aktiviere die Schrittzählung unter Einstellungen → Ziele.</Muted>
      ) : null}
    </Screen>
  );
}

// ---------------------------------------------------------------- Weight

export function DashboardWeightScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'DashboardWeight'>) {
  const { data, settings } = useStore();
  const [entry, setEntry] = useState(false);
  const now = Date.now();
  const points = useMemo(() => weightSeries28(data, now), [data, now]);
  const k = useMemo(() => weightKpis(data, now), [data, now]);
  const changeColor = k.changeKg === null ? colors.textMuted : TONE_COLOR[weightToneForGoal(k.changeKg, settings.weightDirection)];
  const kg = (v: number) => `${de(v, 1)} kg`;

  return (
    <Screen padding={16} gap={12}>
      <ChartCard
        eyebrow="Diese Woche · Vorwoche"
        summary={
          <View style={{ gap: 10 }}>
            <ComparisonMetric
              title="Ø Gewicht"
              current={k.currentAverageKg !== null ? kg(k.currentAverageKg) : '—'}
              previous={k.previousAverageKg !== null ? kg(k.previousAverageKg) : '—'}
              changeText={k.changeKg !== null ? signedKgText(k.changeKg) : null}
              currentColor="rgba(255,255,255,0.82)"
              changeColor={changeColor}
            />
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>{k.measurementsThisWeek} Messungen diese Woche</Text>
          </View>
        }
      >
        <LineChart
          color="rgba(255,255,255,0.78)"
          height={260}
          readout
          points={points.map((p) => ({ x: p.date, y: p.value, label: dayLabel(p.date) }))}
          format={kg}
          axis={{ yFormat: (y) => de(y, 1), xFormat: dateShort }}
          xDomain={domainOf(points.map((p) => p.date), now)}
          emptyText="Keine Messwerte in den letzten 4 Wochen"
        />
      </ChartCard>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Button label="Manuell eintragen" height={48} style={{ flex: 1 }} icon={<PlusIcon color={colors.text} size={18} />} onPress={() => setEntry(true)} />
        <Button label="Verlauf" height={48} style={{ flex: 1 }} icon={<ClockIcon color={colors.text} />} onPress={() => navigation.navigate('History', { kind: 'weights' })} />
      </View>
      <WeightEntrySheet visible={entry} onClose={() => setEntry(false)} />
    </Screen>
  );
}
