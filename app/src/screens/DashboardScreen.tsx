import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';

import { Screen } from '../components/Screen';
import { AchievementCard } from '../components/dashboard/AchievementCard';
import { ActionTile } from '../components/dashboard/ActionTile';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { TrainingTrendCard } from '../components/dashboard/TrainingTrendCard';
import { WeekSummaryCard } from '../components/dashboard/WeekSummaryCard';
import { WeeklyReportCard } from '../components/dashboard/WeeklyReportCard';
import { WeightTrendCard } from '../components/dashboard/WeightTrendCard';
import { dashboardDummy } from '../data/dashboardDummy';
import { colors } from '../theme';
import type { RootStackParamList, TabParamList } from '../types/navigation';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Dashboard'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function DashboardScreen({ navigation }: Props) {
  const { week, weightTrend, trainingTrend, lastAchievement } = dashboardDummy;

  return (
    <Screen>
      <DashboardHeader />

      <View style={styles.actions}>
        <ActionTile
          label="Training"
          title="Workout starten"
          info={`${week.workouts} Einheiten diese Woche`}
          accent={colors.accent}
          accentSoft={colors.accentSoft}
          accentBorder={colors.accentBorder}
          onPress={() => navigation.navigate('Workout')}
        />
        <ActionTile
          label="Running"
          title="Lauf starten"
          info={`${week.runs} Lauf · ${week.runDistance}`}
          accent={colors.running}
          accentSoft={colors.runningSoft}
          accentBorder={colors.runningBorder}
          onPress={() => navigation.navigate('Running')}
        />
      </View>

      <WeekSummaryCard
        metrics={[
          { label: 'Training', value: String(week.workouts) },
          { label: 'Läufe', value: String(week.runs) },
          { label: 'Schritte', value: week.steps },
          { label: 'Gewicht', value: week.weight, unit: week.weightUnit },
        ]}
      />

      <WeightTrendCard
        value={weightTrend.value}
        change={weightTrend.change}
        points={weightTrend.points}
      />
      <TrainingTrendCard
        summary={trainingTrend.summary}
        trend={trainingTrend.trend}
        weeklyCounts={trainingTrend.weeklyCounts}
      />

      <WeeklyReportCard onPress={() => navigation.navigate('WeeklyReport')} />

      <AchievementCard
        title={lastAchievement.title}
        value={lastAchievement.value}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
});
