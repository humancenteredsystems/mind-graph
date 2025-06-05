import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock the API service first
vi.mock('../../../src/services/ApiService', () => ({
  fetchAllNodeIds: vi.fn(),
  fetchTraversalData: vi.fn(),
  executeQuery: vi.fn(),
  executeMutation: vi.fn(),
}));

// Mock the hierarchy context using the correct hook path
vi.mock('../../../src/hooks/useHierarchy', () => ({
  useHierarchyContext: () => ({
    hierarchyId: 'test-hierarchy',
    hierarchies: [{ id: 'test-hierarchy', name: 'Test Hierarchy' }],
    setHierarchyId: vi.fn(),
    levels: [],
    isLoading: false,
    error: null,
  }),
}));

import { useGraphState } from '../../../src/hooks/useGraphState';
import * as ApiService from '../../../src/services/ApiService';
import type { RawNodeResponse } from '../../../src/types/graph';

describe('useGraphState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock executeQuery for loadCompleteGraph - using correct structure for transformAllGraphData
    vi.mocked(ApiService.executeQuery).mockResolvedValue({
      queryNode: [
        {
          id: 'node1',
          label: 'Test Node 1',
          type: 'concept',
          hierarchyAssignments: [
            {
              hierarchy: { id: 'test-hierarchy', name: 'Test Hierarchy' },
              level: { id: 'level1', levelNumber: 1, label: 'Level 1' }
            }
          ],
          outgoing: [
            {
              type: 'simple',
              to: {
                id: 'node2'
              }
            }
          ]
        },
        {
          id: 'node2',
          label: 'Test Node 2',
          type: 'concept',
          hierarchyAssignments: [
            {
              hierarchy: { id: 'test-hierarchy', name: 'Test Hierarchy' },
              level: { id: 'level2', levelNumber: 2, label: 'Level 2' }
            }
          ],
          outgoing: []
        }
      ]
    } as any);

    // Mock fetchTraversalData for loadInitialGraph
    vi.mocked(ApiService.fetchTraversalData).mockResolvedValue({
      queryNode: [
        {
          id: 'root1',
          label: 'Root Node',
          type: 'concept',
          hierarchyAssignments: [
            {
              hierarchy: { id: 'test-hierarchy', name: 'Test Hierarchy' },
              level: { id: 'level1', levelNumber: 1, label: 'Level 1' }
            }
          ],
          outgoing: []
        } as RawNodeResponse
      ]
    });
  });

  it('initializes with loading state', () => {
    const { result } = renderHook(() => useGraphState());

    expect(result.current.nodes).toEqual([]);
    expect(result.current.edges).toEqual([]);
    expect(result.current.isLoading).toBe(true); // Should start as loading
    expect(result.current.error).toBeNull();
  });

  it('loads complete graph successfully', async () => {
    const { result } = renderHook(() => useGraphState());

    await act(async () => {
      await result.current.loadCompleteGraph();
    });

    expect(ApiService.executeQuery).toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.nodes).toHaveLength(2);
    expect(result.current.edges).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('loads initial graph successfully', async () => {
    const { result } = renderHook(() => useGraphState());

    await act(async () => {
      await result.current.loadInitialGraph('root1');
    });

    expect(ApiService.fetchTraversalData).toHaveBeenCalledWith('root1', 'test-hierarchy');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.nodes).toHaveLength(1);
    expect(result.current.edges).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });

  it('handles API errors in loadCompleteGraph', async () => {
    vi.mocked(ApiService.executeQuery).mockRejectedValue(new Error('API Error'));
    
    const { result } = renderHook(() => useGraphState());

    await act(async () => {
      await result.current.loadCompleteGraph();
    });

    expect(result.current.error).toBe('Failed to load complete graph data.');
    expect(result.current.isLoading).toBe(false);
  });

  it('handles API errors in loadInitialGraph', async () => {
    vi.mocked(ApiService.fetchTraversalData).mockRejectedValue(new Error('API Error'));
    
    const { result } = renderHook(() => useGraphState());

    await act(async () => {
      await result.current.loadInitialGraph('root1');
    });

    expect(result.current.error).toBe('Failed to load initial graph data.');
    expect(result.current.isLoading).toBe(false);
  });

  it('expands node children correctly', async () => {
    const { result } = renderHook(() => useGraphState());

    // First load some data
    await act(async () => {
      await result.current.loadCompleteGraph();
    });

    // Hide node2 first
    act(() => {
      result.current.hideNode('node2');
    });

    expect(result.current.hiddenNodeIds.has('node2')).toBe(true);

    // Now expand node1 children (should show node2)
    act(() => {
      result.current.expandChildren('node1');
    });

    expect(result.current.hiddenNodeIds.has('node2')).toBe(false);
  });

  it('hides and shows nodes correctly', async () => {
    const { result } = renderHook(() => useGraphState());

    // First load some data
    await act(async () => {
      await result.current.loadCompleteGraph();
    });

    // Hide a node
    act(() => {
      result.current.hideNode('node1');
    });

    expect(result.current.hiddenNodeIds.has('node1')).toBe(true);

    // Hide multiple nodes
    act(() => {
      result.current.hideNodes(['node1', 'node2']);
    });

    expect(result.current.hiddenNodeIds.has('node1')).toBe(true);
    expect(result.current.hiddenNodeIds.has('node2')).toBe(true);
  });
});
