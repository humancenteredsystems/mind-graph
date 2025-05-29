import axios from 'axios';
import { TestMockFactory } from '../../helpers/mockFactory';
import { isAxiosError, getErrorMessage, getErrorData } from '../../helpers/graphqlTestUtils';

// Mock axios first
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock config completely to avoid dotenv issues
jest.mock('../../../config', () => TestMockFactory.createConfigMock());

// Import after mocking
import { pushSchemaViaHttp } from '../../../utils/pushSchema';

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
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await pushSchemaViaHttp(mockSchema, null, adminUrl);

      expect(result.success).toBe(true);
      expect(result.response).toEqual({ code: 'Success', message: 'Done' });
      expect(mockedAxios.post).toHaveBeenCalledWith(
        adminUrl,
        mockSchema,
        { headers: { 'Content-Type': 'application/graphql' } }
      );
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockedAxios.post.mockRejectedValueOnce(networkError);

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
      mockedAxios.post.mockRejectedValueOnce(dgraphError);

      const result = await pushSchemaViaHttp(mockSchema, null, adminUrl);

      expect(result.success).toBe(false);
      expect(result.error).toEqual({ error: 'Invalid schema syntax' });
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('timeout of 5000ms exceeded') as any;
      timeoutError.code = 'ECONNABORTED';
      mockedAxios.post.mockRejectedValueOnce(timeoutError);

      const result = await pushSchemaViaHttp(mockSchema, null, adminUrl);

      expect(result.success).toBe(false);
      expect(result.error).toBe('timeout of 5000ms exceeded');
    });

    it('should use correct headers', async () => {
      const mockResponse = {
        status: 200,
        data: { code: 'Success', message: 'Done' }
      };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      await pushSchemaViaHttp(mockSchema, null, adminUrl);

      expect(mockedAxios.post).toHaveBeenCalledWith(
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
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await pushSchemaViaHttp(mockSchema, null, adminUrl);

      expect(result.success).toBe(true);
      expect(result.response).toEqual({ message: 'Schema updated successfully' });
    });

    it('should handle errors without response data', async () => {
      const error = new Error('Connection refused');
      mockedAxios.post.mockRejectedValueOnce(error);

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
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await pushSchemaViaHttp(mockSchema, null, adminUrl);

      expect(result.success).toBe(true);
      expect(result.response).toEqual({ code: 'Success', message: 'Done' });
    });

    it('should use default config URL when no custom URL provided', async () => {
      const mockResponse = {
        status: 200,
        data: { code: 'Success', message: 'Done' }
      };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      await pushSchemaViaHttp(mockSchema, null, null);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8080/admin/schema',
        mockSchema,
        { headers: { 'Content-Type': 'application/graphql' } }
      );
    });

    it('should handle namespace parameter', async () => {
      const mockResponse = {
        status: 200,
        data: { code: 'Success', message: 'Done' }
      };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      await pushSchemaViaHttp(mockSchema, '0x1', adminUrl);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${adminUrl}?namespace=0x1`,
        mockSchema,
        { headers: { 'Content-Type': 'application/graphql' } }
      );
    });
  });
});
