// Minimal calm charts drawn with react-native-svg (no chart library).
import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import {
  areaPath,
  linePath,
  nearestIndex,
  niceTicks,
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
  /** Legacy style: value labels on the right, dates below, plain line with dots, no read-out row. */
  axis?: { yFormat: (y: number) => string; xFormat: (x: number) => string };
};

const FONT = Platform.OS === 'web' ? 'system-ui, -apple-system, sans-serif' : undefined;
const PADDING = { top: 12, right: 12, bottom: 12, left: 12 };
const AXIS_PADDING = { top: 14, right: 50, bottom: 28, left: 12 };

export function LineChart({ points, color = colors.accent, height = 160, format = (y) => String(y), emptyText, onSelect, axis }: LineProps) {
  const padding = axis ? AXIS_PADDING : PADDING;
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const layout = useMemo(() => ({ width, height, padding }), [width, height, padding]);
  const range = useMemo(() => {
    const padded = paddedRange(points.map((p) => p.y));
    if (!axis) return padded;
    const nice = niceTicks(padded.min, padded.max, 5);
    return { min: nice[0], max: nice[nice.length - 1] };
  }, [points, axis]);
  const scaled = useMemo(() => scalePoints(points, layout, range), [points, layout, range]);
  const gridValues = axis ? niceTicks(range.min, range.max, 5) : ticks(range.min, range.max, 3);
  const baseline = height - padding.bottom;
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
      {axis ? null : (
        <View style={styles.readout}>
          <Text style={styles.readoutValue}>{sel ? format(sel.point.y) : ''}</Text>
          <Text style={styles.readoutLabel}>{sel?.point.label ?? ''}</Text>
        </View>
      )}
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={pick}
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
              return (
                <React.Fragment key={i}>
                  <Line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke={colors.border} strokeWidth={1} />
                  {axis ? (
                    <SvgText x={width - padding.right + 8} y={y + 4} fill={colors.textMuted} fontSize={12} fontFamily={FONT}>
                      {axis.yFormat(v)}
                    </SvgText>
                  ) : null}
                </React.Fragment>
              );
            })}
            {scaled.length > 1 && !axis ? <Path d={areaPath(scaled, baseline)} fill={`url(#${gradientId})`} /> : null}
            {scaled.length > 1 ? (
              <Path d={linePath(scaled)} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            ) : null}
            {scaled.length <= 40
              ? scaled.map((s, i) => <Circle key={i} cx={s.px} cy={s.py} r={i === selected ? 5 : 3} fill={color} />)
              : null}
            {sel ? <Line x1={sel.px} x2={sel.px} y1={padding.top} y2={baseline} stroke={color} strokeOpacity={0.35} strokeWidth={1} /> : null}
            {axis
              ? [0, Math.floor((scaled.length - 1) / 2), scaled.length - 1]
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .map((i) => (
                    <SvgText key={'x' + i} x={scaled[i].px} y={height - 6} fill={colors.textMuted} fontSize={12} fontFamily={FONT} textAnchor="middle">
                      {axis.xFormat(scaled[i].point.x)}
                    </SvgText>
                  ))
              : null}
            {sel ? <Circle cx={sel.px} cy={sel.py} r={6} fill={colors.background} stroke={color} strokeWidth={2.5} /> : null}
          </Svg>
        ) : null}
      </View>
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
