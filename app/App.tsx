import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppFrame } from './src/components/AppFrame';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppFrame>
        <RootNavigator />
      </AppFrame>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
