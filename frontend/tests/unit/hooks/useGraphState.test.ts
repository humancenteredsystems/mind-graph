import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock the API service first
vi.mock('../../../src/services/ApiService', () => ({
  fetchAllNodeIds: vi.fn(),
  fetchTraversalData: vi.fn(),
  executeQuery: vi.fn(),
  executeMutation: vi.fn(),
}));

// Mock the hierarchy context
vi.mock('../../../src/context/HierarchyContext', () => ({
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

describe('useGraphState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ApiService.fetchAllNodeIds).mockResolvedValue(['node1', 'node2']);
    vi.mocked(ApiService.fetchTraversalData).mockResolvedValue({
      queryNode: [
        {
          id: 'node1',
          label: 'Test Node',
          type: 'concept',
          hierarchyAssignments: [],
          outgoing: []
        }
      ]
    });
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useGraphState());

    expect(result.current.nodes).toEqual([]);
    expect(result.current.edges).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('loads complete graph successfully', async () => {
    const { result } = renderHook(() => useGraphState());

    await act(async () => {
      await result.current.loadCompleteGraph();
    });

    expect(ApiService.fetchAllNodeIds).toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('handles API errors', async () => {
    vi.mocked(ApiService.fetchAllNodeIds).mockRejectedValue(new Error('API Error'));
    
    const { result } = renderHook(() => useGraphState());

    await act(async () => {
      await result.current.loadCompleteGraph();
    });

    expect(result.current.error).toBe('API Error');
  });
});
