import {
  DarkTheme,
  NavigationContainer,
  type Theme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AchievementsScreen, ExerciseStatsScreen, RunDetailScreen, WorkoutDetailScreen } from '../screens/DetailScreens';
import { HistoryScreen } from '../screens/HistoryScreen';
import { DashboardRunsScreen, DashboardStepsScreen, DashboardWeightScreen, DashboardWorkoutsScreen } from '../screens/dashboard/DashboardDetails';
import { ExercisesScreen } from '../screens/ExercisesScreen';
import { TrainingChoiceScreen } from '../screens/TrainingChoiceScreen';
import { RunningScreen } from '../screens/RunningScreen';
import { AboutScreen } from '../screens/settings/AboutScreen';
import { DataBackupScreen } from '../screens/settings/DataBackupScreen';
import { GoalsScreen } from '../screens/settings/GoalsScreen';
import { PlanEditorScreen } from '../screens/settings/PlanEditorScreen';
import { TrainingPlansScreen } from '../screens/settings/TrainingPlansScreen';
import { WeeklyReportScreen } from '../screens/WeeklyReportScreen';
import { WorkoutScreen } from '../screens/WorkoutScreen';
import { colors } from '../theme';
import type { RootStackParamList } from '../types/navigation';
import { TabNavigator } from './TabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
  },
};

export function RootNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator>
        <Stack.Screen
          name="Tabs"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="Workout" component={WorkoutScreen} />
        <Stack.Screen name="Running" component={RunningScreen} options={{ headerShown: false }} />
        <Stack.Screen
          name="WeeklyReport"
          component={WeeklyReportScreen}
          options={{ title: 'Wochenbericht' }}
        />
        <Stack.Screen name="TrainingPlans" component={TrainingPlansScreen} options={{ title: 'Trainingspläne' }} />
        <Stack.Screen name="PlanEditor" component={PlanEditorScreen} options={{ title: 'Plan' }} />
        <Stack.Screen name="Goals" component={GoalsScreen} options={{ title: 'Ziele' }} />
        <Stack.Screen name="DataBackup" component={DataBackupScreen} options={{ title: 'Daten & Backup' }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'Verlauf' }} />
        <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} options={{ title: 'Training' }} />
        <Stack.Screen name="RunDetail" component={RunDetailScreen} options={{ title: 'Lauf' }} />
        <Stack.Screen name="ExerciseStats" component={ExerciseStatsScreen} options={{ title: 'Übung' }} />
        <Stack.Screen name="Achievements" component={AchievementsScreen} options={{ title: 'Bestwerte' }} />
        <Stack.Screen name="TrainingChoice" component={TrainingChoiceScreen} options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="Exercises" component={ExercisesScreen} options={{ title: 'Übungen' }} />
        <Stack.Screen name="DashboardWorkouts" component={DashboardWorkoutsScreen} options={{ title: 'Workouts', headerTintColor: colors.accent }} />
        <Stack.Screen name="DashboardRuns" component={DashboardRunsScreen} options={{ title: 'Runs', headerTintColor: colors.running }} />
        <Stack.Screen name="DashboardSteps" component={DashboardStepsScreen} options={{ title: 'Steps', headerTintColor: colors.good }} />
        <Stack.Screen name="DashboardWeight" component={DashboardWeightScreen} options={{ title: 'Gewicht', headerTintColor: 'rgba(255,255,255,0.82)' }} />
        <Stack.Screen name="About" component={AboutScreen} options={{ title: 'Über LOCKED IN' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
