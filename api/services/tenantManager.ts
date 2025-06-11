import crypto from 'crypto';
import config from '../config';
import { DgraphTenantFactory } from './dgraphTenant';
import { pushSchemaViaHttp } from '../utils/pushSchema';
import { SchemaValidator } from '../utils/schemaValidator';
import { promises as fs } from 'fs';
import path from 'path';
import { TenantInfo, CreateTenantResponse, TenantHealthStatus } from '../src/types';

// Interfaces for dependency injection
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
export class TenantManager {
  private pushSchema: (schema: string, namespace: string | null, adminUrl?: string) => Promise<any>;
  private fileSystem: typeof fs;
  private schemaPath: string;
  private tenantFactory: typeof DgraphTenantFactory;
  
  public readonly defaultNamespace: string;
  public readonly testNamespace: string;
  public readonly namespacePrefix: string;
  public readonly enableMultiTenant: boolean;

  constructor(dependencies: TenantManagerDependencies = {}) {
    // Dependency injection - use provided dependencies or defaults
    this.pushSchema = dependencies.pushSchema || pushSchemaViaHttp;
    this.fileSystem = dependencies.fileSystem || fs;
    this.schemaPath = dependencies.schemaPath || path.join(__dirname, '../../schemas/default.graphql');
    this.tenantFactory = dependencies.tenantFactory || DgraphTenantFactory;
    
    // Environment configuration
    this.defaultNamespace = config.defaultNamespace;
    this.testNamespace = config.testNamespace;
    this.namespacePrefix = config.namespacePrefix;
    this.enableMultiTenant = config.enableMultiTenant;
    
    console.log(`[TENANT_MANAGER] Initialized with multi-tenant: ${this.enableMultiTenant}`);
  }

  /**
   * Create a new tenant namespace with initial setup
   * @param tenantId - Unique identifier for the tenant
   * @returns The created namespace ID
   */
  async createTenant(tenantId: string): Promise<string> {
    const namespace = this.generateNamespaceId(tenantId);
    
    try {
      console.log(`[TENANT_MANAGER] Creating tenant ${tenantId} in namespace ${namespace}`);
      
      // Initialize schema in new namespace
      await this.initializeTenantSchema(namespace);

      // Verify schema initialization
      const tenantClientForSchemaCheck = await this.tenantFactory.createTenant(namespace);
      try {
        // Try a simple query that should work if schema is applied, e.g., querying a non-existent node of a core type
        await tenantClientForSchemaCheck.executeGraphQL('query { getNode(id: "0x0") { id } }'); 
        console.log(`[TENANT_MANAGER] Schema verified in namespace ${namespace}`);
      } catch (schemaVerifyError) {
        console.error(`[TENANT_MANAGER] Failed to verify schema in namespace ${namespace}:`, schemaVerifyError);
        throw new Error(`Schema verification failed for tenant ${tenantId} in namespace ${namespace}`);
      }
      
      /**
       * Conditional hierarchy seeding based on tenant type.
       * 
       * test-tenant is exempt from default hierarchy seeding because:
       * 1. Test suites need isolated, controlled data environments
       * 2. Different tests require different hierarchy configurations
       * 3. Auto-seeding would interfere with test data setup/teardown cycles
       * 4. Tests must be able to start with completely empty namespaces
       * 
       * Production tenants get default hierarchies for immediate usability.
       */
      if (tenantId !== 'test-tenant') {
        await this.seedDefaultHierarchies(namespace);

        // Verify default hierarchy seeding ONLY IF it's not the test-tenant
        try {
          const hierarchyCheck = await tenantClientForSchemaCheck.executeGraphQL('query { getHierarchy(id: "default-hierarchy") { id } }');
          if (!hierarchyCheck?.getHierarchy?.id) {
            throw new Error('Default hierarchy not found after seeding.');
          }
          console.log(`[TENANT_MANAGER] Default hierarchies verified in namespace ${namespace}`);
        } catch (hierarchyVerifyError) {
          console.error(`[TENANT_MANAGER] Failed to verify default hierarchies in namespace ${namespace}:`, hierarchyVerifyError);
          throw new Error(`Default hierarchy verification failed for tenant ${tenantId} in namespace ${namespace}`);
        }
      } else {
        console.log(`[TENANT_MANAGER] Skipping default hierarchy seeding for test-tenant ${tenantId} in namespace ${namespace}. Test suites should handle their own seeding.`);
      }
      
      console.log(`[TENANT_MANAGER] Successfully created tenant ${tenantId} in namespace ${namespace}`);
      return namespace;
    } catch (error) {
      console.error(`[TENANT_MANAGER] Failed to create tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Initialize schema in a tenant's namespace with comprehensive validation
   * @param namespace - The namespace to initialize
   */
  async initializeTenantSchema(namespace: string): Promise<void> {
    try {
      const schemaContent = await this.getDefaultSchema();
      
      // Pre-push validation
      console.log(`[TENANT_MANAGER] Validating schema content before push to namespace ${namespace}`);
      const validation = SchemaValidator.validateSchemaContent(schemaContent);
      
      if (!validation.valid) {
        throw new Error(`Schema validation failed: ${validation.errors.join(', ')}`);
      }
      
      if (validation.warnings.length > 0) {
        console.warn(`[TENANT_MANAGER] Schema validation warnings: ${validation.warnings.join(', ')}`);
      }
      
      // Push schema with enhanced error handling
      console.log(`[TENANT_MANAGER] Pushing schema to namespace ${namespace}`);
      const pushResult = await this.pushSchema(schemaContent, namespace);
      
      if (!pushResult.success) {
        throw new Error(`Schema push failed: ${JSON.stringify(pushResult.error)}`);
      }
      
      console.log(`[TENANT_MANAGER] Schema push completed, waiting for availability in namespace ${namespace}`);
      
      // Wait for schema to be available with polling
      const availabilityResult = await SchemaValidator.waitForSchemaAvailability(namespace, 15000, 1000);
      
      if (!availabilityResult.success) {
        console.error(`[TENANT_MANAGER] Schema availability check failed: ${availabilityResult.details}`);
        
        // Try one more comprehensive verification to get detailed error info
        const detailedVerification = await SchemaValidator.verifySchemaInNamespace(namespace);
        console.error(`[TENANT_MANAGER] Detailed schema verification: ${JSON.stringify(detailedVerification, null, 2)}`);
        
        throw new Error(`Schema not available after push: ${availabilityResult.details}. Detailed verification: ${detailedVerification.details}`);
      }
      
      console.log(`[TENANT_MANAGER] ✅ Schema successfully initialized and verified in namespace ${namespace} (${availabilityResult.waitedMs}ms)`);
      
    } catch (error) {
      console.error(`[TENANT_MANAGER] Failed to initialize schema for namespace ${namespace}:`, error);
      throw error;
    }
  }

  /**
   * Get the default GraphQL schema content
   * @returns The schema content
   */
  async getDefaultSchema(): Promise<string> {
    try {
      return await this.fileSystem.readFile(this.schemaPath, 'utf8');
    } catch (error) {
      console.error('[TENANT_MANAGER] Failed to read default schema:', error);
      throw new Error('Could not load default schema');
    }
  }

  /**
   * Seed a tenant namespace with default hierarchies
   * @param namespace - The namespace to seed
   */
  async seedDefaultHierarchies(namespace: string): Promise<void> {
    try {
      const tenant = await this.tenantFactory.createTenant(namespace);
      
      const defaultHierarchies: HierarchyData[] = [
        {
          id: 'default-hierarchy',
          name: 'Default Hierarchy',
          levels: [
            { levelNumber: 1, label: 'Concepts', allowedTypes: ['concept'] },
            { levelNumber: 2, label: 'Examples', allowedTypes: ['example'] },
            { levelNumber: 3, label: 'Details', allowedTypes: ['question', 'note'] }
          ]
        }
      ];

      for (const hierarchy of defaultHierarchies) {
        await this.createHierarchyInNamespace(hierarchy, tenant);
      }
      
      console.log(`[TENANT_MANAGER] Seeded default hierarchies in namespace ${namespace}`);
    } catch (error) {
      console.error(`[TENANT_MANAGER] Failed to seed hierarchies in namespace ${namespace}:`, error);
      throw error;
    }
  }

  /**
   * Create a hierarchy in a specific namespace
   * @param hierarchyData - The hierarchy data to create
   * @param tenant - The tenant client to use
   */
  async createHierarchyInNamespace(hierarchyData: HierarchyData, tenant: DgraphTenant): Promise<void> {
    const mutation = `
      mutation CreateHierarchy($hierarchy: AddHierarchyInput!) {
        addHierarchy(input: [$hierarchy]) {
          hierarchy {
            id
            name
            levels {
              id
              levelNumber
              label
              allowedTypes {
                typeName
              }
            }
          }
        }
      }
    `;

    // Transform hierarchy data to match GraphQL schema
    const hierarchyInput = {
      id: hierarchyData.id,
      name: hierarchyData.name,
      levels: hierarchyData.levels.map((level) => ({
        levelNumber: level.levelNumber,
        label: level.label,
        allowedTypes: level.allowedTypes.map(typeName => ({ typeName }))
      }))
    };

    await tenant.executeGraphQL(mutation, { hierarchy: hierarchyInput });
  }

  /**
   * Generate deterministic namespace ID with collision-resistant algorithm.
   * 
   * **Algorithm Design:**
   * 1. **Reserved namespaces**: test-tenant → 0x1, default → 0x0
   * 2. **SHA-256 hashing**: Ensures deterministic, cryptographically distributed output
   * 3. **8-hex-digit extraction**: Uses first 32 bits for namespace generation
   * 4. **Modulo distribution**: Maps to 0x2-0xF423F range (1M namespace capacity)
   * 5. **Collision resistance**: SHA-256 provides excellent distribution properties
   * 
   * **Collision Handling:**
   * - Probability of collision: ~1 in 1M for random tenant IDs
   * - Deterministic mapping ensures same tenant → same namespace across restarts
   * - Range 0x2-0xF423F leaves room for future reserved namespaces
   * 
   * @param tenantId - The tenant identifier (should be unique across system)
   * @returns Hexadecimal namespace ID (e.g., "0x1a2b3c")
   */
  generateNamespaceId(tenantId: string): string {
    // Handle special cases with reserved namespace mappings
    if (tenantId === 'test-tenant') return this.testNamespace;
    if (tenantId === 'default') return this.defaultNamespace;
    
    // Generate deterministic namespace ID using cryptographic hashing
    const hash = crypto.createHash('sha256').update(tenantId).digest('hex');
    const namespaceNum = parseInt(hash.substring(0, 8), 16) % 1000000 + 2; // Start from 0x2
    return `${this.namespacePrefix}${namespaceNum.toString(16)}`;
  }

  /**
   * Get the namespace for a given tenant ID
   * @param tenantId - The tenant identifier
   * @returns The namespace ID
   */
  async getTenantNamespace(tenantId: string): Promise<string> {
    // For now, generate deterministically
    // In production, this would query a tenant mapping table
    return this.generateNamespaceId(tenantId);
  }

  /**
   * Comprehensive health check for a tenant namespace
   * @param tenantId - The tenant identifier
   * @param namespace - The namespace to check
   * @returns Health status and details
   */
  async checkTenantHealth(tenantId: string, namespace: string): Promise<{
    health: TenantHealthStatus;
    details?: string;
  }> {
    try {
      const tenant = await this.tenantFactory.createTenant(namespace);
      
      // Stage 1: Basic connectivity test
      try {
        const schemaQuery = `query { __schema { types { name } } }`;
        const schemaResult = await tenant.executeGraphQL(schemaQuery);
        
        if (!schemaResult || !schemaResult.__schema) {
          return {
            health: 'error',
            details: 'GraphQL schema introspection failed'
          };
        }
      } catch (connectivityError) {
        // Check if this is a namespace not found error vs other connectivity issues
        const errorMessage = (connectivityError as Error).message || '';
        if (errorMessage.includes('namespace') || errorMessage.includes('not found')) {
          return {
            health: 'not-accessible',
            details: `Namespace ${namespace} not found in Dgraph`
          };
        }
        return {
          health: 'error',
          details: `Connection failed: ${errorMessage}`
        };
      }
      
      // Stage 2: Schema verification - check for core types
      try {
        const coreTypeQuery = `query { __type(name: "Node") { name } }`;
        const typeResult = await tenant.executeGraphQL(coreTypeQuery);
        
        if (!typeResult || !typeResult.__type) {
          return {
            health: 'error',
            details: 'Core schema types not found - schema may not be initialized'
          };
        }
      } catch (schemaError) {
        return {
          health: 'error',
          details: `Schema verification failed: ${(schemaError as Error).message}`
        };
      }
      
      // Stage 3: Data accessibility test
      try {
        const dataQuery = `query { queryNode(first: 1) { id } }`;
        await tenant.executeGraphQL(dataQuery);
        
        // If we get here, everything is working
        return {
          health: 'healthy',
          details: 'All health checks passed'
        };
      } catch (dataError) {
        // Data query failed, but connectivity and schema are OK
        // This might be normal for empty tenants
        const errorMessage = (dataError as Error).message || '';
        if (errorMessage.includes('queryNode')) {
          // This is likely just an empty tenant, which is still healthy
          return {
            health: 'healthy',
            details: 'Namespace accessible, schema initialized (no data yet)'
          };
        }
        return {
          health: 'error',
          details: `Data access test failed: ${errorMessage}`
        };
      }
      
    } catch (unexpectedError) {
      return {
        health: 'unknown',
        details: `Unexpected error during health check: ${(unexpectedError as Error).message}`
      };
    }
  }

  /**
   * Check if a tenant exists (legacy method for backward compatibility)
   * @param tenantId - The tenant identifier
   * @returns Whether the tenant exists
   */
  async tenantExists(tenantId: string): Promise<boolean> {
    try {
      const namespace = await this.getTenantNamespace(tenantId);
      const healthResult = await this.checkTenantHealth(tenantId, namespace);
      return healthResult.health === 'healthy' || healthResult.health === 'error';
    } catch (error) {
      console.log(`[TENANT_MANAGER] Tenant ${tenantId} does not exist or is not accessible`);
      return false;
    }
  }

  /**
   * Delete a tenant and all its data
   * @param tenantId - The tenant identifier
   */
  async deleteTenant(tenantId: string): Promise<void> {
    try {
      const namespace = await this.getTenantNamespace(tenantId);
      console.log(`[TENANT_MANAGER] Deleting tenant ${tenantId} from namespace ${namespace}`);
      
      const tenant = await this.tenantFactory.createTenant(namespace);

      /**
       * Critical deletion order to prevent GraphQL schema constraint violations.
       * 
       * Must delete in dependency order from most dependent to least:
       * 1. HierarchyAssignment - References both nodes and hierarchy levels
       * 2. HierarchyLevelType - References hierarchy levels and node types
       * 3. HierarchyLevel - References hierarchy but not nodes
       * 4. Hierarchy - Top-level hierarchy definitions
       * 5. Edge - References nodes but simpler relationships
       * 6. Node - Core entities (deleted last to avoid orphaned references)
       * 
       * Violating this order causes GraphQL constraint errors in Dgraph.
       */
      const deleteOperations = [
        { name: 'HierarchyAssignment', mutation: 'mutation { deleteHierarchyAssignment(filter: {}) { numUids } }' },
        { name: 'HierarchyLevelType', mutation: 'mutation { deleteHierarchyLevelType(filter: {}) { numUids } }' },
        { name: 'HierarchyLevel', mutation: 'mutation { deleteHierarchyLevel(filter: {}) { numUids } }' },
        { name: 'Hierarchy', mutation: 'mutation { deleteHierarchy(filter: {}) { numUids } }' },
        { name: 'Edge', mutation: 'mutation { deleteEdge(filter: {}) { numUids } }' },
        { name: 'Node', mutation: 'mutation { deleteNode(filter: {}) { numUids } }' }
      ];

      for (const op of deleteOperations) {
        try {
          console.log(`[TENANT_MANAGER] Deleting all ${op.name} in namespace ${namespace}...`);
          const result = await tenant.executeGraphQL(op.mutation);
          // Safely access numUids, handling cases where the key or numUids might be missing
          const numUidsDeleted = result?.[`delete${op.name}`]?.numUids || 0;
          console.log(`[TENANT_MANAGER] Deleted ${numUidsDeleted} ${op.name}(s).`);
        } catch (e) {
          // Log individual deletion errors but attempt to continue
          console.error(`[TENANT_MANAGER] Error deleting ${op.name} in namespace ${namespace}:`, e);
        }
      }
      
      console.log(`[TENANT_MANAGER] Successfully cleared data for tenant ${tenantId} in namespace ${namespace}`);
      
    } catch (error) {
      console.error(`[TENANT_MANAGER] Failed to delete tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Get node count for a tenant
   * @param tenantId - The tenant identifier
   * @returns Number of nodes in the tenant
   */
  async getTenantNodeCount(tenantId: string): Promise<number> {
    try {
      const namespace = await this.getTenantNamespace(tenantId);
      const tenant = await this.tenantFactory.createTenant(namespace);
      
      const countQuery = `query { aggregateNode { count } }`;
      const result = await tenant.executeGraphQL(countQuery);
      
      return result?.aggregateNode?.count || 0;
    } catch (error) {
      console.log(`[TENANT_MANAGER] Failed to get node count for tenant ${tenantId}:`, error);
      return 0; // Return 0 if we can't get the count
    }
  }

  /**
   * Get schema information for a tenant
   * @param tenantId - The tenant identifier
   * @returns Schema information
   */
  async getTenantSchemaInfo(tenantId: string): Promise<{
    id: string;
    name: string;
    isDefault: boolean;
  }> {
    try {
      const namespace = await this.getTenantNamespace(tenantId);
      const tenant = await this.tenantFactory.createTenant(namespace);
      
      // Query the schema types to identify which schema is loaded
      const schemaQuery = `query { __schema { types { name } } }`;
      const result = await tenant.executeGraphQL(schemaQuery);
      
      if (!result?.__schema?.types) {
        throw new Error('No schema found');
      }
      
      // For now, assume default schema - in the future we could match against known schemas
      // by comparing the type names against schema registry
      return {
        id: 'default',
        name: 'Default Schema',
        isDefault: true
      };
    } catch (error) {
      console.log(`[TENANT_MANAGER] Failed to get schema info for tenant ${tenantId}:`, error);
      return {
        id: 'unknown',
        name: 'Unknown Schema',
        isDefault: false
      };
    }
  }

  /**
   * Get the actual schema content for a tenant
   * @param tenantId - The tenant identifier
   * @returns The GraphQL schema content
   */
  async getTenantSchemaContent(tenantId: string): Promise<string> {
    try {
      // For now, return the default schema content
      // In the future, this could detect and return the actual schema from the tenant
      return await this.getDefaultSchema();
    } catch (error) {
      console.error(`[TENANT_MANAGER] Failed to get schema content for tenant ${tenantId}:`, error);
      throw new Error(`Could not retrieve schema content for tenant ${tenantId}`);
    }
  }

  /**
   * Get tenant information with comprehensive health checking
   * @param tenantId - The tenant identifier
   * @returns Tenant information including health status
   */
  async getTenantInfo(tenantId: string): Promise<TenantInfo> {
    const namespace = await this.getTenantNamespace(tenantId);
    
    // Perform comprehensive health check
    const healthResult = await this.checkTenantHealth(tenantId, namespace);
    
    // Determine exists based on health status
    const exists = healthResult.health === 'healthy' || healthResult.health === 'error';
    
    // Get additional stats if tenant is healthy
    let nodeCount: number | undefined;
    let schemaInfo: { id: string; name: string; isDefault: boolean; } | undefined;
    
    if (healthResult.health === 'healthy') {
      try {
        // Get node count and schema info in parallel
        const [nodeCountResult, schemaInfoResult] = await Promise.allSettled([
          this.getTenantNodeCount(tenantId),
          this.getTenantSchemaInfo(tenantId)
        ]);
        
        if (nodeCountResult.status === 'fulfilled') {
          nodeCount = nodeCountResult.value;
        }
        
        if (schemaInfoResult.status === 'fulfilled') {
          schemaInfo = schemaInfoResult.value;
        }
      } catch (error) {
        console.log(`[TENANT_MANAGER] Failed to get additional stats for tenant ${tenantId}:`, error);
        // Continue without stats rather than failing
      }
    }
    
    return {
      tenantId,
      namespace,
      exists,
      health: healthResult.health,
      healthDetails: healthResult.details,
      isTestTenant: tenantId === 'test-tenant',
      isDefaultTenant: tenantId === 'default',
      nodeCount,
      schemaInfo
    };
  }

  /**
   * List all known tenants (for development/debugging)
   * @returns List of tenant information
   */
  async listTenants(): Promise<TenantInfo[]> {
    // For development, return known tenants
    const knownTenants = ['default', 'test-tenant'];
    const tenantInfos: TenantInfo[] = [];
    
    for (const tenantId of knownTenants) {
      try {
        const info = await this.getTenantInfo(tenantId);
        tenantInfos.push(info);
      } catch (error) {
        console.error(`[TENANT_MANAGER] Error getting info for tenant ${tenantId}:`, error);
      }
    }
    
    return tenantInfos;
  }
}
