import { renderHook, act } from '@testing-library/react';
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

    // Mock deleteNodeCascade for deleteNode to return successful response
    // The updated deleteNodeCascade returns an object with deletedNodesCount
    (ApiService.deleteNodeCascade as vi.Mock).mockResolvedValueOnce({
      success: true,
      deletedNodeId: newNode.id,
      deletedEdgesCount: 0, // Assuming no edges initially
      deletedNodesCount: 1,
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
