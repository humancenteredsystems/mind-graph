const request = require('supertest');
const { adaptiveTenantFactory } = require('../../services/adaptiveTenantFactory');

/**
 * Simple helper to make test requests with tenant header
 * Reuses existing request pattern but adds test-tenant header
 */
const testRequest = (app) => ({
  get: (url) => request(app).get(url).set('X-Tenant-Id', 'test-tenant'),
  post: (url) => request(app).post(url).set('X-Tenant-Id', 'test-tenant'),
  put: (url) => request(app).put(url).set('X-Tenant-Id', 'test-tenant'),
  delete: (url) => request(app).delete(url).set('X-Tenant-Id', 'test-tenant')
});

/**
 * Direct query helper for verification in test namespace
 * Uses real adaptiveTenantFactory (not mocked)
 */
const verifyInTestTenant = async (query, variables = {}) => {
  const client = await adaptiveTenantFactory.createTestTenant();
  return client.executeGraphQL(query, variables);
};

/**
 * Create test data with consistent patterns from mockData.js
 * But uses real IDs with timestamps for uniqueness
 */
const createTestNodeData = (overrides = {}) => ({
  id: `test-node-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
  label: 'Test Node',
  type: 'concept',
  ...overrides
});

/**
 * Create test hierarchy assignment data
 */
const createTestHierarchyAssignment = (nodeId, hierarchyId = 'test-hierarchy-1', levelId = 'test-level-1') => ({
  nodeId,
  hierarchyId,
  levelId
});

module.exports = {
  testRequest,
  verifyInTestTenant,
  createTestNodeData,
  createTestHierarchyAssignment
};
