// Consolidated Jest setup file for global test configuration
// This file is executed before each test file
// Environment variables are loaded in jest.config.js via dotenv

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DGRAPH_BASE_URL = 'http://localhost:8080';
process.env.PORT = '3001'; // Use different port for tests
// ADMIN_API_KEY should now be loaded from .env file via dotenv in jest.config.js
process.env.ENABLE_MULTI_TENANT = 'true';
process.env.DGRAPH_NAMESPACE_TEST = '0x1';
process.env.DGRAPH_NAMESPACE_DEFAULT = '0x0';

// Verify ADMIN_API_KEY is loaded from .env
if (!process.env.ADMIN_API_KEY) {
  throw new Error('ADMIN_API_KEY environment variable must be set for tests (should be loaded from .env file)');
}

// Global test timeout (30 seconds for integration tests)
jest.setTimeout(30000);

// Mock console methods to reduce noise in test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

// Temporarily disable console mocking for debugging real integration tests
// beforeAll(() => {
//   // Suppress console output during tests unless explicitly needed
//   console.error = jest.fn();
//   console.warn = jest.fn();
//   console.log = jest.fn();
// });

afterAll(() => {
  // Restore original console methods (if they were mocked)
  // console.error = originalConsoleError;
  // console.warn = originalConsoleWarn;
  // console.log = originalConsoleLog;
});

// Import test utilities from consolidated setup
import { TestDataSeeder } from './__tests__/helpers/testDataSeeder';
import { DgraphTenantFactory } from './services/dgraphTenant';
import { TenantManager } from './services/tenantManager';

const TEST_NAMESPACE = '0x1';
const tenantManager = new TenantManager();
const testDataSeeder = new TestDataSeeder();

// Consolidated global test utilities
(global as any).testUtils = {
  // Basic utilities
  wait: (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms)),
  generateTestId: (prefix: string = 'test') => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  
  // Mock creation utilities
  createMockRequest: (overrides: any = {}) => ({
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
  createMockReq: function(overrides: any = {}) {
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

  // Database management utilities
  setupTestDatabase: async () => {
    console.log('[TEST_SETUP] Initializing test tenant database');
    
    try {
      const exists = await tenantManager.tenantExists('test-tenant');
      if (!exists) {
        await tenantManager.createTenant('test-tenant');
      }
      
      console.log('[TEST_SETUP] Test tenant database ready');
      return true;
    } catch (error) {
      console.error('[TEST_SETUP] Failed to setup test database:', error);
      return false;
    }
  },

  cleanupTestDatabase: async () => {
    console.log('[TEST_CLEANUP] Cleaning test tenant database');
    
    try {
      await tenantManager.deleteTenant('test-tenant');
      console.log('[TEST_CLEANUP] Test tenant database cleaned');
      return true;
    } catch (error) {
      console.error('[TEST_CLEANUP] Failed to cleanup test database:', error);
      return false;
    }
  },

  resetTestDatabase: async () => {
    console.log('[TEST_RESET] Resetting test tenant database');
    
    try {
      await tenantManager.deleteTenant('test-tenant');
      await tenantManager.createTenant('test-tenant');
      console.log('[TEST_RESET] Test tenant database reset');
      return true;
    } catch (error) {
      console.error('[TEST_RESET] Failed to reset test database:', error);
      return false;
    }
  },

  seedTestData: async () => {
    console.log('[TEST_SEED] Seeding test data');
    
    try {
      await testDataSeeder.seedTestData();
      console.log('[TEST_SEED] Test data seeded successfully');
      return true;
    } catch (error) {
      console.error('[TEST_SEED] Failed to seed test data:', error);
      return false;
    }
  },

  // Include testDataSeeder instance
  testDataSeeder,

  // Constants
  TEST_NAMESPACE,
  TEST_TENANT_ID: 'test-tenant'
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

// Note: Not globally mocking axios to allow real integration tests to make HTTP calls
// Individual unit tests should mock axios locally if needed

// Mock file system operations for consistent testing (after we've read .env)
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
  toBeValidNodeId(received: any) {
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
  
  toBeValidHierarchyId(received: any) {
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
  
  toHaveValidGraphQLResponse(received: any) {
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
  await (global as any).testUtils.wait(10);
});

// Export common test constants
(global as any).TEST_CONSTANTS = {
  VALID_NODE_TYPES: ['ConceptNode', 'ExampleNode', 'QuestionNode'],
  VALID_EDGE_TYPES: ['relates_to', 'contains', 'depends_on'],
  DEFAULT_HIERARCHY_ID: 'test-hierarchy',
  DEFAULT_LEVEL_ID: 'test-level',
  ADMIN_API_KEY: process.env.ADMIN_API_KEY
};

// Helper to create consistent test data
(global as any).createTestNode = (overrides: any = {}) => ({
  id: (global as any).testUtils.generateTestId('node'),
  label: 'Test Node',
  type: 'ConceptNode',
  status: 'active',
  branch: 'main',
  ...overrides
});

(global as any).createTestEdge = (overrides: any = {}) => ({
  fromId: (global as any).testUtils.generateTestId('from'),
  toId: (global as any).testUtils.generateTestId('to'),
  type: 'relates_to',
  ...overrides
});

(global as any).createTestHierarchy = (overrides: any = {}) => ({
  id: (global as any).testUtils.generateTestId('hierarchy'),
  name: 'Test Hierarchy',
  ...overrides
});

(global as any).createTestLevel = (overrides: any = {}) => ({
  id: (global as any).testUtils.generateTestId('level'),
  levelNumber: 1,
  label: 'Test Level',
  ...overrides
});

// Dgraph Enterprise detection for conditional test execution
(global as any).testUtils.checkDgraphEnterprise = async () => {
  try {
    const axios = require('axios');
    const response = await axios.get('http://localhost:8080/state');
    return response.data && response.data.enterprise === true;
  } catch (error) {
    console.warn('[TEST_SETUP] Dgraph Enterprise not available, skipping real integration tests');
    return false;
  }
};

// Global flag for enterprise availability
(global as any).DGRAPH_ENTERPRISE_AVAILABLE = false;

// Check enterprise availability during setup
beforeAll(async () => {
  (global as any).DGRAPH_ENTERPRISE_AVAILABLE = await (global as any).testUtils.checkDgraphEnterprise();
});
