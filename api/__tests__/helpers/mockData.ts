// Standardized mock data for backend tests

// Define interfaces for mock data structures
interface HierarchyAssignment {
  hierarchy: { id: string; name?: string };
  level: { id: string; levelNumber?: number; label?: string };
}

interface Node {
  id: string;
  label: string;
  type: string;
  status: string;
  branch: string;
  hierarchyAssignments: HierarchyAssignment[];
  outgoing?: Edge[]; // Add outgoing for traversal mock
  level?: number; // Add level for traversal mock
}

interface Edge {
  from?: { id: string }; // Optional for consistency
  fromId: string;
  to: { id: string; label?: string; type?: string; level?: number } | null; // 'to' can be null for dangling edges
  toId?: string; // Optional for consistency
  type: string;
}

interface HierarchyLevel {
  id: string;
  levelNumber: number;
  label: string;
  allowedTypes: { typeName: string }[];
}

interface Hierarchy {
  id: string;
  name: string;
  levels: HierarchyLevel[];
}

interface GraphQLResponse<T> {
  data: T;
}

interface QueryNodeResponse {
  queryNode: Node[];
}

interface AddNodeResponse {
  addNode: {
    node: Node[];
  };
}

interface QueryHierarchyResponse {
  queryHierarchy: Hierarchy[];
}

interface AddHierarchyResponse {
  addHierarchy: {
    hierarchy: Hierarchy[];
  };
}

interface AddHierarchyLevelResponse {
  addHierarchyLevel: {
    hierarchyLevel: HierarchyLevel[];
  };
}

interface AddHierarchyAssignmentResponse {
  addHierarchyAssignment: {
    hierarchyAssignment: AddHierarchyAssignmentResult[];
  };
}

// Define interface for the result objects in addHierarchyAssignment response
interface AddHierarchyAssignmentResult {
  id: string;
  nodeId: string;
  hierarchyId: string;
  levelId: string;
  // Add other properties if they exist in the actual response
}


export const mockNodes: Node[] = [
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

export const mockEdges: Edge[] = [
  {
    from: { id: 'node1' },
    fromId: 'node1',
    to: { id: 'node2' },
    toId: 'node2',
    type: 'connects_to'
  }
];

export const mockHierarchies: Hierarchy[] = [
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
  } as GraphQLResponse<QueryNodeResponse>,
  addNode: {
    data: {
      addNode: {
        node: [mockNodes[0]]
      }
    }
  } as GraphQLResponse<AddNodeResponse>,
  queryHierarchy: {
    data: {
      queryHierarchy: mockHierarchies
    }
  } as GraphQLResponse<QueryHierarchyResponse>,
  addHierarchy: {
    data: {
      addHierarchy: {
        hierarchy: [mockHierarchies[0]]
      }
    }
  } as GraphQLResponse<AddHierarchyResponse>,
  addHierarchyLevel: {
    data: {
      addHierarchyLevel: {
        hierarchyLevel: [mockHierarchies[0].levels[0]]
      }
    }
  } as GraphQLResponse<AddHierarchyLevelResponse>,
  addHierarchyAssignment: {
    data: {
      addHierarchyAssignment: {
        hierarchyAssignment: [{ id: 'mock-assignment-id', nodeId: 'node1', hierarchyId: 'hierarchy1', levelId: 'level1' }] // Assuming assignment has an id
      }
    }
  } as GraphQLResponse<AddHierarchyAssignmentResponse>
};

export const mockTraversalResponse: GraphQLResponse<QueryNodeResponse> = {
  data: {
    queryNode: [
      {
        ...mockNodes[0],
        outgoing: [
          {
            type: 'connects_to',
            fromId: mockNodes[0].id, // Add fromId
            to: mockNodes[1]
          }
        ]
      }
    ]
  }
};

// Helper functions to create mock data
export const createMockNode = (overrides: Partial<Node> = {}): Node => ({
  id: 'mock-node',
  label: 'Mock Node',
  type: 'concept',
  status: 'active',
  branch: 'main',
  hierarchyAssignments: [],
  ...overrides
});

export const createMockHierarchy = (overrides: Partial<Hierarchy> = {}): Hierarchy => ({
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

interface AddNodeInput {
  id: string;
  label: string;
  type: string;
  hierarchyAssignments?: {
    hierarchy: { id: string };
    level: { id: string };
  }[];
  levelId?: string; // Add levelId as optional
  parentId?: string; // Add parentId as optional
  // Add other potential fields from AddNodeInput if needed
}

export const createMockAddNodeInput = (overrides: Partial<AddNodeInput> = {}): AddNodeInput => ({
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
