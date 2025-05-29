const { authenticateAdmin } = require('../../../middleware/auth');

describe('auth middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = testUtils.createMockReq();
    res = testUtils.createMockRes();
    next = testUtils.createMockNext();
  });

  describe('authenticateAdmin', () => {
    it('should call next() with valid API key', () => {
      req.headers['x-admin-api-key'] = process.env.ADMIN_API_KEY;
      
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

    it('should work with different header casing (Express normalizes to lowercase)', () => {
      req.headers['X-Admin-API-Key'] = process.env.ADMIN_API_KEY;
      
      authenticateAdmin(req, res, next);
      
      // Should succeed because Express normalizes headers to lowercase
      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
