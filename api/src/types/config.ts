// Configuration types

export interface Config {
  port: number;
  dgraphBaseUrl: string;
  dgraphGraphqlUrl: string;
  dgraphAdminUrl: string;
  dgraphAlterUrl: string;
  adminApiKey?: string;
  corsOrigin: string;
  enableMultiTenant: boolean;
  defaultNamespace: string;
  testNamespace: string;
  namespacePrefix: string;
}

export interface DgraphConfig {
  baseUrl: string;
  graphqlUrl: string;
  adminUrl: string;
  alterUrl: string;
}

export interface TenantConfig {
  enableMultiTenant: boolean;
  defaultNamespace: string;
  testNamespace: string;
  namespacePrefix: string;
}

export interface ServerConfig {
  port: number;
  adminApiKey?: string;
  corsOrigins?: string[];
}
