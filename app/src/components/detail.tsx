// Building blocks of the dashboard detail screens (legacy LIChartCard / LITrendMetric / LIComparisonMetric / step bars).
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { Platform } from 'react-native';

import { niceTicks } from '../domain/chartMath';
import type { DayBar } from '../domain/dashboardDetail';
import { percentText, toneForChange, type Tone } from '../domain/weeklyReport';
import { colors } from '../theme';
import { Card } from './Card';

const FONT = Platform.OS === 'web' ? 'system-ui, -apple-system, sans-serif' : undefined;

export const TONE_COLOR: Record<Tone, string> = {
  positive: colors.good,
  caution: colors.warn,
  negative: colors.bad,
  neutral: colors.textMuted,
};

/** Card with a caption, optional controls, a summary row and the chart. */
export function ChartCard({
  eyebrow,
  controls,
  summary,
  children,
}: {
  eyebrow: string;
  controls?: ReactNode;
  summary?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card style={{ gap: 12 }}>
      <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text>
      {controls}
      {summary}
      {children}
    </Card>
  );
}

export function MetricValue({
  title,
  value,
  color = colors.text,
  prominent,
  align = 'left',
}: {
  title: string;
  value: string;
  color?: string;
  prominent?: boolean;
  align?: 'left' | 'right';
}) {
  return (
    <View style={{ alignItems: align === 'right' ? 'flex-end' : 'flex-start', gap: 2 }}>
      <Text style={styles.metricTitle}>{title.toUpperCase()}</Text>
      <Text style={[styles.metricValue, { color, fontSize: prominent ? 40 : 28 }]}>{value}</Text>
    </View>
  );
}

/** Two-column KPI card: title, white value, colored change. */
export function TrendMetrics({ items }: { items: { title: string; value: string; change: number | null }[] }) {
  return (
    <Card>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {items.map((item) => (
          <View key={item.title} style={{ flex: 1, gap: 4 }}>
            <Text style={styles.metricTitle}>{item.title.toUpperCase()}</Text>
            <Text style={styles.kpiValue}>{item.value}</Text>
            {item.change !== null ? (
              <Text style={[styles.kpiChange, { color: TONE_COLOR[toneForChange(item.change)] }]}>{percentText(item.change)}</Text>
            ) : (
              <Text style={[styles.kpiChange, { color: colors.textMuted }]}> </Text>
            )}
          </View>
        ))}
      </View>
    </Card>
  );
}

/** Current value big, previous week small, change on the right. */
export function ComparisonMetric({
  title,
  current,
  previousTitle = 'Vorwoche',
  previous,
  changeText,
  currentColor = colors.text,
  changeColor = colors.textMuted,
}: {
  title: string;
  current: string;
  previousTitle?: string;
  previous: string;
  changeText: string | null;
  currentColor?: string;
  changeColor?: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.metricTitle}>{title.toUpperCase()}</Text>
      <View style={styles.comparisonRow}>
        <Text style={[styles.metricValue, { color: currentColor, fontSize: 34 }]}>{current}</Text>
        <View style={{ flex: 1 }} />
        {changeText ? <Text style={[styles.kpiChange, { color: changeColor, fontSize: 18 }]}>{changeText}</Text> : null}
      </View>
      <Text style={styles.previous}>
        {previousTitle} {previous}
      </Text>
    </View>
  );
}

const de = (n: number) => Math.round(n).toLocaleString('de-DE');

/** Weekday bars with a goal line and the four-week average line (legacy Steps detail). */
export function StepBars({
  bars,
  maximum,
  goal,
  average,
  height = 270,
}: {
  bars: DayBar[];
  maximum: number;
  goal: number;
  average: number | null;
  height?: number;
}) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showAverage, setShowAverage] = useState(false);

  const pad = { top: 22, right: 46, bottom: 26, left: 6 };
  const innerW = Math.max(1, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;
  const yOf = (v: number) => pad.top + innerH * (1 - v / maximum);
  const ticks = useMemo(() => niceTicks(0, maximum, 5).filter((t) => t <= maximum), [maximum]);
  const slot = innerW / 7;

  const handle = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    if (average && Math.abs(locationY - yOf(average)) <= 18) {
      setShowAverage(true);
      return;
    }
    setShowAverage(false);
    setSelected(Math.min(6, Math.max(0, Math.floor((locationX - pad.left) / slot))));
  };

  const barColor = (steps: number) => (steps <= 0 ? 'rgba(255,255,255,0.10)' : steps >= goal ? colors.good : 'rgba(255,255,255,0.38)');
  const sel = selected !== null ? bars[selected] : null;

  return (
    <View>
      <View style={{ minHeight: 24, justifyContent: 'center' }}>
        {sel ? (
          <Text style={styles.selection}>
            {sel.label.toUpperCase()} · {de(sel.steps)}
          </Text>
        ) : null}
      </View>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handle}
        onResponderMove={handle}
        style={{ height }}
      >
        {width > 0 ? (
          <Svg width={width} height={height}>
            {ticks.map((t) => (
              <Line key={`g${t}`} x1={pad.left} x2={width - pad.right} y1={yOf(t)} y2={yOf(t)} stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
            ))}
            {ticks.map((t) => (
              <SvgText key={`l${t}`} x={width - pad.right + 8} y={yOf(t) + 4} fill={colors.textMuted} fontSize={11} fontFamily={FONT}>
                {de(t)}
              </SvgText>
            ))}
            {bars.map((b) => {
              const x = pad.left + b.index * slot + slot * 0.18;
              const w = slot * 0.64;
              const h = Math.max(b.steps > 0 ? 3 : 2, innerH * (b.steps / maximum));
              return (
                <Rect
                  key={b.index}
                  x={x}
                  y={pad.top + innerH - h}
                  width={w}
                  height={h}
                  rx={5}
                  fill={barColor(b.steps)}
                  opacity={selected === null || selected === b.index ? 1 : 0.34}
                />
              );
            })}
            <Line x1={pad.left} x2={width - pad.right} y1={yOf(goal)} y2={yOf(goal)} stroke={colors.good} strokeOpacity={0.72} strokeWidth={1.25} strokeDasharray="5 4" />
            <SvgText x={width - pad.right} y={yOf(goal) - 5} fill={colors.good} fontSize={11} fontWeight="600" textAnchor="end" fontFamily={FONT}>
              {`Ziel ${de(goal)}`}
            </SvgText>
            {average && average > 0 ? (
              <>
                <Line x1={pad.left} x2={width - pad.right} y1={yOf(average)} y2={yOf(average)} stroke="rgba(255,255,255,0.38)" strokeWidth={1} strokeDasharray="6 5" />
                {showAverage ? (
                  <SvgText x={width - pad.right} y={yOf(average) - 5} fill={colors.textMuted} fontSize={11} fontWeight="600" textAnchor="end" fontFamily={FONT}>
                    Ø letzte 4 Wochen
                  </SvgText>
                ) : null}
              </>
            ) : null}
            {bars.map((b) => (
              <SvgText key={`x${b.index}`} x={pad.left + b.index * slot + slot / 2} y={height - 6} fill={colors.text} fontSize={12} fontWeight="600" textAnchor="middle" fontFamily={FONT}>
                {b.label}
              </SvgText>
            ))}
          </Svg>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: colors.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.6 },
  metricTitle: { color: colors.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.4 },
  metricValue: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  kpiValue: { color: colors.text, fontSize: 26, fontWeight: '700', fontVariant: ['tabular-nums'] },
  kpiChange: { fontSize: 15, fontWeight: '600' },
  comparisonRow: { flexDirection: 'row', alignItems: 'baseline' },
  previous: { color: colors.textMuted, fontSize: 14 },
  selection: { color: colors.text, fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
