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
 * Returns a supertest agent with test-tenant header pre-set
 */
const testRequest = (app) => {
    const agent = (0, supertest_1.default)(app);
    // Override the original methods to automatically add the tenant header
    const originalPost = agent.post.bind(agent);
    const originalGet = agent.get.bind(agent);
    const originalPut = agent.put.bind(agent);
    const originalDelete = agent.delete.bind(agent);
    agent.post = (url) => originalPost(url).set('X-Tenant-Id', 'test-tenant');
    agent.get = (url) => originalGet(url).set('X-Tenant-Id', 'test-tenant');
    agent.put = (url) => originalPut(url).set('X-Tenant-Id', 'test-tenant');
    agent.delete = (url) => originalDelete(url).set('X-Tenant-Id', 'test-tenant');
    return agent;
};
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
