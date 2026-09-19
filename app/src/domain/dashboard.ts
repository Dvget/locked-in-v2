// Dashboard view model (D-012, D-037): current week plus roughly the last four weeks. Pure and testable.
import {
  addDays,
  daysBetween,
  isInside,
  remainingDaysInWeek,
  startOfDay,
  weekInterval,
  type Ms,
} from './dates';
import {
  completedWeekToDateStepComparison,
  countChange,
  preferredStepSamples,
  recordedStepAverage,
  stepComparisonChange,
  stepProgressStatus,
  weeklyGoalStatus,
  weekToDateCountComparison,
  weightPoints,
  type Status,
} from './analytics';
import { computeAchievements, type Achievement } from './achievements';
import type { AppData, Settings, WeightDirection } from '../data/repository';

export interface DashboardModel {
  workoutsThisWeek: number;
  runsThisWeek: number;
  runDistanceThisWeek: number;
  stepsThisWeek: number;
  stepAverage: number | null;
  latestWeightKg: number | null;
  weightChange4Weeks: number | null;
  weightTone: Status | null;
  weightSeries: number[];
  trainingCounts4Weeks: number[];
  trainingTotal4Weeks: number;
  trainingTrend: 'up' | 'flat' | 'down' | 'none';
  stepStatus: Status | null;
  workoutGoalStatus: Status;
  runGoalStatus: Status;
  workoutChange: number | null;
  stepChange: number | null;
  lastAchievement: Achievement | null;
  hasAnyData: boolean;
}

export function weightTone(changeKg: number, direction: WeightDirection): Status {
  switch (direction) {
    case 'lose':
      return changeKg <= 0 ? 'green' : changeKg <= 0.5 ? 'yellow' : 'red';
    case 'gain':
      return changeKg >= 0 ? 'green' : changeKg >= -0.5 ? 'yellow' : 'red';
    case 'maintain': {
      const abs = Math.abs(changeKg);
      return abs <= 0.5 ? 'green' : abs <= 1 ? 'yellow' : 'red';
    }
  }
}

export function formatKgText(value: number): string {
  return value.toFixed(1).replace('.', ',');
}

export function formatSignedKg(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return '±0,0';
  return `${rounded > 0 ? '+' : '-'}${Math.abs(rounded).toFixed(1).replace('.', ',')}`;
}

export function formatSteps(steps: number): string {
  return Math.round(steps).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatDistanceKm(km: number): string {
  return `${km.toFixed(1).replace('.', ',')} km`;
}

export function buildDashboard(data: AppData, settings: Settings, now: Ms = Date.now()): DashboardModel {
  const workouts = data.workouts.filter((w) => w.isCompleted && !w.isHidden);
  const runs = data.runs.filter((r) => !r.isHidden && r.distanceKm > 0);
  const weights = data.weights.filter((w) => !w.isHidden && w.weightKg > 0);
  const week = weekInterval(now);

  const workoutDates = workouts.map((w) => w.startedAt);
  const runDates = runs.map((r) => r.date);
  const workoutsThisWeek = workoutDates.filter((d) => isInside(d, week)).length;
  const runsThisWeek = runDates.filter((d) => isInside(d, week)).length;
  const runDistanceThisWeek = runs.filter((r) => isInside(r.date, week)).reduce((t, r) => t + r.distanceKm, 0);

  const stepSamples = data.steps.map((s) => ({ date: s.date, steps: s.steps, source: s.source }));
  const preferred = preferredStepSamples(stepSamples);
  const stepsThisWeek = preferred.filter((s) => isInside(s.date, week)).reduce((t, s) => t + s.steps, 0);
  const stepAverage = recordedStepAverage(
    preferred.filter((s) => isInside(s.date, week) && startOfDay(s.date) < startOfDay(now)),
  );

  // Weight: weekly averages over the last four weeks.
  const sortedWeights = weights.slice().sort((a, b) => a.date - b.date);
  const latestWeightKg = sortedWeights.length ? sortedWeights[sortedWeights.length - 1].weightKg : null;
  const window = weights
    .map((w) => ({ date: w.date, weightKg: w.weightKg }))
    .filter((w) => w.date >= addDays(startOfDay(now), -27) && w.date < addDays(startOfDay(now), 1));
  const points = weightPoints(window, 'month', now);
  const weightSeries = points.map((p) => p.averageKg);
  let weightChange4Weeks: number | null = null;
  if (window.length >= 2) {
    const ordered = window.slice().sort((a, b) => a.date - b.date);
    weightChange4Weeks = ordered[ordered.length - 1].weightKg - ordered[0].weightKg;
  }
  const weightTone_ = weightChange4Weeks === null ? null : weightTone(weightChange4Weeks, settings.weightDirection);

  // Training: sessions per calendar week, last four weeks (oldest first).
  const trainingCounts4Weeks: number[] = [];
  for (let i = 3; i >= 0; i--) {
    const interval = weekInterval(addDays(week.start, -7 * i));
    trainingCounts4Weeks.push(workoutDates.filter((d) => isInside(d, interval)).length);
  }
  const trainingTotal4Weeks = trainingCounts4Weeks.reduce((t, c) => t + c, 0);
  const firstHalf = trainingCounts4Weeks[0] + trainingCounts4Weeks[1];
  const secondHalf = trainingCounts4Weeks[2] + trainingCounts4Weeks[3];
  const trainingTrend =
    trainingTotal4Weeks === 0 ? 'none' : secondHalf > firstHalf ? 'up' : secondHalf < firstHalf ? 'down' : 'flat';

  const stepStatus =
    stepsThisWeek > 0 ? stepProgressStatus(stepsThisWeek, daysBetween(week.start, now) + 1, settings.weeklyStepGoal) : null;
  const remaining = remainingDaysInWeek(now);
  const workoutGoalStatus = weeklyGoalStatus({
    completed: workoutsThisWeek,
    otherCompleted: runsThisWeek,
    remainingDays: remaining,
    target: settings.workoutsPerWeek,
    otherTarget: settings.runsPerWeek,
  });
  const runGoalStatus = weeklyGoalStatus({
    completed: runsThisWeek,
    otherCompleted: workoutsThisWeek,
    remainingDays: remaining,
    target: settings.runsPerWeek,
    otherTarget: settings.workoutsPerWeek,
  });

  const workoutChange = countChange(weekToDateCountComparison(workoutDates, now));
  const stepChange = stepComparisonChange(completedWeekToDateStepComparison(stepSamples, now));

  const achievements = computeAchievements(data.workouts, data.sets, data.runs);
  const lastAchievement = achievements.length ? achievements[achievements.length - 1] : null;

  return {
    workoutsThisWeek,
    runsThisWeek,
    runDistanceThisWeek,
    stepsThisWeek,
    stepAverage,
    latestWeightKg,
    weightChange4Weeks,
    weightTone: weightTone_,
    weightSeries,
    trainingCounts4Weeks,
    trainingTotal4Weeks,
    trainingTrend,
    stepStatus,
    workoutGoalStatus,
    runGoalStatus,
    workoutChange,
    stepChange,
    lastAchievement,
    hasAnyData: workouts.length + runs.length + weights.length + data.steps.length > 0,
  };
}
