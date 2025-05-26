// Standardized mock data for backend tests

const mockNodes = [
  {
    id: 'node1',
    label: 'Test Node 1',
    type: 'concept',
    status: 'active',
    branch: 'main',
    hierarchyAssignments: [
      {
        hierarchy: { id: 'hierarchy1', name: 'Test Hierarchy' },
        level: { id: 'level1', levelNumber: 1, label: 'Domain' }
      }
    ]
  },
  {
    id: 'node2',
    label: 'Test Node 2',
    type: 'example',
    status: 'active',
    branch: 'main',
    hierarchyAssignments: [
      {
        hierarchy: { id: 'hierarchy1', name: 'Test Hierarchy' },
        level: { id: 'level2', levelNumber: 2, label: 'Subdomain' }
      }
    ]
  }
];

const mockEdges = [
  {
    from: { id: 'node1' },
    fromId: 'node1',
    to: { id: 'node2' },
    toId: 'node2',
    type: 'connects_to'
  }
];

const mockHierarchies = [
  {
    id: 'hierarchy1',
    name: 'Test Hierarchy',
    levels: [
      {
        id: 'level1',
        levelNumber: 1,
        label: 'Domain',
        allowedTypes: [
          { typeName: 'concept' },
          { typeName: 'question' }
        ]
      },
      {
        id: 'level2',
        levelNumber: 2,
        label: 'Subdomain',
        allowedTypes: [
          { typeName: 'example' },
          { typeName: 'concept' }
        ]
      }
    ]
  }
];

const mockGraphQLResponses = {
  queryNode: {
    data: {
      queryNode: mockNodes
    }
  },
  addNode: {
    data: {
      addNode: {
        node: [mockNodes[0]]
      }
    }
  },
  queryHierarchy: {
    data: {
      queryHierarchy: mockHierarchies
    }
  }
};

const mockTraversalResponse = {
  data: {
    queryNode: [
      {
        ...mockNodes[0],
        outgoing: [
          {
            type: 'connects_to',
            to: mockNodes[1]
          }
        ]
      }
    ]
  }
};

// Helper functions to create mock data
const createMockNode = (overrides = {}) => ({
  id: 'mock-node',
  label: 'Mock Node',
  type: 'concept',
  status: 'active',
  branch: 'main',
  hierarchyAssignments: [],
  ...overrides
});

const createMockHierarchy = (overrides = {}) => ({
  id: 'mock-hierarchy',
  name: 'Mock Hierarchy',
  levels: [
    {
      id: 'mock-level',
      levelNumber: 1,
      label: 'Mock Level',
      allowedTypes: [{ typeName: 'concept' }]
    }
  ],
  ...overrides
});

const createMockAddNodeInput = (overrides = {}) => ({
  id: 'new-node',
  label: 'New Node',
  type: 'concept',
  hierarchyAssignments: [
    {
      hierarchy: { id: 'hierarchy1' },
      level: { id: 'level1' }
    }
  ],
  ...overrides
});

module.exports = {
  mockNodes,
  mockEdges,
  mockHierarchies,
  mockGraphQLResponses,
  mockTraversalResponse,
  createMockNode,
  createMockHierarchy,
  createMockAddNodeInput
};
