import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const IDS_KEY = '@protege-vidros/alert-ids';

export function configureNotifications() {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: true, shouldShowBanner: true, shouldShowList: true }) });
}

export function listenForAlertConfirmation(_onConfirmed: () => void) {
  return { remove() {} };
}

export async function requestNotificationPermission() {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if ((current as { granted?: boolean }).granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return Boolean((requested as { granted?: boolean }).granted);
}

export async function cancelPendingAlerts() {
  if (Platform.OS === 'web') return;
  const stored = await AsyncStorage.getItem(IDS_KEY);
  const ids: string[] = stored ? JSON.parse(stored) : [];
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  await AsyncStorage.removeItem(IDS_KEY);
}

export async function scheduleRepeatedFrostAlerts(hour: number, minute: number, title: string, body: string) {
  if (Platform.OS === 'web') return 0;
  const granted = await requestNotificationPermission();
  if (!granted) return 0;
  await cancelPendingAlerts();
  const now = new Date();
  const ids: string[] = [];
  for (let index = 0; index < 8; index += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() + 1);
    date.setHours(hour, minute + index * 20, 0, 0);
    const id = await Notifications.scheduleNotificationAsync({ content: { title, body, sound: 'default', data: { frostAlert: true } }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date } });
    ids.push(id);
  }
  await AsyncStorage.setItem(IDS_KEY, JSON.stringify(ids));
  return ids.length;
}
