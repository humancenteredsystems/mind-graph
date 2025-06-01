"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantManager = void 0;
const crypto_1 = __importDefault(require("crypto"));
const config_1 = __importDefault(require("../config"));
const dgraphTenant_1 = require("./dgraphTenant");
const pushSchema_1 = require("../utils/pushSchema");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
/**
 * TenantManager - Manages tenant namespaces and lifecycle operations
 */
class TenantManager {
    constructor(dependencies = {}) {
        // Dependency injection - use provided dependencies or defaults
        this.pushSchema = dependencies.pushSchema || pushSchema_1.pushSchemaViaHttp;
        this.fileSystem = dependencies.fileSystem || fs_1.promises;
        this.schemaPath = dependencies.schemaPath || path_1.default.join(__dirname, '../../schemas/default.graphql');
        this.tenantFactory = dependencies.tenantFactory || dgraphTenant_1.DgraphTenantFactory;
        // Environment configuration
        this.defaultNamespace = config_1.default.defaultNamespace;
        this.testNamespace = config_1.default.testNamespace;
        this.namespacePrefix = config_1.default.namespacePrefix;
        this.enableMultiTenant = config_1.default.enableMultiTenant;
        console.log(`[TENANT_MANAGER] Initialized with multi-tenant: ${this.enableMultiTenant}`);
    }
    /**
     * Create a new tenant namespace with initial setup
     * @param tenantId - Unique identifier for the tenant
     * @returns The created namespace ID
     */
    async createTenant(tenantId) {
        const namespace = this.generateNamespaceId(tenantId);
        try {
            console.log(`[TENANT_MANAGER] Creating tenant ${tenantId} in namespace ${namespace}`);
            // Initialize schema in new namespace
            await this.initializeTenantSchema(namespace);
            // Verify schema initialization
            const tenantClientForSchemaCheck = this.tenantFactory.createTenant(namespace);
            try {
                // Try a simple query that should work if schema is applied, e.g., querying a non-existent node of a core type
                await tenantClientForSchemaCheck.executeGraphQL('query { getNode(id: "0x0") { id } }');
                console.log(`[TENANT_MANAGER] Schema verified in namespace ${namespace}`);
            }
            catch (schemaVerifyError) {
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
                }
                catch (hierarchyVerifyError) {
                    console.error(`[TENANT_MANAGER] Failed to verify default hierarchies in namespace ${namespace}:`, hierarchyVerifyError);
                    throw new Error(`Default hierarchy verification failed for tenant ${tenantId} in namespace ${namespace}`);
                }
            }
            else {
                console.log(`[TENANT_MANAGER] Skipping default hierarchy seeding for test-tenant ${tenantId} in namespace ${namespace}. Test suites should handle their own seeding.`);
            }
            console.log(`[TENANT_MANAGER] Successfully created tenant ${tenantId} in namespace ${namespace}`);
            return namespace;
        }
        catch (error) {
            console.error(`[TENANT_MANAGER] Failed to create tenant ${tenantId}:`, error);
            throw error;
        }
    }
    /**
     * Initialize schema in a tenant's namespace
     * @param namespace - The namespace to initialize
     */
    async initializeTenantSchema(namespace) {
        try {
            const schemaContent = await this.getDefaultSchema();
            console.log(`[TENANT_MANAGER] Pushing schema to namespace ${namespace}`);
            await this.pushSchema(schemaContent, namespace);
        }
        catch (error) {
            console.error(`[TENANT_MANAGER] Failed to initialize schema for namespace ${namespace}:`, error);
            throw error;
        }
    }
    /**
     * Get the default GraphQL schema content
     * @returns The schema content
     */
    async getDefaultSchema() {
        try {
            return await this.fileSystem.readFile(this.schemaPath, 'utf8');
        }
        catch (error) {
            console.error('[TENANT_MANAGER] Failed to read default schema:', error);
            throw new Error('Could not load default schema');
        }
    }
    /**
     * Seed a tenant namespace with default hierarchies
     * @param namespace - The namespace to seed
     */
    async seedDefaultHierarchies(namespace) {
        try {
            const tenant = this.tenantFactory.createTenant(namespace);
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
        }
        catch (error) {
            console.error(`[TENANT_MANAGER] Failed to seed hierarchies in namespace ${namespace}:`, error);
            throw error;
        }
    }
    /**
     * Create a hierarchy in a specific namespace
     * @param hierarchyData - The hierarchy data to create
     * @param tenant - The tenant client to use
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
    generateNamespaceId(tenantId) {
        // Handle special cases with reserved namespace mappings
        if (tenantId === 'test-tenant')
            return this.testNamespace;
        if (tenantId === 'default')
            return this.defaultNamespace;
        // Generate deterministic namespace ID using cryptographic hashing
        const hash = crypto_1.default.createHash('sha256').update(tenantId).digest('hex');
        const namespaceNum = parseInt(hash.substring(0, 8), 16) % 1000000 + 2; // Start from 0x2
        return `${this.namespacePrefix}${namespaceNum.toString(16)}`;
    }
    /**
     * Get the namespace for a given tenant ID
     * @param tenantId - The tenant identifier
     * @returns The namespace ID
     */
    async getTenantNamespace(tenantId) {
        // For now, generate deterministically
        // In production, this would query a tenant mapping table
        return this.generateNamespaceId(tenantId);
    }
    /**
     * Check if a tenant exists
     * @param tenantId - The tenant identifier
     * @returns Whether the tenant exists
     */
    async tenantExists(tenantId) {
        try {
            const namespace = await this.getTenantNamespace(tenantId);
            const tenant = this.tenantFactory.createTenant(namespace);
            // Try a simple query to check if namespace is accessible
            const query = `query { __schema { types { name } } }`;
            await tenant.executeGraphQL(query);
            return true;
        }
        catch (error) {
            console.log(`[TENANT_MANAGER] Tenant ${tenantId} does not exist or is not accessible`);
            return false;
        }
    }
    /**
     * Delete a tenant and all its data
     * @param tenantId - The tenant identifier
     */
    async deleteTenant(tenantId) {
        try {
            const namespace = await this.getTenantNamespace(tenantId);
            console.log(`[TENANT_MANAGER] Deleting tenant ${tenantId} from namespace ${namespace}`);
            const tenant = this.tenantFactory.createTenant(namespace);
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
                    // Ensure the key exists before logging, Dgraph might not return it if nothing was deleted
                    const numUidsDeleted = result[`delete${op.name}`]?.numUids || 0;
                    console.log(`[TENANT_MANAGER] Deleted ${numUidsDeleted} ${op.name}(s).`);
                }
                catch (e) {
                    // Log individual deletion errors but attempt to continue
                    console.error(`[TENANT_MANAGER] Error deleting ${op.name} in namespace ${namespace}:`, e);
                }
            }
            console.log(`[TENANT_MANAGER] Successfully cleared data for tenant ${tenantId} in namespace ${namespace}`);
        }
        catch (error) {
            console.error(`[TENANT_MANAGER] Failed to delete tenant ${tenantId}:`, error);
            throw error;
        }
    }
    /**
     * Get tenant information
     * @param tenantId - The tenant identifier
     * @returns Tenant information
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
     * @returns List of tenant information
     */
    async listTenants() {
        // For development, return known tenants
        const knownTenants = ['default', 'test-tenant'];
        const tenantInfos = [];
        for (const tenantId of knownTenants) {
            try {
                const info = await this.getTenantInfo(tenantId);
                tenantInfos.push(info);
            }
            catch (error) {
                console.error(`[TENANT_MANAGER] Error getting info for tenant ${tenantId}:`, error);
            }
        }
        return tenantInfos;
    }
}
exports.TenantManager = TenantManager;
