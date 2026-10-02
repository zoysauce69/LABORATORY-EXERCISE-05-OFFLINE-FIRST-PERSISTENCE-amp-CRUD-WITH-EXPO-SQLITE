const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  {
    ignores: ['dist/**', '.expo/**', 'node_modules/**', 'coverage/**'],
  },
  'expo',
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
    },
  },
]);