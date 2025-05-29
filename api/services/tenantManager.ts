import crypto from 'crypto';
import config from '../config';
import { DgraphTenantFactory } from './dgraphTenant';
import { pushSchemaViaHttp } from '../utils/pushSchema';
import { promises as fs } from 'fs';
import path from 'path';
import { TenantInfo, CreateTenantResponse } from '../src/types';

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
      
      // Seed with default hierarchies
      await this.seedDefaultHierarchies(namespace);
      
      console.log(`[TENANT_MANAGER] Successfully created tenant ${tenantId} in namespace ${namespace}`);
      return namespace;
    } catch (error) {
      console.error(`[TENANT_MANAGER] Failed to create tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Initialize schema in a tenant's namespace
   * @param namespace - The namespace to initialize
   */
  async initializeTenantSchema(namespace: string): Promise<void> {
    try {
      const schemaContent = await this.getDefaultSchema();
      
      console.log(`[TENANT_MANAGER] Pushing schema to namespace ${namespace}`);
      await this.pushSchema(schemaContent, namespace);
      
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
      const tenant = this.tenantFactory.createTenant(namespace);
      
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
   * Generate a deterministic namespace ID from tenant ID
   * @param tenantId - The tenant identifier
   * @returns The generated namespace ID
   */
  generateNamespaceId(tenantId: string): string {
    // Handle special cases
    if (tenantId === 'test-tenant') return this.testNamespace;
    if (tenantId === 'default') return this.defaultNamespace;
    
    // Generate deterministic namespace ID from tenant ID
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
   * Check if a tenant exists
   * @param tenantId - The tenant identifier
   * @returns Whether the tenant exists
   */
  async tenantExists(tenantId: string): Promise<boolean> {
    try {
      const namespace = await this.getTenantNamespace(tenantId);
      const tenant = this.tenantFactory.createTenant(namespace);
      
      // Try a simple query to check if namespace is accessible
      const query = `query { __schema { types { name } } }`;
      await tenant.executeGraphQL(query);
      
      return true;
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
      
      // For development, we'll just clear the data rather than deleting the namespace
      const tenant = this.tenantFactory.createTenant(namespace);
      
      const dropMutation = `
        mutation {
          deleteNode(filter: {}) {
            numUids
          }
          deleteHierarchy(filter: {}) {
            numUids
          }
          deleteEdge(filter: {}) {
            numUids
          }
        }
      `;
      
      await tenant.executeGraphQL(dropMutation);
      console.log(`[TENANT_MANAGER] Successfully deleted tenant ${tenantId}`);
      
    } catch (error) {
      console.error(`[TENANT_MANAGER] Failed to delete tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Get tenant information
   * @param tenantId - The tenant identifier
   * @returns Tenant information
   */
  async getTenantInfo(tenantId: string): Promise<TenantInfo> {
    const namespace = await this.getTenantNamespace(tenantId);
    const exists = await this.tenantExists(tenantId);
    
    return {
      tenantId,
      namespace,
      exists,
      isTestTenant: tenantId === 'test-tenant',
      isDefaultTenant: tenantId === 'default'
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
