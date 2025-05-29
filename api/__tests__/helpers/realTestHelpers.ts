import request from 'supertest';
import { adaptiveTenantFactory } from '../../services/adaptiveTenantFactory';
import { Express } from 'express'; // Assuming Express type is available

// Define interface for the testRequest helper return type
interface TestRequestHelper {
  get: (url: string) => request.Test;
  post: (url: string) => request.Test;
  put: (url: string) => request.Test;
  delete: (url: string) => request.Test;
}

/**
 * Simple helper to make test requests with tenant header
 * Reuses existing request pattern but adds test-tenant header
 */
export const testRequest = (app: Express): TestRequestHelper => ({
  get: (url: string) => request(app).get(url).set('X-Tenant-Id', 'test-tenant'),
  post: (url: string) => request(app).post(url).set('X-Tenant-Id', 'test-tenant'),
  put: (url: string) => request(app).put(url).set('X-Tenant-Id', 'test-tenant'),
  delete: (url: string) => request(app).delete(url).set('X-Tenant-Id', 'test-tenant')
});

/**
 * Direct query helper for verification in test namespace
 * Uses real adaptiveTenantFactory (not mocked)
 */
export const verifyInTestTenant = async (query: string, variables: any = {}): Promise<any> => {
  const client = await adaptiveTenantFactory.createTestTenant();
  return client.executeGraphQL(query, variables);
};

// Define interface for the structure of test node data
interface TestNodeData {
  id: string;
  label: string;
  type: string;
  // Add other potential fields if they are commonly used in test data
  [key: string]: any; // Allow for overrides
}

/**
 * Create test data with consistent patterns from mockData.js
 * But uses real IDs with timestamps for uniqueness
 */
export const createTestNodeData = (overrides: Partial<TestNodeData> = {}): TestNodeData => ({
  id: `test-node-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
  label: 'Test Node',
  type: 'concept',
  ...overrides
});

// Define interface for the structure of test hierarchy assignment data
interface TestHierarchyAssignment {
  nodeId: string;
  hierarchyId: string;
  levelId: string;
}

/**
 * Create test hierarchy assignment data
 */
export const createTestHierarchyAssignment = (nodeId: string, hierarchyId: string = 'test-hierarchy-1', levelId: string = 'test-level-1'): TestHierarchyAssignment => ({
  nodeId,
  hierarchyId,
  levelId
});
