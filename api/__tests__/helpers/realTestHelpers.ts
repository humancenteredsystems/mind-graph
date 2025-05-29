import request from 'supertest';
import { adaptiveTenantFactory } from '../../services/adaptiveTenantFactory';
import { Express } from 'express';

/**
 * Simple helper to make test requests with tenant header
 * Reuses existing request pattern but adds test-tenant header
 */
export const testRequest = (app: Express) => ({
  get: (url: string) => request(app).get(url).set('X-Tenant-Id', 'test-tenant'),
  post: (url: string) => request(app).post(url).set('X-Tenant-Id', 'test-tenant'),
  put: (url: string) => request(app).put(url).set('X-Tenant-Id', 'test-tenant'),
  delete: (url: string) => request(app).delete(url).set('X-Tenant-Id', 'test-tenant')
});

/**
 * Direct query helper for verification in test namespace
 * Uses real adaptiveTenantFactory (not mocked)
 */
export const verifyInTestTenant = async (query: string, variables: any = {}) => {
  const client = await adaptiveTenantFactory.createTestTenant();
  return client.executeGraphQL(query, variables);
};

/**
 * Create test data with consistent patterns from mockData.ts
 * But uses real IDs with timestamps for uniqueness
 */
export const createTestNodeData = (overrides: any = {}) => ({
  id: `test-node-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
  label: 'Test Node',
  type: 'concept',
  ...overrides
});

/**
 * Create test hierarchy assignment data
 */
export const createTestHierarchyAssignment = (
  nodeId: string, 
  hierarchyId: string = 'test-hierarchy-1', 
  levelId: string = 'test-level-1'
) => ({
  nodeId,
  hierarchyId,
  levelId
});
