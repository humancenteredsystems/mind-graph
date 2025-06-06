// Integration-real test setup - NO AXIOS MOCKING
// This file is executed before each integration-real test file
// Environment variables are loaded in jest.config.js via dotenv

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DGRAPH_BASE_URL = 'http://localhost:8080';
process.env.PORT = '3001'; // Use different port for tests
process.env.ENABLE_MULTI_TENANT = 'true';
process.env.DGRAPH_NAMESPACE_TEST = '0x1';
process.env.DGRAPH_NAMESPACE_DEFAULT = '0x0';

// Verify ADMIN_API_KEY is loaded from .env
if (!process.env.ADMIN_API_KEY) {
  throw new Error('ADMIN_API_KEY environment variable must be set for tests (should be loaded from .env file)');
}

// Global test timeout (30 seconds for integration tests)
jest.setTimeout(30000);

// Import necessary modules (REAL axios, not mocked)
import { TestDataSeeder } from './__tests__/helpers/testDataSeeder';
import { DgraphTenantFactory } from './services/dgraphTenant';
import { TenantManager } from './services/tenantManager';
import { dgraphCapabilityDetector } from './services/dgraphCapabilities';

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

// Dgraph Enterprise detection for conditional test execution using our capability detector
(global as any).testUtils.checkDgraphEnterprise = async () => {
  try {
    const capabilities = await dgraphCapabilityDetector.detectCapabilities();
    
    // Check if Enterprise features are active and license is valid
    const isEnterprise = capabilities.enterpriseDetected && 
                        capabilities.licenseType !== 'oss-only' &&
                        (!capabilities.licenseExpiry || capabilities.licenseExpiry > new Date());

    if (!isEnterprise) {
      console.warn('[TEST_SETUP] Dgraph Enterprise not available or license expired, skipping real integration tests');
      console.warn('[TEST_SETUP] Capabilities:', {
        enterpriseDetected: capabilities.enterpriseDetected,
        licenseType: capabilities.licenseType,
        licenseExpiry: capabilities.licenseExpiry,
        namespacesSupported: capabilities.namespacesSupported
      });
    } else {
      console.log('[TEST_SETUP] Dgraph Enterprise detected and licensed');
      console.log('[TEST_SETUP] Capabilities:', {
        enterpriseDetected: capabilities.enterpriseDetected,
        licenseType: capabilities.licenseType,
        licenseExpiry: capabilities.licenseExpiry,
        namespacesSupported: capabilities.namespacesSupported
      });
    }

    return isEnterprise;

  } catch (error: unknown) {
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.warn('[TEST_SETUP] Error checking Dgraph Enterprise capabilities, skipping real integration tests:', errorMessage);
    return false;
  }
};

// Enterprise detection at module load time using our capability detector
// Note: We start with false and update asynchronously to avoid blocking module load
(global as any).DGRAPH_ENTERPRISE_AVAILABLE = false;

// Async enterprise detection that runs before all tests
beforeAll(async () => {
  try {
    console.log('[TEST_SETUP] Checking Dgraph Enterprise capabilities...');
    const isEnterprise = await (global as any).testUtils.checkDgraphEnterprise();
    (global as any).DGRAPH_ENTERPRISE_AVAILABLE = isEnterprise;
    
    if (isEnterprise) {
      console.log('[TEST_SETUP] ✅ Dgraph Enterprise available for real integration tests');
    } else {
      console.warn('[TEST_SETUP] ❌ Dgraph Enterprise not available - real integration tests will be skipped');
    }
  } catch (error) {
    console.error('[TEST_SETUP] Failed to detect Enterprise capabilities:', error instanceof Error ? error.message : error);
    (global as any).DGRAPH_ENTERPRISE_AVAILABLE = false;
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
