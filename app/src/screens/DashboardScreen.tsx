import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text } from 'react-native';

import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { colors } from '../theme';
import type { RootStackParamList, TabParamList } from '../types/navigation';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Dashboard'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function DashboardScreen({ navigation }: Props) {
  return (
    <Screen>
      <Text style={styles.heading}>Dashboard</Text>
      <Card
        title="Workout"
        description="Start a workout"
        onPress={() => navigation.navigate('Workout')}
      />
      <Card
        title="Running"
        description="Start a run"
        onPress={() => navigation.navigate('Running')}
      />
      <Card title="Steps" description="Placeholder" />
      <Card title="Weight" description="Placeholder" />
      <Card
        title="Weekly Report"
        description="Open the weekly report"
        onPress={() => navigation.navigate('WeeklyReport')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '600',
  },
});
