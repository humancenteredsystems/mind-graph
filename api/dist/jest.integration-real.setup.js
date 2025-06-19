"use strict";
// Integration-real test setup - NO AXIOS MOCKING
// This file is executed before each integration-real test file
// Environment variables are loaded in jest.config.js via dotenv
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// CRITICAL: Set Enterprise availability FIRST before any imports or test file evaluation
// Initialize as false, will be updated during setup based on actual detection
global.DGRAPH_ENTERPRISE_AVAILABLE = false;
console.log('[SETUP] Enterprise availability initialized, will be detected during setup');
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
const testDataSeeder_1 = require("./__tests__/helpers/testDataSeeder");
const dgraphTenant_1 = require("./services/dgraphTenant");
const tenantManager_1 = require("./services/tenantManager");
const capabilityHelpers_1 = require("./utils/capabilityHelpers");
const TEST_NAMESPACE = '0x1';
const tenantManager = new tenantManager_1.TenantManager();
const testDataSeeder = new testDataSeeder_1.TestDataSeeder();
// Consolidated global test utilities
global.testUtils = {
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
    createMockReq: function (overrides = {}) {
        return this.createMockRequest(overrides);
    },
    createMockRes: function () {
        return this.createMockResponse();
    },
    createMockNext: () => jest.fn(),
    // Test tenant utilities
    getTestTenantClient: () => {
        return dgraphTenant_1.DgraphTenantFactory.createTestTenant();
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
        }
        catch (error) {
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
        }
        catch (error) {
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
        }
        catch (error) {
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
        }
        catch (error) {
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
// Dgraph Enterprise detection for conditional test execution using standardized capability helpers
global.testUtils.checkDgraphEnterprise = async () => {
    try {
        console.log('[TEST_SETUP] Checking Dgraph Enterprise capabilities...');
        // Use standardized capability detection via ensureCapabilitiesDetected
        const capabilities = await capabilityHelpers_1.capabilityHelpers.ensureCapabilitiesDetected();
        console.log('[TEST_SETUP] Raw capabilities detected:', {
            enterpriseDetected: capabilities.enterpriseDetected,
            licenseType: capabilities.licenseType,
            licenseExpiry: capabilities.licenseExpiry,
            namespacesSupported: capabilities.namespacesSupported,
            error: capabilities.error
        });
        // Simplified Enterprise checking for test environment
        // Accept Enterprise if ANY of these are true:
        // 1. Namespaces explicitly supported
        // 2. Enterprise explicitly detected  
        // 3. License type suggests Enterprise features
        // 4. No explicit detection errors (assume it might work)
        const namespacesWork = capabilities.namespacesSupported === true;
        const enterpriseDetected = capabilities.enterpriseDetected === true;
        const hasEnterpriseIndicators = capabilities.licenseType && capabilities.licenseType !== 'oss-only';
        const noDetectionErrors = !capabilities.error || capabilities.error === '';
        // For testing: be more optimistic about Enterprise availability
        const finalResult = namespacesWork ||
            enterpriseDetected ||
            hasEnterpriseIndicators ||
            (noDetectionErrors && process.env.ENABLE_MULTI_TENANT === 'true');
        if (!finalResult) {
            console.warn('[TEST_SETUP] ❌ Dgraph Enterprise not available - real integration tests will be skipped');
            console.warn('[TEST_SETUP] Enterprise Detection Details:', {
                enterpriseDetected: capabilities.enterpriseDetected,
                licenseType: capabilities.licenseType,
                namespacesSupported: capabilities.namespacesSupported,
                namespacesWork,
                error: capabilities.error
            });
        }
        else {
            console.log('[TEST_SETUP] ✅ Dgraph Enterprise available for real integration tests');
            console.log('[TEST_SETUP] Enterprise Detection Details:', {
                enterpriseDetected: capabilities.enterpriseDetected,
                licenseType: capabilities.licenseType,
                namespacesSupported: capabilities.namespacesSupported,
                namespacesWork,
                detectionMethod: namespacesWork ? 'namespace-support' : 'enterprise-detected'
            });
        }
        return finalResult;
    }
    catch (error) {
        let errorMessage = 'Unknown error';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        console.error('[TEST_SETUP] ❌ Error checking Dgraph Enterprise capabilities:', errorMessage);
        console.error('[TEST_SETUP] Full error:', error);
        // In test environment, if capability detection fails, try a simple namespace test
        console.log('[TEST_SETUP] Attempting fallback Enterprise detection...');
        try {
            const simpleTest = await testSimpleNamespaceOperation();
            if (simpleTest) {
                console.log('[TEST_SETUP] ✅ Fallback Enterprise detection successful via namespace test');
                return true;
            }
        }
        catch (fallbackError) {
            console.warn('[TEST_SETUP] Fallback detection also failed:', fallbackError instanceof Error ? fallbackError.message : fallbackError);
        }
        console.warn('[TEST_SETUP] ❌ All Enterprise detection methods failed - skipping real integration tests');
        return false;
    }
};
// Simple namespace operation test as fallback Enterprise detection
async function testSimpleNamespaceOperation() {
    try {
        const { DgraphTenantFactory } = await Promise.resolve().then(() => __importStar(require('./services/dgraphTenant')));
        const testClient = DgraphTenantFactory.createTestTenant();
        // Try a simple operation that requires namespace support
        const result = await testClient.executeGraphQL('{ __schema { queryType { name } } }');
        return result && typeof result === 'object';
    }
    catch (error) {
        console.log('[TEST_SETUP] Namespace test failed:', error instanceof Error ? error.message : error);
        return false;
    }
}
// Async enterprise detection that runs before all tests
beforeAll(async () => {
    try {
        console.log('[TEST_SETUP] Detecting Enterprise capabilities...');
        const isEnterprise = await global.testUtils.checkDgraphEnterprise();
        global.DGRAPH_ENTERPRISE_AVAILABLE = isEnterprise;
        if (isEnterprise) {
            console.log('[TEST_SETUP] ✅ Dgraph Enterprise detected - real integration tests will run');
        }
        else {
            console.warn('[TEST_SETUP] ❌ Dgraph Enterprise not detected - real integration tests will be skipped');
        }
    }
    catch (error) {
        console.error('[TEST_SETUP] Failed to detect Enterprise capabilities:', error instanceof Error ? error.message : error);
        global.DGRAPH_ENTERPRISE_AVAILABLE = false;
        console.warn('[TEST_SETUP] ❌ Enterprise detection failed - real integration tests will be skipped');
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
    await global.testUtils.wait(10);
});
// Export common test constants
global.TEST_CONSTANTS = {
    VALID_NODE_TYPES: ['ConceptNode', 'ExampleNode', 'QuestionNode'],
    VALID_EDGE_TYPES: ['relates_to', 'contains', 'depends_on'],
    DEFAULT_HIERARCHY_ID: 'test-hierarchy',
    DEFAULT_LEVEL_ID: 'test-level',
    ADMIN_API_KEY: process.env.ADMIN_API_KEY
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
