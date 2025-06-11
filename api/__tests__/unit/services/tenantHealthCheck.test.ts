import { TenantManager } from '../../../services/tenantManager';
import { DgraphTenantFactory } from '../../../services/dgraphTenant';
import { adaptiveTenantFactory } from '../../../services/adaptiveTenantFactory';
import { TenantCapabilities } from '../../../src/types';

// Mock the adaptive tenant factory to control capability detection
jest.mock('../../../services/adaptiveTenantFactory');
const mockAdaptiveTenantFactory = adaptiveTenantFactory as jest.Mocked<typeof adaptiveTenantFactory>;

// Mock the DgraphTenantFactory to control GraphQL responses
jest.mock('../../../services/dgraphTenant');
const mockDgraphTenantFactory = DgraphTenantFactory as jest.Mocked<typeof DgraphTenantFactory>;

// Mock the capability helpers - but we'll use the real implementation that depends on adaptiveTenantFactory
import * as capabilityHelpers from '../../../utils/capabilityHelpers';

describe('TenantManager Health Check Bug (Issue #28)', () => {
  let tenantManager: TenantManager;
  let mockTenant: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock tenant with executeGraphQL method
    mockTenant = {
      executeGraphQL: jest.fn(),
      getNamespace: jest.fn(),
      isDefaultNamespace: jest.fn()
    };
    
    // Mock the factory to return our mock tenant
    mockDgraphTenantFactory.createTenant.mockResolvedValue(mockTenant);
    
    // Initialize tenant manager with mocked factory
    tenantManager = new TenantManager({
      tenantFactory: mockDgraphTenantFactory as any
    });
  });

  describe('Fixed Behavior (Issue #28 Resolved)', () => {
    beforeEach(() => {
      // Mock OSS mode capabilities (no multi-tenant support)
      const ossCapabilities: TenantCapabilities = {
        enterpriseDetected: false,
        namespacesSupported: false,
        detectedAt: new Date(),
        licenseType: 'oss-only'
      };
      mockAdaptiveTenantFactory.getCapabilities.mockReturnValue(ossCapabilities);
      
      // Mock successful queries for default namespace
      mockTenant.executeGraphQL
        .mockResolvedValue({ queryNode: [] }) // Connectivity query
        .mockResolvedValue({ __type: { name: 'Node' } }); // Schema verification
    });

    it('should correctly report test-tenant as not-accessible in OSS mode (fix verified)', async () => {
      const result = await tenantManager.checkTenantHealth('test-tenant', '0x1');
      
      // Fix verified - test-tenant now correctly shows as not-accessible in OSS mode
      expect(result.health).toBe('not-accessible');
      expect(result.details).toContain('not supported in OSS mode');
      
      // Verify no GraphQL calls were made for non-default namespaces in OSS mode
      expect(mockTenant.executeGraphQL).not.toHaveBeenCalled();
    });

    it('should correctly report default tenant as healthy in OSS mode', async () => {
      const result = await tenantManager.checkTenantHealth('default', '0x0');
      
      expect(result.health).toBe('healthy');
      expect(result.details).toContain('All health checks passed');
    });

    it('should only show default tenant in listTenants() in OSS mode (fix verified)', async () => {
      const tenants = await tenantManager.listTenants();
      
      // Fix verified - only accessible tenants appear in OSS mode
      expect(tenants).toHaveLength(1);
      expect(tenants[0].tenantId).toBe('default');
      expect(tenants[0].health).toBe('healthy');
    });
  });

  describe('Enterprise Mode Behavior (Should Not Change)', () => {
    // Note: These tests verify that the fix doesn't break Enterprise mode
    // In a real Enterprise environment, both tenants would be accessible
    
    it('should allow capability-aware logic to work in Enterprise mode', () => {
      // Mock Enterprise mode capabilities
      const enterpriseCapabilities: TenantCapabilities = {
        enterpriseDetected: true,
        namespacesSupported: true,
        detectedAt: new Date(),
        licenseType: 'enterprise-licensed'
      };
      mockAdaptiveTenantFactory.getCapabilities.mockReturnValue(enterpriseCapabilities);
      
      // Verify that isMultiTenantSupported returns true with Enterprise capabilities
      const isSupported = capabilityHelpers.isMultiTenantSupported();
      expect(isSupported).toBe(true);
    });

    it('should not block non-default namespaces when multi-tenant is supported', async () => {
      // Mock Enterprise mode capabilities
      const enterpriseCapabilities: TenantCapabilities = {
        enterpriseDetected: true,
        namespacesSupported: true,
        detectedAt: new Date(),
        licenseType: 'enterprise-licensed'
      };
      mockAdaptiveTenantFactory.getCapabilities.mockReturnValue(enterpriseCapabilities);
      
      // Mock successful GraphQL operations
      mockTenant.executeGraphQL
        .mockResolvedValueOnce({ queryNode: [] }) // Connectivity test
        .mockResolvedValueOnce({ __type: { name: 'Node' } }); // Schema verification
      
      const result = await tenantManager.checkTenantHealth('test-tenant', '0x1');
      
      // In Enterprise mode, the health check should proceed to GraphQL operations
      // rather than being blocked by capability checking
      expect(mockTenant.executeGraphQL).toHaveBeenCalled();
      expect(result.health).toBe('healthy');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      const ossCapabilities: TenantCapabilities = {
        enterpriseDetected: false,
        namespacesSupported: false,
        detectedAt: new Date(),
        licenseType: 'oss-only'
      };
      mockAdaptiveTenantFactory.getCapabilities.mockReturnValue(ossCapabilities);
    });

    it('should handle GraphQL errors gracefully', async () => {
      mockTenant.executeGraphQL.mockRejectedValue(new Error('Connection failed'));
      
      const result = await tenantManager.checkTenantHealth('default', '0x0');
      
      expect(result.health).toBe('error');
      expect(result.details).toContain('Connection failed');
    });

    it('should handle namespace not found errors', async () => {
      mockTenant.executeGraphQL.mockRejectedValue(new Error('namespace not found'));
      
      const result = await tenantManager.checkTenantHealth('default', '0x0');
      
      expect(result.health).toBe('not-accessible');
      expect(result.details).toContain('not found');
    });
  });
});
