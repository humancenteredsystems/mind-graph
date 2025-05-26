const { authenticateAdmin } = require('../../../middleware/auth');

describe('auth middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = testUtils.createMockReq();
    res = testUtils.createMockRes();
    next = testUtils.createMockNext();
    
    // Set up environment
    process.env.ADMIN_API_KEY = 'test-admin-key';
  });

  describe('authenticateAdmin', () => {
    it('should call next() with valid API key', () => {
      req.headers['x-admin-api-key'] = 'test-admin-key';
      
      authenticateAdmin(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 with missing API key', () => {
      authenticateAdmin(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 with invalid API key', () => {
      req.headers['x-admin-api-key'] = 'invalid-key';
      
      authenticateAdmin(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when environment variable is missing', () => {
      delete process.env.ADMIN_API_KEY;
      req.headers['x-admin-api-key'] = 'any-key';
      
      authenticateAdmin(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should be case-sensitive for header name', () => {
      req.headers['X-Admin-API-Key'] = 'test-admin-key';
      
      authenticateAdmin(req, res, next);
      
      // Should fail because header is case-sensitive
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
