import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useStore } from '../../data/store';
import { ACTIVE_RUN_KEY } from '../../domain/running';
import { colors } from '../../theme';
import { Card } from '../Card';
import { Chevron } from '../Chevron';

type Props = {
  onResumeWorkout: () => void;
  onResumeRun: () => void;
};

/** Shows a resume entry when an unfinished workout or run exists (legacy behavior). */
export function ResumeCard({ onResumeWorkout, onResumeRun }: Props) {
  const store = useStore();
  const [hasRun, setHasRun] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      store.getKV(ACTIVE_RUN_KEY).then((v) => alive && setHasRun(v !== null));
      return () => {
        alive = false;
      };
    }, [store]),
  );

  const openWorkout = store.data.workouts.find((w) => !w.isCompleted && !w.isHidden);
  if (!openWorkout && !hasRun) return null;

  return (
    <View style={styles.wrap}>
      {openWorkout ? (
        <Card style={styles.card} onPress={onResumeWorkout}>
          <View>
            <Text style={[styles.label, { color: colors.accent }]}>Läuft noch</Text>
            <Text style={styles.title}>Workout fortsetzen</Text>
          </View>
          <Chevron />
        </Card>
      ) : null}
      {hasRun ? (
        <Card style={styles.card} onPress={onResumeRun}>
          <View>
            <Text style={[styles.label, { color: colors.running }]}>Läuft noch</Text>
            <Text style={styles.title}>Lauf fortsetzen</Text>
          </View>
          <Chevron />
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 16, fontWeight: '600', marginTop: 2 },
});
