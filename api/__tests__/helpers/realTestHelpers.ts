import request from 'supertest';
import { adaptiveTenantFactory } from '../../services/adaptiveTenantFactory';
import { Express } from 'express';
import config from '../../config';

/**
 * Simple helper to make test requests with tenant header and admin auth
 * Returns a supertest agent with test-tenant header and admin auth pre-set for protected routes
 */
export const testRequest = (app: Express) => {
  const agent = request(app);
  // Override the original methods to automatically add the tenant header and admin auth where needed
  const originalPost = agent.post.bind(agent);
  const originalGet = agent.get.bind(agent);
  const originalPut = agent.put.bind(agent);
  const originalDelete = agent.delete.bind(agent);
  
  // Helper to determine if a route needs admin authentication
  const needsAdminAuth = (url: string): boolean => {
    return url.includes('/api/hierarchy') && !url.match(/\/api\/hierarchy$/) && url !== '/api/hierarchy';
  };
  
  agent.post = (url: string) => {
    const req = originalPost(url).set('X-Tenant-Id', 'test-tenant');
    // Add admin auth for hierarchy operations (POST only, GET is public)
    if (url.includes('/api/hierarchy') && config.adminApiKey) {
      req.set('X-Admin-API-Key', config.adminApiKey);
    }
    return req;
  };
  
  agent.get = (url: string) => originalGet(url).set('X-Tenant-Id', 'test-tenant');
  
  agent.put = (url: string) => {
    const req = originalPut(url).set('X-Tenant-Id', 'test-tenant');
    if (needsAdminAuth(url) && config.adminApiKey) {
      req.set('X-Admin-API-Key', config.adminApiKey);
    }
    return req;
  };
  
  agent.delete = (url: string) => {
    const req = originalDelete(url).set('X-Tenant-Id', 'test-tenant');
    if (needsAdminAuth(url) && config.adminApiKey) {
      req.set('X-Admin-API-Key', config.adminApiKey);
    }
    return req;
  };
  
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
export const createTestHierarchyAssignment = (
  nodeId: string, 
  hierarchyId: string = 'test-hierarchy-1', 
  levelId: string  // No default - require explicit level ID
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
