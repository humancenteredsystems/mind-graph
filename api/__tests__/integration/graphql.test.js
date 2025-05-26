const request = require('supertest');
const app = require('../../server');
const { mockData } = require('../helpers/mockData');

describe('GraphQL Integration Tests', () => {
  describe('POST /api/query', () => {
    it('should execute simple node query successfully', async () => {
      const query = `
        query {
          queryNode(first: 5) {
            id
            label
            type
          }
        }
      `;

      const response = await request(app)
        .post('/api/query')
        .send({ query })
        .expect(200);

      expect(response.body).toHaveProperty('queryNode');
      expect(Array.isArray(response.body.queryNode)).toBe(true);
    });

    it('should execute query with variables', async () => {
      const query = `
        query GetNodeById($id: String!) {
          getNode(id: $id) {
            id
            label
            type
            status
          }
        }
      `;

      const variables = { id: 'test-node-1' };

      const response = await request(app)
        .post('/api/query')
        .send({ query, variables })
        .expect(200);

      expect(response.body).toHaveProperty('getNode');
    });

    it('should handle complex nested queries', async () => {
      const query = `
        query {
          queryNode(first: 3) {
            id
            label
            type
            outgoing {
              type
              to {
                id
                label
              }
            }
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

      const response = await request(app)
        .post('/api/query')
        .send({ query })
        .expect(200);

      expect(response.body).toHaveProperty('queryNode');
      if (response.body.queryNode.length > 0) {
        const node = response.body.queryNode[0];
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('label');
        expect(node).toHaveProperty('type');
      }
    });

    it('should return error for malformed query', async () => {
      const malformedQuery = `
        query {
          queryNode {
            invalidField
          }
        }
      `;

      const response = await request(app)
        .post('/api/query')
        .send({ query: malformedQuery })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });

    it('should return 400 when query is missing', async () => {
      const response = await request(app)
        .post('/api/query')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Query is required');
    });

    it('should handle search queries with filters', async () => {
      const query = `
        query SearchNodes($term: String!) {
          queryNode(filter: { label: { anyofterms: $term } }) {
            id
            label
            type
          }
        }
      `;

      const variables = { term: 'test' };

      const response = await request(app)
        .post('/api/query')
        .send({ query, variables })
        .expect(200);

      expect(response.body).toHaveProperty('queryNode');
    });
  });

  describe('POST /api/mutate', () => {
    it('should execute simple node creation mutation', async () => {
      const mutation = `
        mutation AddNode($input: [AddNodeInput!]!) {
          addNode(input: $input) {
            node {
              id
              label
              type
            }
          }
        }
      `;

      const variables = {
        input: [{
          id: `test-node-${Date.now()}`,
          label: 'Test Node',
          type: 'ConceptNode'
        }]
      };

      const response = await request(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'default-hierarchy')
        .send({ mutation, variables })
        .expect(200);

      expect(response.body).toHaveProperty('addNode');
      expect(response.body.addNode).toHaveProperty('node');
      expect(Array.isArray(response.body.addNode.node)).toBe(true);
    });

    it('should execute edge creation mutation', async () => {
      const mutation = `
        mutation AddEdge($input: [AddEdgeInput!]!) {
          addEdge(input: $input) {
            edge {
              fromId
              toId
              type
            }
          }
        }
      `;

      const variables = {
        input: [{
          fromId: 'source-node',
          toId: 'target-node',
          type: 'relates_to'
        }]
      };

      const response = await request(app)
        .post('/api/mutate')
        .send({ mutation, variables })
        .expect(200);

      expect(response.body).toHaveProperty('addEdge');
    });

    it('should handle node creation with hierarchy assignments', async () => {
      const mutation = `
        mutation AddNodeWithHierarchy($input: [AddNodeInput!]!) {
          addNode(input: $input) {
            node {
              id
              label
              type
              hierarchyAssignments {
                hierarchy {
                  id
                }
                level {
                  levelNumber
                }
              }
            }
          }
        }
      `;

      const variables = {
        input: [{
          id: `hierarchy-node-${Date.now()}`,
          label: 'Hierarchy Test Node',
          type: 'ConceptNode',
          hierarchyAssignments: [{
            hierarchy: { id: 'test-hierarchy' },
            level: { id: 'test-level' }
          }]
        }]
      };

      const response = await request(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'test-hierarchy')
        .send({ mutation, variables })
        .expect(200);

      expect(response.body).toHaveProperty('addNode');
    });

    it('should return error for mutation without required hierarchy header', async () => {
      const mutation = `
        mutation AddNode($input: [AddNodeInput!]!) {
          addNode(input: $input) {
            node {
              id
              label
            }
          }
        }
      `;

      const variables = {
        input: [{
          id: 'test-node-no-hierarchy',
          label: 'Test Node',
          type: 'ConceptNode'
        }]
      };

      const response = await request(app)
        .post('/api/mutate')
        .send({ mutation, variables })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('X-Hierarchy-Id header is required');
    });

    it('should return 400 when mutation is missing', async () => {
      const response = await request(app)
        .post('/api/mutate')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Mutation is required');
    });

    it('should handle update mutations', async () => {
      const mutation = `
        mutation UpdateNode($input: UpdateNodeInput!) {
          updateNode(input: $input) {
            node {
              id
              label
              type
            }
          }
        }
      `;

      const variables = {
        input: {
          filter: { id: { eq: 'existing-node' } },
          set: {
            label: 'Updated Label',
            status: 'active'
          }
        }
      };

      const response = await request(app)
        .post('/api/mutate')
        .send({ mutation, variables })
        .expect(200);

      expect(response.body).toHaveProperty('updateNode');
    });

    it('should handle delete mutations', async () => {
      const mutation = `
        mutation DeleteNode($filter: NodeFilter!) {
          deleteNode(filter: $filter) {
            msg
            numUids
          }
        }
      `;

      const variables = {
        filter: { id: { eq: 'node-to-delete' } }
      };

      const response = await request(app)
        .post('/api/mutate')
        .send({ mutation, variables })
        .expect(200);

      expect(response.body).toHaveProperty('deleteNode');
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

      const response = await request(app)
        .post('/api/query')
        .send({ query: invalidQuery })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should handle field validation errors', async () => {
      const query = `
        query {
          queryNode {
            nonExistentField
          }
        }
      `;

      const response = await request(app)
        .post('/api/query')
        .send({ query })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should handle type validation errors in mutations', async () => {
      const mutation = `
        mutation AddNode($input: [AddNodeInput!]!) {
          addNode(input: $input) {
            node {
              id
            }
          }
        }
      `;

      const variables = {
        input: [{
          id: 123, // Should be string
          label: 'Test',
          type: 'ConceptNode'
        }]
      };

      const response = await request(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'test-hierarchy')
        .send({ mutation, variables })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('Complex GraphQL Operations', () => {
    it('should handle batch operations', async () => {
      const mutation = `
        mutation BatchAddNodes($input: [AddNodeInput!]!) {
          addNode(input: $input) {
            node {
              id
              label
              type
            }
          }
        }
      `;

      const variables = {
        input: [
          {
            id: `batch-node-1-${Date.now()}`,
            label: 'Batch Node 1',
            type: 'ConceptNode'
          },
          {
            id: `batch-node-2-${Date.now()}`,
            label: 'Batch Node 2',
            type: 'ExampleNode'
          }
        ]
      };

      const response = await request(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'test-hierarchy')
        .send({ mutation, variables })
        .expect(200);

      expect(response.body).toHaveProperty('addNode');
      expect(response.body.addNode.node).toHaveLength(2);
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

      const variables = { first: 5, offset: 0 };

      const response = await request(app)
        .post('/api/query')
        .send({ query, variables })
        .expect(200);

      expect(response.body).toHaveProperty('queryNode');
      expect(response.body.queryNode.length).toBeLessThanOrEqual(5);
    });

    it('should handle aggregation queries', async () => {
      const query = `
        query NodeAggregation {
          aggregateNode {
            count
          }
        }
      `;

      const response = await request(app)
        .post('/api/query')
        .send({ query })
        .expect(200);

      expect(response.body).toHaveProperty('aggregateNode');
      expect(response.body.aggregateNode).toHaveProperty('count');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle large query responses efficiently', async () => {
      const query = `
        query LargeDataSet {
          queryNode(first: 100) {
            id
            label
            type
            outgoing {
              type
              to {
                id
                label
              }
            }
          }
        }
      `;

      const startTime = Date.now();
      const response = await request(app)
        .post('/api/query')
        .send({ query })
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body).toHaveProperty('queryNode');
      expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent requests', async () => {
      const query = `
        query ConcurrentTest {
          queryNode(first: 10) {
            id
            label
          }
        }
      `;

      const requests = Array(5).fill().map(() =>
        request(app)
          .post('/api/query')
          .send({ query })
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('queryNode');
      });
    });
  });
});
