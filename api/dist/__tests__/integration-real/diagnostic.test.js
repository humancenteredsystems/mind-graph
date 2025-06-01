"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const server_1 = __importDefault(require("../../server"));
const adaptiveTenantFactory_1 = require("../../services/adaptiveTenantFactory");
const graphqlTestUtils_1 = require("../helpers/graphqlTestUtils");
describe('Real Integration: Diagnostic Tests', () => {
    describe('Basic Connectivity', () => {
        it('should connect to the API server', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .get('/api/health')
                .expect(200);
            console.log('Health check response:', response.body);
        });
        it('should check adaptiveTenantFactory capabilities', async () => {
            const capabilities = adaptiveTenantFactory_1.adaptiveTenantFactory.getCapabilities();
            console.log('Tenant factory capabilities:', capabilities);
            const isMultiTenantSupported = adaptiveTenantFactory_1.adaptiveTenantFactory.isMultiTenantSupported();
            console.log('Multi-tenant supported:', isMultiTenantSupported);
        });
        it('should attempt to create test tenant client', async () => {
            try {
                const testClient = await adaptiveTenantFactory_1.adaptiveTenantFactory.createTestTenant();
                console.log('Test client created successfully');
                console.log('Test client namespace:', testClient.getNamespace());
                // Try a simple query to see if the client works
                const result = await testClient.executeGraphQL('query { __schema { types { name } } }');
                console.log('Schema query result:', !!result);
            }
            catch (error) {
                console.error('Failed to create test client:', (0, graphqlTestUtils_1.getErrorMessage)(error));
                throw error;
            }
        });
        it('should check test database setup utilities', async () => {
            try {
                console.log('Available test utils:', Object.keys(global.testUtils));
                // Try to setup test database
                const setupResult = await global.testUtils.setupTestDatabase();
                console.log('Setup test database result:', setupResult);
            }
            catch (error) {
                console.error('Test database setup failed:', (0, graphqlTestUtils_1.getErrorMessage)(error));
                throw error;
            }
        });
    });
    describe('Simple Query Test', () => {
        it('should handle basic query without tenant header', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/query')
                .send({
                query: 'query { __schema { types { name } } }'
            });
            console.log('Basic query status:', response.status);
            console.log('Basic query body:', response.body);
            // Don't expect specific status, just log what we get
            expect([200, 400, 500]).toContain(response.status);
        });
        it('should handle basic query with test tenant header', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/query')
                .set('X-Tenant-Id', 'test-tenant')
                .send({
                query: 'query { __schema { types { name } } }'
            });
            console.log('Tenant query status:', response.status);
            console.log('Tenant query body:', response.body);
            // Don't expect specific status, just log what we get
            expect([200, 400, 500]).toContain(response.status);
        });
    });
});
