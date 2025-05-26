import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithUIProvider } from '../helpers/testUtils';
import { mockNodes, mockHierarchies } from '../helpers/mockData';
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

// Mock Cytoscape
vi.mock('react-cytoscapejs', () => ({
  default: ({ elements, cy }: { elements: any[]; cy?: any }) => {
    if (typeof cy === 'function') {
      const mockCy = {
        layout: vi.fn().mockReturnValue({ run: vi.fn() }),
        on: vi.fn(),
        off: vi.fn(),
        nodes: vi.fn().mockReturnValue([]),
        edges: vi.fn().mockReturnValue([])
      };
      cy(mockCy);
    }
    return (
      <div 
        data-testid="cytoscape-component" 
        data-elements={JSON.stringify(elements)}
      />
    );
  }
}));

describe('Hierarchy Node Creation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default API responses
    mockApiService.fetchHierarchies.mockResolvedValue(mockHierarchies);
    mockApiService.fetchTraversalData.mockResolvedValue({
      data: { queryNode: [] }
    });
    mockApiService.addNode.mockResolvedValue({
      addNode: {
        node: [{
          id: 'new-node-id',
          label: 'New Node',
          type: 'ConceptNode'
        }]
      }
    });
  });

  it('creates node with correct hierarchy assignment', async () => {
    renderWithUIProvider(<App />);

    // Wait for hierarchies to load
    await waitFor(() => {
      expect(mockApiService.fetchHierarchies).toHaveBeenCalled();
    });

    // Right-click to open context menu
    const graphComponent = screen.getByTestId('cytoscape-component');
    fireEvent.contextMenu(graphComponent);

    // Click "Add Node"
    const addNodeButton = screen.getByText('Add Node');
    fireEvent.click(addNodeButton);

    // Fill out the form
    const labelInput = screen.getByLabelText(/label/i);
    const typeSelect = screen.getByLabelText(/type/i);
    const hierarchySelect = screen.getByLabelText(/hierarchy/i);
    const levelSelect = screen.getByLabelText(/level/i);

    fireEvent.change(labelInput, { target: { value: 'Test Node' } });
    fireEvent.change(typeSelect, { target: { value: 'ConceptNode' } });
    fireEvent.change(hierarchySelect, { target: { value: mockHierarchies[0].id } });
    fireEvent.change(levelSelect, { target: { value: 'level-1' } });

    // Submit the form
    const submitButton = screen.getByText('Save');
    fireEvent.click(submitButton);

    // Verify API call with hierarchy assignment
    await waitFor(() => {
      expect(mockApiService.addNode).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'Test Node',
          type: 'ConceptNode',
          hierarchyAssignments: expect.arrayContaining([
            expect.objectContaining({
              hierarchy: { id: mockHierarchies[0].id },
              level: { id: 'level-1' }
            })
          ])
        }),
        mockHierarchies[0].id
      );
    });
  });

  it('validates hierarchy and level selection', async () => {
    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchHierarchies).toHaveBeenCalled();
    });

    // Open add node modal
    const graphComponent = screen.getByTestId('cytoscape-component');
    fireEvent.contextMenu(graphComponent);
    fireEvent.click(screen.getByText('Add Node'));

    // Try to submit without selecting hierarchy
    const submitButton = screen.getByText('Save');
    fireEvent.click(submitButton);

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/hierarchy is required/i)).toBeInTheDocument();
    });

    expect(mockApiService.addNode).not.toHaveBeenCalled();
  });

  it('updates level options when hierarchy changes', async () => {
    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchHierarchies).toHaveBeenCalled();
    });

    // Open add node modal
    const graphComponent = screen.getByTestId('cytoscape-component');
    fireEvent.contextMenu(graphComponent);
    fireEvent.click(screen.getByText('Add Node'));

    const hierarchySelect = screen.getByLabelText(/hierarchy/i);
    const levelSelect = screen.getByLabelText(/level/i);

    // Change hierarchy
    fireEvent.change(hierarchySelect, { target: { value: mockHierarchies[1].id } });

    // Level options should update
    await waitFor(() => {
      const levelOptions = screen.getAllByRole('option');
      const levelOptionValues = levelOptions.map(option => option.getAttribute('value'));
      expect(levelOptionValues).toContain('level-2-1');
    });
  });

  it('creates connected node with parent relationship', async () => {
    // Setup existing node
    mockApiService.fetchTraversalData.mockResolvedValue({
      data: { queryNode: [mockNodes[0]] }
    });

    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchHierarchies).toHaveBeenCalled();
    });

    // Right-click on existing node
    const nodeElement = screen.getByText(mockNodes[0].label);
    fireEvent.contextMenu(nodeElement);

    // Click "Add Connected Node"
    const addConnectedButton = screen.getByText('Add Connected Node');
    fireEvent.click(addConnectedButton);

    // Fill out form
    const labelInput = screen.getByLabelText(/label/i);
    fireEvent.change(labelInput, { target: { value: 'Connected Node' } });

    // Submit
    const submitButton = screen.getByText('Save');
    fireEvent.click(submitButton);

    // Verify node creation with parent connection
    await waitFor(() => {
      expect(mockApiService.addNode).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'Connected Node',
          parentId: mockNodes[0].id
        }),
        expect.any(String)
      );
    });
  });

  it('handles hierarchy context switching', async () => {
    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchHierarchies).toHaveBeenCalled();
    });

    // Switch hierarchy in header
    const hierarchySelector = screen.getByLabelText(/hierarchy/i);
    fireEvent.change(hierarchySelector, { target: { value: mockHierarchies[1].id } });

    // Open add node modal
    const graphComponent = screen.getByTestId('cytoscape-component');
    fireEvent.contextMenu(graphComponent);
    fireEvent.click(screen.getByText('Add Node'));

    // Hierarchy should be pre-selected
    const modalHierarchySelect = screen.getByDisplayValue(mockHierarchies[1].name);
    expect(modalHierarchySelect).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    mockApiService.addNode.mockRejectedValue(new Error('API Error'));

    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchHierarchies).toHaveBeenCalled();
    });

    // Open add node modal and submit
    const graphComponent = screen.getByTestId('cytoscape-component');
    fireEvent.contextMenu(graphComponent);
    fireEvent.click(screen.getByText('Add Node'));

    const labelInput = screen.getByLabelText(/label/i);
    fireEvent.change(labelInput, { target: { value: 'Test Node' } });

    const submitButton = screen.getByText('Save');
    fireEvent.click(submitButton);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/failed to create node/i)).toBeInTheDocument();
    });

    // Modal should remain open
    expect(screen.getByText('Add Node')).toBeInTheDocument();
  });

  it('validates node type against level restrictions', async () => {
    // Mock hierarchy with type restrictions
    const restrictedHierarchy = {
      ...mockHierarchies[0],
      levels: [{
        id: 'restricted-level',
        levelNumber: 1,
        label: 'Concepts Only',
        allowedTypes: ['ConceptNode']
      }]
    };

    mockApiService.fetchHierarchies.mockResolvedValue([restrictedHierarchy]);

    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchHierarchies).toHaveBeenCalled();
    });

    // Open add node modal
    const graphComponent = screen.getByTestId('cytoscape-component');
    fireEvent.contextMenu(graphComponent);
    fireEvent.click(screen.getByText('Add Node'));

    // Select restricted level
    const levelSelect = screen.getByLabelText(/level/i);
    fireEvent.change(levelSelect, { target: { value: 'restricted-level' } });

    // Try to select invalid type
    const typeSelect = screen.getByLabelText(/type/i);
    fireEvent.change(typeSelect, { target: { value: 'ExampleNode' } });

    const submitButton = screen.getByText('Save');
    fireEvent.click(submitButton);

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/type not allowed at this level/i)).toBeInTheDocument();
    });

    expect(mockApiService.addNode).not.toHaveBeenCalled();
  });

  it('preserves form state during hierarchy switching', async () => {
    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchHierarchies).toHaveBeenCalled();
    });

    // Open add node modal
    const graphComponent = screen.getByTestId('cytoscape-component');
    fireEvent.contextMenu(graphComponent);
    fireEvent.click(screen.getByText('Add Node'));

    // Fill out label and type
    const labelInput = screen.getByLabelText(/label/i);
    const typeSelect = screen.getByLabelText(/type/i);
    
    fireEvent.change(labelInput, { target: { value: 'Test Node' } });
    fireEvent.change(typeSelect, { target: { value: 'ExampleNode' } });

    // Change hierarchy
    const hierarchySelect = screen.getByLabelText(/hierarchy/i);
    fireEvent.change(hierarchySelect, { target: { value: mockHierarchies[1].id } });

    // Label and type should be preserved
    expect(labelInput).toHaveValue('Test Node');
    expect(typeSelect).toHaveValue('ExampleNode');
  });

  it('updates graph after successful node creation', async () => {
    renderWithUIProvider(<App />);

    await waitFor(() => {
      expect(mockApiService.fetchHierarchies).toHaveBeenCalled();
    });

    // Open add node modal and create node
    const graphComponent = screen.getByTestId('cytoscape-component');
    fireEvent.contextMenu(graphComponent);
    fireEvent.click(screen.getByText('Add Node'));

    const labelInput = screen.getByLabelText(/label/i);
    fireEvent.change(labelInput, { target: { value: 'New Node' } });

    const submitButton = screen.getByText('Save');
    fireEvent.click(submitButton);

    // Wait for node creation
    await waitFor(() => {
      expect(mockApiService.addNode).toHaveBeenCalled();
    });

    // Graph should be updated with new node
    await waitFor(() => {
      const updatedElements = JSON.parse(
        screen.getByTestId('cytoscape-component').getAttribute('data-elements') || '[]'
      );
      expect(updatedElements).toContainEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            id: 'new-node-id',
            label: 'New Node'
          })
        })
      );
    });
  });
});
