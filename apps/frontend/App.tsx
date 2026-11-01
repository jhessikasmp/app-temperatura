import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { fetchForecast, Forecast, geocodeCity } from './src/services/weather';
import { cancelPendingAlerts, configureNotifications, listenForAlertConfirmation, scheduleRepeatedFrostAlerts } from './src/services/notifications';
import { defaultSettings, loadSettings, saveSettings } from './src/services/settings';
import { detectCurrentPlace } from './src/services/location';
import { loadRemoteSettings, saveRemoteSettings } from './src/services/api';

function riskLabel(item: Forecast) {
  if (item.temp <= 3 && item.humidity >= 85) return { label: 'Alto risco', color: '#D95D39' };
  if (item.temp <= 5) return { label: 'Atenção', color: '#D99539' };
  return { label: 'Sem risco', color: '#278A73' };
}

export default function App() {
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [alertsScheduled, setAlertsScheduled] = useState(false);
  const [selectedPlace] = useState('Casa');
  const [cityName, setCityName] = useState('Local salvo');
  const [forecast, setForecast] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [alertHour, setAlertHour] = useState('20');
  const [alertMinute, setAlertMinute] = useState('00');
  const [alertStatus, setAlertStatus] = useState('');
  const [latitude, setLatitude] = useState(defaultSettings.latitude);
  const [longitude, setLongitude] = useState(defaultSettings.longitude);
  const [settingsReady, setSettingsReady] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [cityInput, setCityInput] = useState('');
  const [cityStatus, setCityStatus] = useState('');
  const { width } = useWindowDimensions();
  const palette = darkMode ? { bg: '#0D1B26', card: '#162B3A', text: '#F4F8FB', muted: '#A8BBC4', green: '#63D8BD', soft: '#21483F' } : { bg: '#F4F8FB', card: '#FFFFFF', text: '#123149', muted: '#79909C', green: '#278A73', soft: '#E8F5F2' };

  const riskCardStyle = (riskValue: Forecast['risk']) => riskValue === 'alto' ? styles.riskHigh : riskValue === 'atenção' ? styles.riskAttention : styles.riskLow;

  useEffect(() => {
    configureNotifications();
    const listener = listenForAlertConfirmation(() => {
      setAlertStatus('Alerta confirmado. Repetições canceladas.');
    });
    return () => listener.remove();
  }, []);

  useEffect(() => {
    loadSettings().then(async (localSettings) => {
      let settings = localSettings;
      try { const remoteSettings = await loadRemoteSettings(); if (remoteSettings) settings = { ...localSettings, ...remoteSettings, alertHour: String(remoteSettings.alertHour ?? localSettings.alertHour), alertMinute: String(remoteSettings.alertMinute ?? localSettings.alertMinute) }; } catch { /* usa o cache local */ }
      setCityName(settings.cityName); setLatitude(settings.latitude); setLongitude(settings.longitude);
      setAlertHour(settings.alertHour); setAlertMinute(settings.alertMinute); setAlertsEnabled(settings.alertsEnabled); setAlertsScheduled(settings.alertsScheduled); setSettingsReady(true);
    }).catch(() => setSettingsReady(true));
  }, []);

  useEffect(() => {
    detectCurrentPlace().then((place) => {
      if (!place) return;
      setCityName(place.city); setLatitude(place.latitude); setLongitude(place.longitude);
      setCityStatus(`GPS atualizado: ${place.city}`);
    }).catch(() => setCityStatus('Não foi possível obter o GPS.'));
  }, []);

  useEffect(() => {
    if (!settingsReady) return;
    const settings = { placeName: 'Casa', cityName, latitude, longitude, alertHour, alertMinute, alertsEnabled, alertsScheduled };
    saveSettings(settings); saveRemoteSettings(settings).catch(() => undefined);
  }, [settingsReady, selectedPlace, cityName, latitude, longitude, alertHour, alertMinute, alertsEnabled, alertsScheduled]);

  useEffect(() => {
    fetchForecast(latitude, longitude)
      .then(setForecast)
      .catch(() => setError('Não foi possível atualizar agora.'))
      .finally(() => setLoading(false));
  }, [latitude, longitude]);

  useEffect(() => {
    if (!settingsReady || !alertsEnabled || !tomorrow.frost) return;
    const hour = Math.min(23, Math.max(0, Number(alertHour) || 0));
    const minute = Math.min(59, Math.max(0, Number(alertMinute) || 0));
    scheduleRepeatedFrostAlerts(hour, minute, 'Risco de congelamento', `Proteja os vidros: mínima prevista de ${tomorrow.temp}°C.`).then((count) => { if (count) setAlertsScheduled(true); });
  }, [settingsReady, alertsEnabled, alertHour, alertMinute, forecast.length]);

  async function handleScheduleAlerts() {
    const hour = Math.min(23, Math.max(0, Number(alertHour) || 0));
    const minute = Math.min(59, Math.max(0, Number(alertMinute) || 0));
    const formattedTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    setAlertHour(String(hour).padStart(2, '0'));
    setAlertMinute(String(minute).padStart(2, '0'));
    setAlertsEnabled(true);
    setAlertStatus('Registrando alertas...');

    if (Platform.OS === 'web') {
      setAlertsScheduled(false);
      setAlertStatus(`Horário ${formattedTime} salvo. Notificações pop-up funcionam no app instalado no Android/iPhone, não nesta versão web.`);
      return;
    }

    try {
      const count = await scheduleRepeatedFrostAlerts(hour, minute, 'Risco de congelamento', `${tomorrow.frost ? 'Proteja os vidros' : 'Teste de alerta'}: mínima prevista de ${tomorrow.temp}°C.`);
      if (!count) {
        setAlertsScheduled(false);
        setAlertStatus('Permissão de notificações negada. Ative as notificações nas configurações do celular e tente novamente.');
        return;
      }
      setAlertsScheduled(true);
      setAlertStatus(`${count} alertas registrados para amanhã às ${formattedTime}, repetindo a cada 20 min.`);
    } catch (scheduleError) {
      setAlertsScheduled(false);
      setAlertStatus(scheduleError instanceof Error ? `Não foi possível agendar: ${scheduleError.message}` : 'Não foi possível agendar as notificações.');
    }
  }

  const fallback: Forecast = { day: 'Amanhã', date: '--', temp: 0, humidity: 0, frost: false, icon: '❄️', risk: 'baixo', dewPoint: 0 };
  const tomorrow = forecast[1] ?? fallback;
  const risk = useMemo(() => riskLabel(tomorrow), [tomorrow]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={[styles.container, { paddingHorizontal: width < 380 ? 16 : 22, maxWidth: 720, width: '100%', alignSelf: 'center' }]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: palette.green }]}>PROTEGE VIDROS</Text>
            <Text style={[styles.title, { color: palette.text }]}>Proteja seus vidros</Text>
          </View>
          <View style={styles.headerActions}><Pressable style={[styles.themeButton, { backgroundColor: palette.card }]} onPress={() => setDarkMode(!darkMode)}><Text>{darkMode ? '☀️' : '🌙'}</Text></Pressable><View style={styles.avatar}><Text style={styles.avatarText}>⌖</Text></View></View>
        </View>

        <View style={[styles.placePicker, { backgroundColor: palette.card }]}>
          <Text style={styles.pin}>⌖</Text>
          <View style={{ flex: 1 }}><Text style={[styles.placeName, { color: palette.text }]}>Casa</Text><Text style={[styles.placeHint, { color: palette.muted }]}>{cityName}</Text></View>
          <Pressable style={styles.gpsButton} onPress={async () => { setCityStatus('Buscando GPS...'); const place = await detectCurrentPlace(); if (place) { setCityName(place.city); setLatitude(place.latitude); setLongitude(place.longitude); setCityStatus(`GPS atualizado: ${place.city}`); } else setCityStatus('Permissão de localização não concedida.'); }}><Text style={styles.gpsText}>GPS</Text></Pressable>
        </View>
        {!!cityStatus && <Text style={styles.gpsStatus}>{cityStatus}</Text>}

        <View style={styles.alertCard}>
          <View style={styles.alertTop}><Text style={styles.alertIcon}>❄</Text><Text style={styles.alertCaption}>AVISO PARA AMANHÃ</Text></View>
          <Text style={styles.alertTitle}>{tomorrow.frost ? 'Prepare os vidros hoje à noite' : 'Nenhum congelamento previsto'}</Text>
          <Text style={styles.alertText}>{tomorrow.frost ? 'Há chance de congelamento pela manhã.' : 'A previsão ainda não indica congelamento.'} Mínima de {tomorrow.temp}°C, ponto de orvalho de {tomorrow.dewPoint}°C.</Text>
          <View style={styles.divider} />
          <View style={styles.stats}>
            <View><Text style={styles.statValue}>{tomorrow.temp}°C</Text><Text style={styles.statLabel}>mínima</Text></View>
            <View><Text style={styles.statValue}>{tomorrow.humidity}%</Text><Text style={styles.statLabel}>umidade</Text></View>
            <View><Text style={[styles.statValue, { color: risk.color }]}>{tomorrow.risk === 'alto' ? 'Alto' : tomorrow.risk === 'atenção' ? 'Atenção' : 'Baixo'}</Text><Text style={styles.statLabel}>risco</Text></View>
          </View>
        </View>

        <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: palette.text }]}>Próximos dias</Text><Text style={[styles.updated, { color: palette.muted }]}>{loading ? 'Atualizando...' : 'Atualizado agora'}</Text></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.forecastRow}>
          {forecast.map((item) => { const itemRisk = riskLabel(item); return (
            <View key={item.day} style={[styles.dayCard, riskCardStyle(item.risk), item.day === 'Amanhã' && styles.selectedDay]}>
              <Text style={styles.day}>{item.day}</Text><Text style={styles.date}>{item.date}</Text><Text style={styles.weatherIcon}>{item.icon}</Text>
              <Text style={styles.dayTemp}>{item.temp}°</Text><Text style={[styles.dayRisk, { color: itemRisk.color }]}>{itemRisk.label}</Text>
            </View>);
          })}
        </ScrollView>
        {!!error && <Text style={styles.error}>{error}</Text>}

        <View style={[styles.settingsCard, { backgroundColor: palette.card }]}>
          <View style={styles.settingsIcon}><Text>🔔</Text></View><View style={{ flex: 1 }}><Text style={[styles.settingTitle, { color: palette.text }]}>{alertsEnabled && alertsScheduled ? 'Alerta personalizado ativado' : 'Alertas ativados'}</Text><Text style={[styles.settingHint, { color: palette.muted }]}>{alertsEnabled && alertsScheduled ? `Amanhã às ${alertHour.padStart(2, '0')}:${alertMinute.padStart(2, '0')} • repete a cada 20 min` : 'Defina um horário e agende o alerta'}</Text></View>
          <Switch value={alertsEnabled} onValueChange={(enabled) => { setAlertsEnabled(enabled); if (!enabled) { setAlertsScheduled(false); cancelPendingAlerts(); } }} trackColor={{ false: '#D6E0E5', true: '#A9DCCF' }} thumbColor={alertsEnabled ? '#278A73' : '#fff'} />
        </View>
        <View style={[styles.timeCard, { backgroundColor: palette.card }]}>
          <View style={styles.timeHeader}><View><Text style={[styles.settingTitle, { color: palette.text }]}>Horário personalizado</Text><Text style={[styles.settingHint, { color: palette.muted }]}>Repetir a cada 20 min</Text></View><Text style={styles.timeLabel}>AMANHÃ</Text></View>
          <View style={styles.timeInputs}><TextInput value={alertHour} onChangeText={setAlertHour} keyboardType="number-pad" maxLength={2} style={styles.timeInput} /><Text style={styles.timeColon}>:</Text><TextInput value={alertMinute} onChangeText={setAlertMinute} keyboardType="number-pad" maxLength={2} style={styles.timeInput} /></View>
        </View>
        <Pressable style={styles.scheduleButton} onPress={handleScheduleAlerts}><Text style={styles.scheduleText}>Agendar alertas</Text></Pressable>
        {!!alertStatus && <Text style={styles.status}>{alertStatus}</Text>}
        <Pressable style={styles.addButton} onPress={() => { setShowAddLocation(!showAddLocation); setCityStatus(''); }}><Text style={styles.addPlus}>＋</Text><Text style={styles.addText}>{showAddLocation ? 'Cancelar' : 'Adicionar outro local'}</Text></Pressable>
        {showAddLocation && <View style={[styles.addCard, { backgroundColor: palette.card }]}><Text style={[styles.settingTitle, { color: palette.text }]}>Nome da cidade</Text><TextInput value={cityInput} onChangeText={setCityInput} placeholder="Ex.: Curitiba" placeholderTextColor="#9AAEB6" style={styles.cityInput} /><Pressable style={styles.findButton} onPress={async () => { if (!cityInput.trim()) { setCityStatus('Digite uma cidade.'); return; } setCityStatus('Buscando cidade...'); try { const city = await geocodeCity(cityInput); setCityName(city.name); setLatitude(city.latitude); setLongitude(city.longitude); setCityInput(''); setShowAddLocation(false); setCityStatus(''); } catch (e) { setCityStatus(e instanceof Error ? e.message : 'Erro ao buscar cidade.'); } }}><Text style={styles.scheduleText}>Salvar cidade</Text></Pressable>{!!cityStatus && <Text style={styles.status}>{cityStatus}</Text>}</View>}
        <Text style={styles.footer}>O risco é estimado usando temperatura, umidade e condição do céu.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F8FB' }, container: { padding: 22, paddingBottom: 34 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }, headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 }, themeButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: '#278A73', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }, title: { color: '#123149', fontSize: 27, fontWeight: '800', marginTop: 6 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#D5EAE5', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: '#278A73', fontSize: 19, fontWeight: '800' },
  placePicker: { backgroundColor: '#fff', borderRadius: 16, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 4, shadowColor: '#123149', shadowOpacity: .04, shadowRadius: 10, elevation: 2 }, pin: { fontSize: 26, color: '#278A73', marginRight: 12 }, placeName: { color: '#123149', fontSize: 15, fontWeight: '700' }, placeHint: { color: '#79909C', fontSize: 12, marginTop: 3 }, chevron: { color: '#79909C', fontSize: 23 }, gpsButton: { backgroundColor: '#E8F5F2', borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10 }, gpsText: { color: '#278A73', fontSize: 12, fontWeight: '800' }, gpsStatus: { color: '#278A73', fontSize: 11, marginBottom: 14, marginLeft: 3 },
  alertCard: { backgroundColor: '#123149', borderRadius: 22, padding: 21, marginBottom: 27 }, alertTop: { flexDirection: 'row', alignItems: 'center', gap: 9 }, alertIcon: { color: '#9EE1D1', fontSize: 23 }, alertCaption: { color: '#9EE1D1', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }, alertTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 15 }, alertText: { color: '#C6D8DF', lineHeight: 21, marginTop: 9, fontSize: 14 }, divider: { height: 1, backgroundColor: '#315166', marginVertical: 18 }, stats: { flexDirection: 'row', justifyContent: 'space-between', paddingRight: 20 }, statValue: { color: '#fff', fontSize: 20, fontWeight: '800' }, statLabel: { color: '#91AAB5', fontSize: 12, marginTop: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }, sectionTitle: { color: '#123149', fontSize: 18, fontWeight: '800' }, updated: { color: '#91AAB5', fontSize: 11 }, forecastRow: { gap: 10, paddingBottom: 5 }, dayCard: { width: 90, borderRadius: 16, padding: 13, alignItems: 'center' }, riskHigh: { backgroundColor: '#FFD9D2' }, riskAttention: { backgroundColor: '#FFE9B8' }, riskLow: { backgroundColor: '#D8F4E8' }, selectedDay: { borderWidth: 1.5, borderColor: '#278A73' }, day: { color: '#123149', fontSize: 13, fontWeight: '700' }, date: { color: '#536C78', fontSize: 9, marginTop: 3 }, weatherIcon: { fontSize: 27, marginVertical: 10 }, dayTemp: { color: '#123149', fontSize: 20, fontWeight: '800' }, dayRisk: { fontSize: 10, fontWeight: '800', marginTop: 5 },
  settingsCard: { backgroundColor: '#fff', borderRadius: 16, padding: 15, flexDirection: 'row', alignItems: 'center', marginTop: 25 }, settingsIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#E8F5F2', alignItems: 'center', justifyContent: 'center', marginRight: 12 }, settingTitle: { color: '#123149', fontWeight: '700', fontSize: 14 }, settingHint: { color: '#91AAB5', fontSize: 11, marginTop: 4 }, timeCard: { backgroundColor: '#fff', borderRadius: 16, padding: 15, marginTop: 10, overflow: 'hidden' }, timeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, timeLabel: { color: '#278A73', fontSize: 10, fontWeight: '800', letterSpacing: 1 }, timeInputs: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', width: 120, height: 44, backgroundColor: '#E8F5F2', borderRadius: 12, paddingHorizontal: 4, marginTop: 10 }, timeInput: { color: '#278A73', fontWeight: '800', fontSize: 17, width: 42, height: 40, minWidth: 0, textAlign: 'center', paddingVertical: 0, paddingHorizontal: 0, outlineWidth: 0 }, timeColon: { color: '#278A73', fontWeight: '800', fontSize: 17, width: 18, textAlign: 'center' }, scheduleButton: { backgroundColor: '#278A73', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 12 }, scheduleText: { color: '#fff', fontWeight: '800' }, status: { color: '#278A73', fontSize: 12, textAlign: 'center', marginTop: 8 }, addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18 }, addPlus: { color: '#278A73', fontSize: 23, marginRight: 5 }, addText: { color: '#278A73', fontWeight: '700', fontSize: 14 }, addCard: { backgroundColor: '#fff', borderRadius: 16, padding: 15, marginBottom: 12 }, cityInput: { borderWidth: 1, borderColor: '#D6E0E5', borderRadius: 12, color: '#123149', paddingHorizontal: 12, paddingVertical: 11, marginTop: 9, marginBottom: 10 }, findButton: { backgroundColor: '#123149', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }, footer: { textAlign: 'center', color: '#A2B2B8', fontSize: 11, lineHeight: 16, paddingHorizontal: 20 }, error: { color: '#A86438', fontSize: 11, textAlign: 'center', marginTop: 8 }
});
