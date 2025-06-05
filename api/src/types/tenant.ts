// Tenant and multi-tenancy related types

export type TenantHealthStatus = 'healthy' | 'not-accessible' | 'error' | 'unknown';

export interface TenantInfo {
  tenantId: string;
  namespace: string | null;
  isTestTenant: boolean;
  isDefaultTenant: boolean;
  exists: boolean;
  health: TenantHealthStatus;
  healthDetails?: string;
  mode?: 'OSS' | 'Enterprise';
  nodeCount?: number;
  schemaInfo?: {
    id: string;
    name: string;
    isDefault: boolean;
  };
}

export interface TenantCapabilities {
  enterpriseDetected: boolean;
  namespacesSupported: boolean;
  detectedAt: Date;
  error?: string;
  licenseType?: 'oss-only' | 'oss-trial' | 'enterprise-licensed' | 'unknown';
  licenseExpiry?: Date | null;
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

// Dgraph client factory types
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
