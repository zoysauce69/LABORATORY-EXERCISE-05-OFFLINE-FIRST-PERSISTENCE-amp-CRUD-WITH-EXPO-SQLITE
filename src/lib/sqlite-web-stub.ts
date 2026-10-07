/**
 * Web stand-in for `expo-sqlite`.
 *
 * The Lab 5 screen runs in Expo Go on a phone, where the native SQLite module
 * exists. On the web preview expo-sqlite needs a WASM worker chunk the Expo
 * dev server cannot build, so Metro aliases the package to this file for the
 * `web` platform only (see `metro.config.js`).
 *
 * Every method the demo touches is present and inert: reads come back empty
 * and writes are ignored, so the screen renders with its "no database here"
 * notice instead of crashing the bundle.
 */
export interface WebDb {
  execSync: (sql: string) => void;
  getFirstSync: <T>(sql: string, params?: unknown[]) => T | null;
  getAllSync: <T>(sql: string, params?: unknown[]) => T[];
  runSync: (sql: string, params?: unknown[]) => void;
  closeSync: () => void;
}

export function openDatabaseSync(_name: string): WebDb {
  return {
    execSync: () => {},
    getFirstSync: () => null,
    getAllSync: () => [],
    runSync: () => {},
    closeSync: () => {},
  };
}

export default { openDatabaseSync };
