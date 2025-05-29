import express, { Request, Response } from 'express';
import { dgraphCapabilityDetector } from '../services/dgraphCapabilities';
import { adaptiveTenantFactory } from '../services/adaptiveTenantFactory';
import { TenantRequest } from '../src/types';

const router = express.Router();

// System status endpoint
router.get('/system/status', async (req: Request, res: Response): Promise<void> => {
  try {
    // Get current capabilities
    const capabilities = await dgraphCapabilityDetector.detectCapabilities();
    
    // Manually parse tenant header since system routes run before tenant middleware
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const tenantContext = (req as TenantRequest).tenantContext || { tenantId };
    
    // Determine if multi-tenant operations are verified
    // Multi-tenant is verified if namespace support is available (regardless of current tenant)
    const multiTenantVerified = capabilities.namespacesSupported;
    
    const systemStatus = {
      dgraphEnterprise: capabilities.enterpriseDetected,
      multiTenantVerified,
      currentTenant: tenantContext.tenantId || 'default',
      namespace: tenantContext.namespace || null,
      mode: capabilities.namespacesSupported ? 'multi-tenant' : 'single-tenant',
      detectedAt: capabilities.detectedAt,
      detectionError: capabilities.error
    };
    
    console.log(`[SYSTEM_STATUS] Status requested for tenant ${systemStatus.currentTenant}:`, systemStatus);
    
    res.json(systemStatus);
  } catch (error: any) {
    console.error('[SYSTEM_STATUS] Error getting system status:', error);
    res.status(500).json({ 
      error: 'Failed to get system status',
      details: error.message 
    });
  }
});

// Refresh capabilities endpoint (admin only)
router.post('/system/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[SYSTEM_REFRESH] Refreshing Dgraph capabilities...');
    
    // Refresh both capability detector and adaptive factory
    await dgraphCapabilityDetector.refreshCapabilities();
    await adaptiveTenantFactory.refresh();
    
    // Get fresh status
    const capabilities = dgraphCapabilityDetector.getCachedCapabilities();
    
    res.json({
      message: 'System capabilities refreshed successfully',
      capabilities,
      refreshedAt: new Date()
    });
  } catch (error: any) {
    console.error('[SYSTEM_REFRESH] Error refreshing capabilities:', error);
    res.status(500).json({ 
      error: 'Failed to refresh system capabilities',
      details: error.message 
    });
  }
});

// Health check with capability info
router.get('/system/health', async (req: Request, res: Response): Promise<void> => {
  try {
    const capabilities = dgraphCapabilityDetector.getCachedCapabilities();
    const isMultiTenantSupported = adaptiveTenantFactory.isMultiTenantSupported();
    
    res.json({
      status: 'healthy',
      timestamp: new Date(),
      capabilities: capabilities || 'not-detected',
      multiTenantSupported: isMultiTenantSupported,
      mode: isMultiTenantSupported ? 'multi-tenant' : 'single-tenant'
    });
  } catch (error: any) {
    console.error('[SYSTEM_HEALTH] Error getting health status:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date()
    });
  }
});

export default router;
