/* eslint-env node */

// Fills the process environment with the EXPO_PUBLIC_* values from .env.local
// so unit tests can import modules that read configuration.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const envFiles = ['.env.local', '.env'];

for (const file of envFiles) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) continue;

  for (const rawLine of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key.startsWith('EXPO_PUBLIC_') && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

process.env.EXPO_PUBLIC_SUPABASE_URL ||= 'https://placeholder.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||= 'placeholder-anon-key';
process.env.EXPO_PUBLIC_DISTANCE_MODE ||= 'straightline';

// expo-notifications has no web implementation; stub it so importing the
// push-notification service during tests does not throw.
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[test]' })),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  AndroidImportance: { HIGH: 4, DEFAULT: 3, LOW: 2 },
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
}));