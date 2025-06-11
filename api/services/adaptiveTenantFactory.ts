import { DgraphTenantFactory } from './dgraphTenant';

// Import the internal type for return types
type DgraphTenantInternal = InstanceType<typeof DgraphTenantFactory>;
import { dgraphCapabilityDetector } from './dgraphCapabilities';
import { TenantCapabilities, AdaptiveTenantFactoryOptions } from '../src/types';

// User context interface for tenant creation
interface UserContext {
  namespace?: string | null;
  tenantId?: string;
}

/**
 * AdaptiveTenantFactory - Creates tenant clients that adapt to Dgraph capabilities
 * Falls back to single-tenant mode when namespaces aren't supported
 */
export class AdaptiveTenantFactory {
  private capabilities: TenantCapabilities | null = null;
  private initialized: boolean = false;

  constructor(private options: AdaptiveTenantFactoryOptions = {}) {}

  /**
   * Initialize the factory by detecting Dgraph capabilities
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      this.capabilities = await dgraphCapabilityDetector.detectCapabilities();
      this.initialized = true;
      
      const mode = this.capabilities.namespacesSupported ? 'multi-tenant' : 'single-tenant';
      console.log(`[ADAPTIVE_TENANT] Initialized in ${mode} mode`);
      
    } catch (error: any) {
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
  async createTenant(namespace: string | null = null): Promise<DgraphTenantInternal> {
    await this.initialize();
    
    if (this.capabilities?.namespacesSupported) {
      // Enterprise mode: use namespace as requested
      console.log(`[ADAPTIVE_TENANT] Creating tenant for namespace: ${namespace || 'default'}`);
      return await DgraphTenantFactory.createTenant(namespace);
    } else {
      // OSS mode: ignore namespace, use default
      if (namespace && namespace !== '0x0') {
        console.log(`[ADAPTIVE_TENANT] OSS mode: ignoring namespace ${namespace}, using default`);
      }
      return await DgraphTenantFactory.createTenant(null);
    }
  }

  /**
   * Create tenant from user context (adaptive)
   * @param userContext - User context with namespace info
   * @returns Tenant client
   */
  async createTenantFromContext(userContext: UserContext | null): Promise<DgraphTenantInternal> {
    const namespace = userContext?.namespace || null;
    return await this.createTenant(namespace);
  }

  /**
   * Create default tenant
   * @returns Default tenant client
   */
  async createDefaultTenant(): Promise<DgraphTenantInternal> {
    return await this.createTenant(null);
  }

  /**
   * Create test tenant (adaptive)
   * @returns Test tenant client
   */
  async createTestTenant(): Promise<DgraphTenantInternal> {
    const testNamespace = process.env.DGRAPH_NAMESPACE_TEST || '0x1';
    return await this.createTenant(testNamespace);
  }

  /**
   * Get current capabilities
   * @returns Capabilities object
   */
  getCapabilities(): TenantCapabilities | null {
    return this.capabilities;
  }

  /**
   * Check if multi-tenant mode is supported
   * @returns True if namespaces are supported
   */
  isMultiTenantSupported(): boolean {
    return this.capabilities?.namespacesSupported || false;
  }

  /**
   * Refresh capabilities and reinitialize
   */
  async refresh(): Promise<void> {
    this.initialized = false;
    this.capabilities = null;
    await this.initialize();
  }
}

// Export singleton instance
export const adaptiveTenantFactory = new AdaptiveTenantFactory();
