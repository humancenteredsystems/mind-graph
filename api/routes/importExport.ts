import express, { Request, Response } from 'express';
import multer from 'multer';
import { ImportExportService } from '../services/importExportService';
import { createErrorResponseFromError } from '../utils/errorResponse';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept JSON, CSV, and GraphML files
    const allowedTypes = ['.json', '.csv', '.graphml', '.xml'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}. Allowed types: ${allowedTypes.join(', ')}`));
    }
  }
});

const importExportService = new ImportExportService();

// Import Endpoints
// -------------------------------------------------------------------

/**
 * Upload and validate import file
 * POST /api/import/upload
 */
router.post('/import/upload', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const tenantId = req.tenantContext?.tenantId || 'default';
    const namespace = req.tenantContext?.namespace;

    console.log(`[IMPORT] File uploaded for tenant ${tenantId}: ${req.file.originalname}`);

    // Validate and analyze the uploaded file
    const analysis = await importExportService.analyzeImportFile(
      req.file.path,
      req.file.originalname,
      tenantId
    );

    res.json({
      success: true,
      fileId: analysis.fileId,
      analysis: {
        format: analysis.format,
        nodeCount: analysis.nodeCount,
        edgeCount: analysis.edgeCount,
        hierarchyCount: analysis.hierarchyCount,
        validation: analysis.validation,
        preview: analysis.preview
      },
      uploadedAt: new Date()
    });

  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('[IMPORT] Failed to cleanup uploaded file:', cleanupError);
      }
    }

    const err = error as Error;
    console.error('[IMPORT] File upload failed:', error);
    res.status(500).json(createErrorResponseFromError('File upload failed', err));
  }
});

/**
 * Preview import data with field mapping
 * POST /api/import/preview
 */
router.post('/import/preview', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId, mapping } = req.body;

    if (!fileId) {
      res.status(400).json({ error: 'Missing required field: fileId' });
      return;
    }

    const tenantId = req.tenantContext?.tenantId || 'default';

    console.log(`[IMPORT] Generating preview for tenant ${tenantId}, fileId: ${fileId}`);

    const preview = await importExportService.generateImportPreview(
      fileId,
      tenantId,
      mapping
    );

    res.json({
      success: true,
      preview: {
        nodes: preview.nodes,
        edges: preview.edges,
        hierarchies: preview.hierarchies,
        validation: preview.validation,
        conflicts: preview.conflicts
      }
    });

  } catch (error) {
    const err = error as Error;
    console.error('[IMPORT] Preview generation failed:', error);
    res.status(500).json(createErrorResponseFromError('Preview generation failed', err));
  }
});

/**
 * Execute import with specified options
 * POST /api/import/execute
 */
router.post('/import/execute', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId, options = {} } = req.body;

    if (!fileId) {
      res.status(400).json({ error: 'Missing required field: fileId' });
      return;
    }

    const tenantId = req.tenantContext?.tenantId || 'default';
    const namespace = req.tenantContext?.namespace;

    console.log(`[IMPORT] Starting import execution for tenant ${tenantId}, fileId: ${fileId}`);

    // Start import job
    const jobId = await importExportService.executeImport(
      fileId,
      tenantId,
      namespace || undefined,
      options
    );

    res.json({
      success: true,
      jobId,
      message: 'Import job started',
      startedAt: new Date()
    });

  } catch (error) {
    const err = error as Error;
    console.error('[IMPORT] Import execution failed:', error);
    res.status(500).json(createErrorResponseFromError('Import execution failed', err));
  }
});

/**
 * Get import job status
 * GET /api/import/status/:jobId
 */
router.get('/import/status/:jobId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const tenantId = req.tenantContext?.tenantId || 'default';

    const status = await importExportService.getImportJobStatus(jobId, tenantId);

    res.json({
      success: true,
      job: status
    });

  } catch (error) {
    const err = error as Error;
    console.error('[IMPORT] Status check failed:', error);
    res.status(500).json(createErrorResponseFromError('Status check failed', err));
  }
});

// Export Endpoints
// -------------------------------------------------------------------

/**
 * Get available export formats
 * GET /api/export/formats
 */
router.get('/export/formats', async (req: Request, res: Response): Promise<void> => {
  try {
    const formats = await importExportService.getAvailableExportFormats();

    res.json({
      success: true,
      formats
    });

  } catch (error) {
    const err = error as Error;
    console.error('[EXPORT] Format listing failed:', error);
    res.status(500).json(createErrorResponseFromError('Format listing failed', err));
  }
});

/**
 * Execute export with specified options
 * POST /api/export/execute
 */
router.post('/export/execute', async (req: Request, res: Response): Promise<void> => {
  try {
    const { format = 'json', filters = {}, options = {} } = req.body;

    const tenantId = req.tenantContext?.tenantId || 'default';
    const namespace = req.tenantContext?.namespace;

    console.log(`[EXPORT] Starting export for tenant ${tenantId}, format: ${format}`);

    // Start export job
    const jobId = await importExportService.executeExport(
      tenantId,
      namespace || undefined,
      format,
      filters,
      options
    );

    res.json({
      success: true,
      jobId,
      format,
      message: 'Export job started',
      startedAt: new Date()
    });

  } catch (error) {
    const err = error as Error;
    console.error('[EXPORT] Export execution failed:', error);
    res.status(500).json(createErrorResponseFromError('Export execution failed', err));
  }
});

/**
 * Get export job status
 * GET /api/export/status/:jobId
 */
router.get('/export/status/:jobId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const tenantId = req.tenantContext?.tenantId || 'default';

    const status = await importExportService.getExportJobStatus(jobId, tenantId);

    res.json({
      success: true,
      job: status
    });

  } catch (error) {
    const err = error as Error;
    console.error('[EXPORT] Status check failed:', error);
    res.status(500).json(createErrorResponseFromError('Status check failed', err));
  }
});

/**
 * Download exported file
 * GET /api/export/download/:jobId
 */
router.get('/export/download/:jobId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const tenantId = req.tenantContext?.tenantId || 'default';

    const downloadInfo = await importExportService.getExportDownload(jobId, tenantId);

    if (!downloadInfo.filePath || !downloadInfo.fileName) {
      res.status(404).json({ error: 'Export file not found or not ready' });
      return;
    }

    // Set appropriate headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${downloadInfo.fileName}"`);
    res.setHeader('Content-Type', downloadInfo.mimeType || 'application/octet-stream');

    // Stream the file
    const fileStream = require('fs').createReadStream(downloadInfo.filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error: Error) => {
      console.error('[EXPORT] File streaming error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'File download failed' });
      }
    });

  } catch (error) {
    const err = error as Error;
    console.error('[EXPORT] Download failed:', error);
    if (!res.headersSent) {
      res.status(500).json(createErrorResponseFromError('Download failed', err));
    }
  }
});

/**
 * Cancel import/export job
 * POST /api/job/:jobId/cancel
 */
router.post('/job/:jobId/cancel', async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const tenantId = req.tenantContext?.tenantId || 'default';

    const result = await importExportService.cancelJob(jobId, tenantId);

    res.json({
      success: true,
      jobId,
      message: result.cancelled ? 'Job cancelled successfully' : 'Job was already completed',
      cancelledAt: new Date()
    });

  } catch (error) {
    const err = error as Error;
    console.error('[JOB] Cancellation failed:', error);
    res.status(500).json(createErrorResponseFromError('Job cancellation failed', err));
  }
});

export default router;
