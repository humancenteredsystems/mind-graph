const { jest } = require('@jest/globals');

// Common Jest configuration and global mocks
global.console = {
  ...console,
  // Suppress console.log during tests unless explicitly needed
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DGRAPH_BASE_URL = 'http://localhost:8080';
process.env.ADMIN_API_KEY = 'test-admin-key';

// Global test utilities
global.testUtils = {
  // Helper to create mock request objects
  createMockReq: (overrides = {}) => ({
    body: {},
    headers: {},
    params: {},
    query: {},
    ...overrides
  }),

  // Helper to create mock response objects
  createMockRes: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
  },

  // Helper to create mock next function
  createMockNext: () => jest.fn()
};

module.exports = {};
