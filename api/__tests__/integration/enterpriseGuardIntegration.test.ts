import request from 'supertest';
import express from 'express';
import { 
  requireEnterprise, 
  requireNamespaceSupport, 
  validateTenantCapabilities,
  protectTenantManagement,
  protectNamespaceOperation 
} from '../../middleware/enterpriseGuards';

// Mock the adaptiveTenantFactory
jest.mock('../../services/adaptiveTenantFactory', () => ({
  adaptiveTenantFactory: {
    getCapabilities: jest.fn()
  }
}));

// Mock tenant manager
jest.mock('../../services/tenantManager', () => ({
  TenantManager: jest.fn().mockImplementation(() => ({
    createTenant: jest.fn().mockResolvedValue('0x1'),
    deleteTenant: jest.fn().mockResolvedValue(undefined),
    listTenants: jest.fn().mockResolvedValue([]),
    getTenantInfo: jest.fn().mockResolvedValue({ tenantId: 'test', namespace: '0x1' })
  }))
}));

import { adaptiveTenantFactory } from '../../services/adaptiveTenantFactory';

describe('Enterprise Guard Integration Tests', () => {
  let app: express.Application;
  const mockGetCapabilities = adaptiveTenantFactory.getCapabilities as jest.MockedFunction<typeof adaptiveTenantFactory.getCapabilities>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Add tenant context middleware mock
    app.use((req, res, next) => {
      req.tenantContext = {
        tenantId: 'test-tenant',
        namespace: '0x1',
        isTestTenant: false,
        isDefaultTenant: false
      };
      next();
    });
    
    jest.clearAllMocks();
  });

  describe('Enterprise-only endpoints', () => {
    beforeEach(() => {
      // Add protected route for testing
      app.post('/api/test/enterprise-only', 
        requireEnterprise('test enterprise operation'),
        (req, res) => {
          res.json({ success: true });
        }
      );
    });

    it('should allow access when Enterprise is detected', async () => {
      mockGetCapabilities.mockReturnValue({
        enterpriseDetected: true,
        namespacesSupported: true,
        detectedAt: new Date()
      });

      const response = await request(app)
        .post('/api/test/enterprise-only')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject access when Enterprise is not detected', async () => {
      mockGetCapabilities.mockReturnValue({
        enterpriseDetected: false,
        namespacesSupported: false,
        detectedAt: new Date()
      });

      const response = await request(app)
        .post('/api/test/enterprise-only')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ENTERPRISE_FEATURE_NOT_AVAILABLE');
      expect(response.body.details.currentMode).toBe('oss-single-tenant');
      expect(response.body.details.suggestion).toContain('Upgrade to Dgraph Enterprise');
    });
  });

  describe('Namespace-protected endpoints', () => {
    beforeEach(() => {
      app.post('/api/test/namespace-required', 
        requireNamespaceSupport('test namespace operation'),
        (req, res) => {
          res.json({ success: true });
        }
      );
    });

    it('should allow access when namespaces are supported', async () => {
      mockGetCapabilities.mockReturnValue({
        enterpriseDetected: true,
        namespacesSupported: true,
        detectedAt: new Date()
      });

      const response = await request(app)
        .post('/api/test/namespace-required')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject access when namespaces are not supported', async () => {
      mockGetCapabilities.mockReturnValue({
        enterpriseDetected: false,
        namespacesSupported: false,
        detectedAt: new Date()
      });

      const response = await request(app)
        .post('/api/test/namespace-required')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('NAMESPACE_NOT_SUPPORTED');
      expect(response.body.details.namespace).toBe('0x1');
      expect(response.body.details.suggestion).toContain('Upgrade to Dgraph Enterprise');
    });
  });

  describe('Tenant validation middleware', () => {
    beforeEach(() => {
      app.post('/api/test/tenant-validation', 
        validateTenantCapabilities('test tenant operation'),
        (req, res) => {
          res.json({ success: true });
        }
      );
    });

    it('should allow default tenant regardless of capabilities', async () => {
      // Create a fresh app with default tenant context
      const testApp = express();
      testApp.use(express.json());
      
      // Set default tenant context
      testApp.use((req, res, next) => {
        req.tenantContext = {
          tenantId: 'default',
          namespace: null,
          isTestTenant: false,
          isDefaultTenant: true
        };
        next();
      });

      testApp.post('/api/test/tenant-validation', 
        validateTenantCapabilities('test tenant operation'),
        (req, res) => {
          res.json({ success: true });
        }
      );

      mockGetCapabilities.mockReturnValue({
        enterpriseDetected: false,
        namespacesSupported: false,
        detectedAt: new Date()
      });

      const response = await request(testApp)
        .post('/api/test/tenant-validation')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should validate non-default tenant capabilities', async () => {
      mockGetCapabilities.mockReturnValue({
        enterpriseDetected: false,
        namespacesSupported: false,
        detectedAt: new Date()
      });

      const response = await request(app)
        .post('/api/test/tenant-validation')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('NAMESPACE_NOT_SUPPORTED');
    });
  });

  describe('Composite middleware protection', () => {
    beforeEach(() => {
      // Test the full tenant management protection
      app.post('/api/test/tenant-mgmt', 
        ...protectTenantManagement('tenant management test'),
        (req, res) => {
          res.json({ success: true });
        }
      );
      
      // Test namespace operation protection
      app.post('/api/test/namespace-op', 
        ...protectNamespaceOperation('namespace operation test'),
        (req, res) => {
          res.json({ success: true });
        }
      );
    });

    it('should protect tenant management operations comprehensively', async () => {
      mockGetCapabilities.mockReturnValue({
        enterpriseDetected: true,
        namespacesSupported: true,
        detectedAt: new Date()
      });

      const response = await request(app)
        .post('/api/test/tenant-mgmt')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Note: protectTenantManagement doesn't include headers, only protectNamespaceOperation does
    });

    it('should reject tenant management in OSS mode', async () => {
      mockGetCapabilities.mockReturnValue({
        enterpriseDetected: false,
        namespacesSupported: false,
        detectedAt: new Date()
      });

      const response = await request(app)
        .post('/api/test/tenant-mgmt')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ENTERPRISE_FEATURE_NOT_AVAILABLE');
    });

    it('should add capability headers for namespace operations', async () => {
      // Create a test app with default tenant to avoid validation failures
      const testApp = express();
      testApp.use(express.json());
      
      testApp.use((req, res, next) => {
        req.tenantContext = {
          tenantId: 'default',
          namespace: null,
          isTestTenant: false,
          isDefaultTenant: true
        };
        next();
      });

      testApp.post('/api/test/namespace-op', 
        ...protectNamespaceOperation('namespace operation test'),
        (req, res) => {
          res.json({ success: true });
        }
      );

      mockGetCapabilities.mockReturnValue({
        enterpriseDetected: false,
        namespacesSupported: false,
        detectedAt: new Date()
      });

      const response = await request(testApp)
        .post('/api/test/namespace-op')
        .send({});

      expect(response.status).toBe(200);
      expect(response.get('X-Dgraph-Enterprise')).toBe('false');
      expect(response.get('X-Dgraph-Namespaces')).toBe('false');
      expect(response.get('X-Dgraph-Mode')).toBe('oss-single-tenant');
    });
  });

  describe('Error handling and suggestion system', () => {
    beforeEach(() => {
      app.post('/api/test/error-handling', 
        requireNamespaceSupport('error handling test'),
        (req, res) => {
          res.json({ success: true });
        }
      );
    });

    it('should provide appropriate suggestion for Enterprise detected but namespaces unavailable', async () => {
      mockGetCapabilities.mockReturnValue({
        enterpriseDetected: true,
        namespacesSupported: false,
        detectedAt: new Date()
      });

      const response = await request(app)
        .post('/api/test/error-handling')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('NAMESPACE_NOT_SUPPORTED');
      expect(response.body.details.suggestion).toContain('Upgrade to Dgraph Enterprise');
      expect(response.body.details.currentMode).toBe('enterprise-single-tenant');
      expect(response.body.details.namespace).toBe('0x1');
    });

    it('should provide upgrade suggestion for OSS mode', async () => {
      mockGetCapabilities.mockReturnValue({
        enterpriseDetected: false,
        namespacesSupported: false,
        detectedAt: new Date()
      });

      const response = await request(app)
        .post('/api/test/error-handling')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('NAMESPACE_NOT_SUPPORTED');
      expect(response.body.details.suggestion).toContain('Upgrade to Dgraph Enterprise');
      expect(response.body.details.currentMode).toBe('oss-single-tenant');
      expect(response.body.details.namespace).toBe('0x1');
    });
  });
});
