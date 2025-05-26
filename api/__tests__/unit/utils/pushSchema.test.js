const { pushSchemaViaHttp } = require('../../../utils/pushSchema');

// Mock axios
jest.mock('axios');
const axios = require('axios');

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
      axios.post.mockResolvedValueOnce(mockResponse);

      const result = await pushSchemaViaHttp(mockSchema, null, adminUrl);

      expect(result.success).toBe(true);
      expect(result.response).toEqual({ code: 'Success', message: 'Done' });
      expect(axios.post).toHaveBeenCalledWith(
        adminUrl,
        mockSchema,
        { headers: { 'Content-Type': 'application/graphql' } }
      );
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      axios.post.mockRejectedValueOnce(networkError);

      const result = await pushSchemaViaHttp(mockSchema, null, adminUrl);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network Error');
    });

    it('should handle Dgraph error responses', async () => {
      const dgraphError = new Error('Schema validation failed');
      dgraphError.response = {
        status: 400,
        data: { error: 'Invalid schema syntax' }
      };
      axios.post.mockRejectedValueOnce(dgraphError);

      const result = await pushSchemaViaHttp(mockSchema, null, adminUrl);

      expect(result.success).toBe(false);
      expect(result.error).toEqual({ error: 'Invalid schema syntax' });
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('timeout of 5000ms exceeded');
      timeoutError.code = 'ECONNABORTED';
      axios.post.mockRejectedValueOnce(timeoutError);

      const result = await pushSchemaViaHttp(mockSchema, null, adminUrl);

      expect(result.success).toBe(false);
      expect(result.error).toBe('timeout of 5000ms exceeded');
    });

    it('should use correct headers', async () => {
      const mockResponse = {
        status: 200,
        data: { code: 'Success', message: 'Done' }
      };
      axios.post.mockResolvedValueOnce(mockResponse);

      await pushSchemaViaHttp(mockSchema, null, adminUrl);

      expect(axios.post).toHaveBeenCalledWith(
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
      axios.post.mockResolvedValueOnce(mockResponse);

      const result = await pushSchemaViaHttp(mockSchema, null, adminUrl);

      expect(result.success).toBe(true);
      expect(result.response).toEqual({ message: 'Schema updated successfully' });
    });

    it('should handle errors without response data', async () => {
      const error = new Error('Connection refused');
      // No response property
      axios.post.mockRejectedValueOnce(error);

      const result = await pushSchemaViaHttp(mockSchema, null, adminUrl);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection refused');
    });
  });
});
