import { useKeepAwake } from 'expo-keep-awake';
import { Platform } from 'react-native';

/** Keeps the screen on during workouts and runs. No-op on web (the wake lock API is not reliable there). */
export const useScreenAwake: () => void = Platform.OS === 'web' ? () => undefined : () => useKeepAwake();
