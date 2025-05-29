import { DgraphTenantFactory } from './dgraphTenant';
import { promises as fs } from 'fs';
import { TenantInfo } from '../src/types';
interface TenantManagerDependencies {
    pushSchema?: (schema: string, namespace: string | null, adminUrl?: string) => Promise<any>;
    fileSystem?: typeof fs;
    schemaPath?: string;
    tenantFactory?: typeof DgraphTenantFactory;
}
interface HierarchyLevel {
    levelNumber: number;
    label: string;
    allowedTypes: string[];
}
interface HierarchyData {
    id: string;
    name: string;
    levels: HierarchyLevel[];
}
interface DgraphTenant {
    executeGraphQL: (query: string, variables?: Record<string, any>) => Promise<any>;
}
/**
 * TenantManager - Manages tenant namespaces and lifecycle operations
 */
export declare class TenantManager {
    private pushSchema;
    private fileSystem;
    private schemaPath;
    private tenantFactory;
    readonly defaultNamespace: string;
    readonly testNamespace: string;
    readonly namespacePrefix: string;
    readonly enableMultiTenant: boolean;
    constructor(dependencies?: TenantManagerDependencies);
    /**
     * Create a new tenant namespace with initial setup
     * @param tenantId - Unique identifier for the tenant
     * @returns The created namespace ID
     */
    createTenant(tenantId: string): Promise<string>;
    /**
     * Initialize schema in a tenant's namespace
     * @param namespace - The namespace to initialize
     */
    initializeTenantSchema(namespace: string): Promise<void>;
    /**
     * Get the default GraphQL schema content
     * @returns The schema content
     */
    getDefaultSchema(): Promise<string>;
    /**
     * Seed a tenant namespace with default hierarchies
     * @param namespace - The namespace to seed
     */
    seedDefaultHierarchies(namespace: string): Promise<void>;
    /**
     * Create a hierarchy in a specific namespace
     * @param hierarchyData - The hierarchy data to create
     * @param tenant - The tenant client to use
     */
    createHierarchyInNamespace(hierarchyData: HierarchyData, tenant: DgraphTenant): Promise<void>;
    /**
     * Generate a deterministic namespace ID from tenant ID
     * @param tenantId - The tenant identifier
     * @returns The generated namespace ID
     */
    generateNamespaceId(tenantId: string): string;
    /**
     * Get the namespace for a given tenant ID
     * @param tenantId - The tenant identifier
     * @returns The namespace ID
     */
    getTenantNamespace(tenantId: string): Promise<string>;
    /**
     * Check if a tenant exists
     * @param tenantId - The tenant identifier
     * @returns Whether the tenant exists
     */
    tenantExists(tenantId: string): Promise<boolean>;
    /**
     * Delete a tenant and all its data
     * @param tenantId - The tenant identifier
     */
    deleteTenant(tenantId: string): Promise<void>;
    /**
     * Get tenant information
     * @param tenantId - The tenant identifier
     * @returns Tenant information
     */
    getTenantInfo(tenantId: string): Promise<TenantInfo>;
    /**
     * List all known tenants (for development/debugging)
     * @returns List of tenant information
     */
    listTenants(): Promise<TenantInfo[]>;
}
export {};
//# sourceMappingURL=tenantManager.d.ts.map