import { sendDgraphAdminRequest } from '../../../utils/dgraphAdmin';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('dgraphAdmin utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendDgraphAdminRequest', () => {
    it('should return success for successful requests', async () => {
      const mockResponse = {
        status: 200,
        data: { message: 'Success' }
      };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await sendDgraphAdminRequest('http://localhost:8080/admin/schema', { schema: 'test' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ message: 'Success' });
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8080/admin/schema',
        { schema: 'test' },
        { headers: { 'Content-Type': 'application/json' } }
      );
    });

    it('should handle non-2xx status codes', async () => {
      const mockResponse = {
        status: 400,
        data: { error: 'Bad request' }
      };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await sendDgraphAdminRequest('http://localhost:8080/admin/schema', { schema: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Dgraph admin request failed with status: 400');
      expect(result.details).toEqual({ error: 'Bad request' });
    });

    it('should handle network errors with response', async () => {
      const networkError = new Error('Network Error') as any;
      networkError.response = {
        status: 500,
        statusText: 'Internal Server Error',
        data: { error: 'Server error' }
      };
      mockedAxios.post.mockRejectedValueOnce(networkError);

      const result = await sendDgraphAdminRequest('http://localhost:8080/admin/schema', { schema: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Dgraph admin request failed: 500 - Internal Server Error');
      expect(result.details).toEqual({ error: 'Server error' });
    });

    it('should handle network errors without response', async () => {
      const networkError = new Error('Network Error') as any;
      networkError.request = {};
      mockedAxios.post.mockRejectedValueOnce(networkError);

      const result = await sendDgraphAdminRequest('http://localhost:8080/admin/schema', { schema: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No response received from Dgraph admin');
    });

    it('should handle request setup errors', async () => {
      const setupError = new Error('Request setup failed');
      mockedAxios.post.mockRejectedValueOnce(setupError);

      const result = await sendDgraphAdminRequest('http://localhost:8080/admin/schema', { schema: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Error setting up Dgraph admin request: Request setup failed');
    });

    it('should use correct headers', async () => {
      const mockResponse = {
        status: 200,
        data: { message: 'Success' }
      };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      await sendDgraphAdminRequest('http://localhost:8080/alter', { drop_all: true });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8080/alter',
        { drop_all: true },
        { headers: { 'Content-Type': 'application/json' } }
      );
    });
  });
});
