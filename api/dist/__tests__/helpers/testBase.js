"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockedIntegrationTestBase = exports.RealIntegrationTestBase = exports.IntegrationTestBase = void 0;
const supertest_1 = __importDefault(require("supertest"));
/**
 * Base class for integration tests with common setup/teardown patterns
 */
class IntegrationTestBase {
    constructor(app) {
        this.app = app;
    }
    /**
     * Setup method to be called in beforeAll
     */
    async setupTest() {
        // Override in subclasses for specific setup
    }
    /**
     * Cleanup method to be called in afterAll
     */
    async cleanupTest() {
        // Override in subclasses for specific cleanup
    }
    /**
     * Reset method to be called in beforeEach
     */
    async resetTest() {
        // Override in subclasses for specific reset logic
    }
    /**
     * Create a supertest request with common headers
     */
    createRequest() {
        return (0, supertest_1.default)(this.app);
    }
}
exports.IntegrationTestBase = IntegrationTestBase;
/**
 * Base class for real integration tests with database operations
 */
class RealIntegrationTestBase extends IntegrationTestBase {
    constructor() {
        super(...arguments);
        this.testTenantId = 'test-tenant';
    }
    async setupTest() {
        await global.testUtils.setupTestDatabase();
    }
    async cleanupTest() {
        await global.testUtils.cleanupTestDatabase();
    }
    async resetTest() {
        await global.testUtils.resetTestDatabase();
    }
    /**
     * Create a request with test tenant headers
     */
    createTenantRequest() {
        return this.createRequest().set('X-Tenant-Id', this.testTenantId);
    }
}
exports.RealIntegrationTestBase = RealIntegrationTestBase;
/**
 * Base class for mocked integration tests
 */
class MockedIntegrationTestBase extends IntegrationTestBase {
    constructor(app, mockExecuteGraphQL) {
        super(app);
        this.mockExecuteGraphQL = mockExecuteGraphQL;
    }
    async resetTest() {
        this.mockExecuteGraphQL.mockReset();
        // ADMIN_API_KEY is already loaded from .env file via jest.setup.ts
    }
}
exports.MockedIntegrationTestBase = MockedIntegrationTestBase;
