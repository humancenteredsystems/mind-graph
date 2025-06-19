import { EnterpriseGuards, EnterpriseFeatureNotAvailableError, NamespaceNotSupportedError } from '../../../utils/enterpriseGuards';
import { adaptiveTenantFactory } from '../../../services/adaptiveTenantFactory';

// Mock the adaptiveTenantFactory
jest.mock('../../../services/adaptiveTenantFactory', () => ({
  adaptiveTenantFactory: {
    getCapabilities: jest.fn()
  }
}));

describe('EnterpriseGuards', () => {
  const mockGetCapabilities = adaptiveTenantFactory.getCapabilities as jest.MockedFunction<typeof adaptiveTenantFactory.getCapabilities>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requireEnterprise', () => {
    it('should pass when Enterprise features are available', () => {
      mockGetCapabilities.mockReturnValue({
        enterpriseDetected: true,
        namespacesSupported: true,
        detectedAt: new Date()
      });

      expect(() => {
        EnterpriseGuards.requireEnterprise('test operation');
      }).not.toThrow();
    });

    it('should throw EnterpriseFeatureNotAvailableError when Enterprise features unavailable', () => {
      mockGetCapabilities.mockReturnValue({
        enterpriseDetected: false,
        namespacesSupported: false,
        detectedAt: new Date()
      });

      expect(() => {
        EnterpriseGuards.requireEnterprise('test operation');
      }).toThrow(EnterpriseFeatureNotAvailableError);
    });

    it('should throw when capabilities are null', () => {
      mockGetCapabilities.mockReturnValue(null);

      expect(() => {
        EnterpriseGuards.requireEnterprise('test operation');
      }).toThrow(EnterpriseFeatureNotAvailableError);
    });
  });

  describe('requireNamespaceSupport', () => {
    it('should pass when namespace support is available', () => {
      mockGetCapabilities.mockReturnValue({
        enterpriseDetected: true,
        namespacesSupported: true,
        detectedAt: new Date()
      });

      expect(() => {
        EnterpriseGuards.requireNamespaceSupport('test operation', '0x1');
      }).not.toThrow();
    });

    it('should throw NamespaceNotSupportedError when namespace support unavailable', () => {
      mockGetCapabilities.mockReturnValue({
        enterpriseDetected: true,
        namespacesSupported: false,
        detectedAt: new Date()
      });

      expect(() => {
        EnterpriseGuards.requireNamespaceSupport('test operation', '0x1');
      }).toThrow(NamespaceNotSupportedError);
    });

    it('should provide appropriate suggestion for Enterprise detected but namespaces not supported', () => {
      mockGetCapabilities.mockReturnValue({
        enterpriseDetected: true,
        namespacesSupported: false,
        detectedAt: new Date()
      });

      try {
        EnterpriseGuards.requireNamespaceSupport('test operation', '0x1');
        fail('Expected NamespaceNotSupportedError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NamespaceNotSupportedError);
        expect((error as NamespaceNotSupportedError).suggestion).toContain('Check namespace isolation configuration');
      }
    });

    it('should provide upgrade suggestion for OSS mode', () => {
      mockGetCapabilities.mockReturnValue({
        enterpriseDetected: false,
        namespacesSupported: false,
        detectedAt: new Date()
      });

      try {
        EnterpriseGuards.requireNamespaceSupport('test operation', '0x1');
        fail('Expected NamespaceNotSupportedError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NamespaceNotSupportedError);
        expect((error as NamespaceNotSupportedError).suggestion).toContain('Upgrade to Dgraph Enterprise');
      }
    });
  });

  describe('isEnterpriseAvailable', () => {
    it('should return true when Enterprise is detected', () => {
      mockGetCapabilities.mockReturnValue({
        enterpriseDetected: true,
        namespacesSupported: true,
        detectedAt: new Date()
      });

      expect(EnterpriseGuards.isEnterpriseAvailable()).toBe(true);
    });

    it('should return false when Enterprise is not detected', () => {
      mockGetCapabilities.mockReturnValue({
        enterpriseDetected: false,
        namespacesSupported: false,
        detectedAt: new Date()
      });

      expect(EnterpriseGuards.isEnterpriseAvailable()).toBe(false);
    });

    it('should return false when capabilities are null', () => {
      mockGetCapabilities.mockReturnValue(null);

      expect(EnterpriseGuards.isEnterpriseAvailable()).toBe(false);
    });
  });

  describe('isNamespaceSupported', () => {
    it('should return true when namespaces are supported', () => {
      mockGetCapabilities.mockReturnValue({
        enterpriseDetected: true,
        namespacesSupported: true,
        detectedAt: new Date()
      });

      expect(EnterpriseGuards.isNamespaceSupported()).toBe(true);
    });

    it('should return false when namespaces are not supported', () => {
      mockGetCapabilities.mockReturnValue({
        enterpriseDetected: true,
        namespacesSupported: false,
        detectedAt: new Date()
      });

      expect(EnterpriseGuards.isNamespaceSupported()).toBe(false);
    });
  });

  describe('validateNamespace', () => {
    it('should pass for null namespace', () => {
      expect(() => {
        EnterpriseGuards.validateNamespace(null, 'test operation');
      }).not.toThrow();
    });

    it('should pass for default namespace', () => {
      expect(() => {
        EnterpriseGuards.validateNamespace('0x0', 'test operation');
      }).not.toThrow();
    });

    it('should validate non-default namespace', () => {
      mockGetCapabilities.mockReturnValue({
        enterpriseDetected: false,
        namespacesSupported: false,
        detectedAt: new Date()
      });

      expect(() => {
        EnterpriseGuards.validateNamespace('0x1', 'test operation');
      }).toThrow(NamespaceNotSupportedError);
    });
  });

  describe('validateTenantContext', () => {
    it('should pass for default tenant', () => {
      expect(() => {
        EnterpriseGuards.validateTenantContext('default', null, 'test operation');
      }).not.toThrow();
    });

    it('should validate non-default tenant', () => {
      mockGetCapabilities.mockReturnValue({
        enterpriseDetected: false,
        namespacesSupported: false,
        detectedAt: new Date()
      });

      expect(() => {
        EnterpriseGuards.validateTenantContext('test-tenant', '0x1', 'test operation');
      }).toThrow(NamespaceNotSupportedError);
    });
  });

  describe('getDeploymentMode', () => {
    it('should return enterprise-multi-tenant when namespaces supported', () => {
      mockGetCapabilities.mockReturnValue({
        enterpriseDetected: true,
        namespacesSupported: true,
        detectedAt: new Date()
      });

      expect(EnterpriseGuards.getDeploymentMode()).toBe('enterprise-multi-tenant');
    });

    it('should return enterprise-single-tenant when Enterprise detected but no namespaces', () => {
      mockGetCapabilities.mockReturnValue({
        enterpriseDetected: true,
        namespacesSupported: false,
        detectedAt: new Date()
      });

      expect(EnterpriseGuards.getDeploymentMode()).toBe('enterprise-single-tenant');
    });

    it('should return oss-single-tenant for OSS mode', () => {
      mockGetCapabilities.mockReturnValue({
        enterpriseDetected: false,
        namespacesSupported: false,
        detectedAt: new Date()
      });

      expect(EnterpriseGuards.getDeploymentMode()).toBe('oss-single-tenant');
    });
  });

  describe('getCapabilitySummary', () => {
    it('should return comprehensive capability summary', () => {
      const testDate = new Date('2023-01-01T00:00:00.000Z');
      mockGetCapabilities.mockReturnValue({
        enterpriseDetected: true,
        namespacesSupported: true,
        licenseType: 'enterprise-licensed',
        detectedAt: testDate
      });

      const summary = EnterpriseGuards.getCapabilitySummary();

      expect(summary).toEqual({
        enterpriseDetected: true,
        namespacesSupported: true,
        licenseType: 'enterprise-licensed',
        mode: 'enterprise-multi-tenant',
        detectedAt: testDate.toISOString(),
        error: undefined
      });
    });

    it('should handle null capabilities gracefully', () => {
      mockGetCapabilities.mockReturnValue(null);

      const summary = EnterpriseGuards.getCapabilitySummary();

      expect(summary.enterpriseDetected).toBe(false);
      expect(summary.namespacesSupported).toBe(false);
      expect(summary.licenseType).toBe('unknown');
      expect(summary.mode).toBe('oss-single-tenant');
      expect(summary.detectedAt).toBeDefined();
    });
  });

  describe('isCapabilityDetectionComplete', () => {
    it('should return true when capabilities are available', () => {
      mockGetCapabilities.mockReturnValue({
        enterpriseDetected: true,
        namespacesSupported: true,
        detectedAt: new Date()
      });

      expect(EnterpriseGuards.isCapabilityDetectionComplete()).toBe(true);
    });

    it('should return false when capabilities are null', () => {
      mockGetCapabilities.mockReturnValue(null);

      expect(EnterpriseGuards.isCapabilityDetectionComplete()).toBe(false);
    });
  });

  describe('getCapabilityDetectionError', () => {
    it('should return error when capabilities contain error', () => {
      mockGetCapabilities.mockReturnValue({
        enterpriseDetected: false,
        namespacesSupported: false,
        detectedAt: new Date(),
        error: 'Connection failed'
      });

      expect(EnterpriseGuards.getCapabilityDetectionError()).toBe('Connection failed');
    });

    it('should return undefined when no error', () => {
      mockGetCapabilities.mockReturnValue({
        enterpriseDetected: true,
        namespacesSupported: true,
        detectedAt: new Date()
      });

      expect(EnterpriseGuards.getCapabilityDetectionError()).toBeUndefined();
    });
  });
});
