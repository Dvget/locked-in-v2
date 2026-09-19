import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';

import { Screen } from '../components/Screen';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { CategoryCard, CompactCard, StartCard } from '../components/dashboard/HomeCards';
import { DumbbellIcon, PlayIcon, RunnerIcon, StepsIcon, WeightIcon } from '../components/icons';
import { ACTIVE_RUN_KEY } from '../domain/running';
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

// Legacy Home: brand header, ONE start card (leads to "Workout oder Run?", or resumes an unfinished session),
// then the category cards Workouts / Runs / Steps and the compact Weight card. Each card opens its own detail screen.
export function DashboardScreen({ navigation }: Props) {
  const store = useStore();
  const { data, settings, updateSettings, ready } = store;
  const [hasRun, setHasRun] = useState(false);
  const model = useMemo(() => buildDashboard(data, settings), [data, settings]);

  // Weekly report opens once automatically at the first app start of a new week (legacy behavior, D-053).
  useEffect(() => {
    // The web preview uses non-persistent demo data, so it would reopen on every reload.
    if (!ready || isDemoRepository) return;
    const key = weekKey(Date.now());
    if (settings.lastPresentedWeeklyReport === key) return;
    updateSettings({ lastPresentedWeeklyReport: key });
    if (!buildWeeklyReport(data, settings).isEmpty) navigation.navigate('WeeklyReport');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Is there an unfinished run checkpoint? (re-checked whenever the screen gets focus)
  useEffect(() => {
    const check = () => store.getKV(ACTIVE_RUN_KEY).then((v) => setHasRun(v !== null));
    check();
    return navigation.addListener('focus', check);
  }, [navigation, store]);

  const openWorkout = data.workouts.some((w) => !w.isCompleted && !w.isHidden);
  const startTitle = hasRun ? 'Run fortsetzen' : openWorkout ? 'Workout fortsetzen' : 'Workout starten';
  const onStart = () => {
    if (hasRun) navigation.navigate('Running');
    else if (openWorkout) navigation.navigate('Workout');
    else navigation.navigate('TrainingChoice');
  };

  const bandColor = (delta: number | null) => {
    if (delta === null) return colors.textMuted;
    const band = progressBand(delta);
    return band === 'improved' ? colors.good : band === 'declined' ? colors.bad : colors.warn;
  };
  const workoutDetail = model.weekProgress !== null ? `Wochenfortschritt ${progressText(model.weekProgress)}` : 'Noch kein Wochenvergleich';
  const runDetail = model.runWeekChange !== null ? `${percentText(model.runWeekChange)} zur Vorwoche` : 'Noch kein Wochenvergleich';
  const stepValue = model.stepCardAverage !== null ? `Ø ${formatSteps(model.stepCardAverage)}` : '–';
  const stepColor = model.stepCardAverage !== null ? toneColor(dailyStepStatus(model.stepCardAverage)) : colors.textMuted;

  return (
    <Screen padding={14} gap={10}>
      <DashboardHeader />

      <StartCard
        title={startTitle}
        accent={hasRun ? colors.running : colors.accent}
        icon={<PlayIcon color="#000" />}
        onPress={onStart}
      />

      <CategoryCard
        label="Workouts"
        value={`${model.workoutsThisWeek} / ${settings.workoutsPerWeek}`}
        detail={workoutDetail}
        valueColor={toneColor(model.workoutGoalStatus)}
        detailColor={bandColor(model.weekProgress)}
        accent={colors.accent}
        icon={<DumbbellIcon color={colors.accent} />}
        onPress={() => navigation.navigate('DashboardWorkouts')}
      />
      <CategoryCard
        label="Runs"
        value={`${model.runsThisWeek} / ${settings.runsPerWeek}`}
        detail={runDetail}
        valueColor={toneColor(model.runGoalStatus)}
        detailColor={bandColor(model.runWeekChange)}
        accent={colors.running}
        icon={<RunnerIcon color={colors.running} />}
        onPress={() => navigation.navigate('DashboardRuns')}
      />
      <CategoryCard
        label="Steps"
        value={stepValue}
        detail="Wochenschnitt"
        valueColor={stepColor}
        detailColor={colors.textMuted}
        accent={colors.trendNeutral}
        tileColor={colors.cardSecondary}
        icon={<StepsIcon color="rgba(255,255,255,0.85)" />}
        onPress={() => navigation.navigate('DashboardSteps')}
      />
      <CompactCard
        title="Gewicht"
        detail={
          model.latestWeightKg !== null
            ? `${formatKgText(model.latestWeightKg)} kg${model.weightChange4Weeks !== null ? ` · ${formatSignedKg(model.weightChange4Weeks)} kg in 4 Wochen` : ''}`
            : undefined
        }
        detailColor={model.weightTone ? toneColor(model.weightTone) : undefined}
        icon={<WeightIcon color="rgba(255,255,255,0.8)" />}
        onPress={() => navigation.navigate('DashboardWeight')}
      />
    </Screen>
  );
}
