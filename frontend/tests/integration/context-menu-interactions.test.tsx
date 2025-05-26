import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithUIProvider } from '../helpers/testUtils';
import { mockNodes } from '../helpers/mockData';
import App from '../../src/App';

// Mock API Service
const mockApiService = {
  fetchHierarchies: vi.fn(),
  fetchTraversalData: vi.fn(),
  addNode: vi.fn(),
  updateNode: vi.fn(),
  deleteNode: vi.fn()
};

vi.mock('../../src/services/ApiService', () => ({
  default: mockApiService
}));

// Mock Cytoscape with interaction capabilities
const mockCytoscape = vi.fn();
const mockCy = {
  layout: vi.fn().mockReturnValue({ run: vi.fn() }),
  on: vi.fn(),
  off: vi.fn(),
  nodes: vi.fn().mockReturnValue([]),
  edges: vi.fn().mockReturnValue([])
};

vi.mock('react-cytoscapejs', () => ({
  default: ({ elements, cy }: { elements: any[]; cy?: any }) => {
    if (typeof cy === 'function') {
      cy(mockCy);
    }
    mockCytoscape({ elements, cy });
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
    mockApiService.fetchHierarchies.mockResolvedValue([]);
    mockApiService.fetchTraversalData.mockResolvedValue({
      data: { queryNode: mockNodes }
    });
  });

  it('shows background context menu on graph right-click', async () => {
    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchTraversalData).toHaveBeenCalled();
    });

    // Right-click on graph background
    const graphComponent = screen.getByTestId('cytoscape-component');
    fireEvent.contextMenu(graphComponent);

    // Should show background context menu
    expect(screen.getByText('Add Node')).toBeInTheDocument();
    expect(screen.getByText('Load Complete Graph')).toBeInTheDocument();
    expect(screen.getByText('Clear Graph')).toBeInTheDocument();
  });

  it('shows node context menu on node right-click', async () => {
    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchTraversalData).toHaveBeenCalled();
    });

    // Right-click on a node
    const nodeElement = screen.getByText(mockNodes[0].label);
    fireEvent.contextMenu(nodeElement);

    // Should show node context menu
    expect(screen.getByText('Add Connected Node')).toBeInTheDocument();
    expect(screen.getByText('Edit Node')).toBeInTheDocument();
    expect(screen.getByText('Delete Node')).toBeInTheDocument();
  });

  it('hides context menu when clicking elsewhere', async () => {
    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchTraversalData).toHaveBeenCalled();
    });

    // Show context menu
    const graphComponent = screen.getByTestId('cytoscape-component');
    fireEvent.contextMenu(graphComponent);

    expect(screen.getByText('Add Node')).toBeInTheDocument();

    // Click elsewhere
    fireEvent.mouseDown(document.body);

    // Context menu should be hidden
    expect(screen.queryByText('Add Node')).not.toBeInTheDocument();
  });

  it('opens add node modal from background context menu', async () => {
    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchTraversalData).toHaveBeenCalled();
    });

    // Right-click and select Add Node
    const graphComponent = screen.getByTestId('cytoscape-component');
    fireEvent.contextMenu(graphComponent);
    fireEvent.click(screen.getByText('Add Node'));

    // Should open add node modal
    expect(screen.getByText('Add Node')).toBeInTheDocument();
    expect(screen.getByLabelText(/label/i)).toBeInTheDocument();
  });

  it('opens add connected node modal from node context menu', async () => {
    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchTraversalData).toHaveBeenCalled();
    });

    // Right-click on node and select Add Connected Node
    const nodeElement = screen.getByText(mockNodes[0].label);
    fireEvent.contextMenu(nodeElement);
    fireEvent.click(screen.getByText('Add Connected Node'));

    // Should open add node modal with parent context
    expect(screen.getByText('Add Connected Node')).toBeInTheDocument();
    expect(screen.getByLabelText(/label/i)).toBeInTheDocument();
  });

  it('opens edit drawer from node context menu', async () => {
    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchTraversalData).toHaveBeenCalled();
    });

    // Right-click on node and select Edit Node
    const nodeElement = screen.getByText(mockNodes[0].label);
    fireEvent.contextMenu(nodeElement);
    fireEvent.click(screen.getByText('Edit Node'));

    // Should open edit drawer
    expect(screen.getByText(`Node: ${mockNodes[0].label}`)).toBeInTheDocument();
  });

  it('deletes node from context menu', async () => {
    mockApiService.deleteNode.mockResolvedValue({ success: true });

    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchTraversalData).toHaveBeenCalled();
    });

    // Right-click on node and select Delete Node
    const nodeElement = screen.getByText(mockNodes[0].label);
    fireEvent.contextMenu(nodeElement);
    fireEvent.click(screen.getByText('Delete Node'));

    // Should call delete API
    await waitFor(() => {
      expect(mockApiService.deleteNode).toHaveBeenCalledWith(mockNodes[0].id);
    });
  });

  it('loads complete graph from context menu', async () => {
    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchTraversalData).toHaveBeenCalled();
    });

    // Right-click and select Load Complete Graph
    const graphComponent = screen.getByTestId('cytoscape-component');
    fireEvent.contextMenu(graphComponent);
    fireEvent.click(screen.getByText('Load Complete Graph'));

    // Should trigger graph reload
    await waitFor(() => {
      expect(mockApiService.fetchTraversalData).toHaveBeenCalledTimes(2);
    });
  });

  it('clears graph from context menu', async () => {
    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchTraversalData).toHaveBeenCalled();
    });

    // Right-click and select Clear Graph
    const graphComponent = screen.getByTestId('cytoscape-component');
    fireEvent.contextMenu(graphComponent);
    fireEvent.click(screen.getByText('Clear Graph'));

    // Should clear the graph
    await waitFor(() => {
      const elements = JSON.parse(
        screen.getByTestId('cytoscape-component').getAttribute('data-elements') || '[]'
      );
      expect(elements).toHaveLength(0);
    });
  });

  it('handles multiple node selection context menu', async () => {
    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchTraversalData).toHaveBeenCalled();
    });

    // Simulate multiple node selection (this would typically be done via Cytoscape)
    // For testing purposes, we'll mock the selection state
    const multipleNodes = [mockNodes[0], mockNodes[1]];
    
    // Right-click with multiple nodes selected
    const nodeElement = screen.getByText(mockNodes[0].label);
    fireEvent.contextMenu(nodeElement, { 
      detail: { selectedNodes: multipleNodes }
    });

    // Should show multi-node context menu
    expect(screen.getByText('Delete Nodes')).toBeInTheDocument();
    expect(screen.queryByText('Edit Node')).not.toBeInTheDocument();
  });

  it('positions context menu correctly', async () => {
    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchTraversalData).toHaveBeenCalled();
    });

    // Right-click at specific position
    const graphComponent = screen.getByTestId('cytoscape-component');
    fireEvent.contextMenu(graphComponent, {
      clientX: 200,
      clientY: 150
    });

    // Context menu should be positioned near click location
    const contextMenu = screen.getByRole('menu');
    expect(contextMenu).toHaveStyle({
      position: 'fixed'
    });
  });

  it('handles context menu keyboard navigation', async () => {
    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchTraversalData).toHaveBeenCalled();
    });

    // Show context menu
    const graphComponent = screen.getByTestId('cytoscape-component');
    fireEvent.contextMenu(graphComponent);

    // Navigate with arrow keys
    const firstItem = screen.getByText('Add Node');
    firstItem.focus();

    fireEvent.keyDown(firstItem, { key: 'ArrowDown' });
    
    const secondItem = screen.getByText('Load Complete Graph');
    expect(document.activeElement).toBe(secondItem);

    // Activate with Enter
    fireEvent.keyDown(secondItem, { key: 'Enter' });

    // Should trigger the action
    await waitFor(() => {
      expect(mockApiService.fetchTraversalData).toHaveBeenCalledTimes(2);
    });
  });

  it('closes context menu with Escape key', async () => {
    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchTraversalData).toHaveBeenCalled();
    });

    // Show context menu
    const graphComponent = screen.getByTestId('cytoscape-component');
    fireEvent.contextMenu(graphComponent);

    expect(screen.getByText('Add Node')).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(document, { key: 'Escape' });

    // Context menu should be hidden
    expect(screen.queryByText('Add Node')).not.toBeInTheDocument();
  });

  it('prevents default browser context menu', async () => {
    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchTraversalData).toHaveBeenCalled();
    });

    // Right-click should prevent default browser context menu
    const graphComponent = screen.getByTestId('cytoscape-component');
    const contextMenuEvent = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true
    });

    const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault');
    
    graphComponent.dispatchEvent(contextMenuEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('handles context menu state across different interactions', async () => {
    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchTraversalData).toHaveBeenCalled();
    });

    // Show background context menu
    const graphComponent = screen.getByTestId('cytoscape-component');
    fireEvent.contextMenu(graphComponent);
    expect(screen.getByText('Add Node')).toBeInTheDocument();

    // Click elsewhere to hide
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('Add Node')).not.toBeInTheDocument();

    // Show node context menu
    const nodeElement = screen.getByText(mockNodes[0].label);
    fireEvent.contextMenu(nodeElement);
    expect(screen.getByText('Edit Node')).toBeInTheDocument();

    // Should not show background menu items
    expect(screen.queryByText('Load Complete Graph')).not.toBeInTheDocument();
  });

  it('handles context menu with loading states', async () => {
    // Mock slow API response
    mockApiService.deleteNode.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchTraversalData).toHaveBeenCalled();
    });

    // Delete node
    const nodeElement = screen.getByText(mockNodes[0].label);
    fireEvent.contextMenu(nodeElement);
    fireEvent.click(screen.getByText('Delete Node'));

    // Should show loading state
    expect(screen.getByText(/deleting/i)).toBeInTheDocument();

    // Context menu should be hidden during operation
    expect(screen.queryByText('Edit Node')).not.toBeInTheDocument();
  });

  it('handles context menu errors gracefully', async () => {
    mockApiService.deleteNode.mockRejectedValue(new Error('Delete failed'));

    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchTraversalData).toHaveBeenCalled();
    });

    // Try to delete node
    const nodeElement = screen.getByText(mockNodes[0].label);
    fireEvent.contextMenu(nodeElement);
    fireEvent.click(screen.getByText('Delete Node'));

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/failed to delete/i)).toBeInTheDocument();
    });

    // Node should still be visible
    expect(screen.getByText(mockNodes[0].label)).toBeInTheDocument();
  });
});
