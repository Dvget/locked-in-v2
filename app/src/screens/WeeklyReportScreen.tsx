import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '../components/Card';
import { BarChart } from '../components/charts';
import { Screen } from '../components/Screen';
import { Heading, Muted, SectionLabel } from '../components/ui';
import { useStore } from '../data/store';
import { buildWeeklyReport, type ReportMetric, type Tone } from '../domain/weeklyReport';
import { colors } from '../theme';

const TONE_COLOR: Record<Tone, string> = {
  positive: colors.good,
  caution: colors.warn,
  negative: colors.bad,
  neutral: colors.textMuted,
};

const fmt = (ms: number) => new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

export function WeeklyReportScreen() {
  const { data, settings } = useStore();
  const report = useMemo(() => buildWeeklyReport(data, settings), [data, settings]);
  const weekLabels = report.context.workoutsPerWeek.map((_, i) => `W${i + 1 - report.context.workoutsPerWeek.length}`);

  return (
    <Screen>
      <Heading>Wochenbericht</Heading>
      <Muted>
        {fmt(report.weekStart)} – {fmt(report.weekEnd)} im Vergleich zur Woche davor
      </Muted>

      {report.isEmpty ? (
        <Card title="Noch kein sinnvoller Wochenvergleich" description="Es werden nur Werte gezeigt, die in beiden Wochen vorhanden sind." />
      ) : (
        report.categories.map((category) => (
          <Card key={category.id}>
            <SectionLabel color={category.id === 'runs' ? colors.running : colors.accent}>{category.title}</SectionLabel>
            {category.metrics.map((m) => (
              <MetricRow key={m.id} metric={m} />
            ))}
          </Card>
        ))
      )}

      {report.standouts.length > 0 ? (
        <Card>
          <SectionLabel color={colors.accent}>Besondere Erfolge</SectionLabel>
          {report.standouts.map((a) => (
            <Text key={a.id} style={styles.standout}>
              {a.title}: {a.value}
            </Text>
          ))}
        </Card>
      ) : null}

      <Card>
        <SectionLabel>Trainings pro Woche · letzte 8 Wochen</SectionLabel>
        <BarChart data={report.context.workoutsPerWeek.map((v, i) => ({ label: weekLabels[i], value: v }))} format={(v) => `${v} Trainings`} />
      </Card>
      <Card>
        <SectionLabel color={colors.running}>Laufkilometer pro Woche · letzte 8 Wochen</SectionLabel>
        <BarChart
          color={colors.running}
          data={report.context.runKmPerWeek.map((v, i) => ({ label: weekLabels[i], value: Math.round(v * 10) / 10 }))}
          format={(v) => `${String(v).replace('.', ',')} km`}
        />
      </Card>
    </Screen>
  );
}

function MetricRow({ metric }: { metric: ReportMetric }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricTitle}>{metric.title}</Text>
      <View style={styles.metricValues}>
        <Text style={styles.previous}>{metric.previous}</Text>
        <Text style={styles.arrow}>→</Text>
        <Text style={styles.current}>{metric.current}</Text>
        <Text style={[styles.change, { color: TONE_COLOR[metric.tone] }]}>{metric.changeText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  metric: { paddingVertical: 8, gap: 4 },
  metricTitle: { color: colors.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' },
  metricValues: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  previous: { color: colors.textMuted, fontSize: 15, fontVariant: ['tabular-nums'] },
  arrow: { color: colors.textMuted, fontSize: 13 },
  current: { color: colors.text, fontSize: 20, fontWeight: '600', fontVariant: ['tabular-nums'] },
  change: { fontSize: 14, fontWeight: '600', marginLeft: 'auto' },
  standout: { color: colors.text, fontSize: 15, paddingVertical: 2 },
});
