"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DgraphTenantFactory = exports.DgraphTenant = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = __importDefault(require("../config"));
/**
 * DgraphTenant - A tenant-aware Dgraph client that handles namespace-specific operations
 */
class DgraphTenant {
    constructor(namespace = null) {
        this.namespace = namespace;
        this.baseUrl = config_1.default.dgraphBaseUrl;
        this.endpoint = this.buildEndpoint();
        console.log(`[DGRAPH_TENANT] Created tenant client for namespace: ${namespace || 'default'}`);
    }
    /**
     * Build the GraphQL endpoint URL with optional namespace parameter
     */
    buildEndpoint() {
        const baseEndpoint = `${this.baseUrl.replace(/\/+$/, '')}/graphql`;
        return this.namespace ? `${baseEndpoint}?namespace=${this.namespace}` : baseEndpoint;
    }
    /**
     * Execute a GraphQL query or mutation against the tenant's namespace
     * @param query - The GraphQL query string
     * @param variables - Variables for the query
     * @returns The data part of the GraphQL response
     */
    async executeGraphQL(query, variables = {}) {
        const queryPreview = query.substring(0, 100).replace(/\s+/g, ' ');
        console.log(`[DGRAPH_TENANT] Executing query in namespace ${this.namespace || 'default'}: ${queryPreview}...`);
        try {
            const response = await axios_1.default.post(this.endpoint, {
                query,
                variables,
            }, {
                headers: { 'Content-Type': 'application/json' }
            });
            // Check for GraphQL errors in the response body
            if (response.data.errors) {
                console.error(`[DGRAPH_TENANT] GraphQL Errors in namespace ${this.namespace || 'default'}:`, JSON.stringify(response.data.errors, null, 2));
                throw new Error(`GraphQL query failed: ${response.data.errors.map((e) => e.message).join(', ')}`);
            }
            console.log(`[DGRAPH_TENANT] Query executed successfully in namespace ${this.namespace || 'default'}`);
            return response.data.data;
        }
        catch (error) {
            console.error(`[DGRAPH_TENANT] Error in namespace ${this.namespace || 'default'}: ${error.message}`);
            if (error.response) {
                console.error(`[DGRAPH_TENANT] Response status: ${error.response.status}`);
                console.error(`[DGRAPH_TENANT] Response data:`, error.response.data);
            }
            else if (error.request) {
                console.error(`[DGRAPH_TENANT] No response received:`, error.request);
            }
            throw new Error(`Failed to communicate with Dgraph in namespace ${this.namespace || 'default'}: ${error.message}`);
        }
    }
    /**
     * Get the namespace this tenant is operating in
     */
    getNamespace() {
        return this.namespace;
    }
    /**
     * Check if this tenant is using the default namespace
     */
    isDefaultNamespace() {
        return this.namespace === null || this.namespace === '0x0';
    }
}
exports.DgraphTenant = DgraphTenant;
/**
 * DgraphTenantFactory - Factory for creating tenant-specific Dgraph clients
 */
class DgraphTenantFactory {
    /**
     * Create a new DgraphTenant instance for the specified namespace
     * @param namespace - The namespace to operate in (null for default)
     * @returns A new tenant client instance
     */
    static createTenant(namespace = null) {
        return new DgraphTenant(namespace);
    }
    /**
     * Create a tenant client from a user context object
     * @param userContext - User context containing namespace information
     * @returns A new tenant client instance
     */
    static createTenantFromContext(userContext) {
        const namespace = userContext?.namespace || null;
        return new DgraphTenant(namespace);
    }
    /**
     * Create a tenant client for the default namespace
     * @returns A new tenant client for default namespace
     */
    static createDefaultTenant() {
        return new DgraphTenant(null);
    }
    /**
     * Create a tenant client for the test namespace
     * @returns A new tenant client for test namespace
     */
    static createTestTenant() {
        return new DgraphTenant(config_1.default.testNamespace);
    }
}
exports.DgraphTenantFactory = DgraphTenantFactory;
