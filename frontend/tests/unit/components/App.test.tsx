import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { screen, waitFor, act, render } from '@testing-library/react';
import { mockNodes, mockEdges } from '../../helpers/mockData';
import App from '../../../src/App';

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

// Mock the ApiService module
vi.mock('../../../src/services/ApiService', () => ({
  fetchHierarchies: mockFetchHierarchies,
  executeQuery: mockExecuteQuery,
  executeMutation: mockExecuteMutation,
  fetchAllNodeIds: mockFetchAllNodeIds,
}));

// Mock GraphUtils module
vi.mock('../../../src/utils/graphUtils', () => ({
  transformAllGraphData: mockTransformAllGraphData,
}));

// Mock GraphView component to avoid complex Cytoscape dependencies
vi.mock('../../../src/components/GraphView', () => ({
  default: ({ nodes, edges, onNodeExpand, onLoadCompleteGraph, onDeleteNode }: any) => {
    return (
      <div data-testid="graph-view">
        <span data-testid="node-count">{nodes.length}</span>
        <span data-testid="edge-count">{edges.length}</span>
        <button 
          data-testid="expand-trigger" 
          onClick={() => onNodeExpand?.('test-node')}
        >
          Expand
        </button>
        <button 
          data-testid="load-complete-trigger" 
          onClick={() => onLoadCompleteGraph?.()}
        >
          Load Complete
        </button>
        <button 
          data-testid="delete-trigger" 
          onClick={() => onDeleteNode?.('test-node')}
        >
          Delete
        </button>
      </div>
    );
  }
}));

describe('App Component', () => {
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
    
    mockFetchAllNodeIds.mockResolvedValue(['node1', 'node2']);
    
    mockTransformAllGraphData.mockReturnValue({
      nodes: mockNodes,
      edges: mockEdges
    });
    
    mockExecuteMutation.mockResolvedValue({
      data: { deleteNode: { numUids: 1 } }
    });
  });

  it('renders loading state initially', () => {
    // Make the API call hang to test loading state
    mockExecuteQuery.mockReturnValue(new Promise(() => {}));
    
    render(<App />);
    expect(screen.getByText(/Loading graph data.../i)).toBeInTheDocument();
  });

  it('renders GraphView after successful data load', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.queryByText(/Loading graph data.../i)).not.toBeInTheDocument();
    });
    
    expect(screen.getByTestId('graph-view')).toBeInTheDocument();
    expect(screen.getByTestId('node-count')).toHaveTextContent('3');
  });

  it('handles API errors gracefully', async () => {
    mockExecuteQuery.mockRejectedValue(new Error('API Error'));
    
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
      expect(screen.getByText(/Failed to load complete graph data/)).toBeInTheDocument();
    });
  });

  it('handles node expansion', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByTestId('graph-view')).toBeInTheDocument();
    });

    // Mock expansion data
    mockExecuteQuery.mockResolvedValueOnce({
      queryNode: [mockNodes[1]]
    });
    mockTransformAllGraphData.mockReturnValueOnce({
      nodes: [mockNodes[1]],
      edges: []
    });

    act(() => {
      screen.getByTestId('expand-trigger').click();
    });

    await waitFor(() => {
      expect(mockExecuteQuery).toHaveBeenCalledWith(
        expect.stringContaining('test-node'),
        expect.any(Object)
      );
    });
  });

  it('handles complete graph loading', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByTestId('graph-view')).toBeInTheDocument();
    });

    // Mock complete graph data
    mockFetchAllNodeIds.mockResolvedValueOnce(['node1', 'node2', 'node3']);
    mockExecuteQuery.mockResolvedValue({
      queryNode: mockNodes
    });
    mockTransformAllGraphData.mockReturnValue({
      nodes: mockNodes,
      edges: mockEdges
    });

    act(() => {
      screen.getByTestId('load-complete-trigger').click();
    });

    await waitFor(() => {
      expect(mockFetchAllNodeIds).toHaveBeenCalled();
    });
  });

  it('handles node deletion', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByTestId('graph-view')).toBeInTheDocument();
    });

    mockExecuteMutation.mockResolvedValueOnce({
      data: { deleteNode: { numUids: 1 } }
    });

    act(() => {
      screen.getByTestId('delete-trigger').click();
    });

    await waitFor(() => {
      expect(mockExecuteMutation).toHaveBeenCalled();
    });
  });
});
