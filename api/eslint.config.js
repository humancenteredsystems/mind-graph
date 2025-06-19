const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const enterprisePlugin = require('../eslint-plugin-enterprise');
const eslintRecommendedRules = require('@eslint/js').configs.recommended.rules;
const typescriptRecommendedRules = typescriptEslint.configs.recommended.rules;
const typescriptParser = require('@typescript-eslint/parser');
const globals = require('globals');

module.exports = [
  // Configuration for JavaScript files (like this config file)
  {
    files: ['*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Basic rules for JS files
      'no-console': 'off',
    },
  },
  // Configuration for TypeScript files
  {
    files: ['**/*.ts'],
    ignores: [
      'debug-*.js', // Ignore debug files
      'dist/**', // Ignore the entire dist directory and all subdirectories
      '**/dist/**', // Ignore dist directories anywhere in the project
    ],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        tsconfigRootDir: __dirname,
        project: ['./tsconfig.eslint.json'],
      },
      globals: {
        ...globals.node, // Add Node.js globals
        AbortSignal: 'readonly', // Explicitly allow AbortSignal
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      'enterprise': enterprisePlugin, // Add our custom plugin
    },
    rules: {
      ...eslintRecommendedRules,
      ...typescriptRecommendedRules,
      // Add our custom rules (temporarily disabled problematic rule)
      'enterprise/no-unguarded-namespace-usage': 'off', // Temporarily disabled - needs context awareness
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
    files: ['**/__tests__/**/*.ts', '**/jest.setup.ts', '**/jest.integration-real.setup.ts'],
    languageOptions: {
      globals: {
        ...globals.jest, // Add Jest globals for test files
        pending: 'readonly', // Explicitly allow pending
        fail: 'readonly', // Explicitly allow fail
        addSchema: 'readonly', // Explicitly allow addSchema
        updateSchema: 'readonly', // Explicitly allow updateSchema
      },
    },
    rules: {
      // Relax rules for test files as suggested in the issue
      'enterprise/require-enterprise-error-handling': 'off',
      // Add other test-specific overrides if necessary
    },
  },
];
