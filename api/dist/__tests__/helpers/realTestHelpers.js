"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestHierarchyAssignment = exports.createTestNodeData = exports.verifyInTestTenant = exports.testRequest = void 0;
const supertest_1 = __importDefault(require("supertest"));
const adaptiveTenantFactory_1 = require("../../services/adaptiveTenantFactory");
const config_1 = __importDefault(require("../../config"));
/**
 * Simple helper to make test requests with tenant header and admin auth
 * Returns a supertest agent with test-tenant header and admin auth pre-set for protected routes
 */
const testRequest = (app) => {
    const agent = (0, supertest_1.default)(app);
    // Override the original methods to automatically add the tenant header and admin auth where needed
    const originalPost = agent.post.bind(agent);
    const originalGet = agent.get.bind(agent);
    const originalPut = agent.put.bind(agent);
    const originalDelete = agent.delete.bind(agent);
    // Helper to determine if a route needs admin authentication
    const needsAdminAuth = (url) => {
        return url.includes('/api/hierarchy') && !url.match(/\/api\/hierarchy$/) && url !== '/api/hierarchy';
    };
    agent.post = (url) => {
        const req = originalPost(url).set('X-Tenant-Id', 'test-tenant');
        // Add admin auth for hierarchy operations (POST only, GET is public)
        if (url.includes('/api/hierarchy') && config_1.default.adminApiKey) {
            req.set('X-Admin-API-Key', config_1.default.adminApiKey);
        }
        return req;
    };
    agent.get = (url) => originalGet(url).set('X-Tenant-Id', 'test-tenant');
    agent.put = (url) => {
        const req = originalPut(url).set('X-Tenant-Id', 'test-tenant');
        if (needsAdminAuth(url) && config_1.default.adminApiKey) {
            req.set('X-Admin-API-Key', config_1.default.adminApiKey);
        }
        return req;
    };
    agent.delete = (url) => {
        const req = originalDelete(url).set('X-Tenant-Id', 'test-tenant');
        if (needsAdminAuth(url) && config_1.default.adminApiKey) {
            req.set('X-Admin-API-Key', config_1.default.adminApiKey);
        }
        return req;
    };
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
 *
 * IMPORTANT: levelId must be a real, dynamic ID obtained from Dgraph.
 * Do NOT use hardcoded values like 'test-level-1' - these will not exist.
 *
 * Get actual level IDs from test seeder or query results like:
 * const levelId = levelsResult.addHierarchyLevel.hierarchyLevel.find(l => l.levelNumber === 1)?.id;
 *
 * @param nodeId - The node ID to assign
 * @param hierarchyId - The hierarchy ID (defaults to 'test-hierarchy-1')
 * @param levelId - REQUIRED: Real level ID from Dgraph (no hardcoded defaults)
 *
 * @throws Error if levelId is not provided
 *
 * Related: Issues #6, #13 - Fixed hardcoded level ID assumptions
 */
const createTestHierarchyAssignment = (nodeId, hierarchyId = 'test-hierarchy-1', levelId // No default - require explicit level ID
) => {
    if (!levelId) {
        throw new Error('levelId is required and must be a real Dgraph-generated ID. Do not use hardcoded values like "test-level-1". See Issues #6/#13 for context.');
    }
    return {
        nodeId,
        hierarchyId,
        levelId
    };
};
exports.createTestHierarchyAssignment = createTestHierarchyAssignment;
