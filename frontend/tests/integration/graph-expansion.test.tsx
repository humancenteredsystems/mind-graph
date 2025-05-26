import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithUIProvider } from '../helpers/testUtils';
import { mockNodes, mockEdges } from '../helpers/mockData';
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

// Mock Cytoscape with expansion capabilities
const mockCytoscape = vi.fn();
const mockCy = {
  layout: vi.fn().mockReturnValue({ run: vi.fn() }),
  on: vi.fn(),
  off: vi.fn(),
  nodes: vi.fn().mockReturnValue([]),
  edges: vi.fn().mockReturnValue([]),
  add: vi.fn(),
  remove: vi.fn(),
  getElementById: vi.fn()
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
      />
    );
  }
}));

describe('Graph Expansion Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default API responses
    mockApiService.fetchHierarchies.mockResolvedValue([]);
    mockApiService.fetchTraversalData.mockResolvedValue({
      data: { queryNode: mockNodes }
    });
  });

  it('expands node children when expand is triggered', async () => {
    const parentNode = mockNodes[0];
    const childNodes = [mockNodes[1], mockNodes[2]];
    
    // Initial load with parent node
    mockApiService.fetchTraversalData
      .mockResolvedValueOnce({
        data: { queryNode: [parentNode] }
      })
      // Expansion call returns children
      .mockResolvedValueOnce({
        data: { queryNode: childNodes }
      });

    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchTraversalData).toHaveBeenCalledTimes(1);
    });

    // Right-click on parent node
    const nodeElement = screen.getByText(parentNode.label);
    fireEvent.contextMenu(nodeElement);

    // Click "Expand Children"
    const expandButton = screen.getByText('Expand Children');
    fireEvent.click(expandButton);

    // Should fetch children
    await waitFor(() => {
      expect(mockApiService.fetchTraversalData).toHaveBeenCalledWith(
        parentNode.id,
        expect.any(String)
      );
    });

    // Graph should update with new nodes
    await waitFor(() => {
      const elements = JSON.parse(
        screen.getByTestId('cytoscape-component').getAttribute('data-elements') || '[]'
      );
      
      const nodeIds = elements
        .filter((el: any) => !el.data.source)
        .map((el: any) => el.data.id);
      
      expect(nodeIds).toContain(childNodes[0].id);
      expect(nodeIds).toContain(childNodes[1].id);
    });
  });

  it('handles expansion of already expanded nodes', async () => {
    const parentNode = mockNodes[0];
    
    // Parent already has children loaded
    mockApiService.fetchTraversalData.mockResolvedValue({
      data: { 
        queryNode: [
          {
            ...parentNode,
            outgoing: [
              { to: mockNodes[1], type: 'relates_to' },
              { to: mockNodes[2], type: 'contains' }
            ]
          }
        ]
      }
    });

    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchTraversalData).toHaveBeenCalled();
    });

    // Right-click on parent node
    const nodeElement = screen.getByText(parentNode.label);
    fireEvent.contextMenu(nodeElement);

    // Expand button should show "Collapse" or be disabled
    const expandButton = screen.queryByText('Expand Children');
    const collapseButton = screen.queryByText('Collapse Children');
    
    expect(expandButton).toBeNull();
    expect(collapseButton).toBeInTheDocument();
  });

  it('collapses expanded node children', async () => {
    const parentNode = mockNodes[0];
    const childNodes = [mockNodes[1], mockNodes[2]];
    
    // Start with expanded state
    mockApiService.fetchTraversalData.mockResolvedValue({
      data: { 
        queryNode: [
          {
            ...parentNode,
            outgoing: childNodes.map(child => ({ to: child, type: 'relates_to' }))
          }
        ]
      }
    });

    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchTraversalData).toHaveBeenCalled();
    });

    // Verify children are visible
    expect(screen.getByText(childNodes[0].label)).toBeInTheDocument();
    expect(screen.getByText(childNodes[1].label)).toBeInTheDocument();

    // Right-click on parent node
    const nodeElement = screen.getByText(parentNode.label);
    fireEvent.contextMenu(nodeElement);

    // Click "Collapse Children"
    const collapseButton = screen.getByText('Collapse Children');
    fireEvent.click(collapseButton);

    // Children should be removed from graph
    await waitFor(() => {
      expect(screen.queryByText(childNodes[0].label)).not.toBeInTheDocument();
      expect(screen.queryByText(childNodes[1].label)).not.toBeInTheDocument();
    });
  });

  it('expands multiple levels of hierarchy', async () => {
    const rootNode = mockNodes[0];
    const level1Node = mockNodes[1];
    const level2Node = mockNodes[2];
    
    // Initial load
    mockApiService.fetchTraversalData
      .mockResolvedValueOnce({
        data: { queryNode: [rootNode] }
      })
      // First expansion
      .mockResolvedValueOnce({
        data: { queryNode: [level1Node] }
      })
      // Second expansion
      .mockResolvedValueOnce({
        data: { queryNode: [level2Node] }
      });

    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchTraversalData).toHaveBeenCalledTimes(1);
    });

    // Expand root node
    fireEvent.contextMenu(screen.getByText(rootNode.label));
    fireEvent.click(screen.getByText('Expand Children'));

    await waitFor(() => {
      expect(screen.getByText(level1Node.label)).toBeInTheDocument();
    });

    // Expand level 1 node
    fireEvent.contextMenu(screen.getByText(level1Node.label));
    fireEvent.click(screen.getByText('Expand Children'));

    await waitFor(() => {
      expect(screen.getByText(level2Node.label)).toBeInTheDocument();
    });

    // All three levels should be visible
    expect(screen.getByText(rootNode.label)).toBeInTheDocument();
    expect(screen.getByText(level1Node.label)).toBeInTheDocument();
    expect(screen.getByText(level2Node.label)).toBeInTheDocument();
  });

  it('handles expansion errors gracefully', async () => {
    const parentNode = mockNodes[0];
    
    mockApiService.fetchTraversalData
      .mockResolvedValueOnce({
        data: { queryNode: [parentNode] }
      })
      .mockRejectedValueOnce(new Error('Network error'));

    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchTraversalData).toHaveBeenCalledTimes(1);
    });

    // Try to expand
    fireEvent.contextMenu(screen.getByText(parentNode.label));
    fireEvent.click(screen.getByText('Expand Children'));

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/failed to expand/i)).toBeInTheDocument();
    });

    // Original node should still be visible
    expect(screen.getByText(parentNode.label)).toBeInTheDocument();
  });

  it('shows loading state during expansion', async () => {
    const parentNode = mockNodes[0];
    
    mockApiService.fetchTraversalData
      .mockResolvedValueOnce({
        data: { queryNode: [parentNode] }
      })
      .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchTraversalData).toHaveBeenCalledTimes(1);
    });

    // Trigger expansion
    fireEvent.contextMenu(screen.getByText(parentNode.label));
    fireEvent.click(screen.getByText('Expand Children'));

    // Should show loading indicator
    expect(screen.getByText(/expanding/i)).toBeInTheDocument();
  });

  it('prevents duplicate expansions', async () => {
    const parentNode = mockNodes[0];
    
    mockApiService.fetchTraversalData
      .mockResolvedValueOnce({
        data: { queryNode: [parentNode] }
      })
      .mockImplementation(() => new Promise(resolve => 
        setTimeout(() => resolve({ data: { queryNode: [mockNodes[1]] } }), 100)
      ));

    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchTraversalData).toHaveBeenCalledTimes(1);
    });

    // Trigger expansion twice quickly
    fireEvent.contextMenu(screen.getByText(parentNode.label));
    fireEvent.click(screen.getByText('Expand Children'));
    
    fireEvent.contextMenu(screen.getByText(parentNode.label));
    const expandButton = screen.queryByText('Expand Children');
    
    // Second expand should be disabled or not available
    expect(expandButton).toBeNull();
  });

  it('updates node expansion state in context menu', async () => {
    const parentNode = mockNodes[0];
    const childNode = mockNodes[1];
    
    mockApiService.fetchTraversalData
      .mockResolvedValueOnce({
        data: { queryNode: [parentNode] }
      })
      .mockResolvedValueOnce({
        data: { queryNode: [childNode] }
      });

    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchTraversalData).toHaveBeenCalledTimes(1);
    });

    // Initially should show "Expand Children"
    fireEvent.contextMenu(screen.getByText(parentNode.label));
    expect(screen.getByText('Expand Children')).toBeInTheDocument();
    expect(screen.queryByText('Collapse Children')).not.toBeInTheDocument();

    // Expand the node
    fireEvent.click(screen.getByText('Expand Children'));

    await waitFor(() => {
      expect(screen.getByText(childNode.label)).toBeInTheDocument();
    });

    // Now should show "Collapse Children"
    fireEvent.contextMenu(screen.getByText(parentNode.label));
    expect(screen.queryByText('Expand Children')).not.toBeInTheDocument();
    expect(screen.getByText('Collapse Children')).toBeInTheDocument();
  });

  it('maintains hierarchy context during expansion', async () => {
    const parentNode = mockNodes[0];
    const childNode = mockNodes[1];
    const hierarchyId = 'test-hierarchy';
    
    mockApiService.fetchTraversalData
      .mockResolvedValueOnce({
        data: { queryNode: [parentNode] }
      })
      .mockResolvedValueOnce({
        data: { queryNode: [childNode] }
      });

    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchTraversalData).toHaveBeenCalledTimes(1);
    });

    // Expand node
    fireEvent.contextMenu(screen.getByText(parentNode.label));
    fireEvent.click(screen.getByText('Expand Children'));

    // Should pass hierarchy context to API call
    await waitFor(() => {
      expect(mockApiService.fetchTraversalData).toHaveBeenCalledWith(
        parentNode.id,
        expect.any(String) // hierarchy ID
      );
    });
  });

  it('handles nodes with no children', async () => {
    const leafNode = mockNodes[0];
    
    mockApiService.fetchTraversalData
      .mockResolvedValueOnce({
        data: { queryNode: [leafNode] }
      })
      .mockResolvedValueOnce({
        data: { queryNode: [] } // No children
      });

    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchTraversalData).toHaveBeenCalledTimes(1);
    });

    // Try to expand
    fireEvent.contextMenu(screen.getByText(leafNode.label));
    fireEvent.click(screen.getByText('Expand Children'));

    // Should show message about no children
    await waitFor(() => {
      expect(screen.getByText(/no children found/i)).toBeInTheDocument();
    });

    // Context menu should update to reflect no children
    fireEvent.contextMenu(screen.getByText(leafNode.label));
    expect(screen.queryByText('Expand Children')).not.toBeInTheDocument();
  });
});
