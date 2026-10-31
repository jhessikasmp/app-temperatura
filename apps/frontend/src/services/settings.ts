import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppSettings = {
  placeName: string;
  cityName: string;
  latitude: number;
  longitude: number;
  alertHour: string;
  alertMinute: string;
  alertsEnabled: boolean;
  alertsScheduled: boolean;
};

const KEY = '@protege-vidros/settings';
export const defaultSettings: AppSettings = { placeName: 'Casa', cityName: 'Local salvo', latitude: -23.5505, longitude: -46.6333, alertHour: '20', alertMinute: '00', alertsEnabled: true, alertsScheduled: false };

export async function loadSettings(): Promise<AppSettings> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return defaultSettings;
  try { return { ...defaultSettings, ...JSON.parse(raw) }; } catch { return defaultSettings; }
}

export async function saveSettings(settings: AppSettings) {
  await AsyncStorage.setItem(KEY, JSON.stringify(settings));
}
