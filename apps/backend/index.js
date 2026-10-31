require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDatabase } = require('./db');
const { Location, Settings } = require('./models');
const { normalizeTime, buildAlertTimes } = require('./alertSchedule');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ app: 'App Temperatura', database: 'MongoDB', databaseState: require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected' }));

async function getSettings(req, res) {
  try { res.json(await Settings.findOne({ profileId: req.params.profileId || 'default' }).lean()); }
  catch (error) { res.status(500).json({ error: error.message }); }
}
app.get('/api/settings', getSettings);
app.get('/api/settings/:profileId', getSettings);

async function putSettings(req, res) {
  try {
    const profileId = req.params.profileId || 'default';
    const { placeName = 'Casa', cityName = 'Local salvo', latitude, longitude, alertHour = 20, alertMinute = 0, alertsEnabled = true, alertsScheduled = false } = req.body;
    normalizeTime(alertHour, alertMinute);
    const settings = await Settings.findOneAndUpdate({ profileId }, { profileId, placeName, cityName, latitude, longitude, alertHour, alertMinute, alertsEnabled, alertsScheduled }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }).lean();
    res.json(settings);
  } catch (error) { res.status(400).json({ error: error.message }); }
}
app.put('/api/settings', putSettings);
app.put('/api/settings/:profileId', putSettings);

app.get('/api/locations', async (req, res) => {
  try { res.json(await Location.find().sort({ createdAt: -1 }).lean()); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/locations', async (req, res) => {
  try {
    const { name, city, latitude, longitude, alertHour = 20, alertMinute = 0, alertsEnabled = true, repeatIntervalMinutes = 20, repeatCount = 8 } = req.body;
    normalizeTime(alertHour, alertMinute);
    const location = await Location.create({ name, city, latitude, longitude, alertHour, alertMinute, alertsEnabled, repeatIntervalMinutes, repeatCount });
    res.status(201).json(location);
  } catch (error) { res.status(400).json({ error: error.message }); }
});

app.post('/api/locations/:id/preview-alerts', async (req, res) => {
  try {
    const location = await Location.findById(req.params.id).lean();
    if (!location) return res.status(404).json({ error: 'Local não encontrado.' });
    const times = buildAlertTimes({ baseDate: new Date(), hour: location.alertHour, minute: location.alertMinute, repeatIntervalMinutes: location.repeatIntervalMinutes, repeatCount: location.repeatCount }).map((date) => date.toISOString());
    res.json({ locationId: location._id, city: location.city, alertHour: location.alertHour, alertMinute: location.alertMinute, times });
  } catch (error) { res.status(400).json({ error: error.message }); }
});

app.delete('/api/locations/:id', async (req, res) => {
  try {
    const deleted = await Location.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Local não encontrado.' });
    res.status(204).send();
  } catch (error) { res.status(400).json({ error: error.message }); }
});

async function start() {
  await connectDatabase();
  const port = Number(process.env.PORT || 3333);
  app.listen(port, () => console.log(`App Temperatura API em http://localhost:${port}`));
}

if (require.main === module) start().catch((error) => { console.error('Falha ao conectar ao MongoDB:', error.message); process.exitCode = 1; });
module.exports = { app, start };
