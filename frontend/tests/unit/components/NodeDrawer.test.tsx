import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import NodeDrawer from '../../../src/components/NodeDrawer';
import { renderWithUIProvider } from '../../helpers/testUtils';
import { mockNodes } from '../../helpers/mockData';

// Mock the HierarchyContext
const mockHierarchyContext = {
  hierarchies: [],
  hierarchyId: 'test-hierarchy',
  setHierarchyId: vi.fn(),
  isLoading: false,
  error: null
};

vi.mock('../../../src/context/HierarchyContext', () => ({
  useHierarchyContext: () => mockHierarchyContext
}));

// Mock the graphUtils
const mockResolveNodeHierarchyAssignment = vi.fn(() => ({
  assignment: {
    levelNumber: 1,
    levelLabel: 'Test Level',
    hierarchyName: 'Test Hierarchy'
  }
}));

vi.mock('../../../src/utils/graphUtils', () => ({
  resolveNodeHierarchyAssignment: mockResolveNodeHierarchyAssignment
}));

describe('NodeDrawer Component', () => {
  const mockOnSave = vi.fn();
  const mockOnClose = vi.fn();
  const testNode = mockNodes[0];

  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveNodeHierarchyAssignment.mockReturnValue({
      assignment: {
        levelNumber: 1,
        levelLabel: 'Test Level',
        hierarchyName: 'Test Hierarchy'
      }
    });
  });

  describe('Rendering', () => {
    it('renders when open with node data', () => {
      renderWithUIProvider(
        <NodeDrawer 
          open={true} 
          node={testNode} 
          onSave={mockOnSave} 
          onClose={mockOnClose} 
        />
      );

      expect(screen.getByText(`Node: ${testNode.label}`)).toBeInTheDocument();
      expect(screen.getByDisplayValue(testNode.label)).toBeInTheDocument();
      expect(screen.getByDisplayValue(testNode.type)).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      renderWithUIProvider(
        <NodeDrawer 
          open={false} 
          node={testNode} 
          onSave={mockOnSave} 
          onClose={mockOnClose} 
        />
      );

      expect(screen.queryByText(`Node: ${testNode.label}`)).not.toBeInTheDocument();
    });

    it('does not render when no node provided', () => {
      renderWithUIProvider(
        <NodeDrawer 
          open={true} 
          node={undefined} 
          onSave={mockOnSave} 
          onClose={mockOnClose} 
        />
      );

      expect(screen.queryByText(/Node:/)).not.toBeInTheDocument();
    });

    it('renders with correct node information', () => {
      renderWithUIProvider(
        <NodeDrawer 
          open={true} 
          node={testNode} 
          onSave={mockOnSave} 
          onClose={mockOnClose} 
        />
      );

      // Check that node details are displayed
      expect(screen.getByDisplayValue(testNode.id)).toBeInTheDocument();
      expect(screen.getByDisplayValue(testNode.label)).toBeInTheDocument();
      expect(screen.getByDisplayValue(testNode.type)).toBeInTheDocument();
    });

    it('renders tabs correctly', () => {
      renderWithUIProvider(
        <NodeDrawer 
          open={true} 
          node={testNode} 
          onSave={mockOnSave} 
          onClose={mockOnClose} 
        />
      );

      expect(screen.getByText('Info')).toBeInTheDocument();
      expect(screen.getByText('Links')).toBeInTheDocument();
      expect(screen.getByText('History')).toBeInTheDocument();
    });

    it('shows Info tab content by default', () => {
      renderWithUIProvider(
        <NodeDrawer 
          open={true} 
          node={testNode} 
          onSave={mockOnSave} 
          onClose={mockOnClose} 
        />
      );

      expect(screen.getByDisplayValue(testNode.label)).toBeInTheDocument();
      expect(screen.getByDisplayValue(testNode.type)).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('allows editing node label', async () => {
      renderWithUIProvider(
        <NodeDrawer 
          open={true} 
          node={testNode} 
          onSave={mockOnSave} 
          onClose={mockOnClose} 
        />
      );

      const labelInput = screen.getByDisplayValue(testNode.label);
      
      fireEvent.change(labelInput, { target: { value: 'Updated Label' } });

      expect(labelInput).toHaveValue('Updated Label');
    });

    it('allows editing node type', async () => {
      renderWithUIProvider(
        <NodeDrawer 
          open={true} 
          node={testNode} 
          onSave={mockOnSave} 
          onClose={mockOnClose} 
        />
      );

      const typeSelect = screen.getByDisplayValue(testNode.type);
      
      fireEvent.change(typeSelect, { target: { value: 'example' } });

      expect(typeSelect).toHaveValue('example');
    });

    it('disables save button when label is empty', async () => {
      renderWithUIProvider(
        <NodeDrawer 
          open={true} 
          node={testNode} 
          onSave={mockOnSave} 
          onClose={mockOnClose} 
        />
      );

      const labelInput = screen.getByDisplayValue(testNode.label);
      const saveButton = screen.getByText('Save');

      // Clear the label
      fireEvent.change(labelInput, { target: { value: '' } });

      expect(saveButton).toBeDisabled();
    });

    it('saves changes when form is valid', async () => {
      renderWithUIProvider(
        <NodeDrawer 
          open={true} 
          node={testNode} 
          onSave={mockOnSave} 
          onClose={mockOnClose} 
        />
      );

      const labelInput = screen.getByDisplayValue(testNode.label);
      const typeSelect = screen.getByDisplayValue(testNode.type);
      const saveButton = screen.getByText('Save');

      fireEvent.change(labelInput, { target: { value: 'Updated Label' } });
      fireEvent.change(typeSelect, { target: { value: 'example' } });
      fireEvent.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith({
        label: 'Updated Label',
        type: 'example',
        level: 1
      });
    });

    it('cancels changes and closes drawer', () => {
      renderWithUIProvider(
        <NodeDrawer 
          open={true} 
          node={testNode} 
          onSave={mockOnSave} 
          onClose={mockOnClose} 
        />
      );

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('closes drawer when X button is clicked', () => {
      renderWithUIProvider(
        <NodeDrawer 
          open={true} 
          node={testNode} 
          onSave={mockOnSave} 
          onClose={mockOnClose} 
        />
      );

      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Tab Navigation', () => {
    it('switches to Links tab when clicked', () => {
      renderWithUIProvider(
        <NodeDrawer 
          open={true} 
          node={testNode} 
          onSave={mockOnSave} 
          onClose={mockOnClose} 
        />
      );

      const linksTab = screen.getByText('Links');
      fireEvent.click(linksTab);

      expect(screen.getByText('Links editing coming soon.')).toBeInTheDocument();
    });

    it('switches to History tab when clicked', () => {
      renderWithUIProvider(
        <NodeDrawer 
          open={true} 
          node={testNode} 
          onSave={mockOnSave} 
          onClose={mockOnClose} 
        />
      );

      const historyTab = screen.getByText('History');
      fireEvent.click(historyTab);

      expect(screen.getByText('History view coming soon.')).toBeInTheDocument();
    });

    it('switches back to Info tab', () => {
      renderWithUIProvider(
        <NodeDrawer 
          open={true} 
          node={testNode} 
          onSave={mockOnSave} 
          onClose={mockOnClose} 
        />
      );

      // Switch to Links tab first
      fireEvent.click(screen.getByText('Links'));
      expect(screen.getByText('Links editing coming soon.')).toBeInTheDocument();

      // Switch back to Info tab
      fireEvent.click(screen.getByText('Info'));
      expect(screen.getByDisplayValue(testNode.label)).toBeInTheDocument();
    });
  });

  describe('Form State Management', () => {
    it('resets form when node changes', () => {
      const { rerender } = renderWithUIProvider(
        <NodeDrawer 
          open={true} 
          node={testNode} 
          onSave={mockOnSave} 
          onClose={mockOnClose} 
        />
      );

      // Modify the form
      const labelInput = screen.getByDisplayValue(testNode.label);
      fireEvent.change(labelInput, { target: { value: 'Modified Label' } });
      expect(labelInput).toHaveValue('Modified Label');

      // Change to a different node
      const newNode = { ...mockNodes[1] };
      rerender(
        <NodeDrawer 
          open={true} 
          node={newNode} 
          onSave={mockOnSave} 
          onClose={mockOnClose} 
        />
      );

      // Form should reset to new node's values
      expect(screen.getByDisplayValue(newNode.label)).toBeInTheDocument();
    });

    it('resets to Info tab when reopened', () => {
      const { rerender } = renderWithUIProvider(
        <NodeDrawer 
          open={true} 
          node={testNode} 
          onSave={mockOnSave} 
          onClose={mockOnClose} 
        />
      );

      // Switch to Links tab
      fireEvent.click(screen.getByText('Links'));
      expect(screen.getByText('Links editing coming soon.')).toBeInTheDocument();

      // Close and reopen
      rerender(
        <NodeDrawer 
          open={false} 
          node={testNode} 
          onSave={mockOnSave} 
          onClose={mockOnClose} 
        />
      );

      rerender(
        <NodeDrawer 
          open={true} 
          node={testNode} 
          onSave={mockOnSave} 
          onClose={mockOnClose} 
        />
      );

      // Should be back on Info tab
      expect(screen.getByDisplayValue(testNode.label)).toBeInTheDocument();
    });
  });

  describe('Hierarchy Integration', () => {
    it('displays hierarchy information', () => {
      renderWithUIProvider(
        <NodeDrawer 
          open={true} 
          node={testNode} 
          onSave={mockOnSave} 
          onClose={mockOnClose} 
        />
      );

      expect(screen.getByDisplayValue('Test Hierarchy')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Level')).toBeInTheDocument();
    });

    it('handles missing hierarchy assignment', () => {
      mockResolveNodeHierarchyAssignment.mockReturnValue({ assignment: undefined });

      renderWithUIProvider(
        <NodeDrawer 
          open={true} 
          node={testNode} 
          onSave={mockOnSave} 
          onClose={mockOnClose} 
        />
      );

      // Should still render without errors
      expect(screen.getByText(`Node: ${testNode.label}`)).toBeInTheDocument();
    });
  });

  describe('Node Type Options', () => {
    it('provides correct type options', () => {
      renderWithUIProvider(
        <NodeDrawer 
          open={true} 
          node={testNode} 
          onSave={mockOnSave} 
          onClose={mockOnClose} 
        />
      );

      const typeSelect = screen.getByDisplayValue(testNode.type);
      
      // Check that all expected options are available
      expect(screen.getByRole('option', { name: 'concept' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'example' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'question' })).toBeInTheDocument();
    });
  });

  describe('Read-only Fields', () => {
    it('displays read-only fields correctly', () => {
      renderWithUIProvider(
        <NodeDrawer 
          open={true} 
          node={testNode} 
          onSave={mockOnSave} 
          onClose={mockOnClose} 
        />
      );

      // ID should be disabled
      const idInput = screen.getByDisplayValue(testNode.id);
      expect(idInput).toBeDisabled();

      // Status should be disabled if present
      if (testNode.status) {
        const statusInput = screen.getByDisplayValue(testNode.status);
        expect(statusInput).toBeDisabled();
      }

      // Branch should be disabled if present
      if (testNode.branch) {
        const branchInput = screen.getByDisplayValue(testNode.branch);
        expect(branchInput).toBeDisabled();
      }
    });
  });
});
