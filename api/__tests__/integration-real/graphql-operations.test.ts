import request from 'supertest';
import app from '../../server';
import { testRequest, verifyInTestTenant, createTestNodeData } from '../helpers/realTestHelpers';
import { TestArrayUtils } from '../helpers/graphqlTestUtils';

describe('Real Integration: GraphQL Operations', () => {
  beforeAll(async () => {
    await global.testUtils.setupTestDatabase();
  });

  afterAll(async () => {
    await global.testUtils.cleanupTestDatabase();
  });

  beforeEach(async () => {
    await global.testUtils.resetTestDatabase();
    await global.testUtils.seedTestData();
  });

  describe('Query Operations', () => {
    it('should execute simple node queries', async () => {
      const response = await testRequest(app)
        .post('/api/query')
        .send({
            query: `
            query {
              queryNode(first: 5) {
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
      const nodeIds = response.body.queryNode.map((n: any) => n.id);
      expect(nodeIds).toContain('test-concept-1');
      expect(nodeIds).toContain('test-example-1');
    });

    it('should execute queries with variables', async () => {
      const query = `
        query GetNodeById($nodeId: String!) {
          getNode(id: $nodeId) {
            id
            label
            type
          }
        }
      `;

      const variables = { nodeId: 'test-concept-1' };

      const response = await testRequest(app)
        .post('/api/query')
        .send({ query, variables })
        .expect(200);

      expect(response.body.getNode).toBeTruthy();
      expect(response.body.getNode.id).toBe('test-concept-1');
      expect(response.body.getNode.label).toBe('Test Concept');
    });

    it('should execute complex nested queries', async () => {
      const query = `
        query {
          queryNode(first: 3) {
            id
            label
            type
            hierarchyAssignments {
              hierarchy {
                id
                name
              }
              level {
                levelNumber
                label
              }
            }
          }
        }
      `;

      const response = await testRequest(app)
        .post('/api/query')
        .send({ query })
        .expect(200);

      expect(response.body.queryNode).toBeDefined();
      
      if (response.body.queryNode.length > 0) {
        const node = response.body.queryNode[0];
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('label');
        expect(node).toHaveProperty('type');
        expect(node).toHaveProperty('hierarchyAssignments');
      }
    });

    it('should handle search queries with filters', async () => {
      const query = `
        query SearchNodes($searchTerm: String!) {
          queryNode(filter: { 
            label: { anyofterms: $searchTerm } 
          }) {
            id
            label
            type
          }
        }
      `;

      const variables = { searchTerm: 'Test' };

      const response = await testRequest(app)
        .post('/api/query')
        .send({ query, variables })
        .expect(200);

      expect(response.body.queryNode).toBeDefined();
      expect(Array.isArray(response.body.queryNode)).toBe(true);
      
      // Should find nodes with "Test" in the label
      const foundLabels = response.body.queryNode.map((n: any) => n.label);
      foundLabels.forEach((label: string) => {
        expect(label.toLowerCase()).toContain('test');
      });
    });

    it('should execute aggregation queries', async () => {
      const query = `
        query {
          aggregateNode {
            count
          }
        }
      `;

      const response = await testRequest(app)
        .post('/api/query')
        .send({ query })
        .expect(200);

      expect(response.body.aggregateNode).toBeDefined();
      expect(response.body.aggregateNode.count).toBeGreaterThan(0);
    });
  });

  describe('Mutation Operations', () => {
    it('should execute simple node creation mutations', async () => {
      const nodeData = createTestNodeData({
        label: 'GraphQL Created Node',
        type: 'concept'
      });

      const mutation = `
        mutation CreateNode($input: [AddNodeInput!]!) {
          addNode(input: $input) {
            node {
              id
              label
              type
            }
          }
        }
      `;

      const variables = { input: [nodeData] };

      const response = await testRequest(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'test-hierarchy-1')
        .send({ mutation, variables })
        .expect(200);

      expect(response.body.addNode).toBeDefined();
      expect(response.body.addNode.node[0].id).toBe(nodeData.id);
      expect(response.body.addNode.node[0].label).toBe(nodeData.label);

      // Verify in database
      const verification = await verifyInTestTenant(`
        query { getNode(id: "${nodeData.id}") { id label type } }
      `);
      
      expect(verification.getNode).toBeTruthy();
      expect(verification.getNode.id).toBe(nodeData.id);
    });

    it('should execute batch node creation', async () => {
      const batchData = [
        createTestNodeData({ label: 'Batch Node 1', type: 'concept' }),
        createTestNodeData({ label: 'Batch Node 2', type: 'example' }),
        createTestNodeData({ label: 'Batch Node 3', type: 'concept' })
      ];

      const mutation = `
        mutation CreateBatchNodes($input: [AddNodeInput!]!) {
          addNode(input: $input) {
            node {
              id
              label
              type
            }
          }
        }
      `;

      const response = await testRequest(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'test-hierarchy-1')
        .send({ mutation, variables: { input: batchData } })
        .expect(200);

      expect(response.body.addNode.node).toHaveLength(3);

      // Verify all nodes were created
      for (const nodeData of batchData) {
        const verification = await verifyInTestTenant(`
          query { getNode(id: "${nodeData.id}") { id label } }
        `);
        expect(verification.getNode).toBeTruthy();
      }
    });

    it('should execute edge creation mutations', async () => {
      // First create two nodes to connect
      const fromNode = createTestNodeData({ label: 'From Node', type: 'concept' });
      const toNode = createTestNodeData({ label: 'To Node', type: 'example' });

      // Create the nodes
      const nodeCreationMutation = `
        mutation CreateNodes($input: [AddNodeInput!]!) {
          addNode(input: $input) {
            node {
              id
              label
              type
            }
          }
        }
      `;

      await testRequest(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'test-hierarchy-1')
        .send({
          mutation: nodeCreationMutation,
          variables: {
            input: [
              { id: fromNode.id, label: fromNode.label, type: fromNode.type },
              { id: toNode.id, label: toNode.label, type: toNode.type }
            ]
          }
        })
        .expect(200);

      // Create edge between them
      const edgeMutation = `
        mutation CreateEdge($input: [AddEdgeInput!]!) {
          addEdge(input: $input) {
            edge {
              fromId
              toId
              type
            }
          }
        }
      `;

      const edgeData = {
        from: { id: fromNode.id },
        to: { id: toNode.id },
        type: 'relates_to'
      };

      const response = await testRequest(app)
        .post('/api/mutate')
        .send({ mutation: edgeMutation, variables: { input: [edgeData] } })
        .expect(200);

      expect(response.body.addEdge).toBeDefined();
      expect(response.body.addEdge.edge[0].fromId).toBe(fromNode.id);
      expect(response.body.addEdge.edge[0].toId).toBe(toNode.id);

      // Verify edge in database
      const verification = await verifyInTestTenant(`
        query {
          getNode(id: "${fromNode.id}") {
            id
            outgoing {
              type
              to {
                id
              }
            }
          }
        }
      `);

      const outgoingEdges = verification.getNode.outgoing;
      const connectedNodeIds = outgoingEdges.map((e: any) => e.to.id);
      expect(connectedNodeIds).toContain(toNode.id);
    });

    it('should execute update mutations', async () => {
      const newLabel = 'Updated via GraphQL';

      const mutation = `
        mutation UpdateTestNode($filter: NodeFilter!, $set: NodePatch!) {
          updateNode(input: { filter: $filter, set: $set }) {
            node {
              id
              label
            }
          }
        }
      `;

      const variables = {
        filter: { id: { eq: 'test-concept-1' } },
        set: { label: newLabel }
      };

      const response = await testRequest(app)
        .post('/api/mutate')
        .send({ mutation, variables })
        .expect(200);

      expect(response.body.updateNode).toBeDefined();

      // Verify update in database
      const verification = await verifyInTestTenant(`
        query { getNode(id: "test-concept-1") { id label } }
      `);
      
      expect(verification.getNode.label).toBe(newLabel);
    });

    it('should execute delete mutations', async () => {
      // First create a node to delete
      const nodeData = createTestNodeData({ label: 'To Be Deleted', type: 'concept' });
      
      await testRequest(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'test-hierarchy-1')
        .send({
          mutation: `
            mutation {
              addNode(input: [{ 
                id: "${nodeData.id}", 
                label: "${nodeData.label}", 
                type: "${nodeData.type}" 
              }]) {
                node { id }
              }
            }
          `
        });

      // Delete the node
      const deleteMutation = `
        mutation DeleteNode($filter: NodeFilter!) {
          deleteNode(filter: $filter) {
            numUids
          }
        }
      `;

      const response = await testRequest(app)
        .post('/api/mutate')
        .send({ 
          mutation: deleteMutation, 
          variables: { filter: { id: { eq: nodeData.id } } }
        })
        .expect(200);

      expect(response.body.deleteNode.numUids).toBeGreaterThan(0);

      // Verify deletion
      const verification = await verifyInTestTenant(`
        query { getNode(id: "${nodeData.id}") { id } }
      `);
      
      expect(verification.getNode).toBeNull();
    });
  });

  describe('GraphQL Error Handling', () => {
    it('should handle syntax errors in queries', async () => {
      const invalidQuery = `
        query {
          queryNode {
            id
            label
          // Missing closing brace
      `;

      const response = await testRequest(app)
        .post('/api/query')
        .send({ query: invalidQuery })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('GraphQL');
    });

    it('should handle field validation errors', async () => {
      const query = `
        query {
          queryNode {
            nonExistentField
            id
          }
        }
      `;

      const response = await testRequest(app)
        .post('/api/query')
        .send({ query })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle type validation errors in mutations', async () => {
      const mutation = `
        mutation {
          addNode(input: [{ 
            id: 123,  # Should be string
            label: "Test", 
            type: "concept" 
          }]) {
            node { id }
          }
        }
      `;

      const response = await testRequest(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'test-hierarchy-1')
        .send({ mutation })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle missing required fields', async () => {
      const mutation = `
        mutation {
          addNode(input: [{ 
            label: "Missing ID and Type"
          }]) {
            node { id }
          }
        }
      `;

      const response = await testRequest(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'test-hierarchy-1')
        .send({ mutation })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when query is missing', async () => {
      const response = await testRequest(app)
        .post('/api/query')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required field: query');
    });

    it('should return 400 when mutation is missing', async () => {
      const response = await testRequest(app)
        .post('/api/mutate')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required field: mutation');
    });
  });

  describe('Complex GraphQL Operations', () => {
    it('should handle queries with fragments', async () => {
      const query = `
        query {
          queryNode(first: 3) {
            id
            label
            type
            hierarchyAssignments {
              hierarchy {
                id
                name
              }
            }
          }
        }
      `;

      const response = await testRequest(app)
        .post('/api/query')
        .send({ query })
        .expect(200);

      expect(response.body.queryNode).toBeDefined();
      
      if (response.body.queryNode.length > 0) {
        const node = response.body.queryNode[0];
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('label');
        expect(node).toHaveProperty('type');
      }
    });

    it('should handle queries with pagination', async () => {
      const query = `
        query PaginatedNodes($first: Int!, $offset: Int!) {
          queryNode(first: $first, offset: $offset, order: { asc: label }) {
            id
            label
            type
          }
        }
      `;

      const variables = { first: 2, offset: 0 };

      const response = await testRequest(app)
        .post('/api/query')
        .send({ query, variables })
        .expect(200);

      expect(response.body.queryNode).toBeDefined();
      expect(Array.isArray(response.body.queryNode)).toBe(true);
      expect(response.body.queryNode.length).toBeLessThanOrEqual(2);
    });

    it('should handle queries with multiple filters', async () => {
      const query = `
        query FilteredNodes($nodeType: String!, $labelFilter: String!) {
          queryNode(filter: { 
            type: { eq: $nodeType },
            label: { anyofterms: $labelFilter }
          }) {
            id
            label
            type
          }
        }
      `;

      const variables = { 
        nodeType: 'concept', 
        labelFilter: 'Test'
      };

      const response = await testRequest(app)
        .post('/api/query')
        .send({ query, variables })
        .expect(200);

      expect(response.body.queryNode).toBeDefined();
      
      // All returned nodes should match the filters
      response.body.queryNode.forEach((node: any) => {
        expect(node.type).toBe('concept');
        expect(node.label.toLowerCase()).toContain('test');
      });
    });

    it('should handle traversal queries', async () => {
      // First create connected nodes
      const nodeA = createTestNodeData({ label: 'Node A', type: 'concept' });
      const nodeB = createTestNodeData({ label: 'Node B', type: 'example' });

      // Create nodes and edge
      await testRequest(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'test-hierarchy-1')
        .send({
          mutation: `
            mutation {
              addNode(input: [
                { id: "${nodeA.id}", label: "${nodeA.label}", type: "${nodeA.type}" },
                { id: "${nodeB.id}", label: "${nodeB.label}", type: "${nodeB.type}" }
              ]) {
                node { id }
              }
            }
          `
        });

      await testRequest(app)
        .post('/api/mutate')
        .send({
          mutation: `
            mutation {
              addEdge(input: [{ 
                from: { id: "${nodeA.id}" }, 
                to: { id: "${nodeB.id}" }, 
                type: "relates_to" 
              }]) {
                edge { 
                  fromId
                  toId
                }
              }
            }
          `
        });

      // Query with traversal
      const traversalQuery = `
        query {
          getNode(id: "${nodeA.id}") {
            id
            label
            outgoing {
              type
              to {
                id
                label
                type
              }
            }
          }
        }
      `;

      const response = await testRequest(app)
        .post('/api/query')
        .send({ query: traversalQuery })
        .expect(200);

      expect(response.body.getNode).toBeTruthy();
      expect(response.body.getNode.outgoing).toBeDefined();
      expect(Array.isArray(response.body.getNode.outgoing)).toBe(true);
      
      if (response.body.getNode.outgoing.length > 0) {
        const edge = response.body.getNode.outgoing[0];
        expect(edge.to.id).toBe(nodeB.id);
      }
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent GraphQL requests', async () => {
      const query = `
        query {
          queryNode(first: 5) {
            id
            label
            type
          }
        }
      `;

      // Execute multiple concurrent requests using type-safe array utility
      const requests = TestArrayUtils.createMappedArray(5, () =>
        testRequest(app)
          .post('/api/query')
          .send({ query })
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.queryNode).toBeDefined();
        expect(Array.isArray(response.body.queryNode)).toBe(true);
      });
    });

    it('should handle large batch mutations efficiently', async () => {
      const batchSize = 10;
      const batchData = TestArrayUtils.createMappedArray(batchSize, (index) => 
        createTestNodeData({ 
          label: `Batch Node ${index}`, 
          type: 'concept' 
        })
      );

      const mutation = `
        mutation CreateLargeBatch($input: [AddNodeInput!]!) {
          addNode(input: $input) {
            node {
              id
              label
            }
          }
        }
      `;

      const startTime = Date.now();
      
      const response = await testRequest(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'test-hierarchy-1')
        .send({ mutation, variables: { input: batchData } })
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.addNode.node).toHaveLength(batchSize);
      expect(responseTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Verify all nodes were created
      const verificationQuery = `
        query { 
          queryNode(filter: { 
            label: { anyofterms: "Batch Node" } 
          }) { 
            id 
            label 
          } 
        }
      `;

      const verification = await verifyInTestTenant(verificationQuery);
      expect(verification.queryNode.length).toBe(batchSize);
    });
  });
});
