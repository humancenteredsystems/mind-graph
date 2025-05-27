const axios = require('axios');

/**
 * DgraphCapabilityDetector - Detects Dgraph Enterprise features and capabilities
 */
class DgraphCapabilityDetector {
  constructor() {
    this.baseUrl = process.env.DGRAPH_BASE_URL || 'http://localhost:8080';
    this.zeroUrl = process.env.DGRAPH_ZERO_URL || 'http://localhost:6080';
    this.cachedCapabilities = null;
    this.lastDetection = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Detect Dgraph capabilities with caching
   * @returns {Promise<object>} Capabilities object
   */
  async detectCapabilities() {
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
        licenseType: licenseInfo.type,
        licenseExpiry: licenseInfo.expiry,
        detectedAt: new Date(),
        version: await this.detectVersion()
      };
      
      this.lastDetection = Date.now();
      
      console.log('[DGRAPH_CAPABILITIES] Detection complete:', this.cachedCapabilities);
      return this.cachedCapabilities;

    } catch (error) {
      console.error('[DGRAPH_CAPABILITIES] Error detecting capabilities:', error.message);
      
      // Fallback to OSS assumptions on network errors
      this.cachedCapabilities = {
        enterpriseDetected: false,
        namespacesSupported: false,
        licenseType: 'unknown',
        licenseExpiry: null,
        detectedAt: new Date(),
        version: 'unknown',
        error: error.message
      };
      
      this.lastDetection = Date.now();
      return this.cachedCapabilities;
    }
  }

  /**
   * Detect license type and expiry information
   * @returns {Promise<object>} License information
   */
  async detectLicenseInfo() {
    console.log('[DGRAPH_CAPABILITIES] Detecting license information...');
    
    try {
      const stateUrl = `${this.zeroUrl}/state`;
      console.log(`[DGRAPH_CAPABILITIES] Testing Zero state: ${stateUrl}`);
      
      const response = await axios.get(stateUrl, {
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
        let licenseType;
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
        let expiryDate = null;
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

    } catch (error) {
      console.log('[DGRAPH_CAPABILITIES] License detection failed:', error.message);
      return {
        type: 'unknown',
        expiry: null
      };
    }
  }

  /**
   * Detect if Enterprise features are currently active
   * Based on test results, the most reliable indicator is the ee_features array in health response
   * @returns {Promise<boolean>} True if Enterprise features are active
   */
  async detectEnterpriseFeatures() {
    console.log('[DGRAPH_CAPABILITIES] Detecting active Enterprise features...');
    
    try {
      // Primary method: Check health endpoint for ee_features array
      const healthUrl = `${this.baseUrl}/health`;
      console.log(`[DGRAPH_CAPABILITIES] Testing health endpoint: ${healthUrl}`);
      
      const healthResponse = await axios.get(healthUrl, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });

      if (healthResponse.status === 200 && healthResponse.data) {
        const healthData = healthResponse.data;
        
        // Check if response is an array (typical for Dgraph health)
        if (Array.isArray(healthData) && healthData.length > 0) {
          const alphaInfo = healthData[0]; // First alpha instance
          
          // Look for ee_features array - this is the definitive indicator
          if (alphaInfo.ee_features && Array.isArray(alphaInfo.ee_features) && alphaInfo.ee_features.length > 0) {
            console.log('[DGRAPH_CAPABILITIES] ✅ Enterprise features detected via ee_features:', alphaInfo.ee_features);
            return true;
          }
        }
        
        // Fallback: Check for enterprise indicators in single object response
        if (!Array.isArray(healthData)) {
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
      }

      // Secondary method: Test Zero server enterprise license endpoint
      // Based on test results, this endpoint exists when enterprise features are active
      try {
        const zeroUrl = `${this.zeroUrl}/enterpriseLicense`;
        console.log(`[DGRAPH_CAPABILITIES] Testing Zero enterprise endpoint: ${zeroUrl}`);
        
        const zeroResponse = await axios.get(zeroUrl, {
          timeout: 3000,
          validateStatus: (status) => status < 500
        });
        
        // If endpoint responds (even with error), enterprise features are available
        if (zeroResponse.status !== 404) {
          console.log('[DGRAPH_CAPABILITIES] ✅ Enterprise features detected via Zero server endpoint');
          return true;
        }
      } catch (zeroError) {
        console.log('[DGRAPH_CAPABILITIES] Zero server test failed (may not be accessible):', zeroError.message);
      }

      console.log('[DGRAPH_CAPABILITIES] ❌ No active Enterprise features detected');
      return false;

    } catch (error) {
      console.log('[DGRAPH_CAPABILITIES] Enterprise feature detection failed:', error.message);
      return false;
    }
  }

  /**
   * Test namespace support (separate check from Enterprise detection)
   * @returns {Promise<boolean>} True if namespaces are supported and working
   */
  async testNamespaceSupport() {
    console.log('[DGRAPH_CAPABILITIES] Testing namespace support...');
    
    try {
      // Test namespace support by trying to access admin schema with namespace parameter
      const testUrl = `${this.baseUrl}/admin/schema?namespace=0x1`;
      console.log(`[DGRAPH_CAPABILITIES] Testing namespace parameter: ${testUrl}`);
      
      const response = await axios.get(testUrl, {
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

    } catch (error) {
      console.log('[DGRAPH_CAPABILITIES] Namespace test failed:', error.message);
      return false;
    }
  }

  /**
   * Attempt to detect Dgraph version
   * @returns {Promise<string>} Version string or 'unknown'
   */
  async detectVersion() {
    try {
      // Try to get version from health endpoint
      const healthUrl = `${this.baseUrl}/health`;
      const response = await axios.get(healthUrl, { timeout: 3000 });
      
      // Check if response is an array (typical for Dgraph health)
      if (Array.isArray(response.data) && response.data.length > 0) {
        const alphaInfo = response.data[0];
        if (alphaInfo.version) {
          return alphaInfo.version;
        }
      }
      
      // Fallback for single object response
      if (response.data && response.data.version) {
        return response.data.version;
      }
      
      return 'detected';
    } catch (error) {
      console.log('[DGRAPH_CAPABILITIES] Could not detect version:', error.message);
      return 'unknown';
    }
  }

  /**
   * Force refresh of capabilities cache
   * @returns {Promise<object>} Fresh capabilities
   */
  async refreshCapabilities() {
    this.cachedCapabilities = null;
    this.lastDetection = null;
    return await this.detectCapabilities();
  }

  /**
   * Get cached capabilities without detection
   * @returns {object|null} Cached capabilities or null
   */
  getCachedCapabilities() {
    return this.cachedCapabilities;
  }
}

// Export singleton instance
const dgraphCapabilityDetector = new DgraphCapabilityDetector();

module.exports = { 
  DgraphCapabilityDetector, 
  dgraphCapabilityDetector 
};
