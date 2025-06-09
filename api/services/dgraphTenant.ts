import axios, { AxiosResponse } from 'axios';
import config from '../config';
import { DgraphQueryResponse } from '../src/types';
import { withNamespaceValidationConstructor } from '../utils/namespaceValidator';

/**
 * Internal DgraphTenant class (without validation)
 */
class DgraphTenantInternal {
  private namespace: string | null;
  private baseUrl: string;
  private endpoint: string;

  constructor(namespace: string | null = null) {
    this.namespace = namespace;
    this.baseUrl = config.dgraphBaseUrl;
    this.endpoint = this.buildEndpoint();
    
    console.log(`[DGRAPH_TENANT] Created tenant client for namespace: ${namespace || 'default'}`);
  }

  /**
   * Build the GraphQL endpoint URL with optional namespace parameter
   */
  private buildEndpoint(): string {
    const baseEndpoint = `${this.baseUrl.replace(/\/+$/, '')}/graphql`;
    return this.namespace ? `${baseEndpoint}?namespace=${this.namespace}` : baseEndpoint;
  }

  /**
   * Execute a GraphQL query or mutation against the tenant's namespace
   * @param query - The GraphQL query string
   * @param variables - Variables for the query
   * @returns The data part of the GraphQL response
   */
  async executeGraphQL<T = any>(query: string, variables: Record<string, any> = {}): Promise<T> {
    const queryPreview = query.substring(0, 100).replace(/\s+/g, ' ');
    console.log(`[DGRAPH_TENANT] Executing query in namespace ${this.namespace || 'default'}: ${queryPreview}...`);
    console.log(`[DGRAPH_TENANT] Using endpoint: ${this.endpoint}`);
    console.log(`[DGRAPH_TENANT] Request payload:`, JSON.stringify({ query, variables }, null, 2));
    
    try {
      const response: AxiosResponse<DgraphQueryResponse<T>> = await axios.post(this.endpoint, {
        query,
        variables,
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
        validateStatus: (status) => status < 500
      });
      
      console.log(`[DGRAPH_TENANT] Response status: ${response.status}`);
      console.log(`[DGRAPH_TENANT] Response headers:`, response.headers);

      // Check for GraphQL errors in the response body
      if (response.data.errors) {
        console.error(`[DGRAPH_TENANT] GraphQL Errors in namespace ${this.namespace || 'default'}:`, 
          JSON.stringify(response.data.errors, null, 2));
        throw new Error(`GraphQL query failed: ${response.data.errors.map((e: any) => e.message).join(', ')}`);
      }

      console.log(`[DGRAPH_TENANT] Query executed successfully in namespace ${this.namespace || 'default'}`);      
      console.log(`[DGRAPH_TENANT] Raw response:`, JSON.stringify(response.data, null, 2));
      console.log(`[DGRAPH_TENANT] Returning data:`, JSON.stringify(response.data.data, null, 2));
      return response.data.data;

    } catch (error: any) {
      console.error(`[DGRAPH_TENANT] Error in namespace ${this.namespace || 'default'}: ${error.message}`);
      
      if (error.response) {
        console.error(`[DGRAPH_TENANT] Response status: ${error.response.status}`);
        console.error(`[DGRAPH_TENANT] Response data:`, error.response.data);
      } else if (error.request) {
        console.error(`[DGRAPH_TENANT] No response received:`, error.request);
      }

      // If this is a namespace operation and we're in OSS mode, provide Enterprise-specific error
      if (this.namespace && this.namespace !== '0x0') {
        const { NamespaceNotSupportedError } = require('../utils/errorResponse');
        throw new NamespaceNotSupportedError(
          'GraphQL execution',
          this.namespace,
          'Verify Dgraph Enterprise license and namespace configuration'
        );
      }

      // For default namespace operations, provide generic connection error without internal details
      throw new Error(`Failed to execute GraphQL operation. Please check Dgraph connectivity and configuration.`);
    }
  }

  /**
   * Get the namespace this tenant is operating in
   */
  getNamespace(): string | null {
    return this.namespace;
  }

  /**
   * Check if this tenant is using the default namespace
   */
  isDefaultNamespace(): boolean {
    return this.namespace === null || this.namespace === '0x0';
  }
}

/**
 * DgraphTenant - A tenant-aware Dgraph client that handles namespace-specific operations
 * with Enterprise capability validation
 */
export const DgraphTenant = withNamespaceValidationConstructor(
  DgraphTenantInternal,
  'Tenant client creation',
  0
);

export type DgraphTenant = DgraphTenantInternal;

/**
 * DgraphTenantFactory - Factory for creating tenant-specific Dgraph clients
 */
export class DgraphTenantFactory {
  /**
   * Create a new DgraphTenant instance for the specified namespace
   * @param namespace - The namespace to operate in (null for default)
   * @returns A new tenant client instance
   */
  static createTenant(namespace: string | null = null): DgraphTenant {
    return new DgraphTenant(namespace);
  }

  /**
   * Create a tenant client from a user context object
   * @param userContext - User context containing namespace information
   * @returns A new tenant client instance
   */
  static createTenantFromContext(userContext?: { namespace?: string | null }): DgraphTenant {
    const namespace = userContext?.namespace || null;
    return new DgraphTenant(namespace);
  }

  /**
   * Create a tenant client for the default namespace
   * @returns A new tenant client for default namespace
   */
  static createDefaultTenant(): DgraphTenant {
    return new DgraphTenant(null);
  }

  /**
   * Create a tenant client for the test namespace
   * @returns A new tenant client for test namespace
   */
  static createTestTenant(): DgraphTenant {
    return new DgraphTenant(config.testNamespace);
  }
}
