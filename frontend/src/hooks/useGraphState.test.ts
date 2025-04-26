/// <reference types="vitest/globals" />
import { renderHook, act } from '@testing-library/react';
import type { Mock } from 'vitest';
import { useGraphState } from './useGraphState';
import * as ApiService from '../services/ApiService';

vi.mock('../services/ApiService');

describe('useGraphState', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('adds a root node', async () => {
    const addNodePayload = {
      addNode: {
        node: [
          { id: 'n1', label: 'L', type: 't', level: 1, status: 'pending', branch: 'main' }
        ]
      }
    };
    (ApiService.executeMutation as Mock).mockResolvedValue(addNodePayload);

    const { result } = renderHook(() => useGraphState());
    await act(async () => {
      await result.current.addNode({ label: 'L', type: 't' });
    });

    expect(result.current.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'n1', label: 'L', type: 't', level: 1 })
      ])
    );
    expect(result.current.edges).toEqual([]);
  });

  it('adds a connected node with edge', async () => {
    const addNodePayload = {
      addNode: {
        node: [
          { id: 'n2', label: 'L2', type: 't2', level: 2, status: 'pending', branch: 'main' }
        ]
      }
    };
    const addEdgePayload = {
      addEdge: {
        edge: [
          { from: { id: 'n1' }, to: { id: 'n2' }, type: 'simple' }
        ]
      }
    };
    (ApiService.executeMutation as Mock)
      .mockResolvedValueOnce(addNodePayload)
      .mockResolvedValueOnce(addEdgePayload);

    const { result } = renderHook(() => useGraphState());
    await act(async () => {
      await result.current.addNode({ label: 'L2', type: 't2' }, 'n1');
    });

    expect(result.current.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'n2', label: 'L2', type: 't2', level: 2 })
      ])
    );
    expect(result.current.edges).toEqual(
      expect.arrayContaining([{ source: 'n1', target: 'n2', type: 'simple' }])
    );
  });

  it('edits a node', async () => {
    // Seed initial node via loadInitialGraph stub
    const rawData = {
      queryNode: [
        {
          id: 'n1',
          label: 'L',
          type: 't',
          level: 1,
          status: 'pending',
          branch: 'main',
          outgoing: []
        }
      ]
    };
    (ApiService.fetchTraversalData as Mock).mockResolvedValue(rawData);
    const updatePayload = {
      updateNode: {
        node: [
          { id: 'n1', label: 'New', type: 't', level: 2, status: 'pending', branch: 'main' }
        ]
      }
    };
    (ApiService.executeMutation as Mock).mockResolvedValue(updatePayload);

    const { result } = renderHook(() => useGraphState());
    await act(async () => {
      await result.current.loadInitialGraph('n1');
      await result.current.editNode('n1', { label: 'New', type: 't', level: 2 });
    });

    expect(result.current.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'n1', label: 'New', level: 2 })
      ])
    );
  });

  it('handles editNode error', async () => {
    (ApiService.executeMutation as Mock).mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useGraphState());
    await act(async () => {
      await result.current.editNode('n1', { label: 'L', type: 't', level: 1 });
    });

    expect(result.current.error).toMatch(/Failed to update node n1/);
  });
});
