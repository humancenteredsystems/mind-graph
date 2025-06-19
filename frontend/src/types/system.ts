// System status types for settings and diagnostics

export interface SystemStatus {
  dgraphEnterprise: boolean;
  multiTenantVerified: boolean;
  currentTenant: string;
  namespace: string | null;
  mode: 'multi-tenant' | 'single-tenant';
  detectedAt: string;
  version?: string;
  detectionError?: string;
  namespacesSupported?: boolean;
  licenseType?: 'oss-only' | 'oss-trial' | 'enterprise-licensed' | 'unknown' | string;
  licenseExpiry?: string | null;
}
