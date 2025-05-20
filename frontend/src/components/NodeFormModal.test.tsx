import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import NodeFormModal, { NodeFormValues } from './NodeFormModal';
import { useHierarchyContext } from '../context/HierarchyContext';
import { useGraphState } from '../hooks/useGraphState';
import type { NodeData } from '../types/graph';
import type { Mock } from 'vitest';

vi.mock('../context/HierarchyContext');
vi.mock('../hooks/useGraphState');

describe('NodeFormModal', () => {
  const mockSetHierarchyId = vi.fn();
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    // Provide default context values
    (useHierarchyContext as Mock).mockReturnValue({
      hierarchies: [{ id: 'h1', name: 'H1' }],
      hierarchyId: 'h1',
      levels: [
        { id: 'lvl1', levelNumber: 1, label: 'L1' },
        { id: 'lvl2', levelNumber: 2, label: 'L2' },
      ],
      allowedTypesMap: {
        'h1l1': ['A', 'B'],
        'h1l2': [],
      },
      allNodeTypes: ['concept', 'example', 'question'],
      setHierarchyId: mockSetHierarchyId,
    });
    (useGraphState as Mock).mockReturnValue({
      nodes: [],
    });
  });

  it('renders available types based on allowedTypesMap for top-level', () => {
    render(
      <NodeFormModal open={true} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );
    const typeSelect = screen.getByLabelText('Type');
    // Should show 'A' and 'B' because allowedTypesMap['h1l1'] === ['A','B']
    expect(screen.getByRole('option', { name: 'A' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'B' })).toBeInTheDocument();
    // Should not show default ALL_NODE_TYPES if allowedTypesMap non-empty
    expect(screen.queryByRole('option', { name: 'concept' })).not.toBeInTheDocument();
  });

  it('falls back to ALL_NODE_TYPES when allowedTypesMap is empty', () => {
    // Simulate selecting level 2
    (useHierarchyContext as Mock).mockReturnValue({
      ...useHierarchyContext(),
      levels: [{ id: 'lvl2', levelNumber: 2, label: 'L2' }],
      allowedTypesMap: { 'h1l2': [] },
      allNodeTypes: ['concept', 'example', 'question'],
    });
    render(
      <NodeFormModal open={true} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );
    // concept, example, question should be present
    expect(screen.getByRole('option', { name: 'concept' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'example' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'question' })).toBeInTheDocument();
  });

  it('calls onSubmit with correct values', () => {
    render(
      <NodeFormModal open={true} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'My Label' } });
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'A' } });
    fireEvent.click(screen.getByText('Save'));
    expect(mockOnSubmit).toHaveBeenCalledWith({
      label: 'My Label',
      type: 'A',
      hierarchyId: 'h1',
      levelId: 'lvl1',
    } as NodeFormValues);
  });

  it('calls onCancel when Cancel clicked', () => {
    render(
      <NodeFormModal open={true} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('selects correct child level when parentId is provided', () => {
    const parentId = 'parent1';
    (useGraphState as Mock).mockReturnValue({
      nodes: [
        { id: parentId, assignments: [{ hierarchyId: 'h1', levelId: 'lvl1', levelNumber: 1 }] },
      ],
    });
    render(
      <NodeFormModal open={true} parentId={parentId} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );
    const levelSelect = screen.getByLabelText('Level');
    expect(levelSelect).toHaveValue('lvl2');
    expect(levelSelect).toBeDisabled();
  });
});
