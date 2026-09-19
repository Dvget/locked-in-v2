import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../../theme';
import { Card } from '../Card';
import { Sparkline } from '../Sparkline';

type Props = {
  value: string;
  change: string;
  points: readonly number[];
  changeColor?: string;
  onPress?: () => void;
};

export function WeightTrendCard({ value, change, points, changeColor, onPress }: Props) {
  return (
    <Card style={styles.card} onPress={onPress}>
      <View style={styles.text}>
        <Text style={styles.label}>Gewicht</Text>
        <Text style={styles.value}>{value}</Text>
        <Text style={[styles.caption, changeColor ? { color: changeColor } : null]}>{change}</Text>
      </View>
      <View style={styles.viz}>
        <Sparkline points={[...points]} color={colors.trendNeutral} />
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
    fontSize: 22,
    fontWeight: '600',
  },
  caption: {
    color: colors.textMuted,
    fontSize: 13,
  },
  viz: {
    width: 112,
  },
});
