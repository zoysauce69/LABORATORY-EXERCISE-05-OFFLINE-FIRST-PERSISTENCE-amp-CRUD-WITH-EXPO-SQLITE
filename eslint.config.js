const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  {
    ignores: ['dist/**', '.expo/**', 'node_modules/**', 'coverage/**'],
  },
  // The flat-config entry point. `eslint-config-expo`'s bare main export is the
  // eslintrc shape, which ESLint 9+ cannot consume as a string shorthand.
  expoConfig,
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
    },
  },
]);
