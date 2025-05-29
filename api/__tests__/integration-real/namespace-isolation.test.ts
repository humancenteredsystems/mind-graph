const request = require('supertest');
const app = require('../../server');
const { testRequest, verifyInTestTenant, createTestNodeData } = require('../helpers/realTestHelpers');
import { Node } from '../../src/types/domain';

describe('Real Integration: Namespace Isolation', () => {
  beforeAll(async () => {
    await global.testUtils.testDataSeeder.setupTestDatabase();
  });

  afterAll(async () => {
    await global.testUtils.testDataSeeder.cleanupTestDatabase();
  });

  beforeEach(async () => {
    await global.testUtils.testDataSeeder.resetTestDatabase();
  });

  describe('Data Isolation Between Namespaces', () => {
    it('should isolate data between test and default namespaces', async () => {
      // Create data in test tenant
      const testNode = createTestNodeData({ label: 'Test Tenant Node', type: 'concept' });
      await testRequest(app)
        .post('/api/mutate')
        .set('X-Tenant-Id', 'test-tenant')
        .set('X-Hierarchy-Id', 'test-hierarchy-1')
        .send({
          mutation: `mutation { addNode(input: [{ id: "${testNode.id}", label: "${testNode.label}", type: "${testNode.type}" }]) { node { id } } }`
        });

      // Create data in default tenant
      const defaultNode = createTestNodeData({ label: 'Default Tenant Node', type: 'concept' });
      await testRequest(app)
        .post('/api/mutate')
        .set('X-Tenant-Id', 'default')
        .set('X-Hierarchy-Id', 'test-hierarchy-1') // Assuming default tenant also has this hierarchy
        .send({
          mutation: `mutation { addNode(input: [{ id: "${defaultNode.id}", label: "${defaultNode.label}", type: "${defaultNode.type}" }]) { node { id } } }`
        });

      // Query test tenant - should only see test node
      const testQuery = await testRequest(app)
        .post('/api/query')
        .set('X-Tenant-Id', 'test-tenant')
        .send({ query: `query { queryNode { id label } }` });
      const testNodeIds = testQuery.body.queryNode.map((n: Node) => n.id);
      expect(testNodeIds).toContain(testNode.id);
      expect(testNodeIds).not.toContain(defaultNode.id);

      // Query default tenant - should only see default node
      const defaultQuery = await testRequest(app)
        .post('/api/query')
        .set('X-Tenant-Id', 'default')
        .send({ query: `query { queryNode { id label } }` });
      const defaultNodeIds = defaultQuery.body.queryNode.map((n: Node) => n.id);
      expect(defaultNodeIds).toContain(defaultNode.id);
      expect(defaultNodeIds).not.toContain(testNode.id);
    });

    it('should verify test tenant data is completely separate', async () => {
      // Create data in test tenant
      const testNode = createTestNodeData({ label: 'Test Tenant Exclusive', type: 'concept' });
      await testRequest(app)
        .post('/api/mutate')
        .set('X-Tenant-Id', 'test-tenant')
        .set('X-Hierarchy-Id', 'test-hierarchy-1')
        .send({
          mutation: `mutation { addNode(input: [{ id: "${testNode.id}", label: "${testNode.label}", type: "${testNode.type}" }]) { node { id } } }`
        });

      // Query default tenant - should NOT see test node
      const defaultQuery = await testRequest(app)
        .post('/api/query')
        .set('X-Tenant-Id', 'default')
        .send({ query: `query { queryNode { id label } }` });
      const defaultNodeIds = defaultQuery.body.queryNode.map((n: Node) => n.id);
      expect(defaultNodeIds).not.toContain(testNode.id);
    });

    it('should create different data in each namespace without interference', async () => {
      const tenant1Id = `tenant-${Date.now()}-1`;
      const tenant2Id = `tenant-${Date.now()}-2`;

      // Create tenants
      await testRequest(app)
        .post('/api/tenant')
        .set('X-Admin-API-Key', process.env.ADMIN_API_KEY)
        .send({ tenantId: tenant1Id });
      await testRequest(app)
        .post('/api/tenant')
        .set('X-Admin-API-Key', process.env.ADMIN_API_KEY)
        .send({ tenantId: tenant2Id });

      // Create data in tenant 1
      const node1 = createTestNodeData({ label: 'Tenant 1 Node', type: 'concept' });
      await testRequest(app)
        .post('/api/mutate')
        .set('X-Tenant-Id', tenant1Id)
        .set('X-Hierarchy-Id', 'test-hierarchy-1') // Assuming new tenants get default hierarchy
        .send({
          mutation: `mutation { addNode(input: [{ id: "${node1.id}", label: "${node1.label}", type: "${node1.type}" }]) { node { id } } }`
        });

      // Create data in tenant 2
      const node2 = createTestNodeData({ label: 'Tenant 2 Node', type: 'concept' });
      await testRequest(app)
        .post('/api/mutate')
        .set('X-Tenant-Id', tenant2Id)
        .set('X-Hierarchy-Id', 'test-hierarchy-1') // Assuming new tenants get default hierarchy
        .send({
          mutation: `mutation { addNode(input: [{ id: "${node2.id}", label: "${node2.label}", type: "${node2.type}" }]) { node { id } } }`
        });

      // Query tenant 1 - should only see node 1
      const query1 = await testRequest(app)
        .post('/api/query')
        .set('X-Tenant-Id', tenant1Id)
        .send({ query: `query { queryNode { id label } }` });
      const nodeIds1 = query1.body.queryNode.map((n: Node) => n.id);
      expect(nodeIds1).toContain(node1.id);
      expect(nodeIds1).not.toContain(node2.id);

      // Query tenant 2 - should only see node 2
      const query2 = await testRequest(app)
        .post('/api/query')
        .set('X-Tenant-Id', tenant2Id)
        .send({ query: `query { queryNode { id label } }` });
      const nodeIds2 = query2.body.queryNode.map((n: Node) => n.id);
      expect(nodeIds2).toContain(node2.id);
      expect(nodeIds2).not.toContain(node1.id);

      // Cleanup tenants
      await testRequest(app)
        .delete(`/api/tenant/${tenant1Id}`)
        .set('X-Admin-API-Key', process.env.ADMIN_API_KEY);
      await testRequest(app)
        .delete(`/api/tenant/${tenant2Id}`)
        .set('X-Admin-API-Key', process.env.ADMIN_API_KEY);
    });
  });

  describe('Cross-Namespace Query Prevention', () => {
    it('should not allow cross-namespace data access', async () => {
      // Create data in test tenant
      const testNode = createTestNodeData({ label: 'Test Tenant Data', type: 'concept' });
      await testRequest(app)
        .post('/api/mutate')
        .set('X-Tenant-Id', 'test-tenant')
        .set('X-Hierarchy-Id', 'test-hierarchy-1')
        .send({
          mutation: `mutation { addNode(input: [{ id: "${testNode.id}", label: "${testNode.label}", type: "${testNode.type}" }]) { node { id } } }`
        });

      // Attempt to query test tenant data from default tenant
      const response = await testRequest(app)
        .post('/api/query')
        .set('X-Tenant-Id', 'default')
        .send({
          query: `query { getNode(id: "${testNode.id}") { id label } }`
        });

      // Expect the node not to be found in the default tenant
      expect(response.body.getNode).toBeNull();
    });
  });

  describe('Tenant Context Verification', () => {
    it('should use correct namespace based on tenant header', async () => {
      // Create data in test tenant
      const testNode = createTestNodeData({ label: 'Tenant Header Test', type: 'concept' });
      await testRequest(app)
        .post('/api/mutate')
        .set('X-Tenant-Id', 'test-tenant')
        .set('X-Hierarchy-Id', 'test-hierarchy-1')
        .send({
          mutation: `mutation { addNode(input: [{ id: "${testNode.id}", label: "${testNode.label}", type: "${testNode.type}" }]) { node { id } } }`
        });

      // Query using test tenant header - should find the node
      const testQuery = await testRequest(app)
        .post('/api/query')
        .set('X-Tenant-Id', 'test-tenant')
        .send({ query: `query { getNode(id: "${testNode.id}") { id label } }` });
      expect(testQuery.body.getNode).toBeTruthy();

      // Query using default tenant header - should NOT find the node
      const defaultQuery = await testRequest(app)
        .post('/api/query')
        .set('X-Tenant-Id', 'default')
        .send({ query: `query { getNode(id: "${testNode.id}") { id label } }` });
      expect(defaultQuery.body.getNode).toBeNull();
    });

    it('should use default namespace when no tenant header provided', async () => {
      // Create data in default tenant
      const defaultNode = createTestNodeData({ label: 'No Header Test', type: 'concept' });
      await testRequest(app)
        .post('/api/mutate')
        .set('X-Tenant-Id', 'default')
        .set('X-Hierarchy-Id', 'test-hierarchy-1') // Assuming default tenant has this hierarchy
        .send({
          mutation: `mutation { addNode(input: [{ id: "${defaultNode.id}", label: "${defaultNode.label}", type: "${defaultNode.type}" }]) { node { id } } }`
        });

      // Query without tenant header - should find the default node
      const noHeaderQuery = await testRequest(app)
        .post('/api/query')
        .send({ query: `query { getNode(id: "${defaultNode.id}") { id label } }` });
      expect(noHeaderQuery.body.getNode).toBeTruthy();

      // Query using test tenant header - should NOT find the default node
      const testQuery = await testRequest(app)
        .post('/api/query')
        .set('X-Tenant-Id', 'test-tenant')
        .send({ query: `query { getNode(id: "${defaultNode.id}") { id label } }` });
      expect(testQuery.body.getNode).toBeNull();
    });
  });

  describe('Namespace Safety', () => {
    it('should prevent accidental data mixing', async () => {
      // This test primarily relies on the DgraphTenant and TenantManager
      // implementations to ensure operations are scoped to the correct namespace.
      // The previous tests in this suite verify that data is isolated.
      // This test serves as a high-level check that the system prevents
      // accidental cross-namespace operations at the API level.

      // Attempt a mutation in test tenant
      const testNode = createTestNodeData({ label: 'Safety Test Node', type: 'concept' });
      await testRequest(app)
        .post('/api/mutate')
        .set('X-Tenant-Id', 'test-tenant')
        .set('X-Hierarchy-Id', 'test-hierarchy-1')
        .send({
          mutation: `mutation { addNode(input: [{ id: "${testNode.id}", label: "${testNode.label}", type: "${testNode.type}" }]) { node { id } } }`
        });

      // Verify the node exists ONLY in the test tenant
      const testQuery = await testRequest(app)
        .post('/api/query')
        .set('X-Tenant-Id', 'test-tenant')
        .send({ query: `query { getNode(id: "${testNode.id}") { id } }` });
      expect(testQuery.body.getNode).toBeTruthy();

      const defaultQuery = await testRequest(app)
        .post('/api/query')
        .set('X-Tenant-Id', 'default')
        .send({ query: `query { getNode(id: "${testNode.id}") { id } }` });
      expect(defaultQuery.body.getNode).toBeNull();
    });
  });
});
