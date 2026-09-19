import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { DumbbellIcon, RunnerIcon } from '../components/icons';
import { Button } from '../components/ui';
import { colors } from '../theme';
import type { RootStackParamList } from '../types/navigation';

type Mode = 'strength' | 'running';

// Legacy "Workout oder Run?": two large cards with a selection state and one confirm button at the bottom.
export function TrainingChoiceScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'TrainingChoice'>) {
  const [mode, setMode] = useState<Mode>('strength');

  const card = (value: Mode, title: string, icon: (color: string) => React.ReactNode) => {
    const selected = mode === value;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={title}
        onPress={() => setMode(value)}
        style={[styles.card, selected && styles.cardSelected]}
      >
        <View style={[styles.check, selected && { backgroundColor: colors.good, borderColor: colors.good }]}>
          {selected ? <Text style={styles.checkMark}>✓</Text> : null}
        </View>
        <View style={[styles.iconTile, selected && { backgroundColor: colors.good }]}>
          {icon(selected ? '#000' : colors.good)}
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.close}>Schließen</Text>
        </Pressable>
        <DashboardHeader />
        <Text style={[styles.close, { opacity: 0 }]}>Schließen</Text>
      </View>

      <View style={styles.heading}>
        <Text style={styles.title}>Workout oder Run?</Text>
        <Text style={styles.subtitle}>Wähle, was heute ansteht.</Text>
      </View>

      <View style={styles.cards}>
        {card('strength', 'Workout', (c) => (
          <DumbbellIcon color={c} size={52} />
        ))}
        {card('running', 'Run', (c) => (
          <RunnerIcon color={c} size={52} />
        ))}
      </View>

      <View style={styles.bottom}>
        <Button
          label={mode === 'strength' ? 'Workout auswählen' : 'Run starten'}
          variant="primary"
          height={58}
          iconRight={<Text style={styles.arrow}>→</Text>}
          onPress={() => navigation.replace(mode === 'strength' ? 'Workout' : 'Running')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#040604' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 4 },
  close: { color: colors.textMuted, fontSize: 17 },
  heading: { paddingHorizontal: 18, paddingTop: 28, paddingBottom: 18, gap: 8 },
  title: { color: colors.text, fontSize: 34, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 15 },
  cards: { flex: 1, gap: 14, paddingHorizontal: 18 },
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  cardSelected: { backgroundColor: 'rgba(140,219,79,0.10)', borderColor: 'rgba(140,219,79,0.75)', borderWidth: 1.5 },
  iconTile: {
    width: 92,
    height: 92,
    borderRadius: 24,
    backgroundColor: 'rgba(140,219,79,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { color: colors.text, fontSize: 28, fontWeight: '800' },
  check: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: '#000', fontSize: 15, fontWeight: '900' },
  bottom: { padding: 18, backgroundColor: 'rgba(0,0,0,0.96)' },
  arrow: { color: '#000', fontSize: 20, fontWeight: '700' },
});
