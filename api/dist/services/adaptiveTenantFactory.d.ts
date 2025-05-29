import { DgraphTenant } from './dgraphTenant';
import { TenantCapabilities, AdaptiveTenantFactoryOptions } from '../src/types';
interface UserContext {
    namespace?: string | null;
    tenantId?: string;
}
/**
 * AdaptiveTenantFactory - Creates tenant clients that adapt to Dgraph capabilities
 * Falls back to single-tenant mode when namespaces aren't supported
 */
export declare class AdaptiveTenantFactory {
    private options;
    private capabilities;
    private initialized;
    constructor(options?: AdaptiveTenantFactoryOptions);
    /**
     * Initialize the factory by detecting Dgraph capabilities
     */
    initialize(): Promise<void>;
    /**
     * Create a tenant client that adapts to available capabilities
     * @param namespace - Desired namespace (ignored in OSS mode)
     * @returns Tenant client
     */
    createTenant(namespace?: string | null): Promise<DgraphTenant>;
    /**
     * Create tenant from user context (adaptive)
     * @param userContext - User context with namespace info
     * @returns Tenant client
     */
    createTenantFromContext(userContext: UserContext | null): Promise<DgraphTenant>;
    /**
     * Create default tenant
     * @returns Default tenant client
     */
    createDefaultTenant(): Promise<DgraphTenant>;
    /**
     * Create test tenant (adaptive)
     * @returns Test tenant client
     */
    createTestTenant(): Promise<DgraphTenant>;
    /**
     * Get current capabilities
     * @returns Capabilities object
     */
    getCapabilities(): TenantCapabilities | null;
    /**
     * Check if multi-tenant mode is supported
     * @returns True if namespaces are supported
     */
    isMultiTenantSupported(): boolean;
    /**
     * Refresh capabilities and reinitialize
     */
    refresh(): Promise<void>;
}
export declare const adaptiveTenantFactory: AdaptiveTenantFactory;
export {};
//# sourceMappingURL=adaptiveTenantFactory.d.ts.map