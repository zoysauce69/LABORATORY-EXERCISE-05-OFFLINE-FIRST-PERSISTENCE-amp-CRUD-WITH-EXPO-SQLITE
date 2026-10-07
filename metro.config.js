const path = require('path');

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite ships its web engine as a .wasm file; Metro only treats known
// asset extensions as assets, so without this the web build fails to resolve
// `./wa-sqlite/wa-sqlite.wasm` from expo-sqlite's web worker.
config.resolver.assetExts.push('wasm');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // The SQLite demo is phone-only: expo-sqlite's web build needs a WASM worker
  // chunk the Expo dev server cannot serve, so web gets an inert stub instead.
  if (platform === 'web' && moduleName === 'expo-sqlite') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'src/lib/sqlite-web-stub.ts'),
    };
  }
  // Anything else falls through to Metro's own resolver.
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
