// Test file for App.tsx
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import App from './App';
import * as ApiService from './services/ApiService';
import * as GraphUtils from './utils/graphUtils';
import { NodeData, EdgeData } from './types/graph'; // Import types

// Mock the ApiService and GraphUtils modules
vi.mock('./services/ApiService');
vi.mock('./utils/graphUtils');

// Keep variable accessible to tests
let capturedOnNodeExpand: ((nodeId: string) => void) | undefined;

// Define the mock *inside* the factory function
vi.mock('./components/GraphView', () => {
  // Define the mock component function within the factory scope
  const MockGraphViewComponent = vi.fn(({ nodes, edges, onNodeExpand }: { nodes: NodeData[], edges: EdgeData[], onNodeExpand?: (id: string) => void }) => {
    capturedOnNodeExpand = onNodeExpand; // Capture the handler
    return (
      <div data-testid="graph-view">
        <span data-testid="node-count">{nodes.length}</span>
        <span data-testid="edge-count">{edges.length}</span>
        {/* Add a way to manually trigger expand for testing */}
        <button data-testid="manual-expand-trigger" onClick={() => capturedOnNodeExpand?.('node-to-expand')}></button>
      </div>
    );
  });
  // The factory must return the object with the default export
  return { default: MockGraphViewComponent };
});


describe('App Component', () => {
  // Define mock data structures used across tests
  const initialNode: NodeData = { id: 'node1', label: 'Node 1', level: 1 };
  const initialNodes = [initialNode];
  const initialEdges: EdgeData[] = []; // Start with no edges initially for simplicity

  const initialRawData = { queryNode: [initialNode] }; // Mock raw API response for initial load
  const initialTransformedData = { nodes: initialNodes, edges: initialEdges };

  // Helper function to setup initial render and wait for load
  const setupInitialLoad = async () => {
    (ApiService.fetchTraversalData as Mock).mockResolvedValueOnce(initialRawData);
    (GraphUtils.transformTraversalData as Mock).mockReturnValueOnce(initialTransformedData);
    render(<App />);
    await waitFor(() => expect(screen.queryByText(/Loading graph data.../i)).not.toBeInTheDocument());
    // Don't clear mock here, let beforeEach handle it
  };

  beforeEach(async () => { // Make beforeEach async if needed for await import
    // Reset mocks before each test
    vi.resetAllMocks();
    capturedOnNodeExpand = undefined; // Reset captured handler
     // Access the mock component directly via the import after mocking
    const GraphViewMock = (await import('./components/GraphView')).default as Mock;
    GraphViewMock.mockClear(); // Clear calls from previous tests
  });

  // --- Initial Load Tests (Keep existing ones, slightly adapted) ---
  it('should render loading state initially', () => {
    (ApiService.fetchTraversalData as Mock).mockReturnValue(new Promise(() => {})); // Pending promise
    render(<App />);
    expect(screen.getByText(/Loading graph data.../i)).toBeInTheDocument();
  });

  it('should call fetchAllNodeIds on mount', async () => {
    // Mock node ID fetch
    (ApiService.fetchAllNodeIds as Mock).mockResolvedValue(['node1']);
    // loadInitialGraph is called by hook; no need to mock transform here
    render(<App />);
    await waitFor(() => expect(screen.queryByText(/Loading graph data.../i)).not.toBeInTheDocument());

    expect(ApiService.fetchAllNodeIds).toHaveBeenCalledTimes(1);
    expect(ApiService.fetchAllNodeIds).toHaveBeenCalledWith();
  });

  it('should render GraphView with initial data on successful fetch', async () => {
    await setupInitialLoad(); // Use helper

    // Wait for the graph view to be rendered with the correct initial counts
    await waitFor(() => {
      expect(screen.getByTestId('node-count').textContent).toBe(String(initialNodes.length));
      expect(screen.getByTestId('edge-count').textContent).toBe(String(initialEdges.length));
    });

    // Now check the props passed to the mock *after* waiting
    const GraphViewMock = (await import('./components/GraphView')).default as Mock;
    expect(GraphViewMock.mock.calls.length).toBeGreaterThanOrEqual(1); // Ensure it rendered at least once
    const lastCallArgs = GraphViewMock.mock.calls[GraphViewMock.mock.calls.length - 1][0];
    expect(lastCallArgs.nodes).toEqual(initialNodes);
    expect(lastCallArgs.edges).toEqual(initialEdges);
    // Check counts separately after waiting
    expect(screen.getByTestId('node-count').textContent).toBe(String(initialNodes.length));
    expect(screen.getByTestId('edge-count').textContent).toBe(String(initialEdges.length));
  });

  it('should render error message on failed initial fetch', async () => {
    const errorMessage = 'Initial Fetch Failed';
    (ApiService.fetchTraversalData as Mock).mockRejectedValue(new Error(errorMessage));

    render(<App />);
    await waitFor(() => expect(screen.getByText(/Error: Failed to load initial graph data/i)).toBeInTheDocument());

    expect(screen.queryByText(/Loading graph data.../i)).not.toBeInTheDocument();
    // GraphView might still render in error state depending on App logic, check absence of counts if needed
    // expect(screen.queryByTestId('graph-view')).not.toBeInTheDocument();
  });

  // --- Node Expansion Tests ---

  describe('handleNodeExpand', () => {
    const nodeToExpandId = 'node1'; // Use the initial node for expansion tests
    const newNode: NodeData = { id: 'node2', label: 'Node 2', level: 2 };
    const newEdge: EdgeData = { source: nodeToExpandId, target: 'node2', type: 'connects_to' };

    const expansionRawData = { queryNode: [ { ...initialNode, outgoing: [{ type: 'connects_to', to: newNode }] } ] };
    const expansionTransformedData = { nodes: [initialNode, newNode], edges: [newEdge] }; // Simulates transform result for expansion

    it('should fetch data, transform, and add unique nodes/edges on expand', async () => {
      await setupInitialLoad(); // Start with initial node loaded

      // Mock the API call for the expansion
      (ApiService.fetchTraversalData as Mock).mockResolvedValueOnce(expansionRawData);
      // Mock the transform result for the expansion data *including filtering logic simulation*
      // Here we assume transform returns ALL nodes/edges from raw, and App filters
      (GraphUtils.transformTraversalData as Mock).mockReturnValueOnce(expansionTransformedData);

      // Simulate the expand trigger (e.g., right-click in GraphView calling onNodeExpand)
      expect(capturedOnNodeExpand).toBeDefined();
      await act(async () => {
        capturedOnNodeExpand!(nodeToExpandId);
      });

      // Check API call for expansion
      expect(ApiService.fetchTraversalData).toHaveBeenCalledTimes(2); // Initial + Expand
      expect(ApiService.fetchTraversalData).toHaveBeenLastCalledWith(nodeToExpandId, 1);

      // Check transform call for expansion
      expect(GraphUtils.transformTraversalData).toHaveBeenCalledTimes(2); // Initial + Expand
      expect(GraphUtils.transformTraversalData).toHaveBeenLastCalledWith(expansionRawData);

      // Wait for potential loading state during expansion to clear
      await waitFor(() => expect(screen.queryByText(/Loading graph data.../i)).not.toBeInTheDocument());

      // Wait for the node count to update in the DOM
      await waitFor(() => {
        expect(screen.getByTestId('node-count').textContent).toBe('2');
        expect(screen.getByTestId('edge-count').textContent).toBe('1');
      });

      // Now check the props passed in the last render *after* waiting
      const GraphViewMock = (await import('./components/GraphView')).default as Mock;
      expect(GraphViewMock.mock.calls.length).toBeGreaterThanOrEqual(2); // Initial + update
      const finalCallArgs = GraphViewMock.mock.calls[GraphViewMock.mock.calls.length - 1][0];
      expect(finalCallArgs.nodes).toEqual([initialNode, newNode]);
      expect(finalCallArgs.edges).toEqual([newEdge]);

      // Counts already checked in waitFor
      expect(screen.getByTestId('edge-count').textContent).toBe('1');
    });

    it('should not add nodes/edges if API returns only existing ones', async () => {
      await setupInitialLoad(); // Start with initial node loaded

      // Mock API to return data that only contains the initial node
      const existingRawData = { queryNode: [initialNode] }; // No new nodes/edges
      const existingTransformedData = { nodes: [initialNode], edges: [] };
      (ApiService.fetchTraversalData as Mock).mockResolvedValueOnce(existingRawData);
      (GraphUtils.transformTraversalData as Mock).mockReturnValueOnce(existingTransformedData);

      // Simulate expand
      expect(capturedOnNodeExpand).toBeDefined();
      await act(async () => {
        capturedOnNodeExpand!(nodeToExpandId);
      });

      // Wait for loading
      await waitFor(() => expect(screen.queryByText(/Loading graph data.../i)).not.toBeInTheDocument());

      // Wait briefly to ensure no state update happens, then check counts
      await new Promise(r => setTimeout(r, 50));
      expect(screen.getByTestId('node-count').textContent).toBe('1');
      expect(screen.getByTestId('edge-count').textContent).toBe('0');

      // Check props passed in the last render *after* waiting
      const GraphViewMock = (await import('./components/GraphView')).default as Mock;
      expect(GraphViewMock.mock.calls.length).toBeGreaterThanOrEqual(1); // Should have rendered at least initially
      const finalCallArgs = GraphViewMock.mock.calls[GraphViewMock.mock.calls.length - 1][0];
      expect(finalCallArgs.nodes).toEqual(initialNodes);
      expect(finalCallArgs.edges).toEqual(initialEdges);

       // Check counts separately (redundant but safe)
      expect(screen.getByTestId('node-count').textContent).toBe('1');
      expect(screen.getByTestId('edge-count').textContent).toBe('0');
    });

    it('should display an error message if expansion fetch fails', async () => {
      await setupInitialLoad(); // Start with initial node loaded

      const expansionError = 'Expansion Failed';
      (ApiService.fetchTraversalData as Mock).mockRejectedValueOnce(new Error(expansionError));

      // Simulate expand
      expect(capturedOnNodeExpand).toBeDefined();
      await act(async () => {
        capturedOnNodeExpand!(nodeToExpandId);
      });

      // Wait for error message
      await waitFor(() => expect(screen.getByText(/Error: Failed to expand node/i)).toBeInTheDocument());

      // Wait briefly to ensure no state update happens, then check counts
      await new Promise(r => setTimeout(r, 50));
      expect(screen.getByTestId('node-count').textContent).toBe('1');
      expect(screen.getByTestId('edge-count').textContent).toBe('0');

      // Check props passed in the last render *after* waiting
      const GraphViewMock = (await import('./components/GraphView')).default as Mock;
      expect(GraphViewMock.mock.calls.length).toBeGreaterThanOrEqual(1); // Should have rendered at least initially
      const finalCallArgs = GraphViewMock.mock.calls[GraphViewMock.mock.calls.length - 1][0];
      expect(finalCallArgs.nodes).toEqual(initialNodes);
      expect(finalCallArgs.edges).toEqual(initialEdges);

      // Check counts separately (redundant but safe)
      expect(screen.getByTestId('node-count').textContent).toBe('1');
      expect(screen.getByTestId('edge-count').textContent).toBe('0');
    });

     it('should handle loading state during expansion', async () => {
      await setupInitialLoad();

      // Mock API with a slight delay
      const delayedPromise = new Promise(resolve => setTimeout(() => resolve(expansionRawData), 50));
      (ApiService.fetchTraversalData as Mock).mockReturnValueOnce(delayedPromise);
      (GraphUtils.transformTraversalData as Mock).mockReturnValueOnce(expansionTransformedData); // Doesn't matter much here

      // Trigger expand - DO NOT await the act call fully here
      expect(capturedOnNodeExpand).toBeDefined();
      act(() => {
         capturedOnNodeExpand!(nodeToExpandId);
      });

      // Check immediately for loading text
      await waitFor(() => expect(screen.getByText(/Loading graph data.../i)).toBeInTheDocument());

      // Now wait for the loading to complete
      await waitFor(() => expect(screen.queryByText(/Loading graph data.../i)).not.toBeInTheDocument());
    });

  }); // End describe('handleNodeExpand')

}); // End describe('App Component')
