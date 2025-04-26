// Test file for App.tsx
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import App from './App';
import { UIProvider } from './context/UIContext';
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
  const MockGraphViewComponent = vi.fn(({ nodes, edges, onNodeExpand }: { nodes: NodeData[]; edges: EdgeData[]; onNodeExpand?: (id: string) => void }) => {
    capturedOnNodeExpand = onNodeExpand; // Capture the handler
    return (
      <div data-testid="graph-view">
        <span data-testid="node-count">{nodes.length}</span>
        <span data-testid="edge-count">{edges.length}</span>
        <button data-testid="manual-expand-trigger" onClick={() => capturedOnNodeExpand?.('node-to-expand')} />
      </div>
    );
  });
  return { default: MockGraphViewComponent };
});

describe('App Component', () => {
  const initialNode: NodeData = { id: 'node1', label: 'Node 1', level: 1 };
  const initialNodes = [initialNode];
  const initialEdges: EdgeData[] = [];

  const initialRawData = { queryNode: [initialNode] };
  const initialTransformedData = { nodes: initialNodes, edges: initialEdges };

  const setupInitialLoad = async () => {
    (ApiService.fetchTraversalData as Mock).mockResolvedValueOnce(initialRawData);
    (GraphUtils.transformTraversalData as Mock).mockReturnValueOnce(initialTransformedData);
    render(
      <UIProvider>
        <App />
      </UIProvider>
    );
    await waitFor(() => expect(screen.queryByText(/Loading graph data.../i)).not.toBeInTheDocument());
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    (ApiService.fetchAllNodeIds as Mock).mockResolvedValue(initialNodes.map(n => n.id));
    capturedOnNodeExpand = undefined;
    const GraphViewMock = (await import('./components/GraphView')).default as Mock;
    GraphViewMock.mockClear();
  });

  it('should render loading state initially', () => {
    (ApiService.fetchTraversalData as Mock).mockReturnValue(new Promise(() => {}));
    render(
      <UIProvider>
        <App />
      </UIProvider>
    );
    expect(screen.getByText(/Loading graph data.../i)).toBeInTheDocument();
  });

  it('should call fetchAllNodeIds on mount', async () => {
    (ApiService.fetchAllNodeIds as Mock).mockResolvedValue(['node1']);
    render(
      <UIProvider>
        <App />
      </UIProvider>
    );
    await waitFor(() => expect(screen.queryByText(/Loading graph data.../i)).not.toBeInTheDocument());
    expect(ApiService.fetchAllNodeIds).toHaveBeenCalledTimes(1);
    expect(ApiService.fetchAllNodeIds).toHaveBeenCalledWith();
  });

  it('should render GraphView with initial data on successful fetch', async () => {
    await setupInitialLoad();
    await waitFor(() => {
      expect(screen.getByTestId('node-count').textContent).toBe('1');
      expect(screen.getByTestId('edge-count').textContent).toBe('0');
    });
    const GraphViewMock = (await import('./components/GraphView')).default as Mock;
    const lastArgs = GraphViewMock.mock.calls.slice(-1)[0][0];
    expect(lastArgs.nodes).toEqual(initialNodes);
    expect(lastArgs.edges).toEqual(initialEdges);
  });

  it('should render error message on failed initial fetch', async () => {
    const errorMessage = 'Initial Fetch Failed';
    (ApiService.fetchTraversalData as Mock).mockRejectedValueOnce(new Error(errorMessage));
    render(
      <UIProvider>
        <App />
      </UIProvider>
    );
    await waitFor(() => expect(screen.getByText(/Error: Failed to load initial graph data/i)).toBeInTheDocument());
  });

  describe('handleNodeExpand', () => {
    const nodeToExpandId = 'node1';
    const newNode: NodeData = { id: 'node2', label: 'Node 2', level: 2 };
    const newEdge: EdgeData = { source: nodeToExpandId, target: 'node2', type: 'connects_to' };
    const expansionRawData = { queryNode: [{ ...initialNode, outgoing: [{ type: 'connects_to', to: newNode }] }] };
    const expansionTransformedData = { nodes: [initialNode, newNode], edges: [newEdge] };

    it('should fetch, transform, and add unique nodes/edges on expand', async () => {
      await setupInitialLoad();
      (ApiService.fetchTraversalData as Mock).mockResolvedValueOnce(expansionRawData);
      (GraphUtils.transformTraversalData as Mock).mockReturnValueOnce(expansionTransformedData);
      expect(capturedOnNodeExpand).toBeDefined();
      await act(async () => capturedOnNodeExpand!(nodeToExpandId));
      expect(ApiService.fetchTraversalData).toHaveBeenCalledTimes(2);
      expect(ApiService.fetchTraversalData).toHaveBeenLastCalledWith(nodeToExpandId, 1);
      await waitFor(() => expect(screen.queryByText(/Loading graph data.../i)).not.toBeInTheDocument());
      await waitFor(() => {
        expect(screen.getByTestId('node-count').textContent).toBe('2');
        expect(screen.getByTestId('edge-count').textContent).toBe('1');
      });
    });

    it('should not add nodes/edges if API returns existing only', async () => {
      await setupInitialLoad();
      const existingRaw = { queryNode: [initialNode] };
      const existingTrans = { nodes: [initialNode], edges: [] };
      (ApiService.fetchTraversalData as Mock).mockResolvedValueOnce(existingRaw);
      (GraphUtils.transformTraversalData as Mock).mockReturnValueOnce(existingTrans);
      await act(async () => capturedOnNodeExpand!(nodeToExpandId));
      await waitFor(() => expect(screen.queryByText(/Loading graph data.../i)).not.toBeInTheDocument());
      expect(screen.getByTestId('node-count').textContent).toBe('1');
      expect(screen.getByTestId('edge-count').textContent).toBe('0');
    });

    it('should display error if expansion fetch fails', async () => {
      await setupInitialLoad();
      (ApiService.fetchTraversalData as Mock).mockRejectedValueOnce(new Error('ExpFail'));
      await act(async () => capturedOnNodeExpand!(nodeToExpandId));
      await waitFor(() => expect(screen.getByText(/Error: Failed to expand node/i)).toBeInTheDocument());
      expect(screen.getByTestId('node-count').textContent).toBe('1');
      expect(screen.getByTestId('edge-count').textContent).toBe('0');
    });

    it('should handle loading state during expansion', async () => {
      await setupInitialLoad();
      const delayed = new Promise(resolve => setTimeout(() => resolve(expansionRawData), 50));
      (ApiService.fetchTraversalData as Mock).mockReturnValueOnce(delayed);
      (GraphUtils.transformTraversalData as Mock).mockReturnValueOnce(expansionTransformedData);
      act(() => capturedOnNodeExpand!(nodeToExpandId));
      expect(screen.getByText(/Loading graph data.../i)).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByText(/Loading graph data.../i)).not.toBeInTheDocument());
    });
  });
});
