// Minimal calm charts drawn with react-native-svg (no chart library).
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import {
  areaPath,
  linePath,
  nearestIndex,
  paddedRange,
  scalePoints,
  ticks,
  type ChartPoint,
} from '../domain/chartMath';
import { colors } from '../theme';

type LineProps = {
  points: ChartPoint[];
  color?: string;
  height?: number;
  /** Formats a y value for the selection read-out. */
  format?: (y: number) => string;
  /** Formats the axis tick labels (defaults to format). */
  emptyText?: string;
  onSelect?: (point: ChartPoint | null) => void;
};

const PADDING = { top: 12, right: 12, bottom: 12, left: 12 };

export function LineChart({ points, color = colors.accent, height = 160, format = (y) => String(y), emptyText, onSelect }: LineProps) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const layout = useMemo(() => ({ width, height, padding: PADDING }), [width, height]);
  const range = useMemo(() => paddedRange(points.map((p) => p.y)), [points]);
  const scaled = useMemo(() => scalePoints(points, layout, range), [points, layout, range]);
  const gridValues = ticks(range.min, range.max, 3);
  const baseline = height - PADDING.bottom;
  const gradientId = useMemo(() => `g${Math.random().toString(36).slice(2, 8)}`, []);

  const pick = (e: GestureResponderEvent) => {
    if (scaled.length === 0) return;
    const index = nearestIndex(scaled, e.nativeEvent.locationX);
    setSelected(index);
    onSelect?.(scaled[index].point);
  };

  if (points.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>{emptyText ?? 'Noch keine Daten'}</Text>
      </View>
    );
  }

  const sel = selected !== null && selected < scaled.length ? scaled[selected] : scaled[scaled.length - 1];

  return (
    <View>
      <View style={styles.readout}>
        <Text style={styles.readoutValue}>{sel ? format(sel.point.y) : ''}</Text>
        <Text style={styles.readoutLabel}>{sel?.point.label ?? ''}</Text>
      </View>
      <Pressable
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onPressIn={pick}
        onResponderMove={pick}
        style={{ height }}
      >
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color} stopOpacity={0.28} />
                <Stop offset="1" stopColor={color} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {gridValues.map((v, i) => {
              const y = scalePoints([{ x: 0, y: v }], layout, range)[0].py;
              return <Line key={i} x1={PADDING.left} x2={width - PADDING.right} y1={y} y2={y} stroke={colors.border} strokeWidth={1} />;
            })}
            {scaled.length > 1 ? <Path d={areaPath(scaled, baseline)} fill={`url(#${gradientId})`} /> : null}
            {scaled.length > 1 ? (
              <Path d={linePath(scaled)} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            ) : null}
            {scaled.length <= 40
              ? scaled.map((s, i) => <Circle key={i} cx={s.px} cy={s.py} r={i === selected ? 5 : 3} fill={color} />)
              : null}
            {sel ? <Line x1={sel.px} x2={sel.px} y1={PADDING.top} y2={baseline} stroke={color} strokeOpacity={0.35} strokeWidth={1} /> : null}
            {sel ? <Circle cx={sel.px} cy={sel.py} r={6} fill={colors.background} stroke={color} strokeWidth={2.5} /> : null}
          </Svg>
        ) : null}
      </Pressable>
    </View>
  );
}

type BarDatum = { label: string; value: number; highlight?: boolean };

export function BarChart({
  data,
  color = colors.accent,
  height = 130,
  format = (v) => String(v),
  max,
}: {
  data: BarDatum[];
  color?: string;
  height?: number;
  format?: (v: number) => string;
  max?: number;
}) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const top = max ?? Math.max(1, ...data.map((d) => d.value));
  const plotH = height - 22;
  const gap = 6;
  const barW = data.length > 0 && width > 0 ? Math.max(3, (width - gap * (data.length - 1)) / data.length) : 0;
  const sel = selected !== null ? data[selected] : null;

  return (
    <View>
      <View style={styles.readout}>
        <Text style={styles.readoutValue}>{sel ? format(sel.value) : ' '}</Text>
        <Text style={styles.readoutLabel}>{sel?.label ?? ''}</Text>
      </View>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            {data.map((d, i) => {
              const h = Math.max(d.value > 0 ? 3 : 0, (d.value / top) * (plotH - 4));
              const x = i * (barW + gap);
              return (
                <Rect
                  key={i}
                  x={x}
                  y={plotH - h}
                  width={barW}
                  height={h}
                  rx={4}
                  fill={color}
                  opacity={selected === null ? (d.highlight === false ? 0.45 : 1) : selected === i ? 1 : 0.4}
                  onPress={() => setSelected(selected === i ? null : i)}
                />
              );
            })}
          </Svg>
        ) : null}
        <View style={styles.barLabels} pointerEvents="none">
          {data.map((d, i) => (
            <Text key={i} style={[styles.barLabel, { width: barW + gap }]} numberOfLines={1}>
              {data.length <= 14 || i % Math.ceil(data.length / 10) === 0 ? d.label : ''}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 14 },
  readout: { flexDirection: 'row', alignItems: 'baseline', gap: 8, minHeight: 26 },
  readoutValue: { color: colors.text, fontSize: 20, fontWeight: '600', fontVariant: ['tabular-nums'] },
  readoutLabel: { color: colors.textMuted, fontSize: 12 },
  barLabels: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row' },
  barLabel: { color: colors.textMuted, fontSize: 10, textAlign: 'left' },
});
