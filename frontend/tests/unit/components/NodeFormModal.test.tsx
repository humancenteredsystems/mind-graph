import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../helpers/testUtils';
import { mockHierarchies, mockNodeFormValues } from '../../helpers/mockData';
import NodeFormModal from '../../../src/components/NodeFormModal';
import type { NodeFormValues } from '../../../src/components/NodeFormModal';

// Mock the context hooks
vi.mock('../../../src/context/HierarchyContext', () => ({
  useHierarchyContext: () => ({
    hierarchies: mockHierarchies,
    hierarchyId: 'hierarchy1',
    levels: mockHierarchies[0].levels,
    allowedTypesMap: {
      'hierarchy1l1': ['concept', 'question'],
      'hierarchy1l2': ['example', 'concept']
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
    
    const typeSelect = screen.getByLabelText('Type');
    expect(screen.getByRole('option', { name: 'concept' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'question' })).toBeInTheDocument();
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
        hierarchyId: 'hierarchy1',
        levelId: 'level1'
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
    
    // Try to submit without filling required fields
    fireEvent.click(screen.getByText('Save'));
    
    // Should not call onSubmit if validation fails
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('populates initial values when provided', () => {
    const initialValues = {
      label: 'Initial Label',
      type: 'concept',
      hierarchyId: 'hierarchy1',
      levelId: 'level1'
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
