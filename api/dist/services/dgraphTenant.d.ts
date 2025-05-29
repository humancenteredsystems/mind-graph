/**
 * DgraphTenant - A tenant-aware Dgraph client that handles namespace-specific operations
 */
export declare class DgraphTenant {
    private namespace;
    private baseUrl;
    private endpoint;
    constructor(namespace?: string | null);
    /**
     * Build the GraphQL endpoint URL with optional namespace parameter
     */
    private buildEndpoint;
    /**
     * Execute a GraphQL query or mutation against the tenant's namespace
     * @param query - The GraphQL query string
     * @param variables - Variables for the query
     * @returns The data part of the GraphQL response
     */
    executeGraphQL<T = any>(query: string, variables?: Record<string, any>): Promise<T>;
    /**
     * Get the namespace this tenant is operating in
     */
    getNamespace(): string | null;
    /**
     * Check if this tenant is using the default namespace
     */
    isDefaultNamespace(): boolean;
}
/**
 * DgraphTenantFactory - Factory for creating tenant-specific Dgraph clients
 */
export declare class DgraphTenantFactory {
    /**
     * Create a new DgraphTenant instance for the specified namespace
     * @param namespace - The namespace to operate in (null for default)
     * @returns A new tenant client instance
     */
    static createTenant(namespace?: string | null): DgraphTenant;
    /**
     * Create a tenant client from a user context object
     * @param userContext - User context containing namespace information
     * @returns A new tenant client instance
     */
    static createTenantFromContext(userContext?: {
        namespace?: string | null;
    }): DgraphTenant;
    /**
     * Create a tenant client for the default namespace
     * @returns A new tenant client for default namespace
     */
    static createDefaultTenant(): DgraphTenant;
    /**
     * Create a tenant client for the test namespace
     * @returns A new tenant client for test namespace
     */
    static createTestTenant(): DgraphTenant;
}
//# sourceMappingURL=dgraphTenant.d.ts.map