import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../../theme';
import { Card } from '../Card';

type Props = {
  summary: string;
  trend: string;
  weeklyCounts: readonly number[];
};

const BAR_MAX_HEIGHT = 36;

export function TrainingTrendCard({ summary, trend, weeklyCounts }: Props) {
  const max = Math.max(...weeklyCounts, 1);

  return (
    <Card style={styles.card}>
      <View style={styles.text}>
        <Text style={styles.label}>Training</Text>
        <Text style={styles.value}>{summary}</Text>
        <Text style={styles.caption}>{trend}</Text>
      </View>
      <View style={styles.bars}>
        {weeklyCounts.map((count, index) => (
          <View
            key={index}
            style={[
              styles.bar,
              {
                height: Math.max(6, (count / max) * BAR_MAX_HEIGHT),
                opacity: index === weeklyCounts.length - 1 ? 1 : 0.45,
              },
            ]}
          />
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  text: {
    flex: 1,
    gap: 4,
  },
  label: {
    color: colors.textMuted,
    ...typography.label,
  },
  value: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  caption: {
    color: colors.textMuted,
    fontSize: 13,
  },
  bars: {
    width: 112,
    height: 44,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  bar: {
    width: 18,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
});
