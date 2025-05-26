const { pushSchemaToTarget } = require('../../../utils/pushSchema');
const axios = require('axios');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('pushSchema Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('pushSchemaToTarget', () => {
    const mockSchema = `
      type Node {
        id: String! @id
        label: String! @search(by: [term])
        type: String!
      }
    `;

    it('should successfully push schema to local target', async () => {
      const mockResponse = {
        data: {
          code: 'Success',
          message: 'Done',
          uids: {}
        }
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await pushSchemaToTarget(mockSchema, 'local');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8080/admin/schema',
        mockSchema,
        {
          headers: {
            'Content-Type': 'text/plain'
          }
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should successfully push schema to remote target with custom URL', async () => {
      const customUrl = 'https://custom-dgraph.example.com:8080';
      const mockResponse = {
        data: {
          code: 'Success',
          message: 'Schema updated successfully'
        }
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await pushSchemaToTarget(mockSchema, 'remote', customUrl);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${customUrl}/admin/schema`,
        mockSchema,
        {
          headers: {
            'Content-Type': 'text/plain'
          }
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should use default remote URL when no custom URL provided', async () => {
      const mockResponse = {
        data: { code: 'Success' }
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      await pushSchemaToTarget(mockSchema, 'remote');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8080/admin/schema',
        mockSchema,
        {
          headers: {
            'Content-Type': 'text/plain'
          }
        }
      );
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      networkError.code = 'ECONNREFUSED';
      mockedAxios.post.mockRejectedValue(networkError);

      await expect(pushSchemaToTarget(mockSchema, 'local'))
        .rejects.toThrow('Network Error');
    });

    it('should handle Dgraph error responses', async () => {
      const dgraphError = {
        response: {
          status: 400,
          data: {
            errors: [
              {
                message: 'Schema parsing failed',
                extensions: {
                  code: 'ErrorInvalidSchema'
                }
              }
            ]
          }
        }
      };
      mockedAxios.post.mockRejectedValue(dgraphError);

      await expect(pushSchemaToTarget(mockSchema, 'local'))
        .rejects.toMatchObject({
          response: {
            status: 400,
            data: {
              errors: expect.arrayContaining([
                expect.objectContaining({
                  message: 'Schema parsing failed'
                })
              ])
            }
          }
        });
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('timeout of 5000ms exceeded');
      timeoutError.code = 'ECONNABORTED';
      mockedAxios.post.mockRejectedValue(timeoutError);

      await expect(pushSchemaToTarget(mockSchema, 'local'))
        .rejects.toThrow('timeout of 5000ms exceeded');
    });

    it('should validate target parameter', async () => {
      await expect(pushSchemaToTarget(mockSchema, 'invalid'))
        .rejects.toThrow('Invalid target: invalid. Must be "local" or "remote"');
    });

    it('should validate schema parameter', async () => {
      await expect(pushSchemaToTarget('', 'local'))
        .rejects.toThrow('Schema content cannot be empty');

      await expect(pushSchemaToTarget(null, 'local'))
        .rejects.toThrow('Schema content is required');

      await expect(pushSchemaToTarget(undefined, 'local'))
        .rejects.toThrow('Schema content is required');
    });

    it('should handle successful response with warnings', async () => {
      const mockResponse = {
        data: {
          code: 'Success',
          message: 'Schema updated with warnings',
          warnings: [
            'Deprecated directive used: @reverse'
          ]
        }
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await pushSchemaToTarget(mockSchema, 'local');

      expect(result).toEqual(mockResponse.data);
      expect(result.warnings).toHaveLength(1);
    });

    it('should preserve custom headers if provided', async () => {
      const mockResponse = { data: { code: 'Success' } };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const customHeaders = {
        'Authorization': 'Bearer token123',
        'X-Custom-Header': 'custom-value'
      };

      await pushSchemaToTarget(mockSchema, 'local', null, customHeaders);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8080/admin/schema',
        mockSchema,
        {
          headers: {
            'Content-Type': 'text/plain',
            ...customHeaders
          }
        }
      );
    });

    it('should handle malformed response data', async () => {
      const mockResponse = {
        data: 'Invalid JSON response'
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await pushSchemaToTarget(mockSchema, 'local');

      expect(result).toBe('Invalid JSON response');
    });
  });

  describe('URL construction', () => {
    it('should construct correct URLs for different targets', async () => {
      const mockResponse = { data: { code: 'Success' } };
      mockedAxios.post.mockResolvedValue(mockResponse);

      // Test local target
      await pushSchemaToTarget('type Node { id: String! @id }', 'local');
      expect(mockedAxios.post).toHaveBeenLastCalledWith(
        'http://localhost:8080/admin/schema',
        expect.any(String),
        expect.any(Object)
      );

      // Test remote target with custom URL
      await pushSchemaToTarget(
        'type Node { id: String! @id }', 
        'remote', 
        'https://prod-dgraph.example.com:443'
      );
      expect(mockedAxios.post).toHaveBeenLastCalledWith(
        'https://prod-dgraph.example.com:443/admin/schema',
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should handle URLs with trailing slashes', async () => {
      const mockResponse = { data: { code: 'Success' } };
      mockedAxios.post.mockResolvedValue(mockResponse);

      await pushSchemaToTarget(
        'type Node { id: String! @id }', 
        'remote', 
        'https://dgraph.example.com:8080/'
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://dgraph.example.com:8080/admin/schema',
        expect.any(String),
        expect.any(Object)
      );
    });
  });
});
