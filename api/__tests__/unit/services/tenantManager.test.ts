import { TenantManager } from '../../../services/tenantManager';
import { DgraphTenantFactory } from '../../../services/dgraphTenant';

describe('TenantManager', () => {
  let tenantManager: TenantManager;

  beforeAll(() => {
    tenantManager = new TenantManager();
  });

  describe('generateNamespaceId', () => {
    it('should generate consistent namespace IDs for the same tenant', () => {
      const tenantId = 'test-user-123';
      const namespace1 = tenantManager.generateNamespaceId(tenantId);
      const namespace2 = tenantManager.generateNamespaceId(tenantId);
      
      expect(namespace1).toBe(namespace2);
      expect(namespace1).toMatch(/^0x[0-9a-f]+$/);
    });

    it('should handle special tenant IDs', () => {
      expect(tenantManager.generateNamespaceId('test-tenant')).toBe('0x1');
      expect(tenantManager.generateNamespaceId('default')).toBe('0x0');
    });

    it('should generate different namespaces for different tenants', () => {
      const namespace1 = tenantManager.generateNamespaceId('user-1');
      const namespace2 = tenantManager.generateNamespaceId('user-2');
      
      expect(namespace1).not.toBe(namespace2);
    });
  });

  describe('getTenantNamespace', () => {
    it('should return namespace for tenant ID', async () => {
      const namespace = await tenantManager.getTenantNamespace('test-tenant');
      expect(namespace).toBe('0x1');
    });
  });

  describe('getTenantInfo', () => {
    it('should return tenant information', async () => {
      const info = await tenantManager.getTenantInfo('test-tenant');
      
      expect(info).toEqual({
        tenantId: 'test-tenant',
        namespace: '0x1',
        exists: expect.any(Boolean),
        health: expect.any(String),
        healthDetails: expect.any(String),
        isTestTenant: true,
        isDefaultTenant: false
      });
      
      // Verify health is one of the expected values
      expect(['healthy', 'not-accessible', 'error', 'unknown']).toContain(info.health);
    });

    it('should identify default tenant', async () => {
      const info = await tenantManager.getTenantInfo('default');
      
      expect(info).toEqual({
        tenantId: 'default',
        namespace: '0x0',
        exists: expect.any(Boolean),
        health: expect.any(String),
        healthDetails: expect.any(String),
        isTestTenant: false,
        isDefaultTenant: true
      });
      
      // Verify health is one of the expected values
      expect(['healthy', 'not-accessible', 'error', 'unknown']).toContain(info.health);
    });
  });
});

describe('DgraphTenantFactory', () => {
  describe('createTenant', () => {
    it('should create tenant with namespace', () => {
      const tenant = DgraphTenantFactory.createTenant('0x1');
      
      expect(tenant.getNamespace()).toBe('0x1');
      expect(tenant.isDefaultNamespace()).toBe(false);
    });

    it('should create default tenant', () => {
      const tenant = DgraphTenantFactory.createDefaultTenant();
      
      expect(tenant.getNamespace()).toBeNull();
      expect(tenant.isDefaultNamespace()).toBe(true);
    });

    it('should create test tenant', () => {
      const tenant = DgraphTenantFactory.createTestTenant();
      
      expect(tenant.getNamespace()).toBe('0x1');
      expect(tenant.isDefaultNamespace()).toBe(false);
    });
  });

  describe('createTenantFromContext', () => {
    it('should create tenant from context', () => {
      const context = {
        tenantId: 'test-tenant',
        namespace: '0x1',
        isTestTenant: true
      };
      
      const tenant = DgraphTenantFactory.createTenantFromContext(context);
      
      expect(tenant.getNamespace()).toBe('0x1');
    });

    it('should handle missing context', () => {
      const tenant = DgraphTenantFactory.createTenantFromContext(undefined);
      
      expect(tenant.getNamespace()).toBeNull();
      expect(tenant.isDefaultNamespace()).toBe(true);
    });
  });
});
