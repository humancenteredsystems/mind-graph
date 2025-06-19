// Mock config before any imports
jest.mock('../../../config', () => ({
  default: {
    dgraphAdminUrl: 'http://localhost:8080/admin/schema',
    dgraphBaseUrl: 'http://localhost:8080',
    port: 3001
  }
}));

import { pushSchemaViaHttp } from '../../../utils/pushSchema';
import axios from 'axios';

describe('pushSchema Utility', () => {
  let mockedAxiosPost: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // Set up the spy in beforeEach to ensure it's applied after module loading
    mockedAxiosPost = jest.spyOn(axios, 'post').mockImplementation();
  });

  afterEach(() => {
    mockedAxiosPost.mockRestore();
  });

  describe('pushSchemaViaHttp', () => {
    const mockSchema = 'type Node { id: String! @id label: String! }';
    const adminUrl = 'http://localhost:8080/admin/schema';

    it('should successfully push schema', async () => {
      const mockResponse = {
        status: 200,
        data: { code: 'Success', message: 'Done' }
      };
      mockedAxiosPost.mockResolvedValueOnce(mockResponse);

      const result = await pushSchemaViaHttp(mockSchema, null, adminUrl);

      expect(result.success).toBe(true);
      expect(result.response).toEqual({ code: 'Success', message: 'Done' });
      expect(mockedAxiosPost).toHaveBeenCalledWith(
        adminUrl,
        mockSchema,
        { 
          headers: { 'Content-Type': 'application/graphql' },
          timeout: 30000
        }
      );
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockedAxiosPost.mockRejectedValueOnce(networkError);

      const result = await pushSchemaViaHttp(mockSchema, null, adminUrl);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network Error');
    });

    it('should handle Dgraph error responses', async () => {
      const dgraphError = new Error('Schema validation failed') as any;
      dgraphError.response = {
        status: 400,
        data: { error: 'Invalid schema syntax' }
      };
      mockedAxiosPost.mockRejectedValueOnce(dgraphError);

      const result = await pushSchemaViaHttp(mockSchema, null, adminUrl);

      expect(result.success).toBe(false);
      expect(result.error).toEqual({
        status: 400,
        statusText: undefined,
        data: { error: 'Invalid schema syntax' },
        originalError: 'Schema validation failed'
      });
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('timeout of 5000ms exceeded') as any;
      timeoutError.code = 'ECONNABORTED';
      mockedAxiosPost.mockRejectedValueOnce(timeoutError);

      const result = await pushSchemaViaHttp(mockSchema, null, adminUrl);

      expect(result.success).toBe(false);
      expect(result.error).toBe('timeout of 5000ms exceeded');
    });

    it('should use correct headers', async () => {
      const mockResponse = {
        status: 200,
        data: { code: 'Success', message: 'Done' }
      };
      mockedAxiosPost.mockResolvedValueOnce(mockResponse);

      await pushSchemaViaHttp(mockSchema, null, adminUrl);

      expect(mockedAxiosPost).toHaveBeenCalledWith(
        adminUrl,
        mockSchema,
        { 
          headers: { 'Content-Type': 'application/graphql' },
          timeout: 30000
        }
      );
    });

    it('should handle successful response with different data format', async () => {
      const mockResponse = {
        status: 200,
        data: { code: 'Success', message: 'Done' }
      };
      mockedAxiosPost.mockResolvedValueOnce(mockResponse);

      const result = await pushSchemaViaHttp(mockSchema, null, adminUrl);

      expect(result.success).toBe(true);
      expect(result.response).toEqual({ code: 'Success', message: 'Done' });
    });

    it('should handle errors without response data', async () => {
      const error = new Error('Connection refused');
      mockedAxiosPost.mockRejectedValueOnce(error);

      const result = await pushSchemaViaHttp(mockSchema, null, adminUrl);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection refused');
    });

    it('should handle nested response data structure', async () => {
      const mockResponse = {
        status: 200,
        data: {
          data: { code: 'Success', message: 'Done' }
        }
      };
      mockedAxiosPost.mockResolvedValueOnce(mockResponse);

      const result = await pushSchemaViaHttp(mockSchema, null, adminUrl);

      expect(result.success).toBe(true);
      expect(result.response).toEqual({ code: 'Success', message: 'Done' });
    });

    it('should use default config URL when no custom URL provided', async () => {
      const mockResponse = {
        status: 200,
        data: { code: 'Success', message: 'Done' }
      };
      mockedAxiosPost.mockResolvedValueOnce(mockResponse);

      await pushSchemaViaHttp(mockSchema, null, null);

      expect(mockedAxiosPost).toHaveBeenCalledWith(
        'http://localhost:8080/admin/schema',
        mockSchema,
        { 
          headers: { 'Content-Type': 'application/graphql' },
          timeout: 30000
        }
      );
    });

    it('should handle namespace parameter', async () => {
      const mockResponse = {
        status: 200,
        data: { code: 'Success', message: 'Done' }
      };
      mockedAxiosPost.mockResolvedValueOnce(mockResponse);

      await pushSchemaViaHttp(mockSchema, '0x1', adminUrl);

      expect(mockedAxiosPost).toHaveBeenCalledWith(
        `${adminUrl}?namespace=0x1`, // eslint-disable-line enterprise/no-unguarded-namespace-usage
        mockSchema,
        { 
          headers: { 'Content-Type': 'application/graphql' },
          timeout: 30000
        }
      );
    });
  });
});
