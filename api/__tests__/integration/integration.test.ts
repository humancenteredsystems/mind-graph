import request from 'supertest';
import app from '../../server';

// Create a shared mock for executeGraphQL
const mockExecuteGraphQL = jest.fn();

// Mock the adaptive tenant factory with proper client structure
jest.mock('../../services/adaptiveTenantFactory', () => ({
  adaptiveTenantFactory: {
    createTenant: jest.fn(() => ({
      executeGraphQL: mockExecuteGraphQL,
      getNamespace: jest.fn(() => null),
      isDefaultNamespace: jest.fn(() => true)
    })),
    createTenantFromContext: jest.fn(() => ({
      executeGraphQL: mockExecuteGraphQL,
      getNamespace: jest.fn(() => null),
      isDefaultNamespace: jest.fn(() => true)
    })),
    createTestTenant: jest.fn(() => ({
      executeGraphQL: mockExecuteGraphQL,
      getNamespace: jest.fn(() => '0x1'),
      isDefaultNamespace: jest.fn(() => false)
    })),
    createDefaultTenant: jest.fn(() => ({
      executeGraphQL: mockExecuteGraphQL,
      getNamespace: jest.fn(() => null),
      isDefaultNamespace: jest.fn(() => true)
    }))
  }
}));

describe('Integration /api/mutate', () => {
  beforeEach(() => {
    mockExecuteGraphQL.mockReset();
  });

  it('should create a node and return JSON payload from Dgraph', async () => {
    // Mock hierarchy validation first
    mockExecuteGraphQL
      .mockResolvedValueOnce({ getHierarchy: { id: 'test-hierarchy' } }) // validateHierarchyId
      .mockResolvedValueOnce({ queryHierarchy: [{ levels: [{ id: 'level1', levelNumber: 1 }] }] }) // getLevelIdForNode
      .mockResolvedValueOnce({ getHierarchyLevel: { id: 'level1', levelNumber: 1, hierarchy: { id: 'test-hierarchy' }, allowedTypes: [] } }) // validateLevelIdAndAllowedType
      .mockResolvedValueOnce({
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
      .set('X-Hierarchy-Id', 'test-hierarchy') // Required header
      .send(payload)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body).toHaveProperty('addNode.node');
    expect(Array.isArray(res.body.addNode.node)).toBe(true);
    expect(res.body.addNode.node[0]).toMatchObject({
      id: "it-test-id",
      label: "IT Node",
      type: "concept"
    });
  });

  it('should create a node with nested hierarchyAssignments', async () => {
    // Mock hierarchy validation and node creation
    mockExecuteGraphQL
      .mockResolvedValueOnce({ getHierarchy: { id: 'hid' } }) // validateHierarchyId
      .mockResolvedValueOnce({ queryHierarchy: [{ levels: [{ id: 'lid', levelNumber: 1 }] }] }) // getLevelIdForNode
      .mockResolvedValueOnce({ getHierarchyLevel: { id: 'lid', levelNumber: 1, hierarchy: { id: 'hid' }, allowedTypes: [] } }) // validateLevelIdAndAllowedType
      .mockResolvedValueOnce({
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
          { id: "nested-id", label: "Nested", type: "concept" }
        ]
      }
    };

    const res = await request(app)
      .post('/api/mutate')
      .set('X-Hierarchy-Id', 'hid')
      .send(payload)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body.addNode.node[0].hierarchyAssignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          hierarchy: { id: 'hid', name: 'HierarchyName' },
          level: { id: 'lid', levelNumber: 1, label: 'LevelLabel' }
        })
      ])
    );
  });

  it('should return 400 error when hierarchy header is missing for node creation', async () => {
    const payload = {
      mutation: `
        mutation AddNode($input: [AddNodeInput!]!) {
          addNode(input: $input) {
            node { id label type }
          }
        }
      `,
      variables: {
        input: [
          {
            id: "no-header-node",
            label: "No Header Node",
            type: "concept"
          }
        ]
      }
    };

    const res = await request(app)
      .post('/api/mutate')
      // Intentionally omit X-Hierarchy-Id header
      .send(payload)
      .expect('Content-Type', /json/)
      .expect(400);

    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('X-Hierarchy-Id header is required');
  });
});

describe('Integration /api/traverse', () => {
  beforeEach(() => {
    mockExecuteGraphQL.mockReset();
  });

  it('should filter out dangling edges during traversal', async () => {
    const rootId = 'root-with-dangling';
    // Mock Dgraph traversal response
    mockExecuteGraphQL.mockResolvedValueOnce({
      queryNode: [
        {
          id: rootId,
          label: 'Root Node',
          type: 'concept',
          level: 0,
          outgoing: [
            { type: 'child', to: { id: 'child-node-1', label: 'Child 1', type: 'concept', level: 1 } },
            { type: 'child', to: null },
            { type: 'related', to: { label: 'Missing ID' } },
            { type: 'example', to: { id: 'missing-label-node', type: 'example' } },
            { type: 'related', to: { id: 'related-node-2', label: 'Related 2', type: 'concept', level: 1 } }
          ]
        }
      ]
    });

    const res = await request(app)
      .post('/api/traverse')
      .send({ rootId })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body).toHaveProperty('data.queryNode');
    const node = res.body.data.queryNode[0];
    expect(node.outgoing.length).toBe(2);
    const targets = node.outgoing.map((e: any) => e.to.id);
    expect(targets).toEqual(expect.arrayContaining(['child-node-1', 'related-node-2']));
  });

  it('should return all edges for a clean graph', async () => {
    const rootId = 'clean-root';
    mockExecuteGraphQL.mockResolvedValueOnce({
      queryNode: [
        {
          id: rootId,
          label: 'Clean Root Node',
          type: 'concept',
          level: 0,
          outgoing: [
            { type: 'child', to: { id: 'clean-child-1', label: 'Clean Child 1', type: 'concept', level: 1 } },
            { type: 'related', to: { id: 'clean-related-2', label: 'Clean Related 2', type: 'concept', level: 1 } }
          ]
        }
      ]
    });

    const res = await request(app)
      .post('/api/traverse')
      .send({ rootId })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body.data.queryNode[0].outgoing.length).toBe(2);
  });

  it('should return 400 if rootId is missing', async () => {
    const res = await request(app)
      .post('/api/traverse')
      .send({})
      .expect('Content-Type', /json/)
      .expect(400);

    expect(res.body).toHaveProperty('error', 'Missing required field: rootId');
  });
});
