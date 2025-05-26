import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { mockNodes } from '../../helpers/mockData';
import NodeDrawer from '../../../src/components/NodeDrawer';

// Use vi.hoisted to properly handle mock hoisting
const { mockResolveNodeHierarchyAssignment, mockHierarchyContext } = vi.hoisted(() => ({
  mockResolveNodeHierarchyAssignment: vi.fn(),
  mockHierarchyContext: {
    hierarchies: [
      { id: 'h1', name: 'Test Hierarchy 1' },
      { id: 'h2', name: 'Test Hierarchy 2' }
    ],
    hierarchyId: 'h1',
    setHierarchyId: vi.fn(),
    levels: [
      { id: 'l1', levelNumber: 1, label: 'Domain', allowedTypes: ['concept'] },
      { id: 'l2', levelNumber: 2, label: 'Category', allowedTypes: ['concept', 'example'] }
    ],
    isLoading: false,
    error: null,
  }
}));

// Mock the utility function
vi.mock('../../../src/utils/graphUtils', () => ({
  resolveNodeHierarchyAssignment: mockResolveNodeHierarchyAssignment,
}));

// Mock the context
vi.mock('../../../src/context/HierarchyContext', () => ({
  useHierarchyContext: () => mockHierarchyContext,
}));

describe('NodeDrawer', () => {
  const mockNode = mockNodes[0];
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset context state
    mockHierarchyContext.isLoading = false;
    mockHierarchyContext.error = null;
    
    // Setup default return value for hierarchy assignment
    mockResolveNodeHierarchyAssignment.mockReturnValue({
      assignment: {
        hierarchyId: 'h1',
        hierarchyName: 'Test Hierarchy 1',
        levelId: 'l1',
        levelNumber: 1,
        levelLabel: 'Domain'
      },
      levelNumber: 1,
      levelLabel: 'Domain'
    });
  });

  it('renders node information when open', () => {
    render(
      <NodeDrawer 
        open={true}
        node={mockNode}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );
    
    expect(screen.getByText(`Node: ${mockNode.label}`)).toBeInTheDocument();
    expect(screen.getByDisplayValue(mockNode.id)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <NodeDrawer 
        open={false}
        node={mockNode}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );
    
    expect(screen.queryByText(`Node: ${mockNode.label}`)).not.toBeInTheDocument();
  });

  it('does not render when no node provided', () => {
    render(
      <NodeDrawer 
        open={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );
    
    expect(screen.queryByText(/Node:/)).not.toBeInTheDocument();
  });

  it('displays hierarchy assignment information', () => {
    render(
      <NodeDrawer 
        open={true}
        node={mockNode}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );
    
    expect(screen.getByDisplayValue('Test Hierarchy 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Domain')).toBeInTheDocument();
  });

  it('handles missing hierarchy assignment', () => {
    mockResolveNodeHierarchyAssignment.mockReturnValue({
      assignment: undefined,
      levelNumber: 0,
      levelLabel: undefined
    });
    
    render(
      <NodeDrawer 
        open={true}
        node={mockNode}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );
    
    // Should show empty values for hierarchy and level
    const hierarchyInput = screen.getByDisplayValue('');
    expect(hierarchyInput).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <NodeDrawer 
        open={true}
        node={mockNode}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );
    
    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when Cancel button is clicked', () => {
    render(
      <NodeDrawer 
        open={true}
        node={mockNode}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onSave when Save button is clicked with valid data', () => {
    render(
      <NodeDrawer 
        open={true}
        node={mockNode}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );
    
    // Change the label
    const labelInput = screen.getByDisplayValue(mockNode.label || '');
    fireEvent.change(labelInput, { target: { value: 'Updated Label' } });
    
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);
    
    expect(mockOnSave).toHaveBeenCalledWith({
      label: 'Updated Label',
      type: mockNode.type,
      level: 1
    });
  });

  it('disables Save button when label is empty', () => {
    render(
      <NodeDrawer 
        open={true}
        node={mockNode}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );
    
    // Clear the label
    const labelInput = screen.getByDisplayValue(mockNode.label || '');
    fireEvent.change(labelInput, { target: { value: '' } });
    
    const saveButton = screen.getByText('Save');
    expect(saveButton).toBeDisabled();
  });

  it('allows changing node type', () => {
    render(
      <NodeDrawer 
        open={true}
        node={mockNode}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );
    
    const typeSelect = screen.getByDisplayValue(mockNode.type || 'concept');
    fireEvent.change(typeSelect, { target: { value: 'example' } });
    
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);
    
    expect(mockOnSave).toHaveBeenCalledWith({
      label: mockNode.label,
      type: 'example',
      level: 1
    });
  });

  it('shows different tabs', () => {
    render(
      <NodeDrawer 
        open={true}
        node={mockNode}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );
    
    expect(screen.getByText('Info')).toBeInTheDocument();
    expect(screen.getByText('Links')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
  });

  it('switches between tabs', () => {
    render(
      <NodeDrawer 
        open={true}
        node={mockNode}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );
    
    // Click on Links tab
    fireEvent.click(screen.getByText('Links'));
    expect(screen.getByText('Links editing coming soon.')).toBeInTheDocument();
    
    // Click on History tab
    fireEvent.click(screen.getByText('History'));
    expect(screen.getByText('History view coming soon.')).toBeInTheDocument();
    
    // Click back to Info tab
    fireEvent.click(screen.getByText('Info'));
    expect(screen.getByDisplayValue(mockNode.id)).toBeInTheDocument();
  });

  it('resets form values when node changes', () => {
    const { rerender } = render(
      <NodeDrawer 
        open={true}
        node={mockNode}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );
    
    // Change the label
    const labelInput = screen.getByDisplayValue(mockNode.label || '');
    fireEvent.change(labelInput, { target: { value: 'Changed Label' } });
    
    // Change to a different node
    const newNode = { ...mockNodes[1] };
    rerender(
      <NodeDrawer 
        open={true}
        node={newNode}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );
    
    // Should show the new node's label, not the changed one
    expect(screen.getByDisplayValue(newNode.label || '')).toBeInTheDocument();
  });

  it('displays node status and branch when available', () => {
    const nodeWithStatus = {
      ...mockNode,
      status: 'active',
      branch: 'main'
    };
    
    render(
      <NodeDrawer 
        open={true}
        node={nodeWithStatus}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );
    
    expect(screen.getByDisplayValue('active')).toBeInTheDocument();
    expect(screen.getByDisplayValue('main')).toBeInTheDocument();
  });

  it('handles empty status and branch gracefully', () => {
    render(
      <NodeDrawer 
        open={true}
        node={mockNode}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );
    
    // Should have empty inputs for status and branch
    const inputs = screen.getAllByDisplayValue('');
    expect(inputs.length).toBeGreaterThan(0);
  });
});
