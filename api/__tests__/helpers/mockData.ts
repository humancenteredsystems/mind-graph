// Standardized mock data for backend tests

export const mockNodes = [
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

export const mockEdges = [
  {
    from: { id: 'node1' },
    fromId: 'node1',
    to: { id: 'node2' },
    toId: 'node2',
    type: 'connects_to'
  }
];

export const mockHierarchies = [
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

export const mockGraphQLResponses = {
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

export const mockTraversalResponse = {
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
export const createMockNode = (overrides: any = {}) => ({
  id: 'mock-node',
  label: 'Mock Node',
  type: 'concept',
  status: 'active',
  branch: 'main',
  hierarchyAssignments: [],
  ...overrides
});

export const createMockHierarchy = (overrides: any = {}) => ({
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

export const createMockAddNodeInput = (overrides: any = {}) => ({
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
