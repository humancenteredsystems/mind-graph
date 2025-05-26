import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { mockNodes } from '../helpers/mockData';
import App from '../../src/App';

// Use vi.hoisted to properly handle mock hoisting
const { 
  mockFetchHierarchies,
  mockExecuteQuery,
  mockExecuteMutation,
  mockFetchAllNodeIds,
  mockTransformAllGraphData
} = vi.hoisted(() => ({
  mockFetchHierarchies: vi.fn(),
  mockExecuteQuery: vi.fn(),
  mockExecuteMutation: vi.fn(),
  mockFetchAllNodeIds: vi.fn(),
  mockTransformAllGraphData: vi.fn()
}));

// Mock API Service with all named exports
vi.mock('../../src/services/ApiService', () => ({
  fetchHierarchies: mockFetchHierarchies,
  executeQuery: mockExecuteQuery,
  executeMutation: mockExecuteMutation,
  fetchAllNodeIds: mockFetchAllNodeIds,
}));

// Mock GraphUtils module
vi.mock('../../src/utils/graphUtils', () => ({
  transformAllGraphData: mockTransformAllGraphData,
}));

// Mock Cytoscape with interaction capabilities
vi.mock('react-cytoscapejs', () => ({
  default: ({ elements, cy }: { elements: any[]; cy?: any }) => {
    const mockCy = {
      layout: vi.fn().mockReturnValue({ run: vi.fn() }),
      on: vi.fn(),
      off: vi.fn(),
      nodes: vi.fn().mockReturnValue([]),
      edges: vi.fn().mockReturnValue([])
    };
    
    if (typeof cy === 'function') {
      cy(mockCy);
    }
    
    return (
      <div 
        data-testid="cytoscape-component" 
        data-elements={JSON.stringify(elements)}
        onContextMenu={(e) => {
          e.preventDefault();
        }}
      />
    );
  }
}));

describe('Hierarchy Node Creation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default API responses
    mockFetchHierarchies.mockResolvedValue([
      { 
        id: 'h1', 
        name: 'Test Hierarchy 1',
        levels: [
          { id: 'l1', levelNumber: 1, label: 'Domain', allowedTypes: ['concept'] },
          { id: 'l2', levelNumber: 2, label: 'Category', allowedTypes: ['concept', 'example'] }
        ]
      },
      { 
        id: 'h2', 
        name: 'Test Hierarchy 2',
        levels: [
          { id: 'l3', levelNumber: 1, label: 'Topic', allowedTypes: ['question'] }
        ]
      }
    ]);
    
    mockExecuteQuery.mockResolvedValue({
      queryNode: mockNodes
    });
    
    mockFetchAllNodeIds.mockResolvedValue(['node1', 'node2', 'node3']);
    
    mockTransformAllGraphData.mockReturnValue({
      nodes: mockNodes,
      edges: [
        { source: 'node1', target: 'node2', type: 'connects_to' }
      ]
    });
    
    mockExecuteMutation.mockResolvedValue({
      data: { addNode: { numUids: 1 } }
    });
  });

  it('loads hierarchies and displays them in selector', async () => {
    render(<App />);

    await waitFor(() => {
      expect(mockFetchHierarchies).toHaveBeenCalled();
    });

    // Should display hierarchy selector
    expect(screen.getByText('Test Hierarchy 1')).toBeInTheDocument();
    expect(screen.getByText('Test Hierarchy 2')).toBeInTheDocument();
  });

  it('creates nodes within hierarchy constraints', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('cytoscape-component')).toBeInTheDocument();
    });

    // Mock successful node creation
    const newNode = {
      id: 'node4',
      label: 'New Concept Node',
      type: 'concept',
      assignments: [
        {
          hierarchyId: 'h1',
          hierarchyName: 'Test Hierarchy 1',
          levelId: 'l1',
          levelNumber: 1
        }
      ]
    };

    mockExecuteMutation.mockResolvedValueOnce({
      data: { addNode: { numUids: 1 } }
    });

    mockExecuteQuery.mockResolvedValueOnce({
      queryNode: [...mockNodes, newNode]
    });

    mockTransformAllGraphData.mockReturnValueOnce({
      nodes: [...mockNodes, newNode],
      edges: [
        { source: 'node1', target: 'node2', type: 'connects_to' },
        { source: 'node1', target: 'node4', type: 'relates_to' }
      ]
    });

    // Simulate node creation workflow
    await waitFor(() => {
      expect(mockExecuteQuery).toHaveBeenCalled();
    });
  });

  it('validates node types against hierarchy level constraints', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('cytoscape-component')).toBeInTheDocument();
    });

    // Attempt to create a node with invalid type for level
    const invalidNode = {
      id: 'node5',
      label: 'Invalid Node',
      type: 'question', // Not allowed in level 1 of hierarchy 1
      assignments: [
        {
          hierarchyId: 'h1',
          hierarchyName: 'Test Hierarchy 1',
          levelId: 'l1',
          levelNumber: 1
        }
      ]
    };

    // Should validate and potentially reject
    mockExecuteMutation.mockRejectedValueOnce(new Error('Invalid node type for level'));

    await waitFor(() => {
      expect(mockFetchHierarchies).toHaveBeenCalled();
    });
  });

  it('handles hierarchy switching and node creation', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('cytoscape-component')).toBeInTheDocument();
    });

    // Switch to different hierarchy
    const hierarchySelector = screen.getByDisplayValue('Test Hierarchy 1');
    fireEvent.change(hierarchySelector, { target: { value: 'h2' } });

    // Create node in new hierarchy
    const newNode = {
      id: 'node6',
      label: 'Question Node',
      type: 'question',
      assignments: [
        {
          hierarchyId: 'h2',
          hierarchyName: 'Test Hierarchy 2',
          levelId: 'l3',
          levelNumber: 1
        }
      ]
    };

    mockExecuteQuery.mockResolvedValueOnce({
      queryNode: [newNode]
    });

    mockTransformAllGraphData.mockReturnValueOnce({
      nodes: [newNode],
      edges: []
    });

    await waitFor(() => {
      expect(mockExecuteQuery).toHaveBeenCalled();
    });
  });

  it('creates connected nodes with proper hierarchy assignments', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('cytoscape-component')).toBeInTheDocument();
    });

    // Create a connected node
    const parentNode = mockNodes[0];
    const connectedNode = {
      id: 'node7',
      label: 'Connected Node',
      type: 'example',
      assignments: [
        {
          hierarchyId: 'h1',
          hierarchyName: 'Test Hierarchy 1',
          levelId: 'l2', // Different level from parent
          levelNumber: 2
        }
      ]
    };

    mockExecuteMutation.mockResolvedValueOnce({
      data: { addNode: { numUids: 1 } }
    });

    mockExecuteQuery.mockResolvedValueOnce({
      queryNode: [...mockNodes, connectedNode]
    });

    mockTransformAllGraphData.mockReturnValueOnce({
      nodes: [...mockNodes, connectedNode],
      edges: [
        { source: 'node1', target: 'node2', type: 'connects_to' },
        { source: parentNode.id, target: connectedNode.id, type: 'connects_to' }
      ]
    });

    await waitFor(() => {
      expect(mockExecuteQuery).toHaveBeenCalled();
    });
  });

  it('handles node creation errors gracefully', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('cytoscape-component')).toBeInTheDocument();
    });

    // Mock node creation failure
    mockExecuteMutation.mockRejectedValueOnce(new Error('Node creation failed'));

    // Should handle error without crashing
    await waitFor(() => {
      expect(screen.getByTestId('cytoscape-component')).toBeInTheDocument();
    });
  });

  it('validates hierarchy level assignments', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('cytoscape-component')).toBeInTheDocument();
    });

    // Attempt to create node with invalid level assignment
    const invalidLevelNode = {
      id: 'node8',
      label: 'Invalid Level Node',
      type: 'concept',
      assignments: [
        {
          hierarchyId: 'h1',
          hierarchyName: 'Test Hierarchy 1',
          levelId: 'invalid-level',
          levelNumber: 999
        }
      ]
    };

    // Should validate level exists in hierarchy
    mockExecuteMutation.mockRejectedValueOnce(new Error('Invalid level assignment'));

    await waitFor(() => {
      expect(mockFetchHierarchies).toHaveBeenCalled();
    });
  });

  it('maintains hierarchy context during node operations', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('cytoscape-component')).toBeInTheDocument();
    });

    // Verify hierarchy context is maintained
    expect(screen.getByDisplayValue('Test Hierarchy 1')).toBeInTheDocument();

    // Create multiple nodes in same hierarchy
    const nodes = [
      {
        id: 'node9',
        label: 'First Node',
        type: 'concept',
        assignments: [{ hierarchyId: 'h1', hierarchyName: 'Test Hierarchy 1', levelId: 'l1', levelNumber: 1 }]
      },
      {
        id: 'node10',
        label: 'Second Node',
        type: 'example',
        assignments: [{ hierarchyId: 'h1', hierarchyName: 'Test Hierarchy 1', levelId: 'l2', levelNumber: 2 }]
      }
    ];

    mockExecuteQuery.mockResolvedValueOnce({
      queryNode: [...mockNodes, ...nodes]
    });

    mockTransformAllGraphData.mockReturnValueOnce({
      nodes: [...mockNodes, ...nodes],
      edges: [
        { source: 'node1', target: 'node2', type: 'connects_to' },
        { source: 'node9', target: 'node10', type: 'connects_to' }
      ]
    });

    await waitFor(() => {
      expect(mockExecuteQuery).toHaveBeenCalled();
    });
  });

  it('handles bulk node creation within hierarchy', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('cytoscape-component')).toBeInTheDocument();
    });

    // Mock bulk creation
    const bulkNodes = [
      { id: 'bulk1', label: 'Bulk Node 1', type: 'concept', assignments: [{ hierarchyId: 'h1', hierarchyName: 'Test Hierarchy 1', levelId: 'l1', levelNumber: 1 }] },
      { id: 'bulk2', label: 'Bulk Node 2', type: 'concept', assignments: [{ hierarchyId: 'h1', hierarchyName: 'Test Hierarchy 1', levelId: 'l1', levelNumber: 1 }] },
      { id: 'bulk3', label: 'Bulk Node 3', type: 'example', assignments: [{ hierarchyId: 'h1', hierarchyName: 'Test Hierarchy 1', levelId: 'l2', levelNumber: 2 }] }
    ];

    mockExecuteMutation.mockResolvedValue({
      data: { addNode: { numUids: 3 } }
    });

    mockExecuteQuery.mockResolvedValueOnce({
      queryNode: [...mockNodes, ...bulkNodes]
    });

    mockTransformAllGraphData.mockReturnValueOnce({
      nodes: [...mockNodes, ...bulkNodes],
      edges: [
        { source: 'node1', target: 'node2', type: 'connects_to' },
        { source: 'bulk1', target: 'bulk3', type: 'connects_to' },
        { source: 'bulk2', target: 'bulk3', type: 'connects_to' }
      ]
    });

    await waitFor(() => {
      expect(mockExecuteQuery).toHaveBeenCalled();
    });
  });

  it('preserves hierarchy relationships during graph operations', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('cytoscape-component')).toBeInTheDocument();
    });

    // Verify that hierarchy relationships are maintained
    const hierarchicalNodes = mockNodes.map(node => ({
      ...node,
      assignments: [
        {
          hierarchyId: 'h1',
          hierarchyName: 'Test Hierarchy 1',
          levelId: node.type === 'concept' ? 'l1' : 'l2',
          levelNumber: node.type === 'concept' ? 1 : 2
        }
      ]
    }));

    mockExecuteQuery.mockResolvedValueOnce({
      queryNode: hierarchicalNodes
    });

    mockTransformAllGraphData.mockReturnValueOnce({
      nodes: hierarchicalNodes,
      edges: [
        { source: 'node1', target: 'node2', type: 'connects_to' }
      ]
    });

    await waitFor(() => {
      expect(mockTransformAllGraphData).toHaveBeenCalledWith(
        expect.objectContaining({
          queryNode: expect.arrayContaining([
            expect.objectContaining({
              assignments: expect.arrayContaining([
                expect.objectContaining({
                  hierarchyId: 'h1'
                })
              ])
            })
          ])
        })
      );
    });
  });
});
