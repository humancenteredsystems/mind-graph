import express, { Request, Response } from 'express';
import { TenantManager } from '../services/tenantManager';
import { authenticateAdmin } from '../middleware/auth';
import { ensureTenant } from '../middleware/tenantContext';
import { TenantRequest } from '../src/types';

const router = express.Router();
const tenantManager = new TenantManager();

// Simple error response helper
const errorResponse = (res: Response, message: string, status = 500) => {
  res.status(status).json({ error: message });
};

// --- Public Tenant Operations ---

// Get current tenant information
router.get('/tenant/info', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = (req as TenantRequest).tenantContext;
    const tenantInfo = await tenantManager.getTenantInfo(tenantId);
    
    res.json({
      ...tenantInfo,
      context: (req as TenantRequest).tenantContext
    });
  } catch (error: any) {
    console.error('[TENANT_INFO] Error:', error);
    errorResponse(res, 'Failed to get tenant information');
  }
});

// --- Admin-Protected Tenant Operations ---
router.use(authenticateAdmin);

// Create a new tenant
router.post('/tenant', ensureTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.body;
    
    if (!tenantId) {
      errorResponse(res, 'Missing required field: tenantId', 400);
      return;
    }

    // Check if tenant already exists
    const exists = await tenantManager.tenantExists(tenantId);
    if (exists) {
      errorResponse(res, 'Tenant already exists', 409);
      return;
    }

    // Create the tenant
    const namespace = await tenantManager.createTenant(tenantId);
    const tenantInfo = await tenantManager.getTenantInfo(tenantId);

    res.status(201).json({
      message: 'Tenant created successfully',
      tenant: tenantInfo,
      namespace
    });
  } catch (error: any) {
    console.error('[CREATE_TENANT] Error:', error);
    errorResponse(res, 'Failed to create tenant');
  }
});

// List all tenants
router.get('/tenant', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenants = await tenantManager.listTenants();
    res.json(tenants);
  } catch (error: any) {
    console.error('[LIST_TENANTS] Error:', error);
    errorResponse(res, 'Failed to list tenants');
  }
});

// Get specific tenant information
router.get('/tenant/:tenantId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.params;
    const tenantInfo = await tenantManager.getTenantInfo(tenantId);
    
    res.json(tenantInfo);
  } catch (error: any) {
    console.error('[GET_TENANT] Error:', error);
    errorResponse(res, 'Failed to get tenant information');
  }
});

// Delete a tenant
router.delete('/tenant/:tenantId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.params;
    
    // Prevent deletion of system tenants
    if (tenantId === 'default' || tenantId === 'test-tenant') {
      errorResponse(res, 'Cannot delete system tenants', 400);
      return;
    }

    // Check if tenant exists
    const exists = await tenantManager.tenantExists(tenantId);
    if (!exists) {
      errorResponse(res, 'Tenant not found', 404);
      return;
    }

    // Delete the tenant
    await tenantManager.deleteTenant(tenantId);

    res.json({
      message: 'Tenant deleted successfully',
      tenantId
    });
  } catch (error: any) {
    console.error('[DELETE_TENANT] Error:', error);
    errorResponse(res, 'Failed to delete tenant');
  }
});

// Initialize test tenant (for development)
router.post('/tenant/test/init', async (req: Request, res: Response): Promise<void> => {
  try {
    const testTenantId = 'test-tenant';
    
    // Check if test tenant already exists
    const exists = await tenantManager.tenantExists(testTenantId);
    if (exists) {
      res.json({
        message: 'Test tenant already exists',
        tenant: await tenantManager.getTenantInfo(testTenantId)
      });
      return;
    }

    // Create test tenant
    const namespace = await tenantManager.createTenant(testTenantId);
    const tenantInfo = await tenantManager.getTenantInfo(testTenantId);

    res.status(201).json({
      message: 'Test tenant initialized successfully',
      tenant: tenantInfo,
      namespace
    });
  } catch (error: any) {
    console.error('[INIT_TEST_TENANT] Error:', error);
    errorResponse(res, 'Failed to initialize test tenant');
  }
});

// Reset test tenant (clear all data)
router.post('/tenant/test/reset', async (req: Request, res: Response): Promise<void> => {
  try {
    const testTenantId = 'test-tenant';
    
    // Delete and recreate test tenant
    await tenantManager.deleteTenant(testTenantId);
    const namespace = await tenantManager.createTenant(testTenantId);
    const tenantInfo = await tenantManager.getTenantInfo(testTenantId);

    res.json({
      message: 'Test tenant reset successfully',
      tenant: tenantInfo,
      namespace
    });
  } catch (error: any) {
    console.error('[RESET_TEST_TENANT] Error:', error);
    errorResponse(res, 'Failed to reset test tenant');
  }
});

export default router;
