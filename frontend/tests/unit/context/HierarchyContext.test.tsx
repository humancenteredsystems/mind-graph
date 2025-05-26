import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { renderHook } from '@testing-library/react';
import { useHierarchyContext, HierarchyProvider } from '../../../src/context/HierarchyContext';
import * as ApiService from '../../../src/services/ApiService';

vi.mock('../../../src/services/ApiService');

describe('HierarchyContext', () => {
  const mockApiService = ApiService as any;
  const mockHierarchies = [
    {
      id: 'h1',
      name: 'Test Hierarchy',
      levels: [
        { id: 'l1', levelNumber: 1, label: 'Domain', allowedTypes: ['concept'] }
      ]
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiService.fetchHierarchies.mockResolvedValue(mockHierarchies);
  });

  it('provides hierarchy context', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <HierarchyProvider>{children}</HierarchyProvider>
    );

    const { result } = renderHook(() => useHierarchyContext(), { wrapper });

    expect(result.current.hierarchies).toEqual([]);
    expect(result.current.hierarchyId).toBe('');
  });

  it('loads hierarchies on mount', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <HierarchyProvider>{children}</HierarchyProvider>
    );

    renderHook(() => useHierarchyContext(), { wrapper });

    expect(mockApiService.fetchHierarchies).toHaveBeenCalled();
  });
});
