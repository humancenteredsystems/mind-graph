import { TenantCapabilities } from '../src/types';
interface LicenseInfo {
    type: 'oss-only' | 'oss-trial' | 'enterprise-licensed' | 'unknown';
    expiry: Date | null;
}
/**
 * DgraphCapabilityDetector - Detects Dgraph Enterprise features and capabilities
 */
export declare class DgraphCapabilityDetector {
    private baseUrl;
    private zeroUrl;
    private cachedCapabilities;
    private lastDetection;
    private cacheTimeout;
    constructor();
    /**
     * Detect Dgraph capabilities with caching
     * @returns Capabilities object
     */
    detectCapabilities(): Promise<TenantCapabilities>;
    /**
     * Detect license type and expiry information
     * @returns License information
     */
    detectLicenseInfo(): Promise<LicenseInfo>;
    /**
     * Detect if Enterprise features are currently active
     * @returns True if Enterprise features are active
     */
    detectEnterpriseFeatures(): Promise<boolean>;
    /**
     * Test namespace support (separate check from Enterprise detection)
     * @returns True if namespaces are supported and working
     */
    testNamespaceSupport(): Promise<boolean>;
    /**
     * Force refresh of capabilities cache
     * @returns Fresh capabilities
     */
    refreshCapabilities(): Promise<TenantCapabilities>;
    /**
     * Get cached capabilities without detection
     * @returns Cached capabilities or null
     */
    getCachedCapabilities(): TenantCapabilities | null;
}
export declare const dgraphCapabilityDetector: DgraphCapabilityDetector;
export {};
//# sourceMappingURL=dgraphCapabilities.d.ts.map