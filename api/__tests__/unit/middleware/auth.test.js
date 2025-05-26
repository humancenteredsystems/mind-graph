const { jest } = require('@jest/globals');
const { validateAdminApiKey } = require('../../../middleware/auth');

describe('auth middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = testUtils.createMockReq();
    res = testUtils.createMockRes();
    next = testUtils.createMockNext();
    
    // Set up environment
    process.env.ADMIN_API_KEY = 'test-admin-key';
  });

  describe('validateAdminApiKey', () => {
    it('should call next() with valid API key', () => {
      req.headers['x-admin-api-key'] = 'test-admin-key';
      
      validateAdminApiKey(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 with missing API key', () => {
      validateAdminApiKey(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Admin API key required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 with invalid API key', () => {
      req.headers['x-admin-api-key'] = 'invalid-key';
      
      validateAdminApiKey(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid admin API key'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle missing environment variable', () => {
      delete process.env.ADMIN_API_KEY;
      req.headers['x-admin-api-key'] = 'any-key';
      
      validateAdminApiKey(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Admin API key not configured'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should be case-insensitive for header name', () => {
      req.headers['X-Admin-API-Key'] = 'test-admin-key';
      
      validateAdminApiKey(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
    });
  });
});
