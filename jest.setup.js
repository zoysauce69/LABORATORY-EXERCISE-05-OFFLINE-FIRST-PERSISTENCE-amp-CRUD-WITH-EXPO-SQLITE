/* eslint-env node */

/**
 * Jest setup.
 *
 * Deliberately minimal. RoomLink has no server, no `.env` and no native module
 * that needs shimming, so the only thing standing between a test run and the
 * real thing is a working AsyncStorage — which `jest-expo` already provides.
 */

// AsyncStorage's own module registers a mock on import, so this only has to make
// the store available before any `@/lib/storage` call happens.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
