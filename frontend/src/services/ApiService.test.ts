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
      const fields = ['id', 'label']; // Fields passed in
      const expectedFields = ['id', 'label', 'level']; // Fields actually sent by the function

      await fetchTraversalData(rootId, depth, fields);

      // Expect the function to add 'level' to the fields sent
      expect(axios.post).toHaveBeenCalledWith('/api/traverse', { rootId, currentLevel: depth, fields: expectedFields });
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
    it('should return data on successful query call', async () => {
      const mockData = { queryNode: [{ id: 'node1' }] };
      (axios.post as any).mockResolvedValue({ data: mockData });
      const result = await executeQuery('queryTest', { foo: 'bar' });
      expect(result).toEqual(mockData);
    });

    it('should throw error on failed query call', async () => {
      const errorMessage = 'Network Error';
      (axios.post as any).mockRejectedValue(new Error(errorMessage));
      await expect(executeQuery('queryErr', {})).rejects.toThrow(errorMessage);
    });
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

    it('should return data on successful mutation call', async () => {
      const mockResult = { addNode: { node: [{ id: 'node1' }] } };
      (axios.post as any).mockResolvedValue({ data: mockResult });
      const result = await executeMutation('mutationTest', { foo: 'bar' });
      expect(result).toEqual(mockResult);
    });

    it('should throw error on failed mutation call', async () => {
      const errorMessage = 'Network Error';
      (axios.post as any).mockRejectedValue(new Error(errorMessage));
      await expect(executeMutation('mutationErr', {})).rejects.toThrow(errorMessage);
    });
  });

   describe('fetchSchema', () => {
     it('should call axios.get for schema', async () => {
      const mockResponse = { data: 'type Node {}' };
      (axios.get as any).mockResolvedValue(mockResponse);
      await fetchSchema();
      expect(axios.get).toHaveBeenCalledWith('/api/schema', { responseType: 'text' });
    });
     it('should return schema text on successful schema call', async () => {
      const mockSchema = 'schema text';
      (axios.get as any).mockResolvedValue({ data: mockSchema });
      const result = await fetchSchema();
      expect(result).toBe(mockSchema);
    });

    it('should throw error on failed schema call', async () => {
      const errorMessage = 'Network Error';
      (axios.get as any).mockRejectedValue(new Error(errorMessage));
      await expect(fetchSchema()).rejects.toThrow(errorMessage);
    });
  });

   describe('fetchHealth', () => {
     it('should call axios.get for health', async () => {
      const mockResponse = { data: { status: 'OK' } };
      (axios.get as any).mockResolvedValue(mockResponse);
      await fetchHealth();
      expect(axios.get).toHaveBeenCalledWith('/api/health');
    });
     it('should return health data on successful health call', async () => {
      const mockHealth = { apiStatus: 'OK', dgraphStatus: 'OK' };
      (axios.get as any).mockResolvedValue({ data: mockHealth });
      const result = await fetchHealth();
      expect(result).toEqual(mockHealth);
    });

    it('should throw error on failed health call', async () => {
      const errorMessage = 'Network Error';
      (axios.get as any).mockRejectedValue(new Error(errorMessage));
      await expect(fetchHealth()).rejects.toThrow(errorMessage);
    });
  });

});
