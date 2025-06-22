/**
 * Unit tests for useLens hook
 */

import { renderHook } from '@testing-library/react';
import { useLens } from '../useLens';
import { useView } from '../../context/ViewContext';
import { useHierarchyContext } from '../useHierarchy';

// Mock dependencies
vi.mock('../../context/ViewContext');
vi.mock('../useHierarchy');
vi.mock('../../lenses', () => ({
  getLens: vi.fn(),
}));
vi.mock('../../utils/logger', () => ({
  log: vi.fn(),
}));

const mockUseView = useView as any;
const mockUseHierarchyContext = useHierarchyContext as any;

describe('useLens', () => {
  const mockGraphData = {
    nodes: [
      { id: '1', label: 'Node 1', type: 'test' },
      { id: '2', label: 'Node 2', type: 'test' }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', type: 'test' }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseView.mockReturnValue({
      active: 'none',
      setActive: vi.fn(),
    });
    
    mockUseHierarchyContext.mockReturnValue({
      hierarchies: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('should return raw data when active view is "none"', () => {
    const { result } = renderHook(() => useLens(mockGraphData));

    expect(result.current.nodes).toEqual(mockGraphData.nodes);
    expect(result.current.edges).toEqual(mockGraphData.edges);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.styleFn).toBeUndefined();
  });

  it('should return raw data when hierarchy lens is not found', () => {
    mockUseView.mockReturnValue({
      active: 'hierarchy-nonexistent',
      setActive: vi.fn(),
    });

    const { result } = renderHook(() => useLens(mockGraphData));

    expect(result.current.nodes).toEqual(mockGraphData.nodes);
    expect(result.current.edges).toEqual(mockGraphData.edges);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should handle empty graph data', () => {
    const emptyData = { nodes: [], edges: [] };
    const { result } = renderHook(() => useLens(emptyData));

    expect(result.current.nodes).toEqual([]);
    expect(result.current.edges).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should provide default layout when no hierarchy lens is active', () => {
    const { result } = renderHook(() => useLens(mockGraphData));

    expect(result.current.layout).toEqual({ name: 'fcose' });
  });
});
