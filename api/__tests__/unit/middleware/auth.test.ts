import { authenticateAdmin } from '../../../middleware/auth';
import { Request, Response, NextFunction } from 'express';

describe('auth middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = global.testUtils.createMockReq();
    res = global.testUtils.createMockRes();
    next = global.testUtils.createMockNext();
    
    // ADMIN_API_KEY is already loaded from .env file via jest.setup.ts
  });

  describe('authenticateAdmin', () => {
    it('should call next() with valid API key', () => {
      req.headers = { 'x-admin-api-key': process.env.ADMIN_API_KEY };
      
      authenticateAdmin(req as Request, res as Response, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 with missing API key', () => {
      authenticateAdmin(req as Request, res as Response, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 with invalid API key', () => {
      req.headers = { 'x-admin-api-key': 'invalid-key' };
      
      authenticateAdmin(req as Request, res as Response, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when environment variable is missing', () => {
      delete process.env.ADMIN_API_KEY;
      req.headers = { 'x-admin-api-key': 'any-key' };
      
      authenticateAdmin(req as Request, res as Response, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle different header case (Express normalizes headers)', () => {
      // Express.js automatically normalizes headers to lowercase
      // So 'X-Admin-API-Key' becomes 'x-admin-api-key'
      req.headers = { 'X-Admin-API-Key': process.env.ADMIN_API_KEY };
      
      authenticateAdmin(req as Request, res as Response, next);
      
      // Should succeed because Express normalizes the header name
      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
