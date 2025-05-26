import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { screen, waitFor, act } from '@testing-library/react';
import { render } from '../../helpers/testUtils';
import { mockNodes, mockEdges, createMockNode } from '../../helpers/mockData';
import App from '../../../src/App';
import * as ApiService from '../../../src/services/ApiService';
import * as GraphUtils from '../../../src/utils/graphUtils';
import type { NodeData, EdgeData } from '../../../src/types/graph';

// Mock the ApiService and GraphUtils modules
vi.mock('../../../src/services/ApiService');
vi.mock('../../../src/utils/graphUtils');

// Mock GraphView component to avoid complex Cytoscape dependencies
vi.mock('../../../src/components/GraphView', () => ({
  default: ({ nodes, edges, onNodeExpand, onLoadCompleteGraph, onDeleteNode, onDeleteNodes }: any) => {
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
  const mockApiService = ApiService as any;
  const mockGraphUtils = GraphUtils as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiService.fetchAllNodeIds.mockResolvedValue(['node1', 'node2']);
    mockApiService.fetchTraversalData.mockResolvedValue({
      queryNode: [mockNodes[0]]
    });
    mockGraphUtils.transformTraversalData.mockReturnValue({
      nodes: [mockNodes[0]],
      edges: []
    });
  });

  it('renders loading state initially', () => {
    mockApiService.fetchTraversalData.mockReturnValue(new Promise(() => {}));
    render(<App />);
    expect(screen.getByText(/Loading graph data.../i)).toBeInTheDocument();
  });

  it('renders GraphView after successful data load', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.queryByText(/Loading graph data.../i)).not.toBeInTheDocument();
    });
    
    expect(screen.getByTestId('graph-view')).toBeInTheDocument();
    expect(screen.getByTestId('node-count')).toHaveTextContent('1');
  });

  it('handles API errors gracefully', async () => {
    mockApiService.fetchTraversalData.mockRejectedValue(new Error('API Error'));
    
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText(/Error: Failed to load initial graph data/i)).toBeInTheDocument();
    });
  });

  it('handles node expansion', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByTestId('graph-view')).toBeInTheDocument();
    });

    // Mock expansion data
    mockApiService.fetchTraversalData.mockResolvedValueOnce({
      queryNode: [mockNodes[1]]
    });
    mockGraphUtils.transformTraversalData.mockReturnValueOnce({
      nodes: [mockNodes[1]],
      edges: []
    });

    act(() => {
      screen.getByTestId('expand-trigger').click();
    });

    await waitFor(() => {
      expect(mockApiService.fetchTraversalData).toHaveBeenCalledWith('test-node', expect.any(String));
    });
  });

  it('handles complete graph loading', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByTestId('graph-view')).toBeInTheDocument();
    });

    // Mock complete graph data
    mockApiService.fetchAllNodeIds.mockResolvedValueOnce(['node1', 'node2']);
    mockApiService.fetchTraversalData.mockResolvedValue({
      queryNode: [mockNodes[0]]
    });
    mockGraphUtils.transformTraversalData.mockReturnValue({
      nodes: mockNodes.slice(0, 2),
      edges: mockEdges
    });

    act(() => {
      screen.getByTestId('load-complete-trigger').click();
    });

    await waitFor(() => {
      expect(mockApiService.fetchAllNodeIds).toHaveBeenCalled();
    });
  });

  it('handles node deletion', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByTestId('graph-view')).toBeInTheDocument();
    });

    mockApiService.executeMutation.mockResolvedValueOnce({});

    act(() => {
      screen.getByTestId('delete-trigger').click();
    });

    await waitFor(() => {
      expect(mockApiService.executeMutation).toHaveBeenCalled();
    });
  });
});
