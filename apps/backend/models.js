const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  latitude: { type: Number, required: true, min: -90, max: 90 },
  longitude: { type: Number, required: true, min: -180, max: 180 },
  alertHour: { type: Number, required: true, min: 0, max: 23, default: 20 },
  alertMinute: { type: Number, required: true, min: 0, max: 59, default: 0 },
  alertsEnabled: { type: Boolean, default: true },
  repeatIntervalMinutes: { type: Number, min: 5, max: 120, default: 20 },
  repeatCount: { type: Number, min: 1, max: 24, default: 8 },
}, { timestamps: true });

const Location = mongoose.models.Location || mongoose.model('Location', locationSchema);

const settingsSchema = new mongoose.Schema({
  profileId: { type: String, unique: true, default: 'default' },
  placeName: { type: String, default: 'Casa' },
  cityName: { type: String, default: 'Local salvo' },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  alertHour: { type: Number, min: 0, max: 23, default: 20 },
  alertMinute: { type: Number, min: 0, max: 59, default: 0 },
  alertsEnabled: { type: Boolean, default: true },
  alertsScheduled: { type: Boolean, default: false },
}, { timestamps: true });

const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
module.exports = { Location, Settings };
