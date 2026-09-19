import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme';
import { Card } from '../Card';
import { Chevron } from '../Chevron';

type Props = {
  onPress: () => void;
};

export function WeeklyReportCard({ onPress }: Props) {
  return (
    <Card style={styles.card} onPress={onPress}>
      <View style={styles.text}>
        <Text style={styles.title}>Wochenbericht</Text>
        <Text style={styles.description}>Deine letzte Woche im Überblick</Text>
      </View>
      <Chevron />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 60,
  },
  text: {
    gap: 2,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
