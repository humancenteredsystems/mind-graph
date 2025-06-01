"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestHierarchyAssignment = exports.createTestNodeData = exports.verifyInTestTenant = exports.testRequest = void 0;
const supertest_1 = __importDefault(require("supertest"));
const adaptiveTenantFactory_1 = require("../../services/adaptiveTenantFactory");
/**
 * Simple helper to make test requests with tenant header
 * Reuses existing request pattern but adds test-tenant header
 */
const testRequest = (app) => ({
    get: (url) => (0, supertest_1.default)(app).get(url).set('X-Tenant-Id', 'test-tenant'),
    post: (url) => (0, supertest_1.default)(app).post(url).set('X-Tenant-Id', 'test-tenant'),
    put: (url) => (0, supertest_1.default)(app).put(url).set('X-Tenant-Id', 'test-tenant'),
    delete: (url) => (0, supertest_1.default)(app).delete(url).set('X-Tenant-Id', 'test-tenant')
});
exports.testRequest = testRequest;
/**
 * Direct query helper for verification in test namespace
 * Uses real adaptiveTenantFactory (not mocked)
 */
const verifyInTestTenant = async (query, variables = {}) => {
    const client = await adaptiveTenantFactory_1.adaptiveTenantFactory.createTestTenant();
    return client.executeGraphQL(query, variables);
};
exports.verifyInTestTenant = verifyInTestTenant;
/**
 * Create test data with consistent patterns from mockData.ts
 * But uses real IDs with timestamps for uniqueness
 */
const createTestNodeData = (overrides = {}) => ({
    id: `test-node-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    label: 'Test Node',
    type: 'concept',
    ...overrides
});
exports.createTestNodeData = createTestNodeData;
/**
 * Create test hierarchy assignment data
 */
const createTestHierarchyAssignment = (nodeId, hierarchyId = 'test-hierarchy-1', levelId = 'test-level-1') => ({
    nodeId,
    hierarchyId,
    levelId
});
exports.createTestHierarchyAssignment = createTestHierarchyAssignment;
