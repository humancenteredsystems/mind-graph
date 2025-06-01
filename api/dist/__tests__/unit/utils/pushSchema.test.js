"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Mock config
jest.mock('../../../config', () => ({
    __esModule: true,
    default: {
        dgraphAdminUrl: 'http://localhost:8080/admin/schema',
        dgraphBaseUrl: 'http://localhost:8080',
        port: 3001
    }
}));
const axios_1 = __importDefault(require("axios"));
const pushSchema_1 = require("../../../utils/pushSchema");
// Get the mocked axios (manual mock will be used automatically)
const mockedAxios = axios_1.default;
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
            const result = await (0, pushSchema_1.pushSchemaViaHttp)(mockSchema, null, adminUrl);
            expect(result.success).toBe(true);
            expect(result.response).toEqual({ code: 'Success', message: 'Done' });
            expect(mockedAxios.post).toHaveBeenCalledWith(adminUrl, mockSchema, { headers: { 'Content-Type': 'application/graphql' } });
        });
        it('should handle network errors', async () => {
            const networkError = new Error('Network Error');
            mockedAxios.post.mockRejectedValueOnce(networkError);
            const result = await (0, pushSchema_1.pushSchemaViaHttp)(mockSchema, null, adminUrl);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Network Error');
        });
        it('should handle Dgraph error responses', async () => {
            const dgraphError = new Error('Schema validation failed');
            dgraphError.response = {
                status: 400,
                data: { error: 'Invalid schema syntax' }
            };
            mockedAxios.post.mockRejectedValueOnce(dgraphError);
            const result = await (0, pushSchema_1.pushSchemaViaHttp)(mockSchema, null, adminUrl);
            expect(result.success).toBe(false);
            expect(result.error).toEqual({ error: 'Invalid schema syntax' });
        });
        it('should handle timeout errors', async () => {
            const timeoutError = new Error('timeout of 5000ms exceeded');
            timeoutError.code = 'ECONNABORTED';
            mockedAxios.post.mockRejectedValueOnce(timeoutError);
            const result = await (0, pushSchema_1.pushSchemaViaHttp)(mockSchema, null, adminUrl);
            expect(result.success).toBe(false);
            expect(result.error).toBe('timeout of 5000ms exceeded');
        });
        it('should use correct headers', async () => {
            const mockResponse = {
                status: 200,
                data: { code: 'Success', message: 'Done' }
            };
            mockedAxios.post.mockResolvedValueOnce(mockResponse);
            await (0, pushSchema_1.pushSchemaViaHttp)(mockSchema, null, adminUrl);
            expect(mockedAxios.post).toHaveBeenCalledWith(adminUrl, mockSchema, { headers: { 'Content-Type': 'application/graphql' } });
        });
        it('should handle successful response with different data format', async () => {
            const mockResponse = {
                status: 200,
                data: { code: 'Success', message: 'Done' }
            };
            mockedAxios.post.mockResolvedValueOnce(mockResponse);
            const result = await (0, pushSchema_1.pushSchemaViaHttp)(mockSchema, null, adminUrl);
            expect(result.success).toBe(true);
            expect(result.response).toEqual({ code: 'Success', message: 'Done' });
        });
        it('should handle errors without response data', async () => {
            const error = new Error('Connection refused');
            mockedAxios.post.mockRejectedValueOnce(error);
            const result = await (0, pushSchema_1.pushSchemaViaHttp)(mockSchema, null, adminUrl);
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
            const result = await (0, pushSchema_1.pushSchemaViaHttp)(mockSchema, null, adminUrl);
            expect(result.success).toBe(true);
            expect(result.response).toEqual({ code: 'Success', message: 'Done' });
        });
        it('should use default config URL when no custom URL provided', async () => {
            const mockResponse = {
                status: 200,
                data: { code: 'Success', message: 'Done' }
            };
            mockedAxios.post.mockResolvedValueOnce(mockResponse);
            await (0, pushSchema_1.pushSchemaViaHttp)(mockSchema, null, null);
            expect(mockedAxios.post).toHaveBeenCalledWith('http://localhost:8080/admin/schema', mockSchema, { headers: { 'Content-Type': 'application/graphql' } });
        });
        it('should handle namespace parameter', async () => {
            const mockResponse = {
                status: 200,
                data: { code: 'Success', message: 'Done' }
            };
            mockedAxios.post.mockResolvedValueOnce(mockResponse);
            await (0, pushSchema_1.pushSchemaViaHttp)(mockSchema, '0x1', adminUrl);
            expect(mockedAxios.post).toHaveBeenCalledWith(`${adminUrl}?namespace=0x1`, mockSchema, { headers: { 'Content-Type': 'application/graphql' } });
        });
    });
});
