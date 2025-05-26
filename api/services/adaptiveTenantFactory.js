const { DgraphTenant } = require('./dgraphTenant');
const { dgraphCapabilityDetector } = require('./dgraphCapabilities');

/**
 * AdaptiveTenantFactory - Creates tenant clients that adapt to Dgraph capabilities
 * Falls back to single-tenant mode when namespaces aren't supported
 */
class AdaptiveTenantFactory {
  constructor() {
    this.capabilities = null;
    this.initialized = false;
  }

  /**
   * Initialize the factory by detecting Dgraph capabilities
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      this.capabilities = await dgraphCapabilityDetector.detectCapabilities();
      this.initialized = true;
      
      const mode = this.capabilities.namespacesSupported ? 'multi-tenant' : 'single-tenant';
      console.log(`[ADAPTIVE_TENANT] Initialized in ${mode} mode`);
      
    } catch (error) {
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
   * @param {string|null} namespace - Desired namespace (ignored in OSS mode)
   * @returns {DgraphTenant} - Tenant client
   */
  async createTenant(namespace = null) {
    await this.initialize();
    
    if (this.capabilities.namespacesSupported) {
      // Enterprise mode: use namespace as requested
      console.log(`[ADAPTIVE_TENANT] Creating tenant for namespace: ${namespace || 'default'}`);
      return new DgraphTenant(namespace);
    } else {
      // OSS mode: ignore namespace, use default
      if (namespace && namespace !== '0x0') {
        console.log(`[ADAPTIVE_TENANT] OSS mode: ignoring namespace ${namespace}, using default`);
      }
      return new DgraphTenant(null);
    }
  }

  /**
   * Create tenant from user context (adaptive)
   * @param {object} userContext - User context with namespace info
   * @returns {DgraphTenant} - Tenant client
   */
  async createTenantFromContext(userContext) {
    const namespace = userContext?.namespace || null;
    return await this.createTenant(namespace);
  }

  /**
   * Create default tenant
   * @returns {DgraphTenant} - Default tenant client
   */
  async createDefaultTenant() {
    return await this.createTenant(null);
  }

  /**
   * Create test tenant (adaptive)
   * @returns {DgraphTenant} - Test tenant client
   */
  async createTestTenant() {
    const testNamespace = process.env.DGRAPH_NAMESPACE_TEST || '0x1';
    return await this.createTenant(testNamespace);
  }

  /**
   * Get current capabilities
   * @returns {object|null} - Capabilities object
   */
  getCapabilities() {
    return this.capabilities;
  }

  /**
   * Check if multi-tenant mode is supported
   * @returns {boolean} - True if namespaces are supported
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

// Export singleton instance
const adaptiveTenantFactory = new AdaptiveTenantFactory();

module.exports = { 
  AdaptiveTenantFactory, 
  adaptiveTenantFactory 
};
