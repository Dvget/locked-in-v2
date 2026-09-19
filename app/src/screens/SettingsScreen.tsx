import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';

import { Screen } from '../components/Screen';
import { Heading, Muted, Row } from '../components/ui';
import { useStore } from '../data/store';
import { colors } from '../theme';
import type { RootStackParamList, TabParamList } from '../types/navigation';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Settings'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function SettingsScreen({ navigation }: Props) {
  const { data } = useStore();
  const items: { title: string; info: string; target: keyof RootStackParamList }[] = [
    { title: 'Trainingspläne', info: `${data.plans.length} Pläne`, target: 'TrainingPlans' },
    { title: 'Ziele', info: 'Gewichtsrichtung, Wochenziele', target: 'Goals' },
    { title: 'Daten & Backup', info: 'Sichern, Wiederherstellen, Export', target: 'DataBackup' },
    { title: 'Über LOCKED IN', info: 'Version und Datenquellen', target: 'About' },
  ];
  return (
    <Screen>
      <Heading>Einstellungen</Heading>
      {items.map((item) => (
        <Row key={item.title} onPress={() => (navigation.navigate as (t: string) => void)(item.target)}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>{item.title}</Text>
            <Muted>{item.info}</Muted>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 20 }}>›</Text>
        </Row>
      ))}
    </Screen>
  );
}
