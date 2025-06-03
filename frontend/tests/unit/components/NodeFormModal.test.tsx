import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '@testing-library/react';
import NodeFormModal from '../../../src/components/NodeFormModal';

// Create mock data before vi.mock calls to avoid hoisting issues
const mockHierarchies = [
  {
    id: 'hierarchy1',
    name: 'Test Hierarchy',
    levels: [
      {
        id: 'level1',
        levelNumber: 1,
        label: 'Domain',
        allowedTypes: ['concept', 'question']
      },
      {
        id: 'level2',
        levelNumber: 2,
        label: 'Subdomain',
        allowedTypes: ['example', 'concept']
      }
    ]
  }
];

const mockLevels = mockHierarchies[0].levels;
const mockAllNodeTypes = ['concept', 'example', 'question'];

// Mock the context hooks
vi.mock('../../../src/context/HierarchyContext', () => ({
  useHierarchyContext: () => ({
    hierarchies: mockHierarchies,
    hierarchyId: 'hierarchy1',
    levels: mockLevels,
    allowedTypesMap: {
      'hierarchy1level1': ['concept', 'question'],
      'hierarchy1level2': ['example', 'concept']
    },
    allNodeTypes: mockAllNodeTypes,
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
    
    expect(screen.getByRole('option', { name: 'concept' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'example' })).toBeInTheDocument();
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
