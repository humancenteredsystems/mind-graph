import express, { Request, Response } from 'express';
import { TenantManager } from '../services/tenantManager';
import { authenticateAdmin } from '../middleware/auth';
import { ensureTenant } from '../middleware/tenantContext';

const router = express.Router();
const tenantManager = new TenantManager();

// --- Public Tenant Operations ---

/**
 * Get current tenant information
 * 
 * **Route:** GET /api/tenant/info
 * **Authentication:** None required
 * **Headers:** X-Tenant-Id (optional, defaults to 'default')
 * 
 * **Response Contract:**
 * ```json
 * {
 *   "tenantId": "string",
 *   "namespace": "string",
 *   "exists": boolean,
 *   "isTestTenant": boolean,
 *   "isDefaultTenant": boolean,
 *   "context": {
 *     "tenantId": "string",
 *     "namespace": "string"
 *   }
 * }
 * ```
 * 
 * **Error Responses:**
 * - 500: Internal server error if tenant information retrieval fails
 */
router.get('/tenant/info', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.tenantContext!;
    const tenantInfo = await tenantManager.getTenantInfo(tenantId);
    
    res.json({
      ...tenantInfo,
      context: req.tenantContext
    });
  } catch (error) {
    const err = error as Error;
    console.error('[TENANT_INFO] Error:', err);
    res.status(500).json({ error: 'Failed to get tenant information' });
  }
});

// --- Admin-Protected Tenant Operations ---
router.use(authenticateAdmin);

/**
 * Create a new tenant
 * 
 * **Route:** POST /api/tenant
 * **Authentication:** Admin API key required (X-Admin-API-Key header)
 * **Headers:** X-Tenant-Id (optional for creation)
 * 
 * **Request Body Contract:**
 * ```json
 * {
 *   "tenantId": "string" // 3-50 alphanumeric characters, unique across system
 * }
 * ```
 * 
 * **Success Response (201):**
 * ```json
 * {
 *   "message": "Tenant created successfully",
 *   "tenant": {
 *     "tenantId": "string",
 *     "namespace": "string",
 *     "exists": true,
 *     "isTestTenant": boolean,
 *     "isDefaultTenant": boolean
 *   },
 *   "namespace": "string"
 * }
 * ```
 * 
 * **Error Responses:**
 * - 400: Missing tenantId field
 * - 409: Tenant already exists
 * - 500: Schema initialization or hierarchy seeding failure
 */
router.post('/tenant', ensureTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId }: { tenantId: string } = req.body;
    
    if (!tenantId) {
      res.status(400).json({ error: 'Missing required field: tenantId' });
      return;
    }

    // Check if tenant already exists
    const exists = await tenantManager.tenantExists(tenantId);
    if (exists) {
      res.status(409).json({ error: 'Tenant already exists' });
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
  } catch (error) {
    const err = error as Error;
    console.error('[CREATE_TENANT] Error:', err);
    res.status(500).json({ error: 'Failed to create tenant' });
  }
});

// List all tenants
router.get('/tenant', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenants = await tenantManager.listTenants();
    res.json(tenants);
  } catch (error) {
    const err = error as Error;
    console.error('[LIST_TENANTS] Error:', err);
    res.status(500).json({ error: 'Failed to list tenants' });
  }
});

// Get specific tenant information
router.get('/tenant/:tenantId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.params;
    const tenantInfo = await tenantManager.getTenantInfo(tenantId);
    
    res.json(tenantInfo);
  } catch (error) {
    const err = error as Error;
    console.error('[GET_TENANT] Error:', err);
    res.status(500).json({ error: 'Failed to get tenant information' });
  }
});

// Delete a tenant
router.delete('/tenant/:tenantId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.params;
    
    // Prevent deletion of system tenants
    if (tenantId === 'default' || tenantId === 'test-tenant') {
      res.status(400).json({ error: 'Cannot delete system tenants' });
      return;
    }

    // Check if tenant exists
    const exists = await tenantManager.tenantExists(tenantId);
    if (!exists) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    // Delete the tenant
    await tenantManager.deleteTenant(tenantId);

    res.json({
      message: 'Tenant deleted successfully',
      tenantId
    });
  } catch (error) {
    const err = error as Error;
    console.error('[DELETE_TENANT] Error:', err);
    res.status(500).json({ error: 'Failed to delete tenant' });
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
  } catch (error) {
    const err = error as Error;
    console.error('[INIT_TEST_TENANT] Error:', err);
    res.status(500).json({ error: 'Failed to initialize test tenant' });
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
  } catch (error) {
    const err = error as Error;
    console.error('[RESET_TEST_TENANT] Error:', err);
    res.status(500).json({ error: 'Failed to reset test tenant' });
  }
});

export default router;
