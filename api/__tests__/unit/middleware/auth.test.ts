import { Request, Response, NextFunction } from 'express';
import { authenticateAdmin } from '../../../middleware/auth';

describe('auth middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock<NextFunction>;

  beforeEach(() => {
    // Use global testUtils which is typed in jest.setup.ts
    req = global.testUtils.createMockReq();
    res = global.testUtils.createMockRes();
    next = global.testUtils.createMockNext();
  });

  describe('authenticateAdmin', () => {
    it('should call next() with valid API key', () => {
      // Ensure headers is defined before accessing it
      if (!req.headers) {
        req.headers = {};
      }
      req.headers['x-admin-api-key'] = process.env.ADMIN_API_KEY;

      authenticateAdmin(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 with missing API key', () => {
      // Ensure headers is defined before accessing it
      if (req.headers) {
        delete req.headers['x-admin-api-key'];
      }

      authenticateAdmin(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 with invalid API key', () => {
      // Ensure headers is defined before accessing it
      if (!req.headers) {
        req.headers = {};
      }
      req.headers['x-admin-api-key'] = 'invalid-key';

      authenticateAdmin(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when environment variable is missing', () => {
      const originalAdminApiKey = process.env.ADMIN_API_KEY;
      delete process.env.ADMIN_API_KEY;
      // Ensure headers is defined before accessing it
      if (!req.headers) {
        req.headers = {};
      }
      req.headers['x-admin-api-key'] = 'any-key';

      authenticateAdmin(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized'
      });
      expect(next).not.toHaveBeenCalled();

      // Restore the original environment variable
      process.env.ADMIN_API_KEY = originalAdminApiKey;
    });

    it('should work with different header casing (Express normalizes to lowercase)', () => {
      // Ensure headers is defined before accessing it
      if (!req.headers) {
        req.headers = {};
      }
      req.headers['X-Admin-API-Key'] = process.env.ADMIN_API_KEY;

      authenticateAdmin(req as Request, res as Response, next);

      // Should succeed because Express normalizes headers to lowercase
      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
