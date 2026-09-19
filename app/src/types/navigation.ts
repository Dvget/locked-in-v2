import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Dashboard: undefined;
  Progress: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  Workout: undefined;
  Running: undefined;
  WeeklyReport: undefined;
};
