// Test file for App.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import * as ApiService from './services/ApiService';
import * as GraphUtils from './utils/graphUtils';

// Mock the ApiService and GraphUtils modules
vi.mock('./services/ApiService');
vi.mock('./utils/graphUtils');
// Mock the GraphView component as it involves complex rendering (Cytoscape)
vi.mock('./components/GraphView', () => ({
  // Default export needs to be a function component
  default: ({ nodes, edges }: { nodes: any[], edges: any[] }) => (
    <div data-testid="graph-view">
      {/* Render something simple to check props */}
      <span data-testid="node-count">{nodes.length}</span>
      <span data-testid="edge-count">{edges.length}</span>
    </div>
  )
}));


describe('App Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();
  });

  it('should render loading state initially', () => {
    // Mock API call to stay pending
    (ApiService.fetchTraversalData as any).mockReturnValue(new Promise(() => {}));
    render(<App />);
    expect(screen.getByText(/Loading graph.../i)).toBeInTheDocument();
  });

  it('should call fetchTraversalData and transformTraversalData on mount', async () => {
    const mockRawData = { queryNode: [{ id: 'node1' }] };
    const mockTransformedData = { nodes: [{ id: 'node1', label: 'Node 1' }], edges: [] };

    (ApiService.fetchTraversalData as any).mockResolvedValue(mockRawData);
    (GraphUtils.transformTraversalData as any).mockReturnValue(mockTransformedData);

    render(<App />);

    // Wait for the loading state to disappear
    await waitFor(() => expect(screen.queryByText(/Loading graph.../i)).not.toBeInTheDocument());

    // Check if API and transform functions were called
    expect(ApiService.fetchTraversalData).toHaveBeenCalledTimes(1);
    // Check arguments if needed, e.g., expect(ApiService.fetchTraversalData).toHaveBeenCalledWith("node1", 3);
    expect(GraphUtils.transformTraversalData).toHaveBeenCalledWith(mockRawData);
  });

   it('should render GraphView with transformed data on successful fetch', async () => {
    const mockRawData = { queryNode: [{ id: 'node1' }] };
    const mockTransformedData = { nodes: [{ id: 'node1', label: 'Node 1' }], edges: [] };

    (ApiService.fetchTraversalData as any).mockResolvedValue(mockRawData);
    (GraphUtils.transformTraversalData as any).mockReturnValue(mockTransformedData);

    render(<App />);

    // Wait for GraphView mock to appear
    await waitFor(() => expect(screen.getByTestId('graph-view')).toBeInTheDocument());

    // Check if GraphView received the correct number of nodes/edges (based on mock)
    expect(screen.getByTestId('node-count').textContent).toBe(String(mockTransformedData.nodes.length));
    expect(screen.getByTestId('edge-count').textContent).toBe(String(mockTransformedData.edges.length));
  });

  it('should render error message on failed fetch', async () => {
    const errorMessage = 'Failed to fetch';
    (ApiService.fetchTraversalData as any).mockRejectedValue(new Error(errorMessage));

    render(<App />);

    // Wait for the error message to appear
    await waitFor(() => expect(screen.getByText(/Error: Failed to load graph data/i)).toBeInTheDocument());

    // Ensure loading text is gone and graph view is not rendered
    expect(screen.queryByText(/Loading graph.../i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('graph-view')).not.toBeInTheDocument();
  });

});
