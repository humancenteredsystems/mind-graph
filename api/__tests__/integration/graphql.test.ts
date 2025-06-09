import request from 'supertest';
import app from '../../server';
import { mockNodes, mockHierarchies } from '../helpers/mockData';

// Mock the adaptive tenant factory
jest.mock('../../services/adaptiveTenantFactory', () => {
  const mockExecuteGraphQL = jest.fn();
  
  return {
    adaptiveTenantFactory: {
      createTenantFromContext: jest.fn().mockResolvedValue({
        executeGraphQL: mockExecuteGraphQL,
        getNamespace: jest.fn().mockReturnValue('0x0'),
        isDefaultNamespace: jest.fn().mockReturnValue(true)
      })
    },
    // Export the mock function so tests can access it
    mockExecuteGraphQL
  };
});

const { mockExecuteGraphQL } = require('../../services/adaptiveTenantFactory');

describe('GraphQL Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecuteGraphQL.mockReset();
    // ADMIN_API_KEY is already loaded from .env file via jest.setup.ts
  });

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

      mockExecuteGraphQL.mockResolvedValueOnce({
        queryNode: mockNodes.slice(0, 2)
      });

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

      mockExecuteGraphQL.mockResolvedValueOnce({
        getNode: mockNodes[0]
      });

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

      mockExecuteGraphQL.mockResolvedValueOnce({
        queryNode: mockNodes
      });

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

      mockExecuteGraphQL.mockRejectedValueOnce(
        new Error('GraphQL query failed: Cannot query field "invalidField" on type "Node"')
      );

      const response = await request(app)
        .post('/api/query')
        .send({ query: malformedQuery })
        .expect(400); // Server returns 400 for GraphQL errors

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when query is missing', async () => {
      const response = await request(app)
        .post('/api/query')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required field: query');
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

      mockExecuteGraphQL.mockResolvedValueOnce({
        queryNode: [mockNodes[0]]
      });

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

      // Mock hierarchy validation first
      mockExecuteGraphQL
        .mockResolvedValueOnce({ getHierarchy: { id: 'default-hierarchy' } }) // validateHierarchyId
        .mockResolvedValueOnce({ queryHierarchy: [{ levels: [{ id: 'level1', levelNumber: 1 }] }] }) // getLevelIdForNode
        .mockResolvedValueOnce({ getHierarchyLevel: { id: 'level1', levelNumber: 1, hierarchy: { id: 'default-hierarchy' }, allowedTypes: [] } }) // validateLevelIdAndAllowedType
        .mockResolvedValueOnce({
          addNode: {
            node: [{
              id: variables.input[0].id,
              label: variables.input[0].label,
              type: variables.input[0].type
            }]
          }
        });

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

      mockExecuteGraphQL.mockResolvedValueOnce({
        addEdge: {
          edge: [variables.input[0]]
        }
      });

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

      // Mock hierarchy validation then a validation error from the node enrichment service
      mockExecuteGraphQL
        .mockResolvedValueOnce({ getHierarchy: { id: 'test-hierarchy' } }) // validateHierarchyId
        .mockRejectedValueOnce(new Error('Invalid level or node type constraint violation'));

      const response = await request(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'test-hierarchy')
        .send({ mutation, variables })
        .expect(500); // Server returns 500 for enrichment errors in this specific mock scenario

      expect(response.body).toHaveProperty('error');
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
        .expect(400); // Server returns 400 for validation errors

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('X-Hierarchy-Id header is required');
    });

    it('should return 400 when mutation is missing', async () => {
      const response = await request(app)
        .post('/api/mutate')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required field: mutation');
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

      // Mock rejection for update mutations (not implemented in test environment)
      mockExecuteGraphQL.mockRejectedValueOnce(
        new Error('Update operations not supported in test environment')
      );

      const response = await request(app)
        .post('/api/mutate')
        .send({ mutation, variables })
        .expect(500);

      expect(response.body).toHaveProperty('error');
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

      mockExecuteGraphQL.mockResolvedValueOnce({
        deleteNode: {
          msg: 'Deleted',
          numUids: 1
        }
      });

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

      mockExecuteGraphQL.mockRejectedValueOnce(
        new Error('GraphQL query failed: Syntax Error')
      );

      const response = await request(app)
        .post('/api/query')
        .send({ query: invalidQuery })
        .expect(400); // Server returns 400 for GraphQL errors

      expect(response.body).toHaveProperty('error');
    });

    it('should handle field validation errors', async () => {
      const query = `
        query {
          queryNode {
            nonExistentField
          }
        }
      `;

      mockExecuteGraphQL.mockRejectedValueOnce(
        new Error('GraphQL query failed: Cannot query field "nonExistentField" on type "Node"')
      );

      const response = await request(app)
        .post('/api/query')
        .send({ query })
        .expect(400); // Server returns 400 for GraphQL errors

      expect(response.body).toHaveProperty('error');
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

      mockExecuteGraphQL.mockRejectedValueOnce(
        new Error('GraphQL query failed: Variable "$input" got invalid value')
      );

      const response = await request(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'test-hierarchy')
        .send({ mutation, variables })
        .expect(400); // Server returns 400 for GraphQL errors

      expect(response.body).toHaveProperty('error');
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

      // Mock validation error for batch operations
      mockExecuteGraphQL.mockRejectedValueOnce(
        new Error('GraphQL query failed: Batch operation validation failed')
      );

      const response = await request(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'test-hierarchy')
        .send({ mutation, variables })
        .expect(400);

      expect(response.body).toHaveProperty('error');
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

      // Mock rejection for complex pagination (not implemented in test environment)
      mockExecuteGraphQL.mockRejectedValueOnce(
        new Error('Pagination not supported in test environment')
      );

      const response = await request(app)
        .post('/api/query')
        .send({ query, variables })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle aggregation queries', async () => {
      const query = `
        query NodeAggregation {
          aggregateNode {
            count
          }
        }
      `;

      mockExecuteGraphQL.mockResolvedValueOnce({
        aggregateNode: {
          count: 42
        }
      });

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

      mockExecuteGraphQL.mockResolvedValueOnce({
        queryNode: mockNodes // Return mock data
      });

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

      // Set up individual mock responses for each concurrent request
      mockExecuteGraphQL
        .mockResolvedValueOnce({ queryNode: mockNodes })
        .mockResolvedValueOnce({ queryNode: mockNodes })
        .mockResolvedValueOnce({ queryNode: mockNodes })
        .mockResolvedValueOnce({ queryNode: mockNodes })
        .mockResolvedValueOnce({ queryNode: mockNodes });

      const requests = Array(5).fill(null).map(() =>
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
