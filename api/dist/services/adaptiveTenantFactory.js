"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adaptiveTenantFactory = exports.AdaptiveTenantFactory = void 0;
const dgraphTenant_1 = require("./dgraphTenant");
const dgraphCapabilities_1 = require("./dgraphCapabilities");
/**
 * AdaptiveTenantFactory - Creates tenant clients that adapt to Dgraph capabilities
 * Falls back to single-tenant mode when namespaces aren't supported
 */
class AdaptiveTenantFactory {
    constructor(options = {}) {
        this.options = options;
        this.capabilities = null;
        this.initialized = false;
    }
    /**
     * Initialize the factory by detecting Dgraph capabilities
     */
    async initialize() {
        if (this.initialized)
            return;
        try {
            this.capabilities = await dgraphCapabilities_1.dgraphCapabilityDetector.detectCapabilities();
            this.initialized = true;
            const mode = this.capabilities.namespacesSupported ? 'multi-tenant' : 'single-tenant';
            console.log(`[ADAPTIVE_TENANT] Initialized in ${mode} mode`);
        }
        catch (error) {
            console.error('[ADAPTIVE_TENANT] Failed to initialize, defaulting to single-tenant mode:', error);
            this.capabilities = {
                enterpriseDetected: false,
                namespacesSupported: false,
                detectedAt: new Date(),
                error: error.message
            };
            this.initialized = true;
        }
    }
    /**
     * Create a tenant client that adapts to available capabilities
     * @param namespace - Desired namespace (ignored in OSS mode)
     * @returns Tenant client
     */
    async createTenant(namespace = null) {
        await this.initialize();
        if (this.capabilities?.namespacesSupported) {
            // Enterprise mode: use namespace as requested
            console.log(`[ADAPTIVE_TENANT] Creating tenant for namespace: ${namespace || 'default'}`);
            return new dgraphTenant_1.DgraphTenant(namespace);
        }
        else {
            // OSS mode: ignore namespace, use default
            if (namespace && namespace !== '0x0') {
                console.log(`[ADAPTIVE_TENANT] OSS mode: ignoring namespace ${namespace}, using default`);
            }
            return new dgraphTenant_1.DgraphTenant(null);
        }
    }
    /**
     * Create tenant from user context (adaptive)
     * @param userContext - User context with namespace info
     * @returns Tenant client
     */
    async createTenantFromContext(userContext) {
        const namespace = userContext?.namespace || null;
        return await this.createTenant(namespace);
    }
    /**
     * Create default tenant
     * @returns Default tenant client
     */
    async createDefaultTenant() {
        return await this.createTenant(null);
    }
    /**
     * Create test tenant (adaptive)
     * @returns Test tenant client
     */
    async createTestTenant() {
        const testNamespace = process.env.DGRAPH_NAMESPACE_TEST || '0x1';
        return await this.createTenant(testNamespace);
    }
    /**
     * Get current capabilities
     * @returns Capabilities object
     */
    getCapabilities() {
        return this.capabilities;
    }
    /**
     * Check if multi-tenant mode is supported
     * @returns True if namespaces are supported
     */
    isMultiTenantSupported() {
        return this.capabilities?.namespacesSupported || false;
    }
    /**
     * Refresh capabilities and reinitialize
     */
    async refresh() {
        this.initialized = false;
        this.capabilities = null;
        await this.initialize();
    }
}
exports.AdaptiveTenantFactory = AdaptiveTenantFactory;
// Export singleton instance
exports.adaptiveTenantFactory = new AdaptiveTenantFactory();
//# sourceMappingURL=adaptiveTenantFactory.js.map