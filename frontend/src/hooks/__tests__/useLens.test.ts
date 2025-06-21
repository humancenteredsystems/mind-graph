/**
 * Unit tests for useLens hook
 */

import { renderHook } from '@testing-library/react';
import { useLens } from '../useLens';
import { ViewProvider } from '../../context/ViewContext';
import { HierarchyProvider } from '../../context/HierarchyContext';
import React from 'react';

// Mock the API service
const mockExecuteQuery = jest.fn();
const mockFetchTraversalData = jest.fn();

jest.mock('../../services/ApiService', () => ({
  executeQuery: mockExecuteQuery,
  fetchTraversalData: mockFetchTraversalData,
}));

// Mock the logger
const mockLog = jest.fn();
jest.mock('../../utils/logger', () => ({
  log: mockLog,
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <HierarchyProvider>
    <ViewProvider>
      {children}
    </ViewProvider>
  </HierarchyProvider>
);

describe('useLens', () => {
  const mockGraphData = {
    nodes: [
      { id: 'node1', label: 'Node 1', type: 'Person' },
      { id: 'node2', label: 'Node 2', type: 'Organization' },
    ],
    edges: [
      { id: 'edge1', source: 'node1', target: 'node2', type: 'WORKS_FOR' },
    ],
  };

  it('should apply default lens transformations', () => {
    const { result } = renderHook(
      () => useLens(mockGraphData),
      { wrapper: TestWrapper }
    );

    expect(result.current.nodes).toHaveLength(2);
    expect(result.current.edges).toHaveLength(1);
    expect(result.current.layout.name).toBe('fcose');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle empty graph data', () => {
    const emptyData = { nodes: [], edges: [] };
    
    const { result } = renderHook(
      () => useLens(emptyData),
      { wrapper: TestWrapper }
    );

    expect(result.current.nodes).toHaveLength(0);
    expect(result.current.edges).toHaveLength(0);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should provide style function when available', () => {
    const { result } = renderHook(
      () => useLens(mockGraphData),
      { wrapper: TestWrapper }
    );

    expect(result.current.styleFn).toBeDefined();
    
    if (result.current.styleFn) {
      const nodeStyle = result.current.styleFn(mockGraphData.nodes[0]);
      expect(nodeStyle).toHaveProperty('background-color');
      expect(nodeStyle).toHaveProperty('border-color');
    }
  });
});
