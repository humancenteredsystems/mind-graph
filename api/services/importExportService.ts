import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DgraphTenantFactory } from './dgraphTenant';
import { TenantManager } from './tenantManager';

// Types for import/export operations
export interface ImportFileAnalysis {
  fileId: string;
  format: 'json' | 'csv' | 'graphml';
  nodeCount: number;
  edgeCount: number;
  hierarchyCount: number;
  validation: ValidationResult;
  preview: PreviewData;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PreviewData {
  nodes: any[];
  edges: any[];
  hierarchies: any[];
  sampleSize: number;
}

export interface ImportPreview {
  nodes: any[];
  edges: any[];
  hierarchies: any[];
  validation: ValidationResult;
  conflicts: ConflictInfo[];
}

export interface ConflictInfo {
  type: 'node' | 'edge' | 'hierarchy';
  id: string;
  action: 'create' | 'update' | 'skip';
  reason: string;
}

export interface JobStatus {
  jobId: string;
  type: 'import' | 'export';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message: string;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
}

export interface ExportFormat {
  id: string;
  name: string;
  description: string;
  extension: string;
  mimeType: string;
  supportsFiltering: boolean;
}

export interface ExportDownload {
  filePath: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export class ImportExportService {
  private tenantManager: TenantManager;
  private jobs: Map<string, JobStatus> = new Map();
  private uploadDir = 'uploads';
  private exportDir = 'exports';

  constructor() {
    this.tenantManager = new TenantManager();
    this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(this.exportDir, { recursive: true });
    } catch (error) {
      console.error('[IMPORT_EXPORT] Failed to create directories:', error);
    }
  }

  // Import Methods
  // -------------------------------------------------------------------

  async analyzeImportFile(
    filePath: string,
    originalName: string,
    tenantId: string
  ): Promise<ImportFileAnalysis> {
    const fileId = uuidv4();
    const format = this.detectFileFormat(originalName);

    console.log(`[IMPORT_EXPORT] Analyzing file ${originalName} (${format}) for tenant ${tenantId}`);

    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      let analysis: ImportFileAnalysis;

      switch (format) {
        case 'json':
          analysis = await this.analyzeJsonFile(fileId, fileContent, tenantId);
          break;
        case 'csv':
          analysis = await this.analyzeCsvFile(fileId, fileContent, tenantId);
          break;
        case 'graphml':
          analysis = await this.analyzeGraphMLFile(fileId, fileContent, tenantId);
          break;
        default:
          throw new Error(`Unsupported file format: ${format}`);
      }

      // Store file for later processing
      const storedPath = path.join(this.uploadDir, `${fileId}.${format}`);
      await fs.copyFile(filePath, storedPath);
      await fs.unlink(filePath); // Clean up original upload

      return analysis;

    } catch (error) {
      await fs.unlink(filePath); // Clean up on error
      throw new Error(`File analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private detectFileFormat(fileName: string): 'json' | 'csv' | 'graphml' {
    const ext = path.extname(fileName).toLowerCase();
    switch (ext) {
      case '.json':
        return 'json';
      case '.csv':
        return 'csv';
      case '.graphml':
      case '.xml':
        return 'graphml';
      default:
        throw new Error(`Unsupported file extension: ${ext}`);
    }
  }

  private async analyzeJsonFile(
    fileId: string,
    content: string,
    tenantId: string
  ): Promise<ImportFileAnalysis> {
    try {
      const data = JSON.parse(content);
      
      // Validate JSON structure
      const validation = this.validateJsonStructure(data);
      
      // Count elements
      const nodeCount = data.nodes?.length || 0;
      const edgeCount = data.edges?.length || 0;
      const hierarchyCount = data.hierarchies?.length || 0;

      // Generate preview (first 10 items of each type)
      const preview: PreviewData = {
        nodes: (data.nodes || []).slice(0, 10),
        edges: (data.edges || []).slice(0, 10),
        hierarchies: (data.hierarchies || []).slice(0, 10),
        sampleSize: Math.min(10, nodeCount + edgeCount + hierarchyCount)
      };

      return {
        fileId,
        format: 'json',
        nodeCount,
        edgeCount,
        hierarchyCount,
        validation,
        preview
      };

    } catch (error) {
      return {
        fileId,
        format: 'json',
        nodeCount: 0,
        edgeCount: 0,
        hierarchyCount: 0,
        validation: {
          isValid: false,
          errors: [`Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`],
          warnings: []
        },
        preview: { nodes: [], edges: [], hierarchies: [], sampleSize: 0 }
      };
    }
  }

  private validateJsonStructure(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for required top-level structure
    if (typeof data !== 'object' || data === null) {
      errors.push('Root element must be an object');
      return { isValid: false, errors, warnings };
    }

    // Validate metadata if present
    if (data.metadata) {
      if (!data.metadata.version) {
        warnings.push('Missing version in metadata');
      }
      if (!data.metadata.exportedAt) {
        warnings.push('Missing exportedAt timestamp in metadata');
      }
    }

    // Validate nodes structure
    if (data.nodes && !Array.isArray(data.nodes)) {
      errors.push('Nodes must be an array');
    } else if (data.nodes) {
      data.nodes.forEach((node: any, index: number) => {
        if (!node.id) {
          errors.push(`Node at index ${index} missing required 'id' field`);
        }
        if (!node.label) {
          warnings.push(`Node at index ${index} missing 'label' field`);
        }
      });
    }

    // Validate edges structure
    if (data.edges && !Array.isArray(data.edges)) {
      errors.push('Edges must be an array');
    } else if (data.edges) {
      data.edges.forEach((edge: any, index: number) => {
        if (!edge.fromId) {
          errors.push(`Edge at index ${index} missing required 'fromId' field`);
        }
        if (!edge.toId) {
          errors.push(`Edge at index ${index} missing required 'toId' field`);
        }
      });
    }

    // Validate hierarchies structure
    if (data.hierarchies && !Array.isArray(data.hierarchies)) {
      errors.push('Hierarchies must be an array');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private async analyzeCsvFile(
    fileId: string,
    content: string,
    tenantId: string
  ): Promise<ImportFileAnalysis> {
    // Basic CSV analysis - for now, assume it's a simple node list
    const lines = content.split('\n').filter(line => line.trim());
    const nodeCount = Math.max(0, lines.length - 1); // Subtract header row

    return {
      fileId,
      format: 'csv',
      nodeCount,
      edgeCount: 0,
      hierarchyCount: 0,
      validation: {
        isValid: nodeCount > 0,
        errors: nodeCount === 0 ? ['CSV file appears to be empty'] : [],
        warnings: ['CSV import requires field mapping configuration']
      },
      preview: {
        nodes: lines.slice(0, 11), // Header + 10 data rows
        edges: [],
        hierarchies: [],
        sampleSize: Math.min(10, nodeCount)
      }
    };
  }

  private async analyzeGraphMLFile(
    fileId: string,
    content: string,
    tenantId: string
  ): Promise<ImportFileAnalysis> {
    // Basic GraphML analysis - would need XML parsing for full implementation
    return {
      fileId,
      format: 'graphml',
      nodeCount: 0,
      edgeCount: 0,
      hierarchyCount: 0,
      validation: {
        isValid: false,
        errors: ['GraphML import not yet implemented'],
        warnings: []
      },
      preview: { nodes: [], edges: [], hierarchies: [], sampleSize: 0 }
    };
  }

  async generateImportPreview(
    fileId: string,
    tenantId: string,
    mapping?: any
  ): Promise<ImportPreview> {
    const filePath = await this.findUploadedFile(fileId);
    const content = await fs.readFile(filePath, 'utf-8');
    const format = this.detectFileFormat(filePath);

    // For JSON format, we can generate a detailed preview
    if (format === 'json') {
      const data = JSON.parse(content);
      
      // Check for conflicts with existing data
      const conflicts = await this.detectConflicts(data, tenantId);
      
      return {
        nodes: data.nodes || [],
        edges: data.edges || [],
        hierarchies: data.hierarchies || [],
        validation: this.validateJsonStructure(data),
        conflicts
      };
    }

    // For other formats, return basic preview
    return {
      nodes: [],
      edges: [],
      hierarchies: [],
      validation: { isValid: false, errors: ['Preview not available for this format'], warnings: [] },
      conflicts: []
    };
  }

  private async detectConflicts(data: any, tenantId: string): Promise<ConflictInfo[]> {
    const conflicts: ConflictInfo[] = [];
    
    try {
      // Get tenant client to check existing data
      const namespace = await this.tenantManager.getTenantNamespace(tenantId);
      const tenantClient = await DgraphTenantFactory.createTenant(namespace);

      // Check for existing nodes
      if (data.nodes) {
        const nodeIds = data.nodes.map((node: any) => node.id);
        const existingNodesQuery = `{
          queryNode(filter: { id: { in: [${nodeIds.map((id: string) => `"${id}"`).join(', ')}] } }) {
            id
            label
          }
        }`;
        
        const existingNodes = await tenantClient.executeGraphQL(existingNodesQuery);
        const existingNodeIds = new Set(existingNodes?.queryNode?.map((node: any) => node.id) || []);

        data.nodes.forEach((node: any) => {
          if (existingNodeIds.has(node.id)) {
            conflicts.push({
              type: 'node',
              id: node.id,
              action: 'update',
              reason: 'Node with this ID already exists'
            });
          }
        });
      }

    } catch (error) {
      console.error('[IMPORT_EXPORT] Error detecting conflicts:', error);
      // Don't fail the preview if conflict detection fails
    }

    return conflicts;
  }

  async executeImport(
    fileId: string,
    tenantId: string,
    namespace: string | undefined,
    options: any
  ): Promise<string> {
    const jobId = uuidv4();
    
    // Create job status
    const job: JobStatus = {
      jobId,
      type: 'import',
      status: 'pending',
      progress: 0,
      message: 'Import job queued',
      startedAt: new Date()
    };
    
    this.jobs.set(jobId, job);

    // Start import process asynchronously
    this.processImport(jobId, fileId, tenantId, namespace, options).catch(error => {
      console.error(`[IMPORT_EXPORT] Import job ${jobId} failed:`, error);
      const failedJob = this.jobs.get(jobId);
      if (failedJob) {
        failedJob.status = 'failed';
        failedJob.error = error instanceof Error ? error.message : 'Unknown error';
        failedJob.completedAt = new Date();
      }
    });

    return jobId;
  }

  private async processImport(
    jobId: string,
    fileId: string,
    tenantId: string,
    namespace: string | undefined,
    options: any
  ): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      job.status = 'running';
      job.message = 'Reading import file';
      job.progress = 10;

      const filePath = await this.findUploadedFile(fileId);
      const content = await fs.readFile(filePath, 'utf-8');
      const format = this.detectFileFormat(filePath);

      if (format !== 'json') {
        throw new Error('Only JSON import is currently supported');
      }

      const data = JSON.parse(content);
      const tenantClient = await DgraphTenantFactory.createTenant(namespace || '');

      job.message = 'Importing hierarchies';
      job.progress = 20;

      // Import hierarchies first
      if (data.hierarchies && data.hierarchies.length > 0) {
        await this.importHierarchies(data.hierarchies, tenantClient);
      }

      job.message = 'Importing nodes';
      job.progress = 40;

      // Import nodes
      if (data.nodes && data.nodes.length > 0) {
        await this.importNodes(data.nodes, tenantClient);
      }

      job.message = 'Importing edges';
      job.progress = 70;

      // Import edges
      if (data.edges && data.edges.length > 0) {
        await this.importEdges(data.edges, tenantClient);
      }

      job.message = 'Import completed successfully';
      job.progress = 100;
      job.status = 'completed';
      job.completedAt = new Date();
      job.result = {
        nodesImported: data.nodes?.length || 0,
        edgesImported: data.edges?.length || 0,
        hierarchiesImported: data.hierarchies?.length || 0
      };

      // Clean up uploaded file
      await fs.unlink(filePath);

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();
    }
  }

  private async importHierarchies(hierarchies: any[], tenantClient: any): Promise<void> {
    for (const hierarchy of hierarchies) {
      // Create hierarchy
      const createHierarchyMutation = `
        mutation CreateHierarchy($input: [AddHierarchyInput!]!) {
          addHierarchy(input: $input) {
            hierarchy {
              id
              name
            }
          }
        }
      `;

      await tenantClient.executeGraphQL(createHierarchyMutation, {
        input: [{ id: hierarchy.id, name: hierarchy.name }]
      });

      // Create levels if present
      if (hierarchy.levels) {
        const createLevelsMutation = `
          mutation CreateLevels($input: [AddHierarchyLevelInput!]!) {
            addHierarchyLevel(input: $input) {
              hierarchyLevel {
                id
                levelNumber
                label
              }
            }
          }
        `;

        const levelInputs = hierarchy.levels.map((level: any) => ({
          hierarchy: { id: hierarchy.id },
          levelNumber: level.levelNumber,
          label: level.label
        }));

        await tenantClient.executeGraphQL(createLevelsMutation, {
          input: levelInputs
        });
      }
    }
  }

  private async importNodes(nodes: any[], tenantClient: any): Promise<void> {
    // Import nodes in batches
    const batchSize = 50;
    for (let i = 0; i < nodes.length; i += batchSize) {
      const batch = nodes.slice(i, i + batchSize);
      
      const createNodesMutation = `
        mutation CreateNodes($input: [AddNodeInput!]!) {
          addNode(input: $input) {
            node {
              id
              label
            }
          }
        }
      `;

      await tenantClient.executeGraphQL(createNodesMutation, {
        input: batch
      });
    }
  }

  private async importEdges(edges: any[], tenantClient: any): Promise<void> {
    // Import edges in batches
    const batchSize = 50;
    for (let i = 0; i < edges.length; i += batchSize) {
      const batch = edges.slice(i, i + batchSize);
      
      const createEdgesMutation = `
        mutation CreateEdges($input: [AddEdgeInput!]!) {
          addEdge(input: $input) {
            edge {
              fromId
              toId
            }
          }
        }
      `;

      await tenantClient.executeGraphQL(createEdgesMutation, {
        input: batch
      });
    }
  }

  async getImportJobStatus(jobId: string, tenantId: string): Promise<JobStatus> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    return job;
  }

  // Export Methods
  // -------------------------------------------------------------------

  async getAvailableExportFormats(): Promise<ExportFormat[]> {
    return [
      {
        id: 'json',
        name: 'JSON (Native)',
        description: 'Complete graph data in native JSON format',
        extension: 'json',
        mimeType: 'application/json',
        supportsFiltering: true
      },
      {
        id: 'csv-nodes',
        name: 'CSV (Nodes Only)',
        description: 'Node data in CSV format',
        extension: 'csv',
        mimeType: 'text/csv',
        supportsFiltering: true
      },
      {
        id: 'csv-edges',
        name: 'CSV (Edges Only)',
        description: 'Edge data in CSV format',
        extension: 'csv',
        mimeType: 'text/csv',
        supportsFiltering: true
      }
    ];
  }

  async executeExport(
    tenantId: string,
    namespace: string | undefined,
    format: string,
    filters: any,
    options: any
  ): Promise<string> {
    const jobId = uuidv4();
    
    // Create job status
    const job: JobStatus = {
      jobId,
      type: 'export',
      status: 'pending',
      progress: 0,
      message: 'Export job queued',
      startedAt: new Date()
    };
    
    this.jobs.set(jobId, job);

    // Start export process asynchronously
    this.processExport(jobId, tenantId, namespace, format, filters, options).catch(error => {
      console.error(`[IMPORT_EXPORT] Export job ${jobId} failed:`, error);
      const failedJob = this.jobs.get(jobId);
      if (failedJob) {
        failedJob.status = 'failed';
        failedJob.error = error instanceof Error ? error.message : 'Unknown error';
        failedJob.completedAt = new Date();
      }
    });

    return jobId;
  }

  private async processExport(
    jobId: string,
    tenantId: string,
    namespace: string | undefined,
    format: string,
    filters: any,
    options: any
  ): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      job.status = 'running';
      job.message = 'Querying graph data';
      job.progress = 10;

      const tenantClient = await DgraphTenantFactory.createTenant(namespace || '');

      // Query all data
      const allDataQuery = `{
        queryNode {
          id
          label
          type
          status
          branch
        }
        queryEdge {
          fromId
          toId
          type
        }
        queryHierarchy {
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
      }`;

      const data = await tenantClient.executeGraphQL(allDataQuery);

      job.message = 'Generating export file';
      job.progress = 50;

      let exportContent: string;
      let fileName: string;
      let mimeType: string;

      switch (format) {
        case 'json':
          exportContent = JSON.stringify({
            metadata: {
              exportedAt: new Date().toISOString(),
              tenantId,
              namespace,
              version: '1.0',
              nodeCount: data.queryNode?.length || 0,
              edgeCount: data.queryEdge?.length || 0,
              hierarchyCount: data.queryHierarchy?.length || 0
            },
            hierarchies: data.queryHierarchy || [],
            nodes: data.queryNode || [],
            edges: data.queryEdge || []
          }, null, 2);
          fileName = `${tenantId}-export-${new Date().toISOString().split('T')[0]}.json`;
          mimeType = 'application/json';
          break;

        case 'csv-nodes':
          exportContent = this.generateNodesCsv(data.queryNode || []);
          fileName = `${tenantId}-nodes-${new Date().toISOString().split('T')[0]}.csv`;
          mimeType = 'text/csv';
          break;

        case 'csv-edges':
          exportContent = this.generateEdgesCsv(data.queryEdge || []);
          fileName = `${tenantId}-edges-${new Date().toISOString().split('T')[0]}.csv`;
          mimeType = 'text/csv';
          break;

        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      job.message = 'Saving export file';
      job.progress = 80;

      // Save export file
      const exportPath = path.join(this.exportDir, `${jobId}-${fileName}`);
      await fs.writeFile(exportPath, exportContent, 'utf-8');

      job.message = 'Export completed successfully';
      job.progress = 100;
      job.status = 'completed';
      job.completedAt = new Date();
      job.result = {
        fileName,
        filePath: exportPath,
        mimeType,
        size: Buffer.byteLength(exportContent, 'utf-8')
      };

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();
    }
  }

  private generateNodesCsv(nodes: any[]): string {
    if (nodes.length === 0) return 'id,label,type,status,branch\n';
    
    const headers = ['id', 'label', 'type', 'status', 'branch'];
    const csvLines = [headers.join(',')];
    
    nodes.forEach(node => {
      const row = headers.map(header => {
        const value = node[header] || '';
        // Escape CSV values that contain commas or quotes
        return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
          ? `"${value.replace(/"/g, '""')}"` 
          : value;
      });
      csvLines.push(row.join(','));
    });
    
    return csvLines.join('\n');
  }

  private generateEdgesCsv(edges: any[]): string {
    if (edges.length === 0) return 'fromId,toId,type\n';
    
    const headers = ['fromId', 'toId', 'type'];
    const csvLines = [headers.join(',')];
    
    edges.forEach(edge => {
      const row = headers.map(header => edge[header] || '');
      csvLines.push(row.join(','));
    });
    
    return csvLines.join('\n');
  }

  async getExportJobStatus(jobId: string, tenantId: string): Promise<JobStatus> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    return job;
  }

  async getExportDownload(jobId: string, tenantId: string): Promise<ExportDownload> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'completed' || !job.result) {
      throw new Error(`Export job ${jobId} not found or not completed`);
    }

    return {
      filePath: job.result.filePath,
      fileName: job.result.fileName,
      mimeType: job.result.mimeType,
      size: job.result.size
    };
  }

  async cancelJob(jobId: string, tenantId: string): Promise<{ cancelled: boolean }> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status === 'completed' || job.status === 'failed') {
      return { cancelled: false };
    }

    job.status = 'cancelled';
    job.completedAt = new Date();
    job.message = 'Job cancelled by user';

    return { cancelled: true };
  }

  // Utility Methods
  // -------------------------------------------------------------------

  private async findUploadedFile(fileId: string): Promise<string> {
    const extensions = ['json', 'csv', 'graphml'];
    
    for (const ext of extensions) {
      const filePath = path.join(this.uploadDir, `${fileId}.${ext}`);
      try {
        await fs.access(filePath);
        return filePath;
      } catch {
        // File doesn't exist, try next extension
      }
    }
    
    throw new Error(`Uploaded file with ID ${fileId} not found`);
  }
}
