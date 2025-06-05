"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dgraphCapabilityDetector = exports.DgraphCapabilityDetector = void 0;
const axios_1 = __importDefault(require("axios"));
/**
 * DgraphCapabilityDetector - Detects Dgraph Enterprise features and capabilities
 */
class DgraphCapabilityDetector {
    constructor() {
        this.cachedCapabilities = null;
        this.lastDetection = null;
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.baseUrl = process.env.DGRAPH_BASE_URL || 'http://localhost:8080';
        this.zeroUrl = process.env.DGRAPH_ZERO_URL || 'http://localhost:6080';
    }
    /**
     * Detect Dgraph capabilities with caching
     * @returns Capabilities object
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
                detectedAt: new Date(),
                error: undefined,
                licenseType: licenseInfo.type,
                licenseExpiry: licenseInfo.expiry
            };
            this.lastDetection = Date.now();
            console.log('[DGRAPH_CAPABILITIES] Detection complete:', this.cachedCapabilities);
            return this.cachedCapabilities;
        }
        catch (error) {
            console.error('[DGRAPH_CAPABILITIES] Error detecting capabilities:', error.message);
            // Try to get license info even if other detection fails
            let fallbackLicenseInfo;
            try {
                fallbackLicenseInfo = await this.detectLicenseInfo();
            }
            catch (licenseError) {
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
    async detectLicenseInfo() {
        console.log('[DGRAPH_CAPABILITIES] Detecting license information...');
        try {
            const stateUrl = `${this.zeroUrl}/state`;
            console.log(`[DGRAPH_CAPABILITIES] Testing Zero state: ${stateUrl}`);
            const response = await axios_1.default.get(stateUrl, {
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
                }
                else if (license.user === '' || license.user === null || license.user === undefined) {
                    licenseType = 'oss-trial';
                    console.log('[DGRAPH_CAPABILITIES] ✅ OSS Trial detected (empty user field)');
                }
                else {
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
            }
            else {
                console.log('[DGRAPH_CAPABILITIES] No license information found in Zero state');
                return {
                    type: 'oss-only',
                    expiry: null
                };
            }
        }
        catch (error) {
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
    async detectEnterpriseFeatures() {
        console.log('[DGRAPH_CAPABILITIES] Detecting active Enterprise features...');
        try {
            // Primary method: Check health endpoint for ee_features array
            const healthUrl = `${this.baseUrl}/health`;
            console.log(`[DGRAPH_CAPABILITIES] Testing health endpoint: ${healthUrl}`);
            // Add admin authentication headers for internal requests
            const headers = {};
            if (process.env.ADMIN_API_KEY) {
                headers['X-Admin-API-Key'] = process.env.ADMIN_API_KEY;
            }
            const healthResponse = await axios_1.default.get(healthUrl, {
                headers,
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
            console.log('[DGRAPH_CAPABILITIES] ❌ No active Enterprise features detected');
            return false;
        }
        catch (error) {
            console.log('[DGRAPH_CAPABILITIES] Enterprise feature detection failed:', error.message);
            return false;
        }
    }
    /**
     * Test namespace support (separate check from Enterprise detection)
     * @returns True if namespaces are supported and working
     */
    async testNamespaceSupport() {
        console.log('[DGRAPH_CAPABILITIES] Testing namespace support...');
        try {
            // Test namespace support by trying to access admin schema with namespace parameter
            const testUrl = `${this.baseUrl}/admin/schema?namespace=0x1`;
            console.log(`[DGRAPH_CAPABILITIES] Testing namespace parameter: ${testUrl}`);
            // Add admin authentication headers for internal requests
            const headers = {};
            if (process.env.ADMIN_API_KEY) {
                headers['X-Admin-API-Key'] = process.env.ADMIN_API_KEY;
            }
            const response = await axios_1.default.get(testUrl, {
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
        }
        catch (error) {
            console.log('[DGRAPH_CAPABILITIES] Namespace test failed:', error.message);
            return false;
        }
    }
    /**
     * Force refresh of capabilities cache
     * @returns Fresh capabilities
     */
    async refreshCapabilities() {
        this.cachedCapabilities = null;
        this.lastDetection = null;
        return await this.detectCapabilities();
    }
    /**
     * Get cached capabilities without detection
     * @returns Cached capabilities or null
     */
    getCachedCapabilities() {
        return this.cachedCapabilities;
    }
}
exports.DgraphCapabilityDetector = DgraphCapabilityDetector;
// Export singleton instance
exports.dgraphCapabilityDetector = new DgraphCapabilityDetector();
