export type Forecast = {
  day: string;
  date: string;
  temp: number;
  humidity: number;
  frost: boolean;
  icon: string;
  risk: 'alto' | 'atenção' | 'baixo';
  dewPoint: number;
};

type OpenMeteoResponse = {
  hourly?: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    dew_point_2m: number[];
    cloud_cover: number[];
    precipitation_probability: number[];
  };
  daily?: {
    time: string[];
    temperature_2m_min: number[];
    relative_humidity_2m_max: number[];
    weather_code: number[];
  };
};

const labels = ['Hoje', 'Amanhã', 'Depois', 'Em 3 dias', 'Em 4 dias'];

export type CityResult = { name: string; region: string; country: string; latitude: number; longitude: number };

export async function geocodeCity(city: string): Promise<CityResult> {
  const params = new URLSearchParams({ name: city.trim(), count: '1', language: 'pt', format: 'json' });
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`);
  if (!response.ok) throw new Error('Não foi possível buscar a cidade.');
  const data = await response.json() as { results?: CityResult[] };
  if (!data.results?.length) throw new Error('Cidade não encontrada.');
  return data.results[0];
}

function weatherIcon(code: number) {
  if (code === 0) return '☀️';
  if ([1, 2].includes(code)) return '🌤️';
  if ([3, 45, 48].includes(code)) return '☁️';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️';
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return '🌧️';
  return '⛈️';
}

export async function fetchForecast(latitude: number, longitude: number): Promise<Forecast[]> {
  const params = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), daily: 'temperature_2m_min,relative_humidity_2m_max,weather_code', timezone: 'auto', forecast_days: '5' });
  params.set('hourly', 'temperature_2m,relative_humidity_2m,dew_point_2m,cloud_cover,precipitation_probability');
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!response.ok) throw new Error('Não foi possível consultar a previsão.');
  const data = (await response.json()) as OpenMeteoResponse;
  if (!data.daily) throw new Error('A previsão retornou dados incompletos.');
  return data.daily.time.map((date, index) => {
    const temp = Math.round(data.daily!.temperature_2m_min[index]);
    const humidity = Math.round(data.daily!.relative_humidity_2m_max[index]);
    const hours = (data.hourly?.time ?? []).map((time, hourIndex) => ({ time, temp: data.hourly!.temperature_2m[hourIndex], humidity: data.hourly!.relative_humidity_2m[hourIndex], dewPoint: data.hourly!.dew_point_2m[hourIndex], cloud: data.hourly!.cloud_cover[hourIndex], rain: data.hourly!.precipitation_probability[hourIndex] })).filter((hour) => hour.time.startsWith(date));
    const coldHours = hours.filter((hour) => hour.temp <= 4.5);
    const lowest = coldHours.reduce((lowest, hour) => hour.temp < lowest.temp ? hour : lowest, hours[0] ?? { temp, dewPoint: temp, humidity, cloud: 100, rain: 0, time: date });
    const dewGap = lowest.temp - lowest.dewPoint;
    const riskScore = (lowest.temp <= 2 ? 3 : lowest.temp <= 4.5 ? 2 : 0) + (lowest.dewPoint <= 2 ? 2 : dewGap <= 2 ? 1 : 0) + (lowest.humidity >= 90 ? 2 : lowest.humidity >= 80 ? 1 : 0) + (lowest.cloud <= 35 ? 1 : 0) - (lowest.rain >= 70 ? 1 : 0);
    const risk = lowest.temp > 6 ? 'baixo' : riskScore >= 5 ? 'alto' : riskScore >= 3 ? 'atenção' : 'baixo';
    return { day: labels[index] ?? `Em ${index} dias`, date: new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '').toUpperCase(), temp, humidity, frost: risk === 'alto', icon: weatherIcon(data.daily!.weather_code[index]), risk, dewPoint: Math.round(lowest.dewPoint) };
  });
}
