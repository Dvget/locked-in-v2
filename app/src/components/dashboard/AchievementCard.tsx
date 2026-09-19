import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../../theme';
import { Card } from '../Card';

type Props = {
  title: string;
  value: string;
};

export function AchievementCard({ title, value }: Props) {
  return (
    <Card style={styles.card}>
      <View style={styles.text}>
        <Text style={styles.label}>Letzter Erfolg</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: {
    gap: 4,
  },
  label: {
    color: colors.textMuted,
    ...typography.label,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  value: {
    color: colors.running,
    fontSize: 20,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
