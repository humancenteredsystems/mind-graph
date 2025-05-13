const request = require('supertest');
const app = require('./server'); // Import the Express app

// Mock the dgraphClient to handle different test scenarios
jest.mock('./dgraphClient', () => ({
  executeGraphQL: jest.fn((query, variables) => {
    // Mock response for the /api/mutate test
    if (query.includes('mutation AddNode')) {
      return Promise.resolve({
        addNode: {
          node: [
            {
              id: 'it-test-id',
              label: 'IT Node',
              type: 'concept',
              level: 1,
              status: 'pending',
              branch: 'main'
            }
          ]
        }
      });
    }

    // Mock responses for /api/traverse tests
    if (variables && variables.rootId === 'root-with-dangling') {
      return Promise.resolve({
        queryNode: [
          {
            id: 'root-with-dangling',
            label: 'Root Node',
            type: 'concept',
            level: 0,
            outgoing: [
              { // Valid edge
                type: 'child',
                to: { id: 'child-node-1', label: 'Child 1', type: 'concept', level: 1 }
              },
              { // Dangling edge (to is null)
                type: 'child',
                to: null
              },
              { // Dangling edge (to is missing id)
                type: 'related',
                to: { label: 'Missing ID Node', type: 'concept', level: 1 }
              },
              { // Dangling edge (to is missing label)
                type: 'example',
                to: { id: 'missing-label-node', type: 'example', level: 1 }
              },
              { // Valid edge
                type: 'related',
                to: { id: 'related-node-2', label: 'Related 2', type: 'concept', level: 1 }
              }
            ]
          }
        ]
      });
    } else if (variables && variables.rootId === 'clean-root') {
       return Promise.resolve({
        queryNode: [
          {
            id: 'clean-root',
            label: 'Clean Root Node',
            type: 'concept',
            level: 0,
            outgoing: [
              { // Valid edge
                type: 'child',
                to: { id: 'clean-child-1', label: 'Clean Child 1', type: 'concept', level: 1 }
              },
              { // Valid edge
                type: 'related',
                to: { id: 'clean-related-2', label: 'Clean Related 2', type: 'concept', level: 1 }
              }
            ]
          }
        ]
      });
    }

    // Default mock response for other queries if necessary, or let it fail
    return Promise.resolve({ queryNode: [] });
  })
}));

describe('Integration /api/mutate', () => {
  // Reset the mock before each test to ensure isolation
  beforeEach(() => {
    require('./dgraphClient').executeGraphQL.mockClear();
  });

  it('should create a node and return JSON payload from Dgraph', async () => {
    const payload = {
      mutation: `
        mutation AddNode($input: [AddNodeInput!]!) {
          addNode(input: $input) {
            node { id label type level status branch }
          }
        }
      `,
      variables: {
        input: [
          {
            id: "it-test-id",
            label: "IT Node",
            type: "concept",
            level: 1,
            status: "pending",
            branch: "main"
          }
        ]
      }
    };

    const res = await request(app)
      .post('/api/mutate')
      .send(payload)
      .expect('Content-Type', /json/)
      .expect(200);

    // Verify the response body contains the addNode.node array
    expect(res.body).toHaveProperty('addNode.node');

    // New test for nested hierarchyAssignments support
    it('should create a node with nested hierarchyAssignments', async () => {
      const payload = {
        mutation: `
          mutation AddNodeWithHierarchy($input: [AddNodeInput!]!) {
            addNode(input: $input) {
              node {
                id
                hierarchyAssignments {
                  hierarchy { id name }
                  level { id levelNumber label }
                }
              }
            }
          }
        `,
        variables: {
          input: [
            { id: "nested-id", label: "Nested", type: "t" }
          ]
        }
      };
      const mockExec = require('./dgraphClient').executeGraphQL;
      mockExec.mockResolvedValueOnce({
        addNode: {
          node: [
            {
              id: 'nested-id',
              hierarchyAssignments: [
                { hierarchy: { id: 'hid', name: 'HierarchyName' }, level: { id: 'lid', levelNumber: 1, label: 'LevelLabel' } }
              ]
            }
          ]
        }
      });
      const resNested = await request(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'hid')
        .send(payload)
        .expect('Content-Type', /json/)
        .expect(200);
      expect(resNested.body.addNode.node[0].hierarchyAssignments).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            hierarchy: { id: 'hid', name: 'HierarchyName' },
            level: { id: 'lid', levelNumber: 1, label: 'LevelLabel' }
          })
        ])
      );
    });
    expect(Array.isArray(res.body.addNode.node)).toBe(true);
    expect(res.body.addNode.node[0]).toMatchObject({
      id: "it-test-id",
      label: "IT Node",
      type: "concept"
    });
  });
});

describe('Integration /api/traverse', () => {
  // Reset the mock before each test to ensure isolation
  beforeEach(() => {
    require('./dgraphClient').executeGraphQL.mockClear();
  });

  it('should filter out dangling edges during traversal', async () => {
    const rootId = 'root-with-dangling';
    const payload = { rootId };

    const res = await request(app)
      .post('/api/traverse')
      .send(payload)
      .expect('Content-Type', /json/)
      .expect(200);

    // Verify the response structure
    expect(res.body).toHaveProperty('data.queryNode');
    expect(Array.isArray(res.body.data.queryNode)).toBe(true);
    expect(res.body.data.queryNode.length).toBe(1); // Should still return the root node

    const rootNode = res.body.data.queryNode[0];
    expect(rootNode).toHaveProperty('id', rootId);
    expect(rootNode).toHaveProperty('outgoing');
    expect(Array.isArray(rootNode.outgoing)).toBe(true);

    // Verify that only valid edges are present
    expect(rootNode.outgoing.length).toBe(2); // Should have filtered out 3 invalid edges

    // Verify the content of the remaining valid edges
    const validEdgeTargets = rootNode.outgoing.map(edge => edge.to.id);
    expect(validEdgeTargets).toContain('child-node-1');
    expect(validEdgeTargets).toContain('related-node-2');

    // Ensure the mock was called with the correct query and variables
    const executeGraphQLMock = require('./dgraphClient').executeGraphQL;
    expect(executeGraphQLMock).toHaveBeenCalledTimes(1);
    expect(executeGraphQLMock).toHaveBeenCalledWith(expect.any(String), { rootId });
  });

  it('should return all edges for a clean graph', async () => {
    const rootId = 'clean-root';
    const payload = { rootId };

    const res = await request(app)
      .post('/api/traverse')
      .send(payload)
      .expect('Content-Type', /json/)
      .expect(200);

    // Verify the response structure
    expect(res.body).toHaveProperty('data.queryNode');
    expect(Array.isArray(res.body.data.queryNode)).toBe(true);
    expect(res.body.data.queryNode.length).toBe(1); // Should still return the root node

    const rootNode = res.body.data.queryNode[0];
    expect(rootNode).toHaveProperty('id', rootId);
    expect(rootNode).toHaveProperty('outgoing');
    expect(Array.isArray(rootNode.outgoing)).toBe(true);

    // Verify that all edges are present
    expect(rootNode.outgoing.length).toBe(2); // Should have returned both valid edges

    // Verify the content of the remaining valid edges
    const validEdgeTargets = rootNode.outgoing.map(edge => edge.to.id);
    expect(validEdgeTargets).toContain('clean-child-1');
    expect(validEdgeTargets).toContain('clean-related-2');

    // Ensure the mock was called with the correct query and variables
    const executeGraphQLMock = require('./dgraphClient').executeGraphQL;
    expect(executeGraphQLMock).toHaveBeenCalledTimes(1);
    expect(executeGraphQLMock).toHaveBeenCalledWith(expect.any(String), { rootId });
  });

  it('should return 400 if rootId is missing', async () => {
    const payload = {}; // Missing rootId

    const res = await request(app)
      .post('/api/traverse')
      .send(payload)
      .expect('Content-Type', /json/)
      .expect(400);

    expect(res.body).toHaveProperty('error', 'Missing required field: rootId');
  });

  // Add more tests for different scenarios (e.g., rootId not found, Dgraph error)
});
