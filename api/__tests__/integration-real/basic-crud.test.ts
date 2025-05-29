const request = require('supertest');
const app = require('../../server');
const { testRequest, verifyInTestTenant, createTestNodeData } = require('../helpers/realTestHelpers');
import { Node } from '../../src/types/domain';

describe('Real Integration: Basic CRUD Operations', () => {
  beforeAll(async () => {
    await global.testUtils.testDataSeeder.setupTestDatabase();
  });

  afterAll(async () => {
    await global.testUtils.testDataSeeder.cleanupTestDatabase();
  });

  beforeEach(async () => {
    await global.testUtils.testDataSeeder.resetTestDatabase();
    await global.testUtils.testDataSeeder.seedTestData(); // Seed data before each test
  });

  describe('Node Creation', () => {
    it('should create a node in test tenant namespace', async () => {
      const nodeData = createTestNodeData({
        label: 'Real Database Test Node',
        type: 'concept'
      });

      // Create via API with test tenant header
      const response = await testRequest(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'test-hierarchy-1')
        .send({
          mutation: `
            mutation AddTestNode($input: [AddNodeInput!]!) {
              addNode(input: $input) {
                node {
                  id
                  label
                  type
                }
              }
            }
          `,
          variables: { input: [nodeData] }
        })
        .expect(200);

      expect(response.body.addNode).toBeDefined();
      expect(response.body.addNode.node[0].id).toBe(nodeData.id);
      expect(response.body.addNode.node[0].label).toBe(nodeData.label);

      // Verify node exists in test tenant database
      const result = await verifyInTestTenant(`
        query GetTestNode($id: String!) {
          getNode(id: $id) {
            id
            label
            type
          }
        }
      `, { id: nodeData.id });
      
      expect(result.getNode).toBeTruthy();
      expect(result.getNode.id).toBe(nodeData.id);
      expect(result.getNode.label).toBe(nodeData.label);
    });

    it('should create multiple nodes in batch', async () => {
      const nodeData1 = createTestNodeData({ label: 'Batch Node 1', type: 'concept' });
      const nodeData2 = createTestNodeData({ label: 'Batch Node 2', type: 'example' });

      const response = await testRequest(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'test-hierarchy-1')
        .send({
          mutation: `
            mutation AddBatchNodes($input: [AddNodeInput!]!) {
              addNode(input: $input) {
                node {
                  id
                  label
                  type
                }
              }
            }
          `,
          variables: { input: [nodeData1, nodeData2] }
        })
        .expect(200);

      expect(response.body.addNode.node).toHaveLength(2);

      // Verify both nodes exist
      const result1 = await verifyInTestTenant(`query { getNode(id: "${nodeData1.id}") { id label } }`);
      const result2 = await verifyInTestTenant(`query { getNode(id: "${nodeData2.id}") { id label } }`);
      
      expect(result1.getNode).toBeTruthy();
      expect(result2.getNode).toBeTruthy();
    });
  });

  describe('Node Reading', () => {
    it('should read nodes from test tenant only', async () => {
      // Query all nodes via API
      const response = await testRequest(app)
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

      expect(response.body.queryNode).toBeDefined();
      expect(Array.isArray(response.body.queryNode)).toBe(true);

      // Should contain seeded test data
      const nodeIds = response.body.queryNode.map((n: Node) => n.id);
      expect(nodeIds).toContain('test-concept-1');
      expect(nodeIds).toContain('test-example-1');
    });

    it('should get specific node by ID', async () => {
      const response = await testRequest(app)
        .post('/api/query')
        .send({
          query: `
            query {
              getNode(id: "test-concept-1") {
                id
                label
                type
              }
            }
          `
        })
        .expect(200);

      expect(response.body.getNode).toBeTruthy();
      expect(response.body.getNode.id).toBe('test-concept-1');
      expect(response.body.getNode.label).toBe('Test Concept');
    });

    it('should return null for non-existent node', async () => {
      const response = await testRequest(app)
        .post('/api/query')
        .send({
          query: `
            query {
              getNode(id: "non-existent-node") {
                id
                label
              }
            }
          `
        })
        .expect(200);

      expect(response.body.getNode).toBeNull();
    });
  });

  describe('Node Updates', () => {
    it('should update an existing node', async () => {
      const newLabel = 'Updated Test Concept';

      const response = await testRequest(app)
        .post('/api/mutate')
        .send({
          mutation: `
            mutation {
              updateNode(input: {
                filter: { id: { eq: "test-concept-1" } }
                set: { label: "${newLabel}" }
              }) {
                node {
                  id
                  label
                }
              }
            }
          `
        })
        .expect(200);

      expect(response.body.updateNode).toBeDefined();

      // Verify update in database
      const result = await verifyInTestTenant(`
        query {
          getNode(id: "test-concept-1") {
            id
            label
          }
        }
      `);
      
      expect(result.getNode.label).toBe(newLabel);
    });
  });

  describe('Node Deletion', () => {
    it('should delete a node from test tenant', async () => {
      // First create a node to delete
      const nodeData = createTestNodeData({ label: 'To Be Deleted', type: 'concept' });
      
      await testRequest(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'test-hierarchy-1')
        .send({
          mutation: `
            mutation {
              addNode(input: [{ id: "${nodeData.id}", label: "${nodeData.label}", type: "${nodeData.type}" }]) {
                node { id }
              }
            }
          `
        });

      // Delete the node
      const response = await testRequest(app)
        .post('/api/mutate')
        .send({
          mutation: `
            mutation {
              deleteNode(filter: { id: { eq: "${nodeData.id}" } }) {
                numUids
              }
            }
          `
        })
        .expect(200);

      expect(response.body.deleteNode.numUids).toBeGreaterThan(0);

      // Verify deletion
      const result = await verifyInTestTenant(`
        query {
          getNode(id: "${nodeData.id}") {
            id
          }
        }
      `);
      
      expect(result.getNode).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle GraphQL errors gracefully', async () => {
      const response = await testRequest(app)
        .post('/api/query')
        .send({
          query: `
            query {
              queryNode {
                nonExistentField
              }
            }
          `
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should require hierarchy header for node creation', async () => {
      const nodeData = createTestNodeData();

      const response = await testRequest(app)
        .post('/api/mutate')
        // Intentionally omit X-Hierarchy-Id header
        .send({
          mutation: `
            mutation {
              addNode(input: [{ id: "${nodeData.id}", label: "${nodeData.label}", type: "${nodeData.type}" }]) {
                node { id }
              }
            }
          `
        })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });
});
