require('dotenv').config();
const crypto = require('crypto');
const { DgraphTenantFactory } = require('./dgraphTenant');
const fs = require('fs').promises;
const path = require('path');

/**
 * TenantManager - Manages tenant namespaces and lifecycle operations
 */
class TenantManager {
  constructor() {
    this.defaultNamespace = process.env.DGRAPH_NAMESPACE_DEFAULT || '0x0';
    this.testNamespace = process.env.DGRAPH_NAMESPACE_TEST || '0x1';
    this.namespacePrefix = process.env.DGRAPH_NAMESPACE_PREFIX || '0x';
    this.enableMultiTenant = process.env.ENABLE_MULTI_TENANT === 'true';
    
    console.log(`[TENANT_MANAGER] Initialized with multi-tenant: ${this.enableMultiTenant}`);
  }

  /**
   * Create a new tenant namespace with initial setup
   * @param {string} tenantId - Unique identifier for the tenant
   * @returns {Promise<string>} - The created namespace ID
   */
  async createTenant(tenantId) {
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
   * @param {string} namespace - The namespace to initialize
   */
  async initializeTenantSchema(namespace) {
    try {
      const { pushSchemaViaHttp } = require('../utils/pushSchema');
      const schemaContent = await this.getDefaultSchema();
      
      console.log(`[TENANT_MANAGER] Pushing schema to namespace ${namespace}`);
      await pushSchemaViaHttp(schemaContent, namespace);
      
    } catch (error) {
      console.error(`[TENANT_MANAGER] Failed to initialize schema for namespace ${namespace}:`, error);
      throw error;
    }
  }

  /**
   * Get the default GraphQL schema content
   * @returns {Promise<string>} - The schema content
   */
  async getDefaultSchema() {
    try {
      const schemaPath = path.join(__dirname, '../../schemas/default.graphql');
      return await fs.readFile(schemaPath, 'utf8');
    } catch (error) {
      console.error('[TENANT_MANAGER] Failed to read default schema:', error);
      throw new Error('Could not load default schema');
    }
  }

  /**
   * Seed a tenant namespace with default hierarchies
   * @param {string} namespace - The namespace to seed
   */
  async seedDefaultHierarchies(namespace) {
    try {
      const tenant = DgraphTenantFactory.createTenant(namespace);
      
      const defaultHierarchies = [
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
   * @param {object} hierarchyData - The hierarchy data to create
   * @param {DgraphTenant} tenant - The tenant client to use
   */
  async createHierarchyInNamespace(hierarchyData, tenant) {
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
      levels: hierarchyData.levels.map((level, index) => ({
        levelNumber: level.levelNumber,
        label: level.label,
        allowedTypes: level.allowedTypes.map(typeName => ({ typeName }))
      }))
    };

    await tenant.executeGraphQL(mutation, { hierarchy: hierarchyInput });
  }

  /**
   * Generate a deterministic namespace ID from tenant ID
   * @param {string} tenantId - The tenant identifier
   * @returns {string} - The generated namespace ID
   */
  generateNamespaceId(tenantId) {
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
   * @param {string} tenantId - The tenant identifier
   * @returns {Promise<string>} - The namespace ID
   */
  async getTenantNamespace(tenantId) {
    // For now, generate deterministically
    // In production, this would query a tenant mapping table
    return this.generateNamespaceId(tenantId);
  }

  /**
   * Check if a tenant exists
   * @param {string} tenantId - The tenant identifier
   * @returns {Promise<boolean>} - Whether the tenant exists
   */
  async tenantExists(tenantId) {
    try {
      const namespace = await this.getTenantNamespace(tenantId);
      const tenant = DgraphTenantFactory.createTenant(namespace);
      
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
   * @param {string} tenantId - The tenant identifier
   */
  async deleteTenant(tenantId) {
    try {
      const namespace = await this.getTenantNamespace(tenantId);
      console.log(`[TENANT_MANAGER] Deleting tenant ${tenantId} from namespace ${namespace}`);
      
      // For development, we'll just clear the data rather than deleting the namespace
      const tenant = DgraphTenantFactory.createTenant(namespace);
      
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
   * @param {string} tenantId - The tenant identifier
   * @returns {Promise<object>} - Tenant information
   */
  async getTenantInfo(tenantId) {
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
   * @returns {Promise<Array>} - List of tenant information
   */
  async listTenants() {
    // For development, return known tenants
    const knownTenants = ['default', 'test-tenant'];
    const tenantInfos = [];
    
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

module.exports = { TenantManager };
