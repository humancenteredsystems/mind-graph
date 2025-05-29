interface BackupMetadata {
    tenantId: string;
    backupDate: string;
    version: string;
    mode: 'enterprise' | 'oss';
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
export declare class TenantMigration {
    private backupDir;
    constructor();
    ensureBackupDirectory(): Promise<void>;
    backupTenant(tenantId: string, backupPath?: string | null): Promise<BackupResult>;
    restoreTenant(tenantId: string, backupPath: string): Promise<RestoreResult>;
    private restoreHierarchy;
    private restoreNodes;
    private restoreEdges;
    listBackups(): Promise<BackupInfo[]>;
}
export {};
//# sourceMappingURL=tenantMigration.d.ts.map