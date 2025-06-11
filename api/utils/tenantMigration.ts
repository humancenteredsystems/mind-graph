import { adaptiveTenantFactory } from '../services/adaptiveTenantFactory';
import { DgraphTenantInternal } from '../services/dgraphTenant';
import { promises as fs } from 'fs';
import path from 'path';

interface BackupMetadata {
  tenantId: string;
  backupDate: string;
  version: string;
  mode: 'enterprise' | 'oss';
}

interface BackupData {
  metadata: BackupMetadata;
  data: {
    nodes?: any[];
    hierarchies?: any[];
    edges?: any[];
  };
}

interface BackupResult {
  success: boolean;
  backupPath: string;
  tenantId: string;
  nodeCount: number;
  hierarchyCount: number;
  edgeCount: number;
}

interface RestoreResult {
  success: boolean;
  tenantId: string;
  backupPath: string;
  restoredCounts: {
    nodes: number;
    hierarchies: number;
    edges: number;
  };
}

interface BackupInfo {
  filename: string;
  path: string;
  size: number;
  created: Date;
  metadata: Partial<BackupMetadata>;
  counts: {
    nodes: number;
    hierarchies: number;
    edges: number;
  };
}

/**
 * TenantMigration - Universal migration utilities that work in both OSS and Enterprise modes
 * Provides backup/restore capabilities with automatic adaptation to available features
 */
export class TenantMigration {
  private backupDir: string;

  constructor() {
    this.backupDir = process.env.TENANT_BACKUP_DIR || './backups';
  }

  async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
    } catch (error) {
      const err = error as Error;
      console.error(`[MIGRATION] Failed to create backup directory: ${err.message}`);
      throw error;
    }
  }

  async backupTenant(tenantId: string, backupPath: string | null = null): Promise<BackupResult> {
    console.log(`[MIGRATION] Backing up tenant ${tenantId}`);
    
    try {
      await this.ensureBackupDirectory();
      
      // Use adaptive factory to get appropriate client
      const tenant = await adaptiveTenantFactory.createTenant(
        tenantId === 'default' ? null : tenantId
      );
      
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
        backupPath = path.join(this.backupDir, `${tenantId}-backup-${timestamp}.json`);
      }
      
      // Add metadata to backup
      const backupData: BackupData = {
        metadata: {
          tenantId,
          backupDate: new Date().toISOString(),
          version: '1.0',
          mode: (await adaptiveTenantFactory.getCapabilities())?.namespacesSupported ? 'enterprise' : 'oss'
        },
        data
      };
      
      await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
      
      console.log(`[MIGRATION] Tenant ${tenantId} backed up to ${backupPath}`);
      return {
        success: true,
        backupPath,
        tenantId,
        nodeCount: data.nodes?.length || 0,
        hierarchyCount: data.hierarchies?.length || 0,
        edgeCount: data.edges?.length || 0
      };
    } catch (error) {
      console.error(`[MIGRATION] Backup failed for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  async restoreTenant(tenantId: string, backupPath: string): Promise<RestoreResult> {
    console.log(`[MIGRATION] Restoring tenant ${tenantId} from ${backupPath}`);
    
    try {
      // Read and validate backup file
      const backupContent = await fs.readFile(backupPath, 'utf8');
      const backupData: BackupData = JSON.parse(backupContent);
      
      if (!backupData.data) {
        throw new Error('Invalid backup file format - missing data section');
      }
      
      const { nodes, hierarchies, edges } = backupData.data;
      
      // Use adaptive factory to get appropriate client
      const tenant = await adaptiveTenantFactory.createTenant(
        tenantId === 'default' ? null : tenantId
      );
      
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
    } catch (error) {
      console.error(`[MIGRATION] Restore failed for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  async restoreHierarchy(tenant: DgraphTenantInternal, hierarchy: any): Promise<void> {
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
        levels: hierarchy.levels?.map((level: any) => ({
          levelNumber: level.levelNumber,
          label: level.label,
          allowedTypes: level.allowedTypes?.map((at: any) => ({ typeName: at.typeName })) || []
        })) || []
      };
      
      await tenant.executeGraphQL(mutation, { input: [hierarchyInput] });
    } catch (error) {
      console.error(`[MIGRATION] Failed to restore hierarchy ${hierarchy.id}:`, error);
      // Continue with other hierarchies
    }
  }

  async restoreNodes(tenant: DgraphTenantInternal, nodes: any[]): Promise<void> {
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
        const nodeInputs = batch.map((node: any) => ({
          id: node.id,
          label: node.label,
          type: node.type,
          status: node.status || 'approved',
          branch: node.branch || 'main'
        }));
        
        await tenant.executeGraphQL(mutation, { input: nodeInputs });
      }
    } catch (error) {
      console.error(`[MIGRATION] Failed to restore nodes:`, error);
      throw error;
    }
  }

  async restoreEdges(tenant: DgraphTenantInternal, edges: any[]): Promise<void> {
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
        const edgeInputs = batch.map((edge: any) => ({
          from: { id: edge.fromId },
          fromId: edge.fromId,
          to: { id: edge.toId },
          toId: edge.toId,
          type: edge.type || 'simple'
        }));
        
        await tenant.executeGraphQL(mutation, { input: edgeInputs });
      }
    } catch (error) {
      console.error(`[MIGRATION] Failed to restore edges:`, error);
      throw error;
    }
  }

  async listBackups(): Promise<BackupInfo[]> {
    try {
      await this.ensureBackupDirectory();
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => file.endsWith('.json'));
      
      const backups: BackupInfo[] = [];
      for (const file of backupFiles) {
        try {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);
          const content = await fs.readFile(filePath, 'utf8');
          const backupData: BackupData = JSON.parse(content);
          
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
        } catch (error) {
          const err = error as Error;
          console.warn(`[MIGRATION] Could not read backup file ${file}:`, err.message);
        }
      }
      
      return backups.sort((a, b) => b.created.getTime() - a.created.getTime());
    } catch (error) {
      console.error(`[MIGRATION] Failed to list backups:`, error);
      throw error;
    }
  }
}
