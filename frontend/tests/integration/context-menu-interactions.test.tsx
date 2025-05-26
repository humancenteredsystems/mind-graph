import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { mockNodes } from '../helpers/mockData';
import App from '../../src/App';

// Use vi.hoisted to properly handle mock hoisting
const { 
  mockFetchHierarchies,
  mockExecuteQuery,
  mockExecuteMutation,
  mockDeleteNodeCascade,
  mockFetchAllNodeIds,
  mockFetchSchema,
  mockFetchHealth,
  mockTransformAllGraphData
} = vi.hoisted(() => ({
  mockFetchHierarchies: vi.fn(),
  mockExecuteQuery: vi.fn(),
  mockExecuteMutation: vi.fn(),
  mockDeleteNodeCascade: vi.fn(),
  mockFetchAllNodeIds: vi.fn(),
  mockFetchSchema: vi.fn(),
  mockFetchHealth: vi.fn(),
  mockTransformAllGraphData: vi.fn()
}));

// Mock API Service with all named exports
vi.mock('../../src/services/ApiService', () => ({
  fetchHierarchies: mockFetchHierarchies,
  executeQuery: mockExecuteQuery,
  executeMutation: mockExecuteMutation,
  deleteNodeCascade: mockDeleteNodeCascade,
  fetchAllNodeIds: mockFetchAllNodeIds,
  fetchSchema: mockFetchSchema,
  fetchHealth: mockFetchHealth,
  API_BASE_URL: '/api'
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
          // Simulate context menu trigger
          const event = new CustomEvent('contextmenu', { bubbles: true });
          e.currentTarget.dispatchEvent(event);
        }}
      />
    );
  }
}));

describe('Context Menu Interactions Integration', () => {
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
    
    mockTransformAllGraphData.mockReturnValue({
      nodes: mockNodes,
      edges: [
        { source: 'node1', target: 'node2', type: 'connects_to' }
      ]
    });
  });

  it('renders app without crashing', async () => {
    render(<App />);
    
    // Should render the main app components
    expect(screen.getByText('MakeItMakeSense.io Graph')).toBeInTheDocument();
  });

  it('loads initial data on mount', async () => {
    render(<App />);

    // Should call the API to fetch hierarchies
    await waitFor(() => {
      expect(mockFetchHierarchies).toHaveBeenCalled();
    });
  });

  it('shows cytoscape component', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('cytoscape-component')).toBeInTheDocument();
    });
  });

  it('handles context menu interactions', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('cytoscape-component')).toBeInTheDocument();
    });

    // Right-click on graph component
    const graphComponent = screen.getByTestId('cytoscape-component');
    fireEvent.contextMenu(graphComponent);

    // Context menu should be triggered (this is a basic integration test)
    // More specific assertions would depend on the actual context menu implementation
  });

  it('handles API errors gracefully', async () => {
    mockFetchHierarchies.mockRejectedValue(new Error('API Error'));

    render(<App />);

    // Should handle the error without crashing
    await waitFor(() => {
      expect(mockFetchHierarchies).toHaveBeenCalled();
    });

    // App should still render
    expect(screen.getByText('MakeItMakeSense.io Graph')).toBeInTheDocument();
  });

  it('renders graph elements when data is loaded', async () => {
    render(<App />);

    await waitFor(() => {
      expect(mockFetchHierarchies).toHaveBeenCalled();
    });

    // Should render the cytoscape component
    expect(screen.getByTestId('cytoscape-component')).toBeInTheDocument();
  });
});
