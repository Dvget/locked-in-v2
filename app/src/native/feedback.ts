import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

const native = Platform.OS !== 'web';

/** Short physical confirmation (set saved etc.). Never throws. */
export function tap(): void {
  if (!native) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

export function success(): void {
  if (!native) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

/** Concise spoken cue (German), e.g. rest timer done or a km split. */
export function speak(text: string): void {
  if (!native) return;
  try {
    Speech.speak(text, { language: 'de-DE' });
  } catch {
    // Audio cues are optional.
  }
}

export function stopSpeaking(): void {
  if (!native) return;
  Speech.stop().catch(() => undefined);
}

let handlerSet = false;
function ensureHandler(): void {
  if (handlerSet) return;
  handlerSet = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Schedules the "rest is over" notification for backgrounded use; returns its id. */
export async function scheduleRestNotification(seconds: number): Promise<string | null> {
  if (!native || seconds <= 0) return null;
  try {
    ensureHandler();
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) {
      const asked = await Notifications.requestPermissionsAsync();
      if (!asked.granted) return null;
    }
    return await Notifications.scheduleNotificationAsync({
      content: { title: 'Pause vorbei', body: 'Weiter mit dem nächsten Satz.', sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(seconds)),
      },
    });
  } catch {
    return null;
  }
}

export async function cancelNotification(id: string | null): Promise<void> {
  if (!native || !id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // ignore
  }
}
