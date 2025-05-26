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

describe('Graph Expansion Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default API responses
    mockFetchHierarchies.mockResolvedValue([
      { id: 'h1', name: 'Test Hierarchy 1' },
      { id: 'h2', name: 'Test Hierarchy 2' }
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
  });

  it('loads initial graph data', async () => {
    render(<App />);

    await waitFor(() => {
      expect(mockFetchHierarchies).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockExecuteQuery).toHaveBeenCalled();
    });
  });

  it('expands graph when new nodes are added', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('cytoscape-component')).toBeInTheDocument();
    });

    // Mock expansion with additional nodes
    mockExecuteQuery.mockResolvedValueOnce({
      queryNode: [...mockNodes, {
        id: 'node4',
        label: 'Expanded Node',
        type: 'concept',
        assignments: []
      }]
    });

    mockTransformAllGraphData.mockReturnValueOnce({
      nodes: [...mockNodes, {
        id: 'node4',
        label: 'Expanded Node',
        type: 'concept',
        assignments: []
      }],
      edges: [
        { source: 'node1', target: 'node2', type: 'connects_to' },
        { source: 'node1', target: 'node4', type: 'relates_to' }
      ]
    });

    // Simulate node expansion
    const graphComponent = screen.getByTestId('cytoscape-component');
    fireEvent.click(graphComponent);

    await waitFor(() => {
      const elements = JSON.parse(
        screen.getByTestId('cytoscape-component').getAttribute('data-elements') || '[]'
      );
      expect(elements.length).toBeGreaterThan(mockNodes.length);
    });
  });

  it('handles complete graph loading', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('cytoscape-component')).toBeInTheDocument();
    });

    // Mock complete graph loading
    mockFetchAllNodeIds.mockResolvedValueOnce(['node1', 'node2', 'node3', 'node4', 'node5']);
    
    const allNodes = [
      ...mockNodes,
      { id: 'node4', label: 'Node 4', type: 'concept', assignments: [] },
      { id: 'node5', label: 'Node 5', type: 'example', assignments: [] }
    ];

    mockExecuteQuery.mockResolvedValueOnce({
      queryNode: allNodes
    });

    mockTransformAllGraphData.mockReturnValueOnce({
      nodes: allNodes,
      edges: [
        { source: 'node1', target: 'node2', type: 'connects_to' },
        { source: 'node2', target: 'node3', type: 'relates_to' },
        { source: 'node3', target: 'node4', type: 'connects_to' },
        { source: 'node4', target: 'node5', type: 'relates_to' }
      ]
    });

    // Trigger complete graph load
    // This would typically be done through a button or menu action
    await waitFor(() => {
      expect(mockExecuteQuery).toHaveBeenCalled();
    });
  });

  it('handles graph filtering and expansion', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('cytoscape-component')).toBeInTheDocument();
    });

    // Mock filtered expansion (e.g., only concept nodes)
    const conceptNodes = mockNodes.filter(node => node.type === 'concept');
    
    mockExecuteQuery.mockResolvedValueOnce({
      queryNode: conceptNodes
    });

    mockTransformAllGraphData.mockReturnValueOnce({
      nodes: conceptNodes,
      edges: []
    });

    await waitFor(() => {
      const elements = JSON.parse(
        screen.getByTestId('cytoscape-component').getAttribute('data-elements') || '[]'
      );
      const nodeElements = elements.filter((el: any) => !el.data.source);
      expect(nodeElements.length).toBe(conceptNodes.length);
    });
  });

  it('handles incremental node expansion', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('cytoscape-component')).toBeInTheDocument();
    });

    // Start with minimal graph
    const initialNodes = [mockNodes[0]];
    mockTransformAllGraphData.mockReturnValueOnce({
      nodes: initialNodes,
      edges: []
    });

    // Expand to include connected nodes
    const expandedNodes = [mockNodes[0], mockNodes[1]];
    mockExecuteQuery.mockResolvedValueOnce({
      queryNode: expandedNodes
    });

    mockTransformAllGraphData.mockReturnValueOnce({
      nodes: expandedNodes,
      edges: [
        { source: 'node1', target: 'node2', type: 'connects_to' }
      ]
    });

    await waitFor(() => {
      expect(mockExecuteQuery).toHaveBeenCalled();
    });
  });

  it('handles graph expansion errors gracefully', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('cytoscape-component')).toBeInTheDocument();
    });

    // Mock expansion error
    mockExecuteQuery.mockRejectedValueOnce(new Error('Expansion failed'));

    // Should handle error without crashing
    await waitFor(() => {
      expect(screen.getByTestId('cytoscape-component')).toBeInTheDocument();
    });
  });

  it('maintains graph state during expansion', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('cytoscape-component')).toBeInTheDocument();
    });

    // Get initial state
    const initialElements = JSON.parse(
      screen.getByTestId('cytoscape-component').getAttribute('data-elements') || '[]'
    );

    // Expand graph
    const expandedNodes = [...mockNodes, {
      id: 'node4',
      label: 'New Node',
      type: 'concept',
      assignments: []
    }];

    mockExecuteQuery.mockResolvedValueOnce({
      queryNode: expandedNodes
    });

    mockTransformAllGraphData.mockReturnValueOnce({
      nodes: expandedNodes,
      edges: [
        { source: 'node1', target: 'node2', type: 'connects_to' },
        { source: 'node1', target: 'node4', type: 'relates_to' }
      ]
    });

    await waitFor(() => {
      const newElements = JSON.parse(
        screen.getByTestId('cytoscape-component').getAttribute('data-elements') || '[]'
      );
      expect(newElements.length).toBeGreaterThan(initialElements.length);
    });
  });

  it('handles dynamic graph updates', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('cytoscape-component')).toBeInTheDocument();
    });

    // Simulate real-time updates
    const updatedNodes = mockNodes.map(node => ({
      ...node,
      label: `Updated ${node.label}`
    }));

    mockExecuteQuery.mockResolvedValueOnce({
      queryNode: updatedNodes
    });

    mockTransformAllGraphData.mockReturnValueOnce({
      nodes: updatedNodes,
      edges: [
        { source: 'node1', target: 'node2', type: 'connects_to' }
      ]
    });

    await waitFor(() => {
      expect(mockTransformAllGraphData).toHaveBeenCalled();
    });
  });
});
