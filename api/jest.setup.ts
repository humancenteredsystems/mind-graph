// Consolidated Jest setup file for global test configuration
// This file is executed before each test file

// Load environment variables from .env file
require('dotenv').config({ path: __dirname + '/.env' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DGRAPH_BASE_URL = 'http://localhost:8080';
process.env.PORT = '3001'; // Use different port for tests

// Set default ADMIN_API_KEY if not loaded from .env
if (!process.env.ADMIN_API_KEY) {
  process.env.ADMIN_API_KEY = 'ShambotTrueBeliever';
}
process.env.ENABLE_MULTI_TENANT = 'true';
process.env.DGRAPH_NAMESPACE_TEST = '0x1';
process.env.DGRAPH_NAMESPACE_DEFAULT = '0x0';

// Global test timeout (30 seconds for integration tests)
jest.setTimeout(30000);

// Import test utilities - use TypeScript imports
import { TestDataSeeder } from './__tests__/helpers/testDataSeeder';
import { DgraphTenantFactory } from './services/dgraphTenant';
import { TenantManager } from './services/tenantManager';

const TEST_NAMESPACE = '0x1';
const tenantManager = new TenantManager();

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

// Type definitions for global utilities
interface TestUtils {
  wait: (ms?: number) => Promise<void>;
  generateTestId: (prefix?: string) => string;
  createMockRequest: (overrides?: any) => any;
  createMockResponse: () => any;
  createMockReq: (overrides?: any) => any;
  createMockRes: () => any;
  createMockNext: () => jest.Mock;
  getTestTenantClient: () => any;
  TEST_NAMESPACE: string;
  TEST_TENANT_ID: string;
  testDataSeeder: TestDataSeeder; // Add testDataSeeder property
}

// Consolidated global test utilities
const testUtils: TestUtils = {
  // Basic utilities
  wait: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),
  generateTestId: (prefix = 'test') => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

  // Mock creation utilities
  createMockRequest: (overrides = {}) => ({
    body: {},
    headers: {},
    params: {},
    query: {},
    tenantContext: {
      tenantId: 'test-tenant',
      namespace: TEST_NAMESPACE,
      isTestTenant: true,
      isDefaultTenant: false
    },
    ...overrides
  }),

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
  },

  // Aliases for backward compatibility
  createMockReq: function(overrides = {}) {
    return this.createMockRequest(overrides);
  },

  createMockRes: function() {
    return this.createMockResponse();
  },

  createMockNext: () => jest.fn(),

  // Test tenant utilities
  getTestTenantClient: () => {
    return DgraphTenantFactory.createTestTenant();
  },

  // Constants
  TEST_NAMESPACE,
  TEST_TENANT_ID: 'test-tenant',

  // TestDataSeeder instance (implementation is in testDataSeeder.ts)
  testDataSeeder: new TestDataSeeder()
};

// Add to global namespace
declare global {
  var testUtils: TestUtils;
  var TEST_CONSTANTS: {
    VALID_NODE_TYPES: string[];
    VALID_EDGE_TYPES: string[];
    DEFAULT_HIERARCHY_ID: string;
    DEFAULT_LEVEL_ID: string;
    ADMIN_API_KEY: string;
  };
  var createTestNode: (overrides?: any) => any;
  var createTestEdge: (overrides?: any) => any;
  var createTestHierarchy: (overrides?: any) => any;
  var createTestLevel: (overrides?: any) => any;
  namespace jest {
    interface Matchers<R> {
      toBeValidNodeId(): R;
      toBeValidHierarchyId(): R;
      toHaveValidGraphQLResponse(): R;
    }
  }
}

// Assign the testUtils object to the global namespace
global.testUtils = testUtils;

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
  // Wait a bit to ensure async operations complete
  await global.testUtils.wait(10);
});

// Export common test constants
global.TEST_CONSTANTS = {
  VALID_NODE_TYPES: ['ConceptNode', 'ExampleNode', 'QuestionNode'],
  VALID_EDGE_TYPES: ['relates_to', 'contains', 'depends_on'],
  DEFAULT_HIERARCHY_ID: 'test-hierarchy',
  DEFAULT_LEVEL_ID: 'test-level',
  ADMIN_API_KEY: process.env.ADMIN_API_KEY || ''
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
