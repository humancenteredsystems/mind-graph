// Test file for ApiService.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { fetchTraversalData, executeQuery, executeMutation, fetchSchema, fetchHealth } from './ApiService';

// Mock the axios module
vi.mock('axios');

describe('ApiService', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();
  });

  describe('fetchTraversalData', () => {
    it('should call axios.post with correct parameters for traverse', async () => {
      const mockResponse = { data: { queryNode: [{ id: 'node1' }] } };
      (axios.post as any).mockResolvedValue(mockResponse);

      const rootId = 'testId';
      const depth = 2;
      const fields = ['id', 'label'];

      await fetchTraversalData(rootId, depth, fields);

      expect(axios.post).toHaveBeenCalledWith('/api/traverse', { rootId, depth, fields });
    });

     it('should return data on successful traverse call', async () => {
      const mockData = { queryNode: [{ id: 'node1' }] };
      (axios.post as any).mockResolvedValue({ data: mockData });
      const result = await fetchTraversalData('testId');
      expect(result).toEqual(mockData);
    });

    it('should throw error on failed traverse call', async () => {
      const errorMessage = 'Network Error';
      (axios.post as any).mockRejectedValue(new Error(errorMessage));
      await expect(fetchTraversalData('testId')).rejects.toThrow(errorMessage);
    });
  });

  describe('executeQuery', () => {
     it('should call axios.post with correct parameters for query', async () => {
      const mockResponse = { data: { queryNode: [] } };
      (axios.post as any).mockResolvedValue(mockResponse);
      const query = 'query { test }';
      const variables = { id: 1 };
      await executeQuery(query, variables);
      expect(axios.post).toHaveBeenCalledWith('/api/query', { query, variables });
    });
    // Add success and error tests similar to fetchTraversalData
  });

  describe('executeMutation', () => {
     it('should call axios.post with correct parameters for mutation', async () => {
      const mockResponse = { data: { addNode: {} } };
      (axios.post as any).mockResolvedValue(mockResponse);
      const mutation = 'mutation { addNode }';
      const variables = { label: 'test' };
      await executeMutation(mutation, variables);
      expect(axios.post).toHaveBeenCalledWith('/api/mutate', { mutation, variables });
    });
     // Add success and error tests similar to fetchTraversalData
  });

   describe('fetchSchema', () => {
     it('should call axios.get for schema', async () => {
      const mockResponse = { data: 'type Node {}' };
      (axios.get as any).mockResolvedValue(mockResponse);
      await fetchSchema();
      expect(axios.get).toHaveBeenCalledWith('/api/schema', { responseType: 'text' });
    });
     // Add success and error tests similar to fetchTraversalData
  });

   describe('fetchHealth', () => {
     it('should call axios.get for health', async () => {
      const mockResponse = { data: { status: 'OK' } };
      (axios.get as any).mockResolvedValue(mockResponse);
      await fetchHealth();
      expect(axios.get).toHaveBeenCalledWith('/api/health');
    });
     // Add success and error tests similar to fetchTraversalData
  });

});
