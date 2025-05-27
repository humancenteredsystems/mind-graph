const request = require('supertest');
const app = require('../../server');
const { adaptiveTenantFactory } = require('../../services/adaptiveTenantFactory');
const { testRequest, verifyInTestTenant, createTestNodeData } = require('../helpers/realTestHelpers');

describe('Real Integration: Namespace Isolation', () => {
  beforeAll(async () => {
    await global.testUtils.setupTestDatabase();
  });

  afterAll(async () => {
    await global.testUtils.cleanupTestDatabase();
  });

  beforeEach(async () => {
    await global.testUtils.resetTestDatabase();
  });

  describe('Data Isolation Between Namespaces', () => {
    it('should isolate data between test and default namespaces', async () => {
      const uniqueId = `isolation-test-${Date.now()}`;
      
      // Create node in test tenant (namespace 0x1)
      await testRequest(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'test-hierarchy-1')
        .send({
          mutation: `
            mutation {
              addNode(input: [{ 
                id: "${uniqueId}", 
                label: "Test Tenant Only Node", 
                type: "concept" 
              }]) {
                node { id label }
              }
            }
          `
        })
        .expect(200);

      // Try to read from default namespace (no tenant header)
      const defaultResponse = await request(app)
        .post('/api/query')
        .send({
          query: `
            query {
              getNode(id: "${uniqueId}") {
                id
                label
              }
            }
          `
        })
        .expect(200);

      // Should not find it in default namespace
      expect(defaultResponse.body.getNode).toBeNull();

      // Verify it exists in test namespace
      const testResult = await verifyInTestTenant(`
        query {
          getNode(id: "${uniqueId}") {
            id
            label
          }
        }
      `);
      
      expect(testResult.getNode).toBeTruthy();
      expect(testResult.getNode.id).toBe(uniqueId);
      expect(testResult.getNode.label).toBe('Test Tenant Only Node');
    });

    it('should verify test tenant data is completely separate', async () => {
      // Query all nodes from test tenant
      const testResponse = await testRequest(app)
        .post('/api/query')
        .send({
          query: `
            query {
              queryNode {
                id
                label
                type
              }
            }
          `
        })
        .expect(200);

      // Query all nodes from default namespace
      const defaultResponse = await request(app)
        .post('/api/query')
        .send({
          query: `
            query {
              queryNode {
                id
                label
                type
              }
            }
          `
        })
        .expect(200);

      // Test tenant should have seeded data
      const testNodeIds = testResponse.body.queryNode.map(n => n.id);
      expect(testNodeIds).toContain('test-concept-1');
      expect(testNodeIds).toContain('test-example-1');

      // Default namespace should be empty or have different data
      const defaultNodeIds = defaultResponse.body.queryNode.map(n => n.id);
      expect(defaultNodeIds).not.toContain('test-concept-1');
      expect(defaultNodeIds).not.toContain('test-example-1');
    });

    it('should create different data in each namespace without interference', async () => {
      const testNodeId = `test-ns-${Date.now()}`;
      const defaultNodeId = `default-ns-${Date.now()}`;

      // Create in test namespace
      await testRequest(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'test-hierarchy-1')
        .send({
          mutation: `
            mutation {
              addNode(input: [{ 
                id: "${testNodeId}", 
                label: "Test Namespace Node", 
                type: "concept" 
              }]) {
                node { id }
              }
            }
          `
        })
        .expect(200);

      // Create in default namespace (if supported)
      // Note: This may fail in environments without default hierarchy setup
      try {
        await request(app)
          .post('/api/mutate')
          .set('X-Hierarchy-Id', 'default-hierarchy')
          .send({
            mutation: `
              mutation {
                addNode(input: [{ 
                  id: "${defaultNodeId}", 
                  label: "Default Namespace Node", 
                  type: "concept" 
                }]) {
                  node { id }
                }
              }
            `
          });
      } catch (error) {
        // Expected if default hierarchy doesn't exist
        console.log('Default namespace creation skipped - no default hierarchy');
      }

      // Verify isolation: test node only in test namespace
      const testCheck = await testRequest(app)
        .post('/api/query')
        .send({
          query: `query { getNode(id: "${testNodeId}") { id } }`
        })
        .expect(200);

      const defaultCheck = await request(app)
        .post('/api/query')
        .send({
          query: `query { getNode(id: "${testNodeId}") { id } }`
        })
        .expect(200);

      expect(testCheck.body.getNode).toBeTruthy();
      expect(defaultCheck.body.getNode).toBeNull();
    });
  });

  describe('Cross-Namespace Query Prevention', () => {
    it('should not allow cross-namespace data access', async () => {
      const testNodeData = createTestNodeData({
        label: 'Cross Namespace Test',
        type: 'concept'
      });

      // Create in test namespace
      await testRequest(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'test-hierarchy-1')
        .send({
          mutation: `
            mutation {
              addNode(input: [{ 
                id: "${testNodeData.id}", 
                label: "${testNodeData.label}", 
                type: "${testNodeData.type}" 
              }]) {
                node { id }
              }
            }
          `
        })
        .expect(200);

      // Try to access via default namespace
      const crossAccessAttempt = await request(app)
        .post('/api/query')
        .send({
          query: `
            query {
              getNode(id: "${testNodeData.id}") {
                id
                label
              }
            }
          `
        })
        .expect(200);

      // Should not find the node
      expect(crossAccessAttempt.body.getNode).toBeNull();

      // Verify node still exists in correct namespace
      const correctAccess = await verifyInTestTenant(`
        query {
          getNode(id: "${testNodeData.id}") {
            id
            label
          }
        }
      `);

      expect(correctAccess.getNode).toBeTruthy();
      expect(correctAccess.getNode.id).toBe(testNodeData.id);
    });
  });

  describe('Tenant Context Verification', () => {
    it('should use correct namespace based on tenant header', async () => {
      // Test with explicit tenant header
      const response = await request(app)
        .post('/api/query')
        .set('X-Tenant-Id', 'test-tenant')
        .send({
          query: `
            query {
              queryNode(first: 5) {
                id
                label
              }
            }
          `
        })
        .expect(200);

      // Should get test tenant data
      const nodeIds = response.body.queryNode.map(n => n.id);
      expect(nodeIds).toContain('test-concept-1');
    });

    it('should use default namespace when no tenant header provided', async () => {
      // Test without tenant header
      const response = await request(app)
        .post('/api/query')
        .send({
          query: `
            query {
              queryNode(first: 5) {
                id
                label
              }
            }
          `
        })
        .expect(200);

      // Should get default namespace data (empty or different)
      const nodeIds = response.body.queryNode.map(n => n.id);
      expect(nodeIds).not.toContain('test-concept-1');
    });
  });

  describe('Namespace Safety', () => {
    it('should prevent accidental data mixing', async () => {
      const nodeId = `safety-test-${Date.now()}`;

      // Create node with test tenant header
      await testRequest(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'test-hierarchy-1')
        .send({
          mutation: `
            mutation {
              addNode(input: [{ 
                id: "${nodeId}", 
                label: "Safety Test Node", 
                type: "concept" 
              }]) {
                node { id }
              }
            }
          `
        })
        .expect(200);

      // Attempt to update from different namespace context
      const updateAttempt = await request(app)
        .post('/api/mutate')
        .send({
          mutation: `
            mutation {
              updateNode(input: {
                filter: { id: { eq: "${nodeId}" } }
                set: { label: "Should Not Update" }
              }) {
                node { id label }
              }
            }
          `
        })
        .expect(200);

      // Update should not affect the node in test namespace
      const verification = await verifyInTestTenant(`
        query {
          getNode(id: "${nodeId}") {
            id
            label
          }
        }
      `);

      expect(verification.getNode.label).toBe('Safety Test Node');
      expect(verification.getNode.label).not.toBe('Should Not Update');
    });
  });
});
