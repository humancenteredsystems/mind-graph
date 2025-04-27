 // @ts-nocheck
import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { describe, it, beforeEach, vi, expect } from 'vitest';
import * as ApiService from '../services/ApiService';
import { useGraphState } from './useGraphState';

// Mock the ApiService module
vi.mock('../services/ApiService');

describe('useGraphState create and delete flow', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should add a node and then delete it', async () => {
    // Prepare a new node payload
    const newNode = {
      id: 'new-test-id',
      label: 'Test Node',
      type: 'concept',
      level: 1,
      status: 'pending',
      branch: 'main',
    };

    // Mock executeMutation for addNode to return the new node
    (ApiService.executeMutation as vi.Mock).mockResolvedValueOnce({
      addNode: { node: [newNode] }
    });

    // Mock executeMutation for deleteNode to return the deleted node id
    (ApiService.executeMutation as vi.Mock).mockResolvedValueOnce({
      deleteNode: { node: [{ id: newNode.id }] }
    });

    // Render the hook
    const { result } = renderHook(() => useGraphState());

    // Initially, no nodes
    expect(result.current.nodes).toEqual([]);

    // Add the node
    await act(async () => {
      await result.current.addNode({ label: newNode.label, type: newNode.type });
    });

    // After adding, the new node should be in state
    expect(result.current.nodes).toEqual([newNode]);

    // Delete the node
    await act(async () => {
      await result.current.deleteNode(newNode.id);
    });

    // After deletion, state should be empty again
    expect(result.current.nodes).toEqual([]);
  });
});
