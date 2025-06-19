import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import * as ApiService from '../../../src/services/ApiService';

// Mock axios.create to return a mocked apiClient instance
vi.mock('axios', () => {
  const mockApiClient = {
    post: vi.fn(),
    get: vi.fn(),
    interceptors: {
      request: {
        use: vi.fn()
      }
    }
  };
  
  return {
    default: {
      create: vi.fn(() => mockApiClient),
      isAxiosError: vi.fn()
    }
  };
});

// Get the mocked axios for test assertions
const mockedAxios = vi.mocked(axios);
const mockApiClient = mockedAxios.create() as unknown as {
  post: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  interceptors: {
    request: {
      use: ReturnType<typeof vi.fn>;
    };
  };
};

describe('ApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock implementations
    mockApiClient.post.mockResolvedValue({ data: {} });
    mockApiClient.get.mockResolvedValue({ data: {} });
  });

  describe('executeQuery', () => {
    it('makes POST request to /query', async () => {
      const query = 'query { test }';
      await ApiService.executeQuery(query);
      
      expect(mockApiClient.post).toHaveBeenCalledWith('/query', { query, variables: undefined });
    });
  });

  describe('executeMutation', () => {
    it('makes POST request to /mutate', async () => {
      const mutation = 'mutation { test }';
      
      await ApiService.executeMutation(mutation);

      expect(mockApiClient.post).toHaveBeenCalledWith('/mutate', { 
        mutation,
        variables: undefined 
      }, undefined);
    });
  });

  describe('fetchTraversalData', () => {
    it('makes POST request to /traverse', async () => {
      const nodeId = 'test-node';
      const hierarchyId = 'test-hierarchy';
      
      await ApiService.fetchTraversalData(nodeId, hierarchyId);
      
      expect(mockApiClient.post).toHaveBeenCalledWith('/traverse', {
        rootId: nodeId,
        hierarchyId
      });
    });
  });

  describe('fetchAllNodeIds', () => {
    it('executes query to get all node IDs', async () => {
      mockApiClient.post.mockResolvedValue({
        data: { queryNode: [{ id: 'node1' }, { id: 'node2' }] }
      });
      
      const result = await ApiService.fetchAllNodeIds();
      
      expect(result).toEqual(['node1', 'node2']);
    });
  });
});
