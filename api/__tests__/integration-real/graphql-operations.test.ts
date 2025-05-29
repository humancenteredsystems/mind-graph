const request = require('supertest');
const app = require('../../server');
const { testRequest, verifyInTestTenant, createTestNodeData } = require('../helpers/realTestHelpers');

describe('Real Integration: GraphQL Operations', () => {
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

  describe('Query Operations', () => {
    it('should execute simple node queries', async () => {
      const query = `
        query {
          queryNode {
            id
            label
            type
          }
        }
      `;
      const response = await testRequest(app).post('/api/query').send({ query }).expect(200);
      expect(response.body.queryNode).toBeDefined();
      expect(Array.isArray(response.body.queryNode)).toBe(true);
    });

    it('should execute queries with variables', async () => {
      const query = `
        query GetNodeById($id: String!) {
          getNode(id: $id) {
            id
            label
          }
        }
      `;
      const variables = { id: 'test-concept-1' };
      const response = await testRequest(app).post('/api/query').send({ query, variables }).expect(200);
      expect(response.body.getNode).toBeDefined();
      expect(response.body.getNode.id).toBe('test-concept-1');
    });

    it('should execute complex nested queries', async () => {
      // Assuming a schema with relationships, e.g., Node has outgoing: [Edge]
      // This test requires seeded data with relationships
      const query = `
        query {
          queryNode(filter: { id: { eq: "test-concept-1" } }) {
            id
            label
            outgoing {
              to {
                id
                label
              }
            }
          }
        }
      `;
      const response = await testRequest(app).post('/api/query').send({ query }).expect(200);
      expect(response.body.queryNode).toBeDefined();
      expect(Array.isArray(response.body.queryNode)).toBe(true);
      // Further assertions would depend on the seeded data relationships
    });

    it('should handle search queries with filters', async () => {
      const query = `
        query {
          queryNode(filter: { label: { allofterms: "Test Concept" } }) {
            id
            label
          }
        }
      `;
      const response = await testRequest(app).post('/api/query').send({ query }).expect(200);
      expect(response.body.queryNode).toBeDefined();
      expect(Array.isArray(response.body.queryNode)).toBe(true);
      const nodeLabels = response.body.queryNode.map(n => n.label);
      expect(nodeLabels).toContain('Test Concept');
    });

    it('should execute aggregation queries', async () => {
      const query = `
        query {
          aggregateNode {
            count
          }
        }
      `;
      const response = await testRequest(app).post('/api/query').send({ query }).expect(200);
      expect(response.body.aggregateNode).toBeDefined();
      expect(response.body.aggregateNode.count).toBeGreaterThan(0); // Assuming seeded data exists
    });
  });

  describe('Mutation Operations', () => {
    it('should execute simple node creation mutations', async () => {
      const newNode = createTestNodeData({ label: 'Mutation Test Node', type: 'concept' });
      const mutation = `
        mutation AddTestNode($input: [AddNodeInput!]!) {
          addNode(input: $input) {
            node {
              id
              label
            }
          }
        }
      `;
      const variables = { input: [newNode] };
      const response = await testRequest(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'test-hierarchy-1') // Required for addNode
        .send({ mutation, variables })
        .expect(200);
      expect(response.body.addNode).toBeDefined();
      expect(response.body.addNode.node[0].id).toBe(newNode.id);
    });

    it('should execute batch node creation', async () => {
      const node1 = createTestNodeData({ label: 'Batch Node 1', type: 'concept' });
      const node2 = createTestNodeData({ label: 'Batch Node 2', type: 'example' });
      const mutation = `
        mutation AddBatchNodes($input: [AddNodeInput!]!) {
          addNode(input: $input) {
            node {
              id
            }
          }
        }
      `;
      const variables = { input: [node1, node2] };
      const response = await testRequest(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'test-hierarchy-1') // Required for addNode
        .send({ mutation, variables })
        .expect(200);
      expect(response.body.addNode.node).toHaveLength(2);
    });

    it('should execute edge creation mutations', async () => {
      // Assuming test-concept-1 and test-example-1 exist from seeding
      const mutation = `
        mutation {
          addEdge(input: [{ fromId: "test-concept-1", toId: "test-example-1", type: "relates_to" }]) {
            edge {
              from { id }
              to { id }
            }
          }
        }
      `;
      const response = await testRequest(app).post('/api/mutate').send({ mutation }).expect(200);
      expect(response.body.addEdge).toBeDefined();
      expect(response.body.addEdge.edge[0].from.id).toBe('test-concept-1');
      expect(response.body.addEdge.edge[0].to.id).toBe('test-example-1');
    });

    it('should execute update mutations', async () => {
      const mutation = `
        mutation {
          updateNode(input: { filter: { id: { eq: "test-concept-1" } }, set: { label: "Updated Concept" } }) {
            node {
              id
              label
            }
          }
        }
      `;
      const response = await testRequest(app).post('/api/mutate').send({ mutation }).expect(200);
      expect(response.body.updateNode).toBeDefined();
      expect(response.body.updateNode.node[0].label).toBe('Updated Concept');
    });

    it('should execute delete mutations', async () => {
      // Create a node to delete first
      const nodeToDelete = createTestNodeData({ label: 'Node to Delete', type: 'concept' });
      await testRequest(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'test-hierarchy-1')
        .send({
          mutation: `mutation { addNode(input: [{ id: "${nodeToDelete.id}", label: "${nodeToDelete.label}", type: "${nodeToDelete.type}" }]) { node { id } } }`
        });

      const mutation = `
        mutation {
          deleteNode(filter: { id: { eq: "${nodeToDelete.id}" } }) {
            numUids
          }
        }
      `;
      const response = await testRequest(app).post('/api/mutate').send({ mutation }).expect(200);
      expect(response.body.deleteNode.numUids).toBeGreaterThan(0);
    });
  });

  describe('GraphQL Error Handling', () => {
    it('should handle syntax errors in queries', async () => {
      const query = `
        query {
          queryNode {
            id
            label
            invalid syntax here
          }
        }
      `;
      const response = await testRequest(app).post('/api/query').send({ query }).expect(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle field validation errors', async () => {
      const query = `
        query {
          queryNode {
            id
            nonExistentField
          }
        }
      `;
      const response = await testRequest(app).post('/api/query').send({ query }).expect(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle type validation errors in mutations', async () => {
      const mutation = `
        mutation {
          addNode(input: [{ id: "invalid-type-node", label: "Invalid", type: 123 }]) { # Type should be String
            node { id }
          }
        }
      `;
      const response = await testRequest(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'test-hierarchy-1') // Required for addNode
        .send({ mutation })
        .expect(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle missing required fields', async () => {
      const mutation = `
        mutation {
          addNode(input: [{ id: "missing-label-node", type: "concept" }]) { # Label is required
            node { id }
          }
        }
      `;
      const response = await testRequest(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'test-hierarchy-1') // Required for addNode
        .send({ mutation })
        .expect(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when query is missing', async () => {
      await testRequest(app).post('/api/query').send({}).expect(400);
    });

    it('should return 400 when mutation is missing', async () => {
      await testRequest(app).post('/api/mutate').send({}).expect(400);
    });
  });

  describe('Complex GraphQL Operations', () => {
    it('should handle batch operations', async () => {
      const node1 = createTestNodeData({ label: 'Batch Op 1', type: 'concept' });
      const node2 = createTestNodeData({ label: 'Batch Op 2', type: 'example' });
      const mutation = `
        mutation {
          addNode(input: [{ id: "${node1.id}", label: "${node1.label}", type: "${node1.type}" }]) { node { id } }
          addNode(input: [{ id: "${node2.id}", label: "${node2.label}", type: "${node2.type}" }]) { node { id } }
        }
      `;
      const response = await testRequest(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'test-hierarchy-1') // Required for addNode
        .send({ mutation })
        .expect(200);
      expect(response.body.addNode).toBeDefined();
      expect(response.body.addNode).toHaveLength(2); // Assuming Dgraph returns an array for batch
    });

    it('should handle queries with pagination', async () => {
      // This test requires more than 'first' number of nodes to be seeded
      // Assuming seeded data has enough nodes
      const query = `
        query {
          queryNode(first: 2) {
            id
            label
          }
        }
      `;
      const response = await testRequest(app).post('/api/query').send({ query }).expect(200);
      expect(response.body.queryNode).toBeDefined();
      expect(response.body.queryNode.length).toBeLessThanOrEqual(2);
    });

    it('should handle aggregation queries', async () => {
      const query = `
        query {
          aggregateNode {
            count
          }
        }
      `;
      const response = await testRequest(app).post('/api/query').send({ query }).expect(200);
      expect(response.body.aggregateNode).toBeDefined();
      expect(response.body.aggregateNode.count).toBeGreaterThan(0);
    });

    it('should handle traversal queries', async () => {
      // This test requires seeded data with edges
      // Assuming test-concept-1 has outgoing edges
      const query = `
        query {
          getNode(id: "test-concept-1") {
            id
            label
            outgoing {
              to {
                id
                label
              }
            }
          }
        }
      `;
      const response = await testRequest(app).post('/api/query').send({ query }).expect(200);
      expect(response.body.getNode).toBeDefined();
      expect(response.body.getNode.outgoing).toBeDefined();
      // Further assertions depend on seeded edge data
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent GraphQL requests', async () => {
      const query = `query { queryNode { id } }`;
      const requests = Array(10).fill(0).map(() =>
        testRequest(app).post('/api/query').send({ query }).expect(200)
      );
      await Promise.all(requests);
      // Test passes if all requests complete without errors
    });

    it('should handle large batch mutations efficiently', async () => {
      const nodes = Array(100).fill(0).map((_, i) => createTestNodeData({ label: `Batch ${i}`, type: 'concept' }));
      const mutation = `
        mutation AddLargeBatch($input: [AddNodeInput!]!) {
          addNode(input: $input) {
            node { id }
          }
        }
      `;
      const variables = { input: nodes };
      const response = await testRequest(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'test-hierarchy-1') // Required for addNode
        .send({ mutation, variables })
        .expect(200);
      expect(response.body.addNode.node).toHaveLength(100);
    });
  });
});
