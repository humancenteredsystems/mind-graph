import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '../../helpers/testUtils';
import NodeFormModal from '../../../src/components/NodeFormModal';



// Override the existing hierarchy context mock with our test-specific data
vi.mock('../../../src/hooks/useHierarchy', () => ({
  useHierarchyContext: () => ({
    hierarchies: [
      { id: 'h1', name: 'Test Hierarchy 1' },
      { id: 'h2', name: 'Test Hierarchy 2' }
    ],
    hierarchyId: 'h1',
    levels: [
      { id: 'l1', levelNumber: 1, label: 'Domain' },
      { id: 'l2', levelNumber: 2, label: 'Category' }
    ],
    allowedTypesMap: {
      'h1l1': ['concept', 'question'],
      'h1l2': ['example', 'concept']
    },
    allNodeTypes: ['concept', 'example', 'question'],
    setHierarchyId: vi.fn(),
  }),
}));

vi.mock('../../../src/hooks/useGraphState', () => ({
  useGraphState: () => ({
    nodes: [],
  }),
}));

// Mock the utility function
vi.mock('../../../src/utils/graphUtils', () => ({
  resolveNodeHierarchyAssignment: () => ({
    assignment: undefined,
    levelNumber: 0,
    levelLabel: undefined
  }),
}));

describe('NodeFormModal', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open is true', () => {
    render(
      <NodeFormModal 
        open={true} 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );
    
    expect(screen.getByLabelText('Label')).toBeInTheDocument();
    expect(screen.getByLabelText('Type')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(
      <NodeFormModal 
        open={false} 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );
    
    expect(screen.queryByLabelText('Label')).not.toBeInTheDocument();
  });

  it('shows available types based on selected level', () => {
    render(
      <NodeFormModal 
        open={true} 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );
    
    // The component shows available types based on the current level selection
    // For level 1 (Domain), it shows concept and example (filtered from allowedTypesMap)
    expect(screen.getByRole('option', { name: 'concept' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'example' })).toBeInTheDocument();
    // Note: 'question' is not shown because it's filtered out for the current level
  });

  it('calls onSubmit with correct values when form is submitted', () => {
    render(
      <NodeFormModal 
        open={true} 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );
    
    fireEvent.change(screen.getByLabelText('Label'), { 
      target: { value: 'Test Node' } 
    });
    fireEvent.change(screen.getByLabelText('Type'), { 
      target: { value: 'concept' } 
    });
    
    fireEvent.click(screen.getByText('Save'));
    
    expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Test Node',
        type: 'concept',
        hierarchyId: 'h1',
        levelId: 'l1'
      })
    );
  });

  it('calls onCancel when Cancel button is clicked', () => {
    render(
      <NodeFormModal 
        open={true} 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );
    
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('validates required fields', () => {
    render(
      <NodeFormModal 
        open={true} 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );
    
    // Save button should be disabled when label is empty
    const saveButton = screen.getByText('Save');
    expect(saveButton).toBeDisabled();
    
    // Should not call onSubmit if validation fails
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('populates initial values when provided', () => {
    const initialValues = {
      id: 'test-node',
      label: 'Initial Label',
      type: 'concept',
      assignments: [
        {
          hierarchyId: 'hierarchy1',
          hierarchyName: 'Test Hierarchy',
          levelId: 'level1',
          levelNumber: 1
        }
      ]
    };
    
    render(
      <NodeFormModal 
        open={true} 
        initialValues={initialValues}
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );
    
    expect(screen.getByDisplayValue('Initial Label')).toBeInTheDocument();
    expect(screen.getByDisplayValue('concept')).toBeInTheDocument();
  });
});
