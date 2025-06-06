import axios, { AxiosResponse } from 'axios';
import { TenantCapabilities } from '../src/types';

// License information interface
interface LicenseInfo {
  type: 'oss-only' | 'oss-trial' | 'enterprise-licensed' | 'unknown';
  expiry: Date | null;
}

// Dgraph health response interface
interface DgraphHealthResponse {
  version?: string;
  ee_features?: string[];
  enterprise?: boolean;
  license?: any;
}

// Dgraph Zero state response interface
interface DgraphZeroStateResponse {
  license?: {
    user?: string;
    enabled?: boolean;
    expiryTs?: string;
  };
}

/**
 * DgraphCapabilityDetector - Detects Dgraph Enterprise features and capabilities
 */
export class DgraphCapabilityDetector {
  private baseUrl: string;
  private zeroUrl: string;
  private cachedCapabilities: TenantCapabilities | null = null;
  private lastDetection: number | null = null;
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.baseUrl = process.env.DGRAPH_BASE_URL || 'http://localhost:8080';
    this.zeroUrl = process.env.DGRAPH_ZERO_URL || 'http://localhost:6080';
  }

  /**
   * Detect Dgraph capabilities with caching
   * @returns Capabilities object
   */
  async detectCapabilities(): Promise<TenantCapabilities> {
    // Return cached result if still valid
    if (this.cachedCapabilities && this.lastDetection) {
      const age = Date.now() - this.lastDetection;
      if (age < this.cacheTimeout) {
        console.log('[DGRAPH_CAPABILITIES] Using cached capabilities');
        return this.cachedCapabilities;
      }
    }

    console.log('[DGRAPH_CAPABILITIES] Detecting Dgraph capabilities...');
    
    try {
      // Step 1: Detect Enterprise Features (active features, not just edition)
      const enterpriseDetected = await this.detectEnterpriseFeatures();
      
      // Step 2: Test namespace support (only if Enterprise features detected)
      let namespacesSupported = false;
      if (enterpriseDetected) {
        namespacesSupported = await this.testNamespaceSupport();
      }

      // Step 3: Detect license type and details
      const licenseInfo = await this.detectLicenseInfo();

      this.cachedCapabilities = {
        enterpriseDetected,
        namespacesSupported,
        detectedAt: new Date(),
        error: undefined,
        licenseType: licenseInfo.type,
        licenseExpiry: licenseInfo.expiry
      };
      
      this.lastDetection = Date.now();
      
      console.log('[DGRAPH_CAPABILITIES] Detection complete:', this.cachedCapabilities);
      return this.cachedCapabilities;

    } catch (error: any) {
      console.error('[DGRAPH_CAPABILITIES] Error detecting capabilities:', error.message);
      
      // Try to get license info even if other detection fails
      let fallbackLicenseInfo: LicenseInfo;
      try {
        fallbackLicenseInfo = await this.detectLicenseInfo();
      } catch (licenseError) {
        fallbackLicenseInfo = { type: 'unknown', expiry: null };
      }
      
      // Fallback to OSS assumptions on network errors
      this.cachedCapabilities = {
        enterpriseDetected: false,
        namespacesSupported: false,
        detectedAt: new Date(),
        error: error.message,
        licenseType: fallbackLicenseInfo.type,
        licenseExpiry: fallbackLicenseInfo.expiry
      };
      
      this.lastDetection = Date.now();
      return this.cachedCapabilities;
    }
  }

  /**
   * Detect license type and expiry information
   * @returns License information
   */
  async detectLicenseInfo(): Promise<LicenseInfo> {
    console.log('[DGRAPH_CAPABILITIES] Detecting license information...');
    
    try {
      // Try Alpha state endpoint first (more reliable in Docker setups)
      const stateUrl = `${this.baseUrl}/state`;
      console.log(`[DGRAPH_CAPABILITIES] Testing Alpha state: ${stateUrl}`);
      
      const response: AxiosResponse<DgraphZeroStateResponse> = await axios.get(stateUrl, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });

      if (response.status === 200 && response.data && response.data.license) {
        const license = response.data.license;
        
        console.log('[DGRAPH_CAPABILITIES] License found:', {
          user: license.user || '(empty)',
          enabled: license.enabled,
          expiryTs: license.expiryTs
        });

        // Determine license type based on user field
        let licenseType: LicenseInfo['type'];
        if (!license.enabled) {
          licenseType = 'oss-only';
        } else if (license.user === '' || license.user === null || license.user === undefined) {
          licenseType = 'oss-trial';
          console.log('[DGRAPH_CAPABILITIES] ✅ OSS Trial detected (empty user field)');
        } else {
          licenseType = 'enterprise-licensed';
          console.log('[DGRAPH_CAPABILITIES] ✅ Licensed Enterprise detected (user field populated)');
        }

        // Parse expiry date
        let expiryDate: Date | null = null;
        if (license.expiryTs) {
          expiryDate = new Date(parseInt(license.expiryTs) * 1000);
          console.log('[DGRAPH_CAPABILITIES] License expires:', expiryDate.toISOString());
        }

        return {
          type: licenseType,
          expiry: expiryDate
        };
      } else {
        console.log('[DGRAPH_CAPABILITIES] No license information found in Zero state');
        return {
          type: 'oss-only',
          expiry: null
        };
      }

    } catch (error: any) {
      console.log('[DGRAPH_CAPABILITIES] License detection failed:', error.message);
      return {
        type: 'unknown',
        expiry: null
      };
    }
  }

  /**
   * Detect if Enterprise features are currently active
   * @returns True if Enterprise features are active
   */
  async detectEnterpriseFeatures(): Promise<boolean> {
    console.log('[DGRAPH_CAPABILITIES] Detecting active Enterprise features...');
    
    try {
      // Primary method: Check health endpoint for ee_features array
      const healthUrl = `${this.baseUrl}/health`;
      console.log(`[DGRAPH_CAPABILITIES] Testing health endpoint: ${healthUrl}`);
      
      // Add admin authentication headers for internal requests
      const headers: Record<string, string> = {};
      if (process.env.ADMIN_API_KEY) {
        headers['X-Admin-API-Key'] = process.env.ADMIN_API_KEY;
      }
      
      const healthResponse: AxiosResponse<DgraphHealthResponse[] | DgraphHealthResponse> = await axios.get(healthUrl, {
        headers,
        timeout: 5000,
        validateStatus: (status) => status < 500
      });

      console.log(`[DGRAPH_CAPABILITIES] Health response status: ${healthResponse.status}`);
      console.log(`[DGRAPH_CAPABILITIES] Health response data:`, JSON.stringify(healthResponse.data, null, 2));

      if (healthResponse.status === 200 && healthResponse.data) {
        const healthData = healthResponse.data;
        
        // Check if response is an array (typical for Dgraph health)
        if (Array.isArray(healthData) && healthData.length > 0) {
          const alphaInfo = healthData[0]; // First alpha instance
          console.log(`[DGRAPH_CAPABILITIES] Alpha info:`, alphaInfo);
          console.log(`[DGRAPH_CAPABILITIES] ee_features:`, alphaInfo.ee_features);
          
          // Look for ee_features array - this is the definitive indicator
          if (alphaInfo.ee_features && Array.isArray(alphaInfo.ee_features) && alphaInfo.ee_features.length > 0) {
            console.log('[DGRAPH_CAPABILITIES] ✅ Enterprise features detected via ee_features:', alphaInfo.ee_features);
            return true;
          } else {
            console.log('[DGRAPH_CAPABILITIES] ❌ No ee_features found in alpha info');
          }
        } else {
          console.log('[DGRAPH_CAPABILITIES] ❌ Health data is not an array or is empty');
        }
        
        // Fallback: Check for enterprise indicators in single object response
        if (!Array.isArray(healthData)) {
          console.log('[DGRAPH_CAPABILITIES] Checking single object response');
          if (healthData.ee_features && Array.isArray(healthData.ee_features) && healthData.ee_features.length > 0) {
            console.log('[DGRAPH_CAPABILITIES] ✅ Enterprise features detected via ee_features:', healthData.ee_features);
            return true;
          }
          
          // Check for other enterprise indicators
          if (healthData.enterprise || healthData.license) {
            console.log('[DGRAPH_CAPABILITIES] ✅ Enterprise features detected via health response fields');
            return true;
          }
        }
      } else {
        console.log(`[DGRAPH_CAPABILITIES] ❌ Invalid health response: status=${healthResponse.status}, data=${!!healthResponse.data}`);
      }

      console.log('[DGRAPH_CAPABILITIES] ❌ No active Enterprise features detected');
      return false;

    } catch (error: any) {
      console.log('[DGRAPH_CAPABILITIES] Enterprise feature detection failed:', error.message);
      return false;
    }
  }

  /**
   * Test namespace support (separate check from Enterprise detection)
   * @returns True if namespaces are supported and working
   */
  async testNamespaceSupport(): Promise<boolean> {
    console.log('[DGRAPH_CAPABILITIES] Testing namespace support...');
    
    try {
      // Test namespace support by trying to access admin schema with namespace parameter
      const testUrl = `${this.baseUrl}/admin/schema?namespace=0x1`;
      console.log(`[DGRAPH_CAPABILITIES] Testing namespace parameter: ${testUrl}`);
      
      // Add admin authentication headers for internal requests
      const headers: Record<string, string> = {};
      if (process.env.ADMIN_API_KEY) {
        headers['X-Admin-API-Key'] = process.env.ADMIN_API_KEY;
      }
      
      const response = await axios.get(testUrl, {
        headers,
        timeout: 5000,
        validateStatus: (status) => status < 500
      });

      // If we get a successful response, namespaces are supported
      if (response.status === 200) {
        console.log('[DGRAPH_CAPABILITIES] ✅ Namespace support confirmed - successful response');
        return true;
      }

      // Based on test results, 400 status with error indicates namespace parameter is recognized
      if (response.status === 400) {
        const errorData = response.data;
        if (errorData && errorData.errors && Array.isArray(errorData.errors)) {
          // This indicates the namespace parameter was processed but there was an issue
          console.log('[DGRAPH_CAPABILITIES] ✅ Namespace support confirmed - parameter recognized');
          return true;
        }
      }

      // Check error message for namespace-related errors
      const errorData = response.data;
      if (typeof errorData === 'string' && errorData.includes('namespace')) {
        console.log('[DGRAPH_CAPABILITIES] ✅ Namespace support confirmed - namespace parameter recognized');
        return true;
      }

      console.log('[DGRAPH_CAPABILITIES] ❌ Namespace support not detected');
      return false;

    } catch (error: any) {
      console.log('[DGRAPH_CAPABILITIES] Namespace test failed:', error.message);
      return false;
    }
  }

  /**
   * Force refresh of capabilities cache
   * @returns Fresh capabilities
   */
  async refreshCapabilities(): Promise<TenantCapabilities> {
    this.cachedCapabilities = null;
    this.lastDetection = null;
    return await this.detectCapabilities();
  }

  /**
   * Get cached capabilities without detection
   * @returns Cached capabilities or null
   */
  getCachedCapabilities(): TenantCapabilities | null {
    return this.cachedCapabilities;
  }
}

// Export singleton instance
export const dgraphCapabilityDetector = new DgraphCapabilityDetector();
