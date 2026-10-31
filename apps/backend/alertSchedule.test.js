const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeTime, buildAlertTimes } = require('./alertSchedule');

test('considera o horário personalizado informado pelo usuário', () => {
  const base = new Date('2026-10-31T10:00:00');
  const alerts = buildAlertTimes({ baseDate: base, hour: 6, minute: 35, repeatIntervalMinutes: 20, repeatCount: 3 });
  assert.equal(alerts[0].getDate(), 1);
  assert.equal(alerts[0].getHours(), 6);
  assert.equal(alerts[0].getMinutes(), 35);
  assert.equal(alerts[1].getMinutes(), 55);
  assert.equal(alerts[2].getHours(), 7);
});

test('preserva o horário quando o minuto ultrapassa a hora', () => {
  const alerts = buildAlertTimes({ baseDate: new Date('2026-10-31T10:00:00'), hour: 23, minute: 50, repeatIntervalMinutes: 20, repeatCount: 2 });
  assert.equal(alerts[0].getHours(), 23);
  assert.equal(alerts[1].getDate(), 2);
  assert.equal(alerts[1].getHours(), 0);
  assert.equal(alerts[1].getMinutes(), 10);
});

test('rejeita horário fora do intervalo', () => {
  assert.throws(() => normalizeTime(24, 0), /Hora inválida/);
  assert.throws(() => normalizeTime(20, 60), /Minuto inválido/);
});
