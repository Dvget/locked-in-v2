import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../../theme';
import { Card } from '../Card';

type Metric = {
  label: string;
  value: string;
  unit?: string;
  color?: string;
};

type Props = {
  metrics: Metric[];
};

export function WeekSummaryCard({ metrics }: Props) {
  return (
    <Card style={styles.card}>
      {metrics.map((metric, index) => (
        <View
          key={metric.label}
          style={[styles.cell, index > 0 && styles.cellDivider]}
        >
          <Text style={styles.label}>{metric.label}</Text>
          <Text style={[styles.value, metric.color ? { color: metric.color } : null]} numberOfLines={1}>
            {metric.value}
            {metric.unit ? <Text style={styles.unit}> {metric.unit}</Text> : null}
          </Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    paddingHorizontal: 0,
  },
  cell: {
    flex: 1,
    gap: 6,
    paddingHorizontal: 10,
  },
  cellDivider: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.border,
  },
  label: {
    color: colors.textMuted,
    ...typography.label,
  },
  value: {
    color: colors.text,
    ...typography.value,
    fontSize: 17,
  },
  unit: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
});
