import { StatusBar } from 'expo-status-bar';
import './src/native/runEngine';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppFrame } from './src/components/AppFrame';
import { Bootstrap } from './src/data/Bootstrap';
import { createRepository } from './src/data/createRepository';
import { AppStoreProvider } from './src/data/store';
import { RootNavigator } from './src/navigation/RootNavigator';

const repository = createRepository();

export default function App() {
  return (
    <SafeAreaProvider>
      <AppFrame>
        <AppStoreProvider repository={repository}>
          <Bootstrap>
            <RootNavigator />
          </Bootstrap>
        </AppStoreProvider>
      </AppFrame>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
