import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '../components/Screen';
import { AchievementCard } from '../components/dashboard/AchievementCard';
import { ActionTile } from '../components/dashboard/ActionTile';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { ResumeCard } from '../components/dashboard/ResumeCard';
import { TrainingTrendCard } from '../components/dashboard/TrainingTrendCard';
import { WeekSummaryCard } from '../components/dashboard/WeekSummaryCard';
import { WeeklyReportCard } from '../components/dashboard/WeeklyReportCard';
import { WeightTrendCard } from '../components/dashboard/WeightTrendCard';
import { useStore } from '../data/store';
import { buildDashboard, formatDistanceKm, formatKgText, formatSignedKg, formatSteps } from '../domain/dashboard';
import { colors, toneColor } from '../theme';
import type { RootStackParamList, TabParamList } from '../types/navigation';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Dashboard'>,
  NativeStackScreenProps<RootStackParamList>
>;

const TREND_TEXT = {
  up: 'Trend: steigend',
  flat: 'Trend: gleichbleibend',
  down: 'Trend: sinkend',
  none: 'Noch keine Einheiten',
} as const;

export function DashboardScreen({ navigation }: Props) {
  const { data, settings } = useStore();
  const model = useMemo(() => buildDashboard(data, settings), [data, settings]);

  const runInfo =
    model.runsThisWeek === 0
      ? `0 von ${settings.runsPerWeek} diese Woche`
      : `${model.runsThisWeek} von ${settings.runsPerWeek} · ${formatDistanceKm(model.runDistanceThisWeek)}`;

  return (
    <Screen>
      <DashboardHeader />

      <ResumeCard
        onResumeWorkout={() => navigation.navigate('Workout')}
        onResumeRun={() => navigation.navigate('Running')}
      />

      <View style={styles.actions}>
        <ActionTile
          label="Training"
          title="Workout starten"
          info={`${model.workoutsThisWeek} von ${settings.workoutsPerWeek} diese Woche`}
          accent={colors.accent}
          accentSoft={colors.accentSoft}
          accentBorder={colors.accentBorder}
          onPress={() => navigation.navigate('Workout')}
        />
        <ActionTile
          label="Running"
          title="Lauf starten"
          info={runInfo}
          accent={colors.running}
          accentSoft={colors.runningSoft}
          accentBorder={colors.runningBorder}
          onPress={() => navigation.navigate('Running')}
        />
      </View>

      <WeekSummaryCard
        metrics={[
          { label: 'Training', value: String(model.workoutsThisWeek) },
          { label: 'Läufe', value: String(model.runsThisWeek) },
          { label: 'Schritte', value: model.stepsThisWeek > 0 ? formatSteps(model.stepsThisWeek) : '–' },
          {
            label: 'Gewicht',
            value: model.latestWeightKg !== null ? formatKgText(model.latestWeightKg) : '–',
            unit: model.latestWeightKg !== null ? 'kg' : undefined,
          },
        ]}
      />

      <WeightTrendCard
        value={model.latestWeightKg !== null ? `${formatKgText(model.latestWeightKg)} kg` : 'Kein Gewicht'}
        change={
          model.weightChange4Weeks !== null
            ? `${formatSignedKg(model.weightChange4Weeks)} kg in 4 Wochen`
            : 'Trage dein Gewicht ein, um den Verlauf zu sehen'
        }
        changeColor={model.weightTone ? toneColor(model.weightTone) : undefined}
        points={model.weightSeries}
      />
      <TrainingTrendCard
        summary={`${model.trainingTotal4Weeks} Einheiten in 4 Wochen`}
        trend={TREND_TEXT[model.trainingTrend]}
        weeklyCounts={model.trainingCounts4Weeks}
      />

      <WeeklyReportCard onPress={() => navigation.navigate('WeeklyReport')} />

      {model.lastAchievement ? (
        <AchievementCard title={model.lastAchievement.title} value={model.lastAchievement.value} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
});
