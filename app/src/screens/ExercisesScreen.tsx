import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { Screen } from '../components/Screen';
import { Muted, Row } from '../components/ui';
import { useStore } from '../data/store';
import { buildTrainingProgress } from '../domain/progress';
import { colors } from '../theme';
import type { RootStackParamList } from '../types/navigation';

/** "Übungen": every exercise that was trained, most recent first; tap for its statistics. */
export function ExercisesScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Exercises'>) {
  const { data } = useStore();
  const training = useMemo(() => buildTrainingProgress(data), [data]);
  return (
    <Screen padding={16} gap={10}>
      {training.exercises.length === 0 ? <Muted>Noch keine Übungen geloggt.</Muted> : null}
      {training.exercises.map((e) => (
        <Row key={e.id} onPress={() => navigation.navigate('ExerciseStats', { exerciseId: e.id })}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{e.name}</Text>
            <Muted>{e.sessions}× trainiert</Muted>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 20 }}>›</Text>
        </Row>
      ))}
    </Screen>
  );
}
