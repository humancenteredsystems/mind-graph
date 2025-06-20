import request from 'supertest';
import app from '../../server';
import { RealIntegrationTestBase } from '../helpers/testBase';
import path from 'path';
import fs from 'fs/promises';

class ImportExportTestBase extends RealIntegrationTestBase {
  public createTenantRequest() {
    return super.createTenantRequest();
  }
}

describe('Import/Export Integration Tests (Real Database)', () => {
  let testBase: ImportExportTestBase;
  const adminKey = process.env.ADMIN_API_KEY || 'test-admin-key';

  beforeAll(async () => {
    testBase = new ImportExportTestBase(app);
    await testBase.setupTest();
  });

  afterAll(async () => {
    await testBase.cleanupTest();
  });

  beforeEach(async () => {
    await testBase.resetTest();
  });

  describe('Export Functionality', () => {
    beforeEach(async () => {
      // Seed some test data for export
      await testBase.createTenantRequest()
        .post('/api/admin/tenant/seed')
        .set('X-Admin-API-Key', adminKey)
        .send({
          tenantId: 'test-tenant',
          dataType: 'test',
          clearFirst: true
        })
        .expect(200);
    });

    test('should get available export formats', async () => {
      const response = await testBase.createTenantRequest()
        .get('/api/export/formats')
        .set('X-Admin-API-Key', adminKey)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.formats).toBeInstanceOf(Array);
      expect(response.body.formats.length).toBeGreaterThan(0);
      
      // Check for expected formats
      const formatIds = response.body.formats.map((f: any) => f.id);
      expect(formatIds).toContain('json');
      expect(formatIds).toContain('csv-nodes');
      expect(formatIds).toContain('csv-edges');
    });

    test('should execute JSON export successfully', async () => {
      const response = await testBase.createTenantRequest()
        .post('/api/export/execute')
        .set('X-Admin-API-Key', adminKey)
        .send({
          format: 'json',
          filters: {},
          options: {}
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.jobId).toBeDefined();
      expect(response.body.format).toBe('json');

      // Poll for completion
      const jobId = response.body.jobId;
      let jobCompleted = false;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout

      while (!jobCompleted && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await testBase.createTenantRequest()
          .get(`/api/export/status/${jobId}`)
          .set('X-Admin-API-Key', adminKey)
          .expect(200);

        const job = statusResponse.body.job;
        expect(job.jobId).toBe(jobId);
        expect(job.type).toBe('export');

        if (job.status === 'completed') {
          jobCompleted = true;
          expect(job.progress).toBe(100);
          expect(job.result).toBeDefined();
          expect(job.result.fileName).toMatch(/\.json$/);
        } else if (job.status === 'failed') {
          throw new Error(`Export job failed: ${job.error}`);
        }

        attempts++;
      }

      expect(jobCompleted).toBe(true);
    });

    test('should execute CSV nodes export successfully', async () => {
      const response = await testBase.createTenantRequest()
        .post('/api/export/execute')
        .set('X-Admin-API-Key', adminKey)
        .send({
          format: 'csv-nodes',
          filters: {},
          options: {}
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.jobId).toBeDefined();
      expect(response.body.format).toBe('csv-nodes');

      // Poll for completion
      const jobId = response.body.jobId;
      let jobCompleted = false;
      let attempts = 0;
      const maxAttempts = 30;

      while (!jobCompleted && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await testBase.createTenantRequest()
          .get(`/api/export/status/${jobId}`)
          .set('X-Admin-API-Key', adminKey)
          .expect(200);

        const job = statusResponse.body.job;
        if (job.status === 'completed') {
          jobCompleted = true;
          expect(job.result.fileName).toMatch(/\.csv$/);
        } else if (job.status === 'failed') {
          throw new Error(`Export job failed: ${job.error}`);
        }

        attempts++;
      }

      expect(jobCompleted).toBe(true);
    });
  });

  describe('Import Functionality', () => {
    test('should upload and analyze JSON file', async () => {
      // Create a test JSON file
      const testData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          tenantId: 'test-tenant',
          version: '1.0',
          nodeCount: 2,
          edgeCount: 1,
          hierarchyCount: 1
        },
        hierarchies: [
          {
            id: 'h1',
            name: 'Test Hierarchy',
            levels: [
              {
                levelNumber: 1,
                label: 'Level 1'
              }
            ]
          }
        ],
        nodes: [
          {
            id: 'node1',
            label: 'Test Node 1',
            type: 'test',
            status: 'approved',
            branch: 'main'
          },
          {
            id: 'node2',
            label: 'Test Node 2',
            type: 'test',
            status: 'approved',
            branch: 'main'
          }
        ],
        edges: [
          {
            fromId: 'node1',
            toId: 'node2',
            type: 'simple'
          }
        ]
      };

      const testFilePath = path.join(__dirname, 'test-import.json');
      await fs.writeFile(testFilePath, JSON.stringify(testData, null, 2));

      try {
        const response = await testBase.createTenantRequest()
          .post('/api/import/upload')
          .set('X-Admin-API-Key', adminKey)
          .attach('file', testFilePath)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.fileId).toBeDefined();
        expect(response.body.analysis).toBeDefined();
        expect(response.body.analysis.format).toBe('json');
        expect(response.body.analysis.nodeCount).toBe(2);
        expect(response.body.analysis.edgeCount).toBe(1);
        expect(response.body.analysis.hierarchyCount).toBe(1);
        expect(response.body.analysis.validation.isValid).toBe(true);
        expect(response.body.analysis.validation.errors).toHaveLength(0);

      } finally {
        // Clean up test file
        await fs.unlink(testFilePath).catch(() => {});
      }
    });

    test('should generate import preview', async () => {
      // Create and upload test file first
      const testData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          tenantId: 'test-tenant',
          version: '1.0',
          nodeCount: 1,
          edgeCount: 0,
          hierarchyCount: 0
        },
        nodes: [
          {
            id: 'preview-node',
            label: 'Preview Test Node',
            type: 'test',
            status: 'approved',
            branch: 'main'
          }
        ],
        edges: [],
        hierarchies: []
      };

      const testFilePath = path.join(__dirname, 'test-preview.json');
      await fs.writeFile(testFilePath, JSON.stringify(testData, null, 2));

      try {
        const uploadResponse = await testBase.createTenantRequest()
          .post('/api/import/upload')
          .set('X-Admin-API-Key', adminKey)
          .attach('file', testFilePath)
          .expect(200);

        const fileId = uploadResponse.body.fileId;

        const previewResponse = await testBase.createTenantRequest()
          .post('/api/import/preview')
          .set('X-Admin-API-Key', adminKey)
          .send({
            fileId,
            mapping: {}
          })
          .expect(200);

        expect(previewResponse.body.success).toBe(true);
        expect(previewResponse.body.preview).toBeDefined();
        expect(previewResponse.body.preview.nodes).toHaveLength(1);
        expect(previewResponse.body.preview.nodes[0].id).toBe('preview-node');
        expect(previewResponse.body.preview.validation.isValid).toBe(true);
        expect(previewResponse.body.preview.conflicts).toBeInstanceOf(Array);

      } finally {
        await fs.unlink(testFilePath).catch(() => {});
      }
    });

    test('should execute import successfully', async () => {
      // Create test data
      const testData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          tenantId: 'test-tenant',
          version: '1.0',
          nodeCount: 2,
          edgeCount: 1,
          hierarchyCount: 1
        },
        hierarchies: [
          {
            id: 'import-h1',
            name: 'Import Test Hierarchy'
          }
        ],
        nodes: [
          {
            id: 'import-node1',
            label: 'Import Test Node 1',
            type: 'test',
            status: 'approved',
            branch: 'main'
          },
          {
            id: 'import-node2',
            label: 'Import Test Node 2',
            type: 'test',
            status: 'approved',
            branch: 'main'
          }
        ],
        edges: [
          {
            fromId: 'import-node1',
            toId: 'import-node2',
            type: 'simple'
          }
        ]
      };

      const testFilePath = path.join(__dirname, 'test-execute-import.json');
      await fs.writeFile(testFilePath, JSON.stringify(testData, null, 2));

      try {
        // Upload file
        const uploadResponse = await testBase.createTenantRequest()
          .post('/api/import/upload')
          .set('X-Admin-API-Key', adminKey)
          .attach('file', testFilePath)
          .expect(200);

        const fileId = uploadResponse.body.fileId;

        // Execute import
        const importResponse = await testBase.createTenantRequest()
          .post('/api/import/execute')
          .set('X-Admin-API-Key', adminKey)
          .send({
            fileId,
            options: {}
          })
          .expect(200);

        expect(importResponse.body.success).toBe(true);
        expect(importResponse.body.jobId).toBeDefined();

        // Poll for completion
        const jobId = importResponse.body.jobId;
        let jobCompleted = false;
        let attempts = 0;
        const maxAttempts = 30;

        while (!jobCompleted && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const statusResponse = await testBase.createTenantRequest()
            .get(`/api/import/status/${jobId}`)
            .set('X-Admin-API-Key', adminKey)
            .expect(200);

          const job = statusResponse.body.job;
          expect(job.jobId).toBe(jobId);
          expect(job.type).toBe('import');

          if (job.status === 'completed') {
            jobCompleted = true;
            expect(job.progress).toBe(100);
            expect(job.result).toBeDefined();
            expect(job.result.nodesImported).toBe(2);
            expect(job.result.edgesImported).toBe(1);
            expect(job.result.hierarchiesImported).toBe(1);
          } else if (job.status === 'failed') {
            throw new Error(`Import job failed: ${job.error}`);
          }

          attempts++;
        }

        expect(jobCompleted).toBe(true);

        // Verify data was imported by querying
        const queryResponse = await testBase.createTenantRequest()
          .post('/api/query')
          .send({
            query: `{
              queryNode(filter: { id: { in: ["import-node1", "import-node2"] } }) {
                id
                label
                type
              }
              queryEdge(filter: { fromId: { eq: "import-node1" } }) {
                fromId
                toId
                type
              }
              queryHierarchy(filter: { id: { eq: "import-h1" } }) {
                id
                name
              }
            }`
          })
          .expect(200);

        expect(queryResponse.body.queryNode).toHaveLength(2);
        expect(queryResponse.body.queryEdge).toHaveLength(1);
        expect(queryResponse.body.queryHierarchy).toHaveLength(1);

      } finally {
        await fs.unlink(testFilePath).catch(() => {});
      }
    });

    test('should handle invalid JSON file', async () => {
      const invalidJson = '{ invalid json content }';
      const testFilePath = path.join(__dirname, 'invalid.json');
      await fs.writeFile(testFilePath, invalidJson);

      try {
        const response = await testBase.createTenantRequest()
          .post('/api/import/upload')
          .set('X-Admin-API-Key', adminKey)
          .attach('file', testFilePath)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.analysis.validation.isValid).toBe(false);
        expect(response.body.analysis.validation.errors.length).toBeGreaterThan(0);
        expect(response.body.analysis.validation.errors[0]).toContain('Invalid JSON format');

      } finally {
        await fs.unlink(testFilePath).catch(() => {});
      }
    });

    test('should handle unsupported file type', async () => {
      const testFilePath = path.join(__dirname, 'test.txt');
      await fs.writeFile(testFilePath, 'This is a text file');

      try {
        await testBase.createTenantRequest()
          .post('/api/import/upload')
          .set('X-Admin-API-Key', adminKey)
          .attach('file', testFilePath)
          .expect(500); // Should fail due to file filter

      } finally {
        await fs.unlink(testFilePath).catch(() => {});
      }
    });
  });

  describe('Job Management', () => {
    test('should cancel running job', async () => {
      // Start an export job
      const exportResponse = await testBase.createTenantRequest()
        .post('/api/export/execute')
        .set('X-Admin-API-Key', adminKey)
        .send({
          format: 'json',
          filters: {},
          options: {}
        })
        .expect(200);

      const jobId = exportResponse.body.jobId;

      // Try to cancel it immediately
      const cancelResponse = await testBase.createTenantRequest()
        .post(`/api/job/${jobId}/cancel`)
        .set('X-Admin-API-Key', adminKey)
        .send({})
        .expect(200);

      expect(cancelResponse.body.success).toBe(true);
      expect(cancelResponse.body.jobId).toBe(jobId);
    });
  });

  describe('Round-trip Test', () => {
    test('should export and then import data successfully', async () => {
      // First, seed some test data
      await testBase.createTenantRequest()
        .post('/api/admin/tenant/seed')
        .set('X-Admin-API-Key', adminKey)
        .send({
          tenantId: 'test-tenant',
          dataType: 'test',
          clearFirst: true
        })
        .expect(200);

      // Export the data
      const exportResponse = await testBase.createTenantRequest()
        .post('/api/export/execute')
        .set('X-Admin-API-Key', adminKey)
        .send({
          format: 'json',
          filters: {},
          options: {}
        })
        .expect(200);

      const exportJobId = exportResponse.body.jobId;

      // Wait for export to complete
      let exportCompleted = false;
      let attempts = 0;
      const maxAttempts = 30;

      while (!exportCompleted && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await testBase.createTenantRequest()
          .get(`/api/export/status/${exportJobId}`)
          .set('X-Admin-API-Key', adminKey)
          .expect(200);

        if (statusResponse.body.job.status === 'completed') {
          exportCompleted = true;
        } else if (statusResponse.body.job.status === 'failed') {
          throw new Error(`Export failed: ${statusResponse.body.job.error}`);
        }

        attempts++;
      }

      expect(exportCompleted).toBe(true);

      // Get the exported file content (simulate download)
      const downloadResponse = await testBase.createTenantRequest()
        .get(`/api/export/download/${exportJobId}`)
        .set('X-Admin-API-Key', adminKey)
        .expect(200);

      // Save the exported content to a temporary file
      const exportedData = downloadResponse.text;
      const tempFilePath = path.join(__dirname, 'round-trip-test.json');
      await fs.writeFile(tempFilePath, exportedData);

      try {
        // Clear the tenant data
        await testBase.createTenantRequest()
          .post('/api/admin/tenant/clear-data')
          .set('X-Admin-API-Key', adminKey)
          .send({ tenantId: 'test-tenant' })
          .expect(200);

        // Import the exported data back
        const uploadResponse = await testBase.createTenantRequest()
          .post('/api/import/upload')
          .set('X-Admin-API-Key', adminKey)
          .attach('file', tempFilePath)
          .expect(200);

        const fileId = uploadResponse.body.fileId;

        const importResponse = await testBase.createTenantRequest()
          .post('/api/import/execute')
          .set('X-Admin-API-Key', adminKey)
          .send({
            fileId,
            options: {}
          })
          .expect(200);

        const importJobId = importResponse.body.jobId;

        // Wait for import to complete
        let importCompleted = false;
        attempts = 0;

        while (!importCompleted && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const statusResponse = await testBase.createTenantRequest()
            .get(`/api/import/status/${importJobId}`)
            .set('X-Admin-API-Key', adminKey)
            .expect(200);

          if (statusResponse.body.job.status === 'completed') {
            importCompleted = true;
            
            // Verify the import results
            const result = statusResponse.body.job.result;
            expect(result.nodesImported).toBeGreaterThan(0);
            expect(result.edgesImported).toBeGreaterThan(0);
            expect(result.hierarchiesImported).toBeGreaterThan(0);
            
          } else if (statusResponse.body.job.status === 'failed') {
            throw new Error(`Import failed: ${statusResponse.body.job.error}`);
          }

          attempts++;
        }

        expect(importCompleted).toBe(true);

        // Verify data integrity by querying some nodes
        const verifyResponse = await testBase.createTenantRequest()
          .post('/api/query')
          .send({
            query: `{
              queryNode {
                id
                label
                type
              }
              queryEdge {
                fromId
                toId
                type
              }
              queryHierarchy {
                id
                name
              }
            }`
          })
          .expect(200);

        expect(verifyResponse.body.queryNode.length).toBeGreaterThan(0);
        expect(verifyResponse.body.queryHierarchy.length).toBeGreaterThan(0);

      } finally {
        await fs.unlink(tempFilePath).catch(() => {});
      }
    });
  });
});
