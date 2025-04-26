import { renderHook, act } from '@testing-library/react';
import { useGraphState } from './useGraphState';
import * as ApiService from '../services/ApiService';
import { vi } from 'vitest';

// Mock executeMutation from ApiService
vi.mock('../services/ApiService', () => ({
  executeMutation: vi.fn(),
}));

// Mock UUID generation to return a predictable ID
vi.mock('uuid', () => ({ v4: () => 'test-id' }));

describe('useGraphState - addNode', () => {
  beforeEach(() => {
    // Clear mocks before each test
    vi.clearAllMocks();
    // Mock window.prompt to supply label and type in two calls
    vi.spyOn(window, 'prompt')
      .mockImplementationOnce(() => 'Test Label')
      .mockImplementationOnce(() => 'concept');
  });

  it('calls executeMutation and updates nodes state', async () => {
    // Prepare mock mutation response
    const mockResult = {
      addNode: {
        node: [{
          id: 'test-id',
          label: 'Test Label',
          type: 'concept',
          level: 1,
          status: 'pending',
          branch: 'main'
        }]
      }
    };
    // Stub executeMutation to resolve to our mock result
    (ApiService.executeMutation as vi.Mock).mockResolvedValueOnce(mockResult);

    // Render the hook
    const { result } = renderHook(() => useGraphState());

    // Initially, no nodes
    expect(result.current.nodes).toHaveLength(0);

    // Invoke addNode and wait for state update
    await act(async () => {
      await result.current.addNode();
    });

    // executeMutation should have been called once
    expect(ApiService.executeMutation).toHaveBeenCalledTimes(1);
    // State should now include the new node
    expect(result.current.nodes).toHaveLength(1);
    expect(result.current.nodes[0]).toMatchObject({
      id: 'test-id',
      label: 'Test Label',
      type: 'concept'
    });
  });
});
