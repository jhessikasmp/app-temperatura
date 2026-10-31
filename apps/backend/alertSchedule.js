function normalizeTime(hour, minute) {
  const parsedHour = Number(hour);
  const parsedMinute = Number(minute);
  if (!Number.isInteger(parsedHour) || parsedHour < 0 || parsedHour > 23) throw new Error('Hora inválida.');
  if (!Number.isInteger(parsedMinute) || parsedMinute < 0 || parsedMinute > 59) throw new Error('Minuto inválido.');
  return { hour: parsedHour, minute: parsedMinute };
}

function buildAlertTimes({ baseDate = new Date(), hour, minute, repeatIntervalMinutes = 20, repeatCount = 8 }) {
  const time = normalizeTime(hour, minute);
  if (!Number.isInteger(repeatIntervalMinutes) || repeatIntervalMinutes < 5) throw new Error('Intervalo inválido.');
  if (!Number.isInteger(repeatCount) || repeatCount < 1) throw new Error('Quantidade de repetições inválida.');
  const first = new Date(baseDate);
  first.setDate(first.getDate() + 1);
  first.setHours(time.hour, time.minute, 0, 0);
  return Array.from({ length: repeatCount }, (_, index) => new Date(first.getTime() + index * repeatIntervalMinutes * 60 * 1000));
}

module.exports = { normalizeTime, buildAlertTimes };
