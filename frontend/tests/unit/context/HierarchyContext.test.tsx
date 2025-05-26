import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { HierarchyProvider, useHierarchyContext } from './HierarchyContext';
import type { Mock } from 'vitest';
import * as ApiService from '../services/ApiService';

// Mock the API service calls
vi.mock('../services/ApiService', () => ({
  fetchHierarchies: vi.fn(),
  executeQuery: vi.fn(),
}));

describe('HierarchyContext', () => {
  const mockedFetch = ApiService.fetchHierarchies as Mock;
  const mockedQuery = ApiService.executeQuery as Mock;

  beforeEach(() => {
    // Reset mocks before each test
    mockedFetch.mockReset();
    mockedQuery.mockReset();
  });

  it('builds allowedTypesMap correctly from fetched levels', async () => {
    // Mock fetchHierarchies to return one hierarchy
    mockedFetch.mockResolvedValue([{ id: 'h1', name: 'Test Hierarchy' }]);
    // Mock executeQuery to return two levels: one with types, one without
    mockedQuery.mockResolvedValue({
      queryHierarchy: [
        {
          levels: [
            {
              id: 'lvl1',
              levelNumber: 1,
              label: 'Level 1',
              allowedTypes: [{ id: 't1', typeName: 'A' }]
            },
            {
              id: 'lvl2',
              levelNumber: 2,
              label: 'Level 2',
              allowedTypes: []
            }
          ]
        }
      ]
    });

    const wrapper = ({ children }: any) => <HierarchyProvider>{children}</HierarchyProvider>;
    const { result, waitForNextUpdate } = renderHook(() => useHierarchyContext(), { wrapper });

    // Wait for initial hierarchy fetch and levels fetch to complete
    await waitForNextUpdate();

    // After fetchHierarchies, provider sets hierarchyId and fetches levels
    // Wait for second update after levels are loaded
    await waitForNextUpdate();

    const { allowedTypesMap } = result.current;

    // Check map entries
    expect(allowedTypesMap['h1l1']).toEqual(['A']);
    // Empty allowedTypes array should become empty, implying no restriction
    expect(allowedTypesMap['h1l2']).toEqual([]);
  });
});
