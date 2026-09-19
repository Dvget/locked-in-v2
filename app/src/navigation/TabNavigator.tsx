import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { TabIcon } from '../components/TabIcon';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { colors } from '../theme';
import type { TabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<TabParamList>();

const LABELS: Record<keyof TabParamList, string> = {
  Dashboard: 'Dashboard',
  Progress: 'Fortschritt',
  Settings: 'Einstellungen',
};

// Footer as in the legacy app (D-050): black, icons only, active tab in brand orange.
export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarAccessibilityLabel: LABELS[route.name],
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        tabBarIcon: ({ color }) => <TabIcon name={route.name} color={color} />,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
