const { jest } = require('@jest/globals');
const { DgraphTenantFactory } = require('../../services/dgraphTenant');
const { TenantManager } = require('../../services/tenantManager');

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
process.env.ENABLE_MULTI_TENANT = 'true';
process.env.DGRAPH_NAMESPACE_TEST = '0x1';
process.env.DGRAPH_NAMESPACE_DEFAULT = '0x0';

const TEST_NAMESPACE = '0x1';
const tenantManager = new TenantManager();

// Global test utilities
global.testUtils = {
  // Helper to create mock request objects with tenant context
  createMockReq: (overrides = {}) => ({
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

  // Helper to create mock response objects
  createMockRes: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
  },

  // Helper to create mock next function
  createMockNext: () => jest.fn(),

  // Helper to get test tenant client
  getTestTenantClient: () => {
    return DgraphTenantFactory.createTestTenant();
  },

  // Helper to setup test database
  setupTestDatabase: async () => {
    console.log('[TEST_SETUP] Initializing test tenant database');
    
    try {
      // Ensure test tenant exists
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

  // Helper to cleanup test database
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

  // Helper to reset test database
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

  // Helper to seed test data
  seedTestData: async () => {
    console.log('[TEST_SEED] Seeding test data');
    
    try {
      const testClient = DgraphTenantFactory.createTestTenant();
      
      // Create test nodes
      const testNodes = [
        { id: 'test-node-1', label: 'Test Concept 1', type: 'concept' },
        { id: 'test-node-2', label: 'Test Example 1', type: 'example' },
        { id: 'test-node-3', label: 'Test Question 1', type: 'question' }
      ];

      for (const node of testNodes) {
        const mutation = `
          mutation AddTestNode($input: [AddNodeInput!]!) {
            addNode(input: $input) {
              node {
                id
                label
                type
              }
            }
          }
        `;
        
        await testClient.executeGraphQL(mutation, { input: [node] });
      }
      
      console.log('[TEST_SEED] Test data seeded successfully');
      return true;
    } catch (error) {
      console.error('[TEST_SEED] Failed to seed test data:', error);
      return false;
    }
  },

  // Constants
  TEST_NAMESPACE,
  TEST_TENANT_ID: 'test-tenant'
};

module.exports = {};
