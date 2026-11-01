import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const IDS_KEY = '@protege-vidros/alert-ids';

export function configureNotifications() {
  Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: true, shouldShowBanner: true, shouldShowList: true }) });
  void Notifications.setNotificationChannelAsync('frost-alerts', { name: 'Alertas de congelamento', importance: Notifications.AndroidImportance.MAX, sound: 'default', vibrationPattern: [0, 500, 250, 500] });
}

export function listenForAlertConfirmation(onConfirmed: () => void) {
  return Notifications.addNotificationResponseReceivedListener(async () => { await cancelPendingAlerts(); onConfirmed(); });
}

async function requestPermission() {
  const current = await Notifications.getPermissionsAsync();
  if ((current as { granted?: boolean }).granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return Boolean((requested as { granted?: boolean }).granted);
}

export async function cancelPendingAlerts() {
  const stored = await AsyncStorage.getItem(IDS_KEY);
  const ids: string[] = stored ? JSON.parse(stored) : [];
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  await AsyncStorage.removeItem(IDS_KEY);
}

export async function scheduleRepeatedFrostAlerts(hour: number, minute: number, title: string, body: string) {
  if (!(await requestPermission())) return 0;
  await cancelPendingAlerts();
  const now = new Date();
  const ids: string[] = [];
  for (let index = 0; index < 8; index += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() + 1);
    date.setHours(hour, minute + index * 20, 0, 0);
    const id = await Notifications.scheduleNotificationAsync({ content: { title, body, sound: 'default', data: { frostAlert: true } }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: 'frost-alerts' } });
    ids.push(id);
  }
  await AsyncStorage.setItem(IDS_KEY, JSON.stringify(ids));
  return ids.length;
}
