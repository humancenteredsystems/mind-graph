const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  // Override the setupFilesAfterEnv to use a different setup file
  setupFilesAfterEnv: ['<rootDir>/jest.integration-real.setup.ts'],
  // Only run integration-real tests
  testMatch: ['<rootDir>/__tests__/integration-real/**/*.test.ts'],
  // Don't use the axios mock for integration tests
  clearMocks: false,
  resetMocks: false,
  restoreMocks: false,
};
