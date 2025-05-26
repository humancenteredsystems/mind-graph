import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import * as ApiService from '../../../src/services/ApiService';

vi.mock('axios');
const mockedAxios = axios as any;

describe('ApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAxios.post.mockResolvedValue({ data: {} });
    mockedAxios.get.mockResolvedValue({ data: {} });
  });

  describe('executeQuery', () => {
    it('makes POST request to /api/query', async () => {
      const query = 'query { test }';
      await ApiService.executeQuery(query);
      
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/query', { query });
    });
  });

  describe('executeMutation', () => {
    it('makes POST request to /api/mutate', async () => {
      const mutation = 'mutation { test }';
      
      await ApiService.executeMutation(mutation);

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/mutate', { 
        mutation,
        variables: undefined 
      }, undefined);
    });
  });

  describe('fetchTraversalData', () => {
    it('makes POST request to /api/traverse', async () => {
      const nodeId = 'test-node';
      const hierarchyId = 'test-hierarchy';
      
      await ApiService.fetchTraversalData(nodeId, hierarchyId);
      
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/traverse', {
        rootId: nodeId,
        hierarchyId
      });
    });
  });

  describe('fetchAllNodeIds', () => {
    it('executes query to get all node IDs', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { queryNode: [{ id: 'node1' }, { id: 'node2' }] }
      });
      
      const result = await ApiService.fetchAllNodeIds();
      
      expect(result).toEqual(['node1', 'node2']);
    });
  });
});
