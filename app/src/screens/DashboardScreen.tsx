import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';

import { Screen } from '../components/Screen';
import { WeightEntrySheet } from '../components/WeightEntrySheet';
import { AchievementCard } from '../components/dashboard/AchievementCard';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { CategoryCard, CompactCard, StartCard } from '../components/dashboard/HomeCards';
import { ResumeCard } from '../components/dashboard/ResumeCard';
import { WeeklyReportCard } from '../components/dashboard/WeeklyReportCard';
import { DumbbellIcon, PlayIcon, RunnerIcon, StepsIcon, WeightIcon } from '../components/icons';
import { isDemoRepository } from '../data/createRepository';
import { useStore } from '../data/store';
import { dailyStepStatus } from '../domain/analytics';
import { buildDashboard, formatKgText, formatSignedKg, formatSteps } from '../domain/dashboard';
import { progressBand, progressText } from '../domain/strength';
import { buildWeeklyReport, percentText, weekKey } from '../domain/weeklyReport';
import { colors, toneColor } from '../theme';
import type { RootStackParamList, TabParamList } from '../types/navigation';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Dashboard'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function DashboardScreen({ navigation }: Props) {
  const { data, settings, updateSettings, ready } = useStore();
  const [weightSheet, setWeightSheet] = useState(false);
  const model = useMemo(() => buildDashboard(data, settings), [data, settings]);

  // Weekly report opens once automatically at the first app start of a new week (legacy behavior).
  useEffect(() => {
    // The web preview uses non-persistent demo data, so it would reopen on every reload.
    if (!ready || isDemoRepository) return;
    const key = weekKey(Date.now());
    if (settings.lastPresentedWeeklyReport === key) return;
    updateSettings({ lastPresentedWeeklyReport: key });
    if (!buildWeeklyReport(data, settings).isEmpty) navigation.navigate('WeeklyReport');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const toProgress = () => navigation.navigate('Tabs', { screen: 'Progress' });

  // Workouts card: goal progress plus the weekly strength index.
  const bandColor = (delta: number | null) => {
    if (delta === null) return colors.textMuted;
    const band = progressBand(delta);
    return band === 'improved' ? colors.good : band === 'declined' ? colors.bad : colors.warn;
  };
  const workoutDetail = model.weekProgress !== null ? `Wochenfortschritt ${progressText(model.weekProgress)}` : 'Noch kein Vergleich';
  const runDetail =
    model.runWeekChange !== null ? `${percentText(model.runWeekChange)} zur Vorwoche` : 'Noch kein Vergleich zur Vorwoche';

  const stepValue = model.stepCardAverage !== null ? `Ø ${formatSteps(model.stepCardAverage)}` : '–';
  const stepColor = model.stepCardAverage !== null ? toneColor(dailyStepStatus(model.stepCardAverage)) : colors.textMuted;

  return (
    <Screen padding={14} gap={10}>
      <DashboardHeader />

      <ResumeCard onResumeWorkout={() => navigation.navigate('Workout')} onResumeRun={() => navigation.navigate('Running')} />

      <StartCard
        title="Workout starten"
        accent={colors.accent}
        icon={<PlayIcon color="#000" />}
        onPress={() => navigation.navigate('Workout')}
      />
      <StartCard
        title="Lauf starten"
        accent={colors.running}
        icon={<PlayIcon color="#000" />}
        onPress={() => navigation.navigate('Running')}
      />

      <CategoryCard
        label="Workouts"
        value={`${model.workoutsThisWeek} / ${settings.workoutsPerWeek}`}
        detail={workoutDetail}
        valueColor={toneColor(model.workoutGoalStatus)}
        detailColor={bandColor(model.weekProgress)}
        accent={colors.accent}
        icon={<DumbbellIcon color={colors.accent} />}
        onPress={toProgress}
      />
      <CategoryCard
        label="Runs"
        value={`${model.runsThisWeek} / ${settings.runsPerWeek}`}
        detail={runDetail}
        valueColor={toneColor(model.runGoalStatus)}
        detailColor={bandColor(model.runWeekChange)}
        accent={colors.running}
        icon={<RunnerIcon color={colors.running} />}
        onPress={toProgress}
      />
      <CategoryCard
        label="Steps"
        value={stepValue}
        detail={settings.stepsEnabled || model.stepCardAverage !== null ? 'Wochenschnitt' : 'In den Zielen aktivieren'}
        valueColor={stepColor}
        detailColor={colors.textMuted}
        accent={colors.trendNeutral}
        tileColor={colors.cardSecondary}
        icon={<StepsIcon color="rgba(255,255,255,0.85)" />}
        onPress={() => navigation.navigate('Goals')}
      />
      <CompactCard
        title="Gewicht"
        detail={
          model.latestWeightKg !== null
            ? `${formatKgText(model.latestWeightKg)} kg${model.weightChange4Weeks !== null ? ` · ${formatSignedKg(model.weightChange4Weeks)} kg in 4 Wochen` : ''}`
            : 'Tippen zum Eintragen'
        }
        detailColor={model.weightTone ? toneColor(model.weightTone) : undefined}
        icon={<WeightIcon color="rgba(255,255,255,0.8)" />}
        onPress={() => setWeightSheet(true)}
      />

      <WeeklyReportCard onPress={() => navigation.navigate('WeeklyReport')} />

      {model.lastAchievement ? <AchievementCard title={model.lastAchievement.title} value={model.lastAchievement.value} /> : null}

      <WeightEntrySheet visible={weightSheet} onClose={() => setWeightSheet(false)} />
    </Screen>
  );
}
