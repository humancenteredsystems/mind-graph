export interface TenantInfo {
    tenantId: string;
    namespace: string | null;
    isTestTenant: boolean;
    isDefaultTenant: boolean;
    exists: boolean;
    mode?: 'OSS' | 'Enterprise';
}
export interface TenantCapabilities {
    enterpriseDetected: boolean;
    namespacesSupported: boolean;
    detectedAt: Date;
    error?: string;
}
export interface CreateTenantRequest {
    tenantId: string;
    namespace?: string;
}
export interface CreateTenantResponse {
    tenantId: string;
    namespace: string;
    created: boolean;
    message?: string;
}
export interface TenantListResponse {
    tenants: TenantInfo[];
    mode: 'OSS' | 'Enterprise';
}
export interface NamespaceInfo {
    namespace: string;
    tenantId?: string;
    nodeCount?: number;
    hierarchyCount?: number;
}
export interface DgraphClientOptions {
    namespace?: string | null;
    timeout?: number;
    retries?: number;
}
export interface AdaptiveTenantFactoryOptions {
    defaultTimeout?: number;
    retryAttempts?: number;
    enableCapabilityDetection?: boolean;
}
//# sourceMappingURL=tenant.d.ts.map