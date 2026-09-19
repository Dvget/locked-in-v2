import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Dashboard: undefined;
  Progress: undefined;
  Settings: undefined;
};

export type HistoryKind = 'workouts' | 'runs' | 'weights';

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  Workout: undefined;
  Running: undefined;
  WeeklyReport: undefined;
  TrainingPlans: undefined;
  PlanEditor: { planId: string | null };
  Goals: undefined;
  DataBackup: undefined;
  About: undefined;
  History: { kind: HistoryKind };
  WorkoutDetail: { workoutId: string };
  RunDetail: { runId: string };
  ExerciseStats: { exerciseId: string };
  Achievements: undefined;
  TrainingChoice: undefined;
  Exercises: undefined;
  DashboardWorkouts: undefined;
  DashboardRuns: undefined;
  DashboardSteps: undefined;
  DashboardWeight: undefined;
};
