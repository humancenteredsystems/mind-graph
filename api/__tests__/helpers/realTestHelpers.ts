import request from 'supertest';
import { adaptiveTenantFactory } from '../../services/adaptiveTenantFactory';
import { Express } from 'express';

/**
 * Simple helper to make test requests with tenant header
 * Returns a supertest agent with test-tenant header pre-set
 */
export const testRequest = (app: Express) => {
  const agent = request(app);
  // Override the original methods to automatically add the tenant header
  const originalPost = agent.post.bind(agent);
  const originalGet = agent.get.bind(agent);
  const originalPut = agent.put.bind(agent);
  const originalDelete = agent.delete.bind(agent);
  
  agent.post = (url: string) => originalPost(url).set('X-Tenant-Id', 'test-tenant');
  agent.get = (url: string) => originalGet(url).set('X-Tenant-Id', 'test-tenant');
  agent.put = (url: string) => originalPut(url).set('X-Tenant-Id', 'test-tenant');
  agent.delete = (url: string) => originalDelete(url).set('X-Tenant-Id', 'test-tenant');
  
  return agent;
};

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
