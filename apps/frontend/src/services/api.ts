import { AppSettings } from './settings';

const API_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');

export async function loadRemoteSettings(): Promise<Partial<AppSettings> | null> {
  if (!API_URL) return null;
  const response = await fetch(`${API_URL}/api/settings/default`);
  if (!response.ok) throw new Error('Falha ao carregar configurações remotas.');
  return await response.json() as Partial<AppSettings> | null;
}

export async function saveRemoteSettings(settings: AppSettings): Promise<void> {
  if (!API_URL) return;
  const response = await fetch(`${API_URL}/api/settings/default`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
  if (!response.ok) throw new Error('Falha ao salvar configurações remotas.');
}
