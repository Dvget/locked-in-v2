import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { Card } from '../components/Card';
import { LineChart } from '../components/charts';
import { Screen } from '../components/Screen';
import { Button, Muted, Row, SectionLabel, Segmented } from '../components/ui';
import { WeightEntrySheet } from '../components/WeightEntrySheet';
import { useStore } from '../data/store';
import { computeAchievements, formatPace } from '../domain/achievements';
import type { Range, RunSeries } from '../domain/analytics';
import { defaultWeightRange } from '../domain/analytics';
import { formatKgText, formatSignedKg, weightTone } from '../domain/dashboard';
import { buildRunProgress, buildTrainingProgress, buildWeightProgress } from '../domain/progress';
import { percentText } from '../domain/weeklyReport';
import { formatClock } from '../domain/workoutSession';
import { colors, toneColor } from '../theme';
import type { RootStackParamList, TabParamList } from '../types/navigation';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Progress'>,
  NativeStackScreenProps<RootStackParamList>
>;

type Category = 'training' | 'running' | 'weight';

const hours = (seconds: number) => `${Math.floor(seconds / 3600)} h ${Math.floor((seconds % 3600) / 60)} min`;
const de = (n: number, digits = 0) => n.toLocaleString('de-DE', { maximumFractionDigits: digits, minimumFractionDigits: digits });

export function ProgressScreen({ navigation }: Props) {
  const { data, settings } = useStore();
  const [category, setCategory] = useState<Category>('training');
  const [runSeries, setRunSeries] = useState<RunSeries>('pace');
  const [range, setRange] = useState<Range | null>(null);
  const [weightSheet, setWeightSheet] = useState(false);
  const now = Date.now();

  const training = useMemo(() => buildTrainingProgress(data), [data]);
  const running = useMemo(() => buildRunProgress(data, runSeries), [data, runSeries]);
  const weightRange =
    range ??
    defaultWeightRange(data.weights.filter((w) => !w.isHidden).map((w) => ({ date: w.date, weightKg: w.weightKg })));
  const weight = useMemo(() => buildWeightProgress(data, weightRange, now), [data, weightRange, now]);
  const achievements = useMemo(() => computeAchievements(data.workouts, data.sets, data.runs), [data]);

  return (
    <Screen>
      <Segmented<Category>
        options={[
          { value: 'training', label: 'Training' },
          { value: 'running', label: 'Laufen' },
          { value: 'weight', label: 'Gewicht' },
        ]}
        value={category}
        onChange={setCategory}
        accent={category === 'running' ? colors.running : colors.accent}
      />

      {category === 'training' ? (
        <>
          <TrainingChartCard training={training} />
          <SectionLabel>Übungen</SectionLabel>
          {training.exercises.length === 0 ? <Muted>Noch keine Übungen geloggt.</Muted> : null}
          {training.exercises.map((e) => (
            <Row key={e.id} onPress={() => navigation.navigate('ExerciseStats', { exerciseId: e.id })}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{e.name}</Text>
                <Muted>{e.sessions}× trainiert</Muted>
              </View>
              <Text style={{ color: colors.textMuted, fontSize: 20 }}>›</Text>
            </Row>
          ))}
          <Button label="Trainingsverlauf" onPress={() => navigation.navigate('History', { kind: 'workouts' })} />
        </>
      ) : null}

      {category === 'running' ? (
        <>
          <Card>
            <SectionLabel color={colors.running}>Seit Beginn</SectionLabel>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              <Stat label="Läufe" value={String(running.runCount)} />
              <Stat label="Strecke" value={`${de(running.totalDistanceKm, 1)} km`} />
              <Stat label="Zeit" value={hours(running.totalDurationSeconds)} />
              <Stat label="Ø Tempo" value={formatPace(running.averagePaceSecondsPerKm)} />
            </View>
          </Card>
          <Segmented<RunSeries>
            options={[
              { value: 'pace', label: 'Tempo' },
              { value: 'distance', label: 'Distanz' },
              { value: 'overall', label: 'Gesamt' },
            ]}
            value={runSeries}
            onChange={setRunSeries}
            accent={colors.running}
          />
          <Card>
            <SectionLabel color={colors.running}>{runSeries === 'distance' ? 'Distanz pro Lauf' : 'Tempo pro Lauf'}</SectionLabel>
            <LineChart
              color={colors.running}
              points={(runSeries === 'distance' ? running.distanceSeries : running.paceSeries).map((p) => ({ x: p.date, y: p.value, label: p.label }))}
              format={(y) => (runSeries === 'distance' ? `${de(y, 2)} km` : formatClock(y).concat(' /km'))}
              emptyText="Noch keine Läufe."
            />
            {running.change !== null ? (
              <Muted>
                Erster bis letzter Lauf: {formatSignedKg(running.change).replace('±', '')} % (schneller / weiter ist positiv)
              </Muted>
            ) : null}
          </Card>
          <Button label="Laufverlauf" onPress={() => navigation.navigate('History', { kind: 'runs' })} />
        </>
      ) : null}

      {category === 'weight' ? (
        <>
          <Segmented<Range>
            options={[
              { value: 'week', label: 'Woche' },
              { value: 'month', label: 'Monat' },
              { value: 'year', label: 'Jahr' },
              { value: 'all', label: 'Gesamt' },
            ]}
            value={weightRange}
            onChange={setRange}
          />
          <Card>
            <SectionLabel>Wochendurchschnitt</SectionLabel>
            <LineChart
              points={weight.series.map((p) => ({ x: p.date, y: p.value, label: p.label }))}
              format={(y) => `${formatKgText(y)} kg`}
              emptyText="Noch kein Gewicht eingetragen."
            />
            {weight.latestKg !== null && weight.firstKg !== null ? (
              <Text
                style={{
                  color: toneColor(weightTone(weight.latestKg - weight.firstKg, settings.weightDirection)),
                  fontSize: 13,
                }}
              >
                Seit Beginn {formatSignedKg(weight.latestKg - weight.firstKg)} kg · aktuell {formatKgText(weight.latestKg)} kg
              </Text>
            ) : null}
          </Card>
          <Button label="Gewicht eintragen" variant="primary" onPress={() => setWeightSheet(true)} />
          <Button label="Gewichtsverlauf" onPress={() => navigation.navigate('History', { kind: 'weights' })} />
          <WeightEntrySheet visible={weightSheet} onClose={() => setWeightSheet(false)} />
        </>
      ) : null}

      <Row onPress={() => navigation.navigate('WeeklyReport')}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>Wochenbericht</Text>
          <Muted>Letzte Woche im Vergleich</Muted>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 20 }}>›</Text>
      </Row>

      <Row onPress={() => navigation.navigate('Achievements')}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>Bestwerte</Text>
          <Muted>{achievements.length} erreicht</Muted>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 20 }}>›</Text>
      </Row>
    </Screen>
  );
}

const dateShort = (ms: number) => new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

/** Legacy Workouts detail layout: switch Index / Gesamtgewicht, big value + trend, chart with axis, totals. */
function TrainingChartCard({ training }: { training: ReturnType<typeof buildTrainingProgress> }) {
  const [metric, setMetric] = useState<'index' | 'weight'>('index');
  const series = metric === 'index' ? training.indexSeries : training.volumeSeries;
  const first = series[0]?.value ?? null;
  const last = series[series.length - 1]?.value ?? null;
  const trend = first !== null && last !== null && first > 0 ? (last / first - 1) * 100 : null;
  const valueText = last === null ? '–' : metric === 'index' ? de(last, 1) : `${de(last)} kg`;
  return (
    <>
      <Card style={{ gap: 12 }}>
        <SectionLabel>Verlauf</SectionLabel>
        <Segmented<'index' | 'weight'>
          neutral
          options={[
            { value: 'index', label: 'Index' },
            { value: 'weight', label: 'Gesamtgewicht' },
          ]}
          value={metric}
          onChange={setMetric}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <SectionLabel>{metric === 'index' ? 'Index' : 'Gesamtgewicht'}</SectionLabel>
            <Text style={{ color: colors.accent, fontSize: 40, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{valueText}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <SectionLabel>Trend</SectionLabel>
            <Text style={{ color: trend === null ? colors.textMuted : trend >= 0 ? colors.good : colors.bad, fontSize: 28, fontWeight: '600' }}>
              {trend === null ? '–' : percentText(trend)}
            </Text>
          </View>
        </View>
        <LineChart
          height={220}
          points={series.map((p) => ({ x: p.date, y: p.value, label: p.label }))}
          axis={{ yFormat: (y) => de(y, metric === 'index' ? 1 : 0), xFormat: dateShort }}
          emptyText="Der Index braucht mindestens zwei Trainings mit gleicher Übung."
        />
      </Card>
      <Card>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1, gap: 4 }}>
            <SectionLabel>Einheiten</SectionLabel>
            <Text style={{ color: colors.text, fontSize: 26, fontWeight: '700' }}>{training.workoutCount}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>{de(training.setCount)} Sätze</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <SectionLabel>Gesamtgewicht</SectionLabel>
            <Text style={{ color: colors.text, fontSize: 26, fontWeight: '700' }}>{de(training.totalVolumeKg)} kg</Text>
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>{hours(training.totalDurationSeconds)}</Text>
          </View>
        </View>
      </Card>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}
