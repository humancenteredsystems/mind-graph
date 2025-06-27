import express, { Request, Response } from 'express';
import { dgraphCapabilityDetector } from '../services/dgraphCapabilities';
import { adaptiveTenantFactory } from '../services/adaptiveTenantFactory';
import { EnterpriseGuards } from '../utils/enterpriseGuards';
import { schemaLoaded } from '../services/systemInitialization';

const router = express.Router();

/**
 * Schema loaded status endpoint
 */
router.get('/schema-status', (_req: Request, res: Response): void => {
  res.json({ loaded: schemaLoaded });
});

/**
 * System status endpoint
 */
router.get('/system/status', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!EnterpriseGuards.isCapabilityDetectionComplete()) {
      await adaptiveTenantFactory.initialize();
    }
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default';
    const tenantContext = req.tenantContext || {
      tenantId,
      namespace: null,
      isTestTenant: false,
      isDefaultTenant: true
    };
    const summary = EnterpriseGuards.getCapabilitySummary();
    const capabilities = EnterpriseGuards.getCapabilities();
    const systemStatus = {
      dgraphEnterprise: summary.enterpriseDetected,
      multiTenantVerified: summary.namespacesSupported,
      currentTenant: tenantContext.tenantId || 'default',
      namespace: tenantContext.namespace || null,
      mode: summary.mode,
      detectedAt: summary.detectedAt,
      version: 'unknown',
      licenseType: summary.licenseType,
      licenseExpiry: capabilities?.licenseExpiry
        ? capabilities.licenseExpiry.toISOString()
        : null,
      detectionError: summary.error
    };
    console.log(`[SYSTEM_STATUS] Status requested for tenant ${systemStatus.currentTenant}:`, systemStatus);
    res.json(systemStatus);
  } catch (error) {
    const err = error as Error;
    console.error('[SYSTEM_STATUS] Failed to get system status:', err);
    res.status(500).json({
      error: 'Failed to get system status',
      details: err.message
    });
  }
});

/**
 * Refresh capabilities endpoint (admin only)
 */
router.post('/system/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[SYSTEM_REFRESH] Refreshing Dgraph capabilities...');
    await dgraphCapabilityDetector.refreshCapabilities();
    await adaptiveTenantFactory.refresh();
    const capabilities = EnterpriseGuards.getCapabilities();
    res.json({
      message: 'System capabilities refreshed successfully',
      capabilities,
      refreshedAt: new Date()
    });
  } catch (error) {
    const err = error as Error;
    console.error('[SYSTEM_REFRESH] Failed to refresh system capabilities:', err);
    res.status(500).json({
      error: 'Failed to refresh system capabilities',
      details: err.message
    });
  }
});

/**
 * Health check with capability info
 */
router.get('/system/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    const capabilities = EnterpriseGuards.getCapabilities();
    const summary = EnterpriseGuards.getCapabilitySummary();
    res.json({
      status: 'healthy',
      timestamp: new Date(),
      capabilities: capabilities || 'not-detected',
      multiTenantSupported: summary.namespacesSupported,
      mode: summary.mode
    });
  } catch (error) {
    const err = error as Error;
    console.error('[SYSTEM_HEALTH] Failed to get health status:', err);
    res.status(500).json({
      status: 'unhealthy',
      error: err.message,
      timestamp: new Date()
    });
  }
});

export default router;
