import request from 'supertest';
import express from 'express';

// Create a simple CORS middleware for testing (copied from server.ts logic)
const createCorsMiddleware = (corsOrigin: string) => {
  return (req: any, res: any, next: any) => {
    const allowedOrigin = corsOrigin;
    res.set('Access-Control-Allow-Origin', allowedOrigin);
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Hierarchy-Id, X-Tenant-Id');
    
    // Allow credentials for specific origins (required by browser if frontend sends cookies/auth)
    if (allowedOrigin !== '*') {
      res.set('Access-Control-Allow-Credentials', 'true');
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  };
};

describe('CORS Middleware', () => {
  describe('when CORS_ORIGIN is set to specific domain', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(createCorsMiddleware('https://makeitmakesense.io'));
      app.get('/test', (req: any, res: any) => res.json({ status: 'ok' }));
    });

    it('should include Access-Control-Allow-Credentials header for OPTIONS requests', async () => {
      const response = await request(app)
        .options('/test')
        .set('Origin', 'https://makeitmakesense.io')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Content-Type');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('https://makeitmakesense.io');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
      expect(response.headers['access-control-allow-methods']).toBe('GET, POST, OPTIONS');
      expect(response.headers['access-control-allow-headers']).toBe('Content-Type, Authorization, X-Hierarchy-Id, X-Tenant-Id');
    });

    it('should include Access-Control-Allow-Credentials header for GET requests', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'https://makeitmakesense.io');

      expect(response.headers['access-control-allow-origin']).toBe('https://makeitmakesense.io');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('when CORS_ORIGIN is set to wildcard', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(createCorsMiddleware('*'));
      app.get('/test', (req: any, res: any) => res.json({ status: 'ok' }));
    });

    it('should NOT include Access-Control-Allow-Credentials header', async () => {
      const response = await request(app)
        .options('/test')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-credentials']).toBeUndefined();
    });
  });
});
