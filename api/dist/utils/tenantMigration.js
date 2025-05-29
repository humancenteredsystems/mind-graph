"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantMigration = void 0;
const adaptiveTenantFactory_1 = require("../services/adaptiveTenantFactory");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
/**
 * TenantMigration - Universal migration utilities that work in both OSS and Enterprise modes
 * Provides backup/restore capabilities with automatic adaptation to available features
 */
class TenantMigration {
    constructor() {
        this.backupDir = process.env.TENANT_BACKUP_DIR || './backups';
    }
    async ensureBackupDirectory() {
        try {
            await fs_1.promises.mkdir(this.backupDir, { recursive: true });
        }
        catch (error) {
            console.error(`[MIGRATION] Failed to create backup directory: ${error.message}`);
            throw error;
        }
    }
    async backupTenant(tenantId, backupPath = null) {
        console.log(`[MIGRATION] Backing up tenant ${tenantId}`);
        try {
            await this.ensureBackupDirectory();
            // Use adaptive factory to get appropriate client
            const tenant = await adaptiveTenantFactory_1.adaptiveTenantFactory.createTenant(tenantId === 'default' ? null : tenantId);
            // Export all data (works in both OSS and Enterprise)
            const exportQuery = `
        query {
          nodes: queryNode { 
            id 
            label 
            type 
            status
            branch
            hierarchyAssignments {
              id
              hierarchy { id name }
              level { id levelNumber label }
            }
          }
          hierarchies: queryHierarchy { 
            id 
            name 
            levels {
              id
              levelNumber
              label
              allowedTypes {
                id
                typeName
              }
            }
          }
          edges: queryEdge { 
            from { id } 
            fromId
            to { id } 
            toId
            type 
          }
        }
      `;
            console.log(`[MIGRATION] Executing export query for tenant ${tenantId}`);
            const data = await tenant.executeGraphQL(exportQuery);
            // Generate backup filename if not provided
            if (!backupPath) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                backupPath = path_1.default.join(this.backupDir, `${tenantId}-backup-${timestamp}.json`);
            }
            // Add metadata to backup
            const backupData = {
                metadata: {
                    tenantId,
                    backupDate: new Date().toISOString(),
                    version: '1.0',
                    mode: (await adaptiveTenantFactory_1.adaptiveTenantFactory.getCapabilities())?.namespacesSupported ? 'enterprise' : 'oss'
                },
                data
            };
            await fs_1.promises.writeFile(backupPath, JSON.stringify(backupData, null, 2));
            console.log(`[MIGRATION] Tenant ${tenantId} backed up to ${backupPath}`);
            return {
                success: true,
                backupPath,
                tenantId,
                nodeCount: data.nodes?.length || 0,
                hierarchyCount: data.hierarchies?.length || 0,
                edgeCount: data.edges?.length || 0
            };
        }
        catch (error) {
            console.error(`[MIGRATION] Backup failed for tenant ${tenantId}:`, error);
            throw error;
        }
    }
    async restoreTenant(tenantId, backupPath) {
        console.log(`[MIGRATION] Restoring tenant ${tenantId} from ${backupPath}`);
        try {
            // Read and validate backup file
            const backupContent = await fs_1.promises.readFile(backupPath, 'utf8');
            const backupData = JSON.parse(backupContent);
            if (!backupData.data) {
                throw new Error('Invalid backup file format - missing data section');
            }
            const { nodes, hierarchies, edges } = backupData.data;
            // Use adaptive factory to get appropriate client
            const tenant = await adaptiveTenantFactory_1.adaptiveTenantFactory.createTenant(tenantId === 'default' ? null : tenantId);
            console.log(`[MIGRATION] Restoring ${hierarchies?.length || 0} hierarchies`);
            // Restore hierarchies first
            if (hierarchies && hierarchies.length > 0) {
                for (const hierarchy of hierarchies) {
                    await this.restoreHierarchy(tenant, hierarchy);
                }
            }
            console.log(`[MIGRATION] Restoring ${nodes?.length || 0} nodes`);
            // Restore nodes
            if (nodes && nodes.length > 0) {
                await this.restoreNodes(tenant, nodes);
            }
            console.log(`[MIGRATION] Restoring ${edges?.length || 0} edges`);
            // Restore edges
            if (edges && edges.length > 0) {
                await this.restoreEdges(tenant, edges);
            }
            console.log(`[MIGRATION] Tenant ${tenantId} restored successfully from ${backupPath}`);
            return {
                success: true,
                tenantId,
                backupPath,
                restoredCounts: {
                    nodes: nodes?.length || 0,
                    hierarchies: hierarchies?.length || 0,
                    edges: edges?.length || 0
                }
            };
        }
        catch (error) {
            console.error(`[MIGRATION] Restore failed for tenant ${tenantId}:`, error);
            throw error;
        }
    }
    async restoreHierarchy(tenant, hierarchy) {
        try {
            const mutation = `
        mutation RestoreHierarchy($input: [AddHierarchyInput!]!) {
          addHierarchy(input: $input) {
            hierarchy { id name }
          }
        }
      `;
            const hierarchyInput = {
                id: hierarchy.id,
                name: hierarchy.name,
                levels: hierarchy.levels?.map(level => ({
                    levelNumber: level.levelNumber,
                    label: level.label,
                    allowedTypes: level.allowedTypes?.map(at => ({ typeName: at.typeName })) || []
                })) || []
            };
            await tenant.executeGraphQL(mutation, { input: [hierarchyInput] });
        }
        catch (error) {
            console.error(`[MIGRATION] Failed to restore hierarchy ${hierarchy.id}:`, error);
            // Continue with other hierarchies
        }
    }
    async restoreNodes(tenant, nodes) {
        try {
            const mutation = `
        mutation RestoreNodes($input: [AddNodeInput!]!) {
          addNode(input: $input) {
            node { id label }
          }
        }
      `;
            // Restore nodes in batches to avoid large mutations
            const batchSize = 50;
            for (let i = 0; i < nodes.length; i += batchSize) {
                const batch = nodes.slice(i, i + batchSize);
                const nodeInputs = batch.map(node => ({
                    id: node.id,
                    label: node.label,
                    type: node.type,
                    status: node.status || 'approved',
                    branch: node.branch || 'main'
                }));
                await tenant.executeGraphQL(mutation, { input: nodeInputs });
            }
        }
        catch (error) {
            console.error(`[MIGRATION] Failed to restore nodes:`, error);
            throw error;
        }
    }
    async restoreEdges(tenant, edges) {
        try {
            const mutation = `
        mutation RestoreEdges($input: [AddEdgeInput!]!) {
          addEdge(input: $input) {
            edge { from { id } to { id } }
          }
        }
      `;
            // Restore edges in batches
            const batchSize = 50;
            for (let i = 0; i < edges.length; i += batchSize) {
                const batch = edges.slice(i, i + batchSize);
                const edgeInputs = batch.map(edge => ({
                    from: { id: edge.fromId },
                    fromId: edge.fromId,
                    to: { id: edge.toId },
                    toId: edge.toId,
                    type: edge.type || 'simple'
                }));
                await tenant.executeGraphQL(mutation, { input: edgeInputs });
            }
        }
        catch (error) {
            console.error(`[MIGRATION] Failed to restore edges:`, error);
            throw error;
        }
    }
    async listBackups() {
        try {
            await this.ensureBackupDirectory();
            const files = await fs_1.promises.readdir(this.backupDir);
            const backupFiles = files.filter(file => file.endsWith('.json'));
            const backups = [];
            for (const file of backupFiles) {
                try {
                    const filePath = path_1.default.join(this.backupDir, file);
                    const stats = await fs_1.promises.stat(filePath);
                    const content = await fs_1.promises.readFile(filePath, 'utf8');
                    const backupData = JSON.parse(content);
                    backups.push({
                        filename: file,
                        path: filePath,
                        size: stats.size,
                        created: stats.mtime,
                        metadata: backupData.metadata || {},
                        counts: {
                            nodes: backupData.data?.nodes?.length || 0,
                            hierarchies: backupData.data?.hierarchies?.length || 0,
                            edges: backupData.data?.edges?.length || 0
                        }
                    });
                }
                catch (error) {
                    console.warn(`[MIGRATION] Could not read backup file ${file}:`, error.message);
                }
            }
            return backups.sort((a, b) => b.created.getTime() - a.created.getTime());
        }
        catch (error) {
            console.error(`[MIGRATION] Failed to list backups:`, error);
            throw error;
        }
    }
}
exports.TenantMigration = TenantMigration;
//# sourceMappingURL=tenantMigration.js.map