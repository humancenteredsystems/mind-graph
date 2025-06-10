const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const enterprisePlugin = require('../eslint-plugin-enterprise');
const eslintRecommendedRules = require('@eslint/js').configs.recommended.rules;
const typescriptRecommendedRules = typescriptEslint.configs.recommended.rules;
const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const enterprisePlugin = require('../eslint-plugin-enterprise');
const eslintRecommendedRules = require('@eslint/js').configs.recommended.rules;
const typescriptRecommendedRules = typescriptEslint.configs.recommended.rules;
const typescriptParser = require('@typescript-eslint/parser');
const globals = require('globals');

module.exports = [
  {
    ignores: [
      'api/debug-*.js', // Ignore debug files
      'api/dist/', // Ignore the dist directory
    ],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        tsconfigRootDir: __dirname,
        project: ['./tsconfig.json'],
      },
      globals: globals.node, // Add Node.js globals
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      'enterprise': enterprisePlugin, // Add our custom plugin
    },
    rules: {
      ...eslintRecommendedRules,
      ...typescriptRecommendedRules,
      // Add our custom rules
      'enterprise/no-unguarded-namespace-usage': 'error',
      'enterprise/require-enterprise-error-handling': 'warn',
      'enterprise/prefer-adaptive-factory': 'warn',

      // Add or override other rules as needed
      // Example: Allow explicit any for now, but consider tightening later
      '@typescript-eslint/no-explicit-any': 'off',
      // Example: Allow console logs for development
      'no-console': 'off',
    },
  },
  {
    files: ['**/__tests__/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.jest, // Add Jest globals for test files
        pending: 'readonly', // Explicitly allow pending
        fail: 'readonly', // Explicitly allow fail
      },
    },
    rules: {
      // Relax rules for test files as suggested in the issue
      'enterprise/require-enterprise-error-handling': 'off',
      // Add other test-specific overrides if necessary
    },
  },
];
