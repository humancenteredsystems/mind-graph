// Jest setup file for global test configuration
// This file is executed before each test file

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DGRAPH_BASE_URL = 'http://localhost:8080';
process.env.PORT = '3001'; // Use different port for tests
process.env.ADMIN_API_KEY = 'test-admin-key';

// Global test timeout (30 seconds for integration tests)
jest.setTimeout(30000);

// Mock console methods to reduce noise in test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

beforeAll(() => {
  // Suppress console output during tests unless explicitly needed
  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
});

// Global test utilities
global.testUtils = {
  // Helper to wait for async operations
  wait: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper to generate unique test IDs
  generateTestId: (prefix = 'test') => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  
  // Helper to create mock request objects
  createMockRequest: (overrides = {}) => ({
    body: {},
    headers: {},
    params: {},
    query: {},
    ...overrides
  }),
  
  // Helper to create mock response objects
  createMockResponse: () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis()
    };
    return res;
  }
};

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in tests, just log the error
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process in tests, just log the error
});

// Mock external dependencies that shouldn't be called during tests
jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  create: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }))
}));

// Mock file system operations for consistent testing
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn(),
    mkdir: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn()
  },
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn()
}));

// Custom Jest matchers for common assertions
expect.extend({
  toBeValidNodeId(received) {
    const pass = typeof received === 'string' && received.length > 0;
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid node ID`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid node ID (non-empty string)`,
        pass: false
      };
    }
  },
  
  toBeValidHierarchyId(received) {
    const pass = typeof received === 'string' && received.length > 0;
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid hierarchy ID`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid hierarchy ID (non-empty string)`,
        pass: false
      };
    }
  },
  
  toHaveValidGraphQLResponse(received) {
    const hasData = received && typeof received === 'object';
    const hasNoErrors = !received.errors || received.errors.length === 0;
    const pass = hasData && hasNoErrors;
    
    if (pass) {
      return {
        message: () => `expected response not to be a valid GraphQL response`,
        pass: true
      };
    } else {
      return {
        message: () => `expected response to be a valid GraphQL response (object without errors)`,
        pass: false
      };
    }
  }
});

// Setup for database-related tests
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset any global state that might affect tests
  delete process.env.TEST_HIERARCHY_ID;
  delete process.env.TEST_NODE_ID;
});

// Cleanup after each test
afterEach(async () => {
  // Clean up any test data or connections
  // This is where you might clean up test database entries
  // if running against a real test database
  
  // Wait a bit to ensure async operations complete
  await global.testUtils.wait(10);
});

// Export common test constants
global.TEST_CONSTANTS = {
  VALID_NODE_TYPES: ['ConceptNode', 'ExampleNode', 'QuestionNode'],
  VALID_EDGE_TYPES: ['relates_to', 'contains', 'depends_on'],
  DEFAULT_HIERARCHY_ID: 'test-hierarchy',
  DEFAULT_LEVEL_ID: 'test-level',
  ADMIN_API_KEY: 'test-admin-key'
};

// Helper to create consistent test data
global.createTestNode = (overrides = {}) => ({
  id: global.testUtils.generateTestId('node'),
  label: 'Test Node',
  type: 'ConceptNode',
  status: 'active',
  branch: 'main',
  ...overrides
});

global.createTestEdge = (overrides = {}) => ({
  fromId: global.testUtils.generateTestId('from'),
  toId: global.testUtils.generateTestId('to'),
  type: 'relates_to',
  ...overrides
});

global.createTestHierarchy = (overrides = {}) => ({
  id: global.testUtils.generateTestId('hierarchy'),
  name: 'Test Hierarchy',
  ...overrides
});

global.createTestLevel = (overrides = {}) => ({
  id: global.testUtils.generateTestId('level'),
  levelNumber: 1,
  label: 'Test Level',
  ...overrides
});
