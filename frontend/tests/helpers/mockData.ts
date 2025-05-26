import type { NodeData, EdgeData } from '../../src/types/graph';

// Mock node data
export const mockNodes: NodeData[] = [
  {
    id: 'node1',
    label: 'Test Node 1',
    type: 'concept',
    assignments: [
      {
        hierarchyId: 'hierarchy1',
        hierarchyName: 'Test Hierarchy',
        levelId: 'level1',
        levelNumber: 1
      }
    ]
  },
  {
    id: 'node2',
    label: 'Test Node 2',
    type: 'example',
    assignments: [
      {
        hierarchyId: 'hierarchy1',
        hierarchyName: 'Test Hierarchy',
        levelId: 'level2',
        levelNumber: 2
      }
    ]
  },
  {
    id: 'node3',
    label: 'Test Node 3',
    type: 'question',
    assignments: [
      {
        hierarchyId: 'hierarchy1',
        hierarchyName: 'Test Hierarchy',
        levelId: 'level1',
        levelNumber: 1
      }
    ]
  }
];

// Mock edge data
export const mockEdges: EdgeData[] = [
  {
    source: 'node1',
    target: 'node2',
    type: 'connects_to'
  },
  {
    source: 'node1',
    target: 'node3',
    type: 'relates_to'
  }
];

// Mock hierarchy data
export const mockHierarchies = [
  {
    id: 'hierarchy1',
    name: 'Test Hierarchy',
    levels: [
      {
        id: 'level1',
        levelNumber: 1,
        label: 'Domain',
        allowedTypes: ['concept', 'question']
      },
      {
        id: 'level2',
        levelNumber: 2,
        label: 'Subdomain',
        allowedTypes: ['example', 'concept']
      }
    ]
  },
  {
    id: 'hierarchy2',
    name: 'Secondary Hierarchy',
    levels: [
      {
        id: 'level3',
        levelNumber: 1,
        label: 'Category',
        allowedTypes: ['concept']
      }
    ]
  }
];

// Mock API responses
export const mockApiResponses = {
  allNodeIds: ['node1', 'node2', 'node3'],
  traversalData: {
    queryNode: [
      {
        id: 'node1',
        label: 'Test Node 1',
        type: 'concept',
        hierarchyAssignments: [
          {
            hierarchy: { id: 'hierarchy1', name: 'Test Hierarchy' },
            level: { id: 'level1', levelNumber: 1, label: 'Domain' }
          }
        ],
        outgoing: [
          {
            type: 'connects_to',
            to: {
              id: 'node2',
              label: 'Test Node 2',
              type: 'example'
            }
          }
        ]
      }
    ]
  },
  hierarchies: mockHierarchies
};

// Helper functions to create mock data
export const createMockNode = (overrides: Partial<NodeData> = {}): NodeData => ({
  id: 'mock-node',
  label: 'Mock Node',
  type: 'concept',
  assignments: [
    {
      hierarchyId: 'hierarchy1',
      hierarchyName: 'Test Hierarchy',
      levelId: 'level1',
      levelNumber: 1
    }
  ],
  ...overrides
});

export const createMockEdge = (overrides: Partial<EdgeData> = {}): EdgeData => ({
  source: 'node1',
  target: 'node2',
  type: 'connects_to',
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
      allowedTypes: ['concept']
    }
  ],
  ...overrides
});

// Mock context menu items
export const mockContextMenuItems = [
  { label: 'Add Node', action: 'add', icon: '➕' },
  { label: 'Edit Node', action: 'edit', icon: '✏️' },
  { label: 'Delete Node', action: 'delete', icon: '🗑️' }
];

// Mock form values
export const mockNodeFormValues = {
  label: 'Test Node',
  type: 'concept',
  hierarchyId: 'hierarchy1',
  levelId: 'level1'
};
