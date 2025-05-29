// Mock axios with proper implementation
const mockPost = jest.fn();
jest.mock('axios', () => ({
  post: mockPost
}));

// Import after mocking
const { pushSchemaViaHttp } = require('../../../utils/pushSchema');

describe('pushSchema Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('pushSchemaViaHttp', () => {
    const mockSchema = 'type Node { id: String! @id label: String! }';
    const adminUrl = 'http://localhost:8080/admin/schema';

    it('should successfully push schema', async () => {
      const mockResponse = {
        status: 200,
        data: { code: 'Success', message: 'Done' }
      };
      mockPost.mockResolvedValueOnce(mockResponse);

      const result = await pushSchemaViaHttp(mockSchema, null, adminUrl);

      expect(result.success).toBe(true);
      expect(result.response).toEqual({ code: 'Success', message: 'Done' });
      expect(result.namespace).toBe(null);
      expect(mockPost).toHaveBeenCalledWith(
        adminUrl,
        mockSchema,
        { headers: { 'Content-Type': 'application/graphql' } }
      );
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockPost.mockRejectedValueOnce(Promise.reject(networkError));

      const result = await pushSchemaViaHttp(mockSchema, null, adminUrl);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network Error');
      expect(result.namespace).toBe(null);
    });

    it('should handle Dgraph error responses', async () => {
      const dgraphError = new Error('Schema validation failed');
      dgraphError.response = {
        status: 400,
        data: { error: 'Invalid schema syntax' }
      };
      mockPost.mockRejectedValueOnce(Promise.reject(dgraphError));

      const result = await pushSchemaViaHttp(mockSchema, null, adminUrl);

      expect(result.success).toBe(false);
      expect(result.error).toEqual({ error: 'Invalid schema syntax' });
      expect(result.namespace).toBe(null);
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('timeout of 5000ms exceeded');
      timeoutError.code = 'ECONNABORTED';
      mockPost.mockRejectedValueOnce(Promise.reject(timeoutError));

      const result = await pushSchemaViaHttp(mockSchema, null, adminUrl);

      expect(result.success).toBe(false);
      expect(result.error).toBe('timeout of 5000ms exceeded');
      expect(result.namespace).toBe(null);
    });

    it('should use correct headers', async () => {
      const mockResponse = {
        status: 200,
        data: { code: 'Success', message: 'Done' }
      };
      mockPost.mockResolvedValueOnce(mockResponse);

      await pushSchemaViaHttp(mockSchema, null, adminUrl);

      expect(mockPost).toHaveBeenCalledWith(
        adminUrl,
        mockSchema,
        { headers: { 'Content-Type': 'application/graphql' } }
      );
    });

    it('should handle successful response with different data format', async () => {
      const mockResponse = {
        status: 200,
        data: { message: 'Schema updated successfully' }
      };
      mockPost.mockResolvedValueOnce(mockResponse);

      const result = await pushSchemaViaHttp(mockSchema, null, adminUrl);

      expect(result.success).toBe(true);
      expect(result.response).toEqual({ message: 'Schema updated successfully' });
      expect(result.namespace).toBe(null);
    });

    it('should handle errors without response data', async () => {
      const error = new Error('Connection refused');
      // No response property
      mockPost.mockRejectedValueOnce(Promise.reject(error));

      const result = await pushSchemaViaHttp(mockSchema, null, adminUrl);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection refused');
      expect(result.namespace).toBe(null);
    });
  });
});
