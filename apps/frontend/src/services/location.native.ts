import * as Location from 'expo-location';

export type CurrentPlace = { city: string; latitude: number; longitude: number };

export async function detectCurrentPlace(): Promise<CurrentPlace | null> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') return null;
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  const [address] = await Location.reverseGeocodeAsync({ latitude: position.coords.latitude, longitude: position.coords.longitude });
  const city = address?.city || address?.subregion || address?.region || 'Local atual';
  return { city, latitude: position.coords.latitude, longitude: position.coords.longitude };
}
