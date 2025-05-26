const { jest } = require('@jest/globals');
const { checkDgraphHealth, dropAllData } = require('../../../utils/dgraphAdmin');

// Mock axios
jest.mock('axios');
const axios = require('axios');

describe('dgraphAdmin utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DGRAPH_BASE_URL = 'http://localhost:8080';
  });

  describe('checkDgraphHealth', () => {
    it('should return healthy status when Dgraph is accessible', async () => {
      axios.get.mockResolvedValueOnce({
        status: 200,
        data: { status: 'healthy' }
      });

      const result = await checkDgraphHealth();

      expect(result.status).toBe('healthy');
      expect(axios.get).toHaveBeenCalledWith('http://localhost:8080/health');
    });

    it('should return unhealthy status when Dgraph is not accessible', async () => {
      axios.get.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await checkDgraphHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Connection refused');
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('timeout of 5000ms exceeded');
      timeoutError.code = 'ECONNABORTED';
      axios.get.mockRejectedValueOnce(timeoutError);

      const result = await checkDgraphHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toContain('timeout');
    });
  });

  describe('dropAllData', () => {
    it('should successfully drop all data', async () => {
      axios.post.mockResolvedValueOnce({
        status: 200,
        data: { message: 'Data dropped successfully' }
      });

      const result = await dropAllData();

      expect(result.success).toBe(true);
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:8080/alter',
        { drop_all: true },
        expect.any(Object)
      );
    });

    it('should handle drop operation failures', async () => {
      axios.post.mockRejectedValueOnce(new Error('Drop operation failed'));

      const result = await dropAllData();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Drop operation failed');
    });

    it('should use correct headers for drop operation', async () => {
      axios.post.mockResolvedValueOnce({
        status: 200,
        data: { message: 'Data dropped successfully' }
      });

      await dropAllData();

      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:8080/alter',
        { drop_all: true },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
    });
  });
});
