import { pushSchemaViaHttp } from '../../../utils/pushSchema';
import axios, { AxiosResponse } from 'axios'; // Import axios and AxiosResponse for typing

// Mock axios with explicit types
const mockPost = jest.fn() as jest.Mock<Promise<AxiosResponse<any>>>; // Type the mock post function as returning a Promise of AxiosResponse
jest.mock('axios', () => ({
  post: mockPost
}));


// Define interfaces for response and error structures
interface SuccessResponseData {
  code?: string; // Dgraph success code
  message?: string; // Dgraph success message
  // Add other potential success properties
  [key: string]: any; // Allow for other properties
}

interface ErrorResponseData {
  error?: string; // Dgraph error message
  // Add other potential error properties
  [key: string]: any; // Allow for other properties
}

interface MockAxiosResponse<T> {
  status: number;
  data: T;
  statusText: string; // Make statusText required
  headers: any; // Add headers property
  config: any; // Add config property
}

interface MockAxiosError extends Error {
  response?: MockAxiosResponse<ErrorResponseData>;
  request?: any; // Axios request object
  code?: string; // Error code (e.g., ECONNABORTED)
}


describe('pushSchema Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('pushSchemaViaHttp', () => {
    const mockSchema = 'type Node { id: String! @id label: String! }';
    const adminUrl = 'http://localhost:8080/admin/schema';

    it('should successfully push schema', async () => {
      const mockResponse: MockAxiosResponse<SuccessResponseData> = {
        status: 200,
        data: { code: 'Success', message: 'Done' },
        statusText: 'OK', // Added statusText
        headers: {}, // Added headers
        config: {} // Added config
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
      const networkError: MockAxiosError = new Error('Network Error');
      mockPost.mockRejectedValueOnce(Promise.reject(networkError));

      const result = await pushSchemaViaHttp(mockSchema, null, adminUrl);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network Error');
      expect(result.namespace).toBe(null);
    });

    it('should handle Dgraph error responses', async () => {
      const dgraphError: MockAxiosError = new Error('Schema validation failed');
      dgraphError.response = {
        status: 400,
        data: { error: 'Invalid schema syntax' },
        statusText: 'Bad Request', // Added statusText
        headers: {}, // Added headers
        config: {} // Added config
      };
      mockPost.mockRejectedValueOnce(Promise.reject(dgraphError));

      const result = await pushSchemaViaHttp(mockSchema, null, adminUrl);

      expect(result.success).toBe(false);
      expect(result.error).toEqual({ error: 'Invalid schema syntax' });
      expect(result.namespace).toBe(null);
    });

    it('should handle timeout errors', async () => {
      const timeoutError: MockAxiosError = new Error('timeout of 5000ms exceeded');
      timeoutError.code = 'ECONNABORTED';
      mockPost.mockRejectedValueOnce(Promise.reject(timeoutError));

      const result = await pushSchemaViaHttp(mockSchema, null, adminUrl);

      expect(result.success).toBe(false);
      expect(result.error).toBe('timeout of 5000ms exceeded');
      expect(result.namespace).toBe(null);
    });

    it('should use correct headers', async () => {
      const mockResponse: MockAxiosResponse<SuccessResponseData> = {
        status: 200,
        data: { code: 'Success', message: 'Done' },
        statusText: 'OK', // Added statusText
        headers: {}, // Added headers
        config: {} // Added config
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
      const mockResponse: MockAxiosResponse<SuccessResponseData> = {
        status: 200,
        data: { message: 'Schema updated successfully' },
        statusText: 'OK', // Added statusText
        headers: {}, // Added headers
        config: {} // Added config
      };
      mockPost.mockResolvedValueOnce(mockResponse);

      const result = await pushSchemaViaHttp(mockSchema, null, adminUrl);

      expect(result.success).toBe(true);
      expect(result.response).toEqual({ message: 'Schema updated successfully' });
      expect(result.namespace).toBe(null);
    });

    it('should handle errors without response data', async () => {
      const error: MockAxiosError = new Error('Connection refused');
      // No response property
      mockPost.mockRejectedValueOnce(Promise.reject(error));

      const result = await pushSchemaViaHttp(mockSchema, null, adminUrl);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection refused');
      expect(result.namespace).toBe(null);
    });
  });
});
