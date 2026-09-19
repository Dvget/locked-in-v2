import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chevron } from '../components/Chevron';
import { DriveIcon, DumbbellIcon, InfoIcon, TargetIcon } from '../components/icons';
import { useStore } from '../data/store';
import { colors } from '../theme';
import type { RootStackParamList, TabParamList } from '../types/navigation';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Settings'>,
  NativeStackScreenProps<RootStackParamList>
>;

// Legacy Settings: a large title and equally tall tiles (green glyph in a 62 tile, 22 bold title, grey subtitle).
export function SettingsScreen({ navigation }: Props) {
  const { data } = useStore();
  const tiles: { title: string; subtitle: string; icon: ReactNode; target: keyof RootStackParamList }[] = [
    {
      title: 'Trainingspläne',
      subtitle: `Übungen, Sätze und Alternativen · ${data.plans.length} Pläne`,
      icon: <DumbbellIcon color={colors.good} size={32} />,
      target: 'TrainingPlans',
    },
    {
      title: 'Ziele',
      subtitle: 'Gewichtsrichtung, Wochenziele und Schritte',
      icon: <TargetIcon color={colors.good} size={32} />,
      target: 'Goals',
    },
    {
      title: 'Backup & Daten',
      subtitle: 'Sichern, exportieren und importieren',
      icon: <DriveIcon color={colors.good} size={32} />,
      target: 'DataBackup',
    },
    {
      title: 'Über LOCKED IN',
      subtitle: 'Version, Datenbank und Datenspeicherung',
      icon: <InfoIcon color={colors.good} size={32} />,
      target: 'About',
    },
  ];
  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <Text style={styles.heading}>Einstellungen</Text>
      <View style={styles.tiles}>
        {tiles.map((t) => (
          <Pressable
            key={t.title}
            accessibilityRole="button"
            onPress={() => (navigation.navigate as (target: string) => void)(t.target)}
            style={({ pressed }) => [styles.tile, pressed && { opacity: 0.75 }]}
          >
            <View style={styles.iconTile}>{t.icon}</View>
            <View style={styles.texts}>
              <Text style={styles.title}>{t.title}</Text>
              <Text style={styles.subtitle} numberOfLines={2}>
                {t.subtitle}
              </Text>
            </View>
            <Chevron />
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  heading: { color: colors.text, fontSize: 34, fontWeight: '700', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  tiles: { flex: 1, gap: 12, paddingHorizontal: 16, paddingBottom: 16 },
  tile: {
    flex: 1,
    minHeight: 92,
    maxHeight: 150,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  iconTile: {
    width: 62,
    height: 62,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: 7 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  subtitle: { color: colors.textMuted, fontSize: 15 },
});
