import express, { Request, Response } from 'express';
import config from '../config';
import { authenticateAdmin } from '../middleware/auth';
import * as schemaRegistry from '../services/schemaRegistry';
import { pushSchemaViaHttp } from '../utils/pushSchema';
import { sendDgraphAdminRequest } from '../utils/dgraphAdmin';
import { TenantManager } from '../services/tenantManager';
import { createErrorResponseFromError } from '../utils/errorResponse';
import { 
  DropAllRequest, 
  DropAllResponse, 
  SchemaRequest, 
  AdminOperationResult, 
  SchemaPushResult 
} from '../src/types/graphql';

const router = express.Router();
const tenantManager = new TenantManager();

// Use URLs from config
const DGRAPH_ADMIN_SCHEMA_URL = config.dgraphAdminUrl;
const DGRAPH_ALTER_URL = `${config.dgraphBaseUrl.replace(/\/+$/, '')}/alter`;

// Helper function to drop all data from the configured Dgraph instance
async function dropAllData(target: string, namespace: string | null = null): Promise<AdminOperationResult> {
  // CRITICAL SAFETY CHECK: In multi-tenant mode, namespace MUST be specified
  const isMultiTenant = config.enableMultiTenant;
  
  if (isMultiTenant && !namespace) {
    console.error('[DROP ALL] SAFETY VIOLATION: Attempted dropAll without namespace in multi-tenant mode!');
    return {
      success: false,
      error: 'Namespace is required for dropAll in multi-tenant mode',
      details: 'This is a safety measure to prevent accidental cluster-wide data loss'
    };
  }

  // Additional safety: Validate namespace format
  if (namespace && !namespace.match(/^0x[0-9a-f]+$/)) {
    console.error(`[DROP ALL] SAFETY VIOLATION: Invalid namespace format: ${namespace}`);
    return {
      success: false,
      error: `Invalid namespace format: ${namespace}. Expected format: 0x0, 0x1, etc.`,
      details: 'Namespace must be a valid hexadecimal format'
    };
  }

  const payload = { "drop_all": true };
  const url = DGRAPH_ALTER_URL; // Use the derived URL

  // Enhanced logging for safety audit trail
  console.log(`[DROP ALL] === NAMESPACE-SCOPED OPERATION ===`);
  console.log(`[DROP ALL] Target: ${target}`);
  console.log(`[DROP ALL] Namespace: ${namespace || 'DEFAULT (non-multi-tenant)'}`);
  console.log(`[DROP ALL] URL: ${url}${namespace ? `?namespace=${namespace}` : ''}`);
  console.log(`[DROP ALL] Multi-tenant mode: ${isMultiTenant}`);
  console.log(`[DROP ALL] ===================================`);
  
  const result = await sendDgraphAdminRequest(url, payload, namespace) as AdminOperationResult;

  // Log the result for audit trail
  if (result.success) {
    console.log(`[DROP ALL] SUCCESS: Data dropped in namespace ${namespace || 'DEFAULT'}`);
  } else {
    console.error(`[DROP ALL] FAILED: ${result.error}`);
  }

  return result; // Return the single result object
}

// Helper function to push schema to the configured Dgraph instance
async function pushSchemaToConfiguredDgraph(schema: string, namespace: string | null = null): Promise<AdminOperationResult> {
  const url = DGRAPH_ADMIN_SCHEMA_URL; // Use the derived URL
  const result = await pushSchemaViaHttp(schema, namespace || undefined, url);

  // Add verification step if needed

  return result;
}

// Admin Endpoints
// -------------------------------------------------------------------

// Endpoint to push schema directly or from registry
router.post('/admin/schema', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { schema, schemaId }: SchemaRequest = req.body;

    // Extract namespace from tenant context
    const namespace = req.tenantContext?.namespace;

    // Determine which schema to use
    let schemaContent: string;

    if (schemaId) {
      console.log(`[SCHEMA PUSH] Using schema ${schemaId} from registry`);
      schemaContent = await schemaRegistry.getSchemaContent(schemaId);
    } else if (schema) {
      schemaContent = schema;
    } else {
      res.status(400).json({ error: 'Missing required field: schema or schemaId' });
      return;
    }

    console.log(`[SCHEMA PUSH] Pushing schema to configured Dgraph instance${namespace ? ` for namespace ${namespace}` : ''}`);
    const result: SchemaPushResult = await pushSchemaToConfiguredDgraph(schemaContent, namespace || null);

    if (result.success) {
      res.json({ success: true, results: result });
    } else {
      console.error('[SCHEMA PUSH] Push failed:', result.error);
      res.status(500).json({ success: false, message: 'Schema push encountered errors', results: result });
    }
  } catch (error) {
    const err = error as Error;
    console.error('[ADMIN] Failed to push schema:', error);
    res.status(500).json({ error: 'Failed to push schema', details: err.message });
  }
});

// POST /api/admin/dropAll - Endpoint to drop all data from Dgraph instance(s)
router.post('/admin/dropAll', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  const { target, confirmNamespace }: DropAllRequest = req.body;

  if (!target || !['local', 'remote', 'both'].includes(target)) {
    res.status(400).json({ error: 'Missing or invalid required field: target. Must be "local", "remote", or "both".' });
    return;
  }

  try {
    // Extract namespace from tenant context
    const namespace = req.tenantContext?.namespace || undefined;
    const tenantId = req.tenantContext?.tenantId;
    const isMultiTenant = config.enableMultiTenant;
    
    // SAFETY CHECK: In multi-tenant mode, require explicit namespace confirmation
    if (isMultiTenant && confirmNamespace !== namespace) {
      console.error(`[DROP ALL] SAFETY CHECK FAILED: confirmNamespace (${confirmNamespace}) does not match context namespace (${namespace})`);
      res.status(400).json({
        error: 'Namespace confirmation required',
        details: `For safety, you must provide confirmNamespace: "${namespace}" in the request body to confirm the target namespace`,
        currentNamespace: namespace,
        currentTenant: tenantId
      });
      return;
    }
    
    console.log(`[DROP ALL] === REQUEST DETAILS ===`);
    console.log(`[DROP ALL] Tenant ID: ${tenantId}`);
    console.log(`[DROP ALL] Namespace: ${namespace}`);
    console.log(`[DROP ALL] Target: ${target}`);
    console.log(`[DROP ALL] Confirmed: ${confirmNamespace === namespace ? 'YES' : 'NO'}`);
    console.log(`[DROP ALL] ======================`);
    
    const result: AdminOperationResult = await dropAllData(target, namespace || null);

    if (result.success) {
      const response: DropAllResponse = {
        success: true,
        message: `Drop all data operation completed successfully for configured Dgraph instance${namespace ? ` in namespace ${namespace}` : ''}`,
        namespace: namespace,
        tenantId: tenantId,
        data: result.data
      };
      res.json(response);
    } else {
      const response: DropAllResponse = {
        success: false,
        message: `Drop all data operation encountered errors`,
        error: result.error,
        details: result.details,
        namespace: namespace,
        tenantId: tenantId
      };
      res.status(500).json(response);
    }
  } catch (error) {
    const err = error as Error;
    console.error('[ADMIN] Failed to drop all data:', error);
    res.status(500).json({ error: 'Failed to drop all data', details: err.message });
  }
});

// Enhanced Tenant Management Endpoints
// -------------------------------------------------------------------

/**
 * Seed test data in a tenant
 * 
 * POST /api/admin/tenant/seed
 * 
 * Body:
 * {
 *   "tenantId": string,
 *   "dataType": "sample" | "test" | "minimal",
 *   "clearFirst": boolean
 * }
 */
router.post('/admin/tenant/seed', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId = 'test-tenant', dataType = 'test', clearFirst = false } = req.body;
    
    console.log(`[ADMIN_TENANT] Seeding data for tenant ${tenantId}, type: ${dataType}, clearFirst: ${clearFirst}`);
    
    // Clear data first if requested
    if (clearFirst) {
      console.log(`[ADMIN_TENANT] Clearing data for tenant ${tenantId} before seeding`);
      await tenantManager.deleteTenant(tenantId);
      await tenantManager.createTenant(tenantId);
    }
    
    // Check if tenant exists
    const exists = await tenantManager.tenantExists(tenantId);
    if (!exists) {
      console.log(`[ADMIN_TENANT] Creating tenant ${tenantId} before seeding`);
      await tenantManager.createTenant(tenantId);
    }
    
    // Get tenant info
    const tenantInfo = await tenantManager.getTenantInfo(tenantId);
    
    // TODO: Implement actual data seeding based on dataType
    // For now, just return success with tenant info
    
    res.json({
      message: `Data seeding completed for tenant ${tenantId}`,
      tenantId,
      dataType,
      tenant: tenantInfo,
      seededAt: new Date()
    });
  } catch (error) {
    const err = error as Error;
    console.error('[ADMIN_TENANT] Failed to seed tenant data:', error);
    res.status(500).json(createErrorResponseFromError('Failed to seed tenant data', err));
  }
});

/**
 * Reset a tenant completely (delete and recreate)
 * 
 * POST /api/admin/tenant/reset
 * 
 * Body:
 * {
 *   "tenantId": string,
 *   "confirmTenantId": string  // Safety confirmation
 * }
 */
router.post('/admin/tenant/reset', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId, confirmTenantId } = req.body;
    
    if (!tenantId) {
      res.status(400).json({ error: 'Missing required field: tenantId' });
      return;
    }
    
    // Safety check: require confirmation
    if (tenantId !== confirmTenantId) {
      res.status(400).json({ 
        error: 'Tenant ID confirmation required',
        details: 'confirmTenantId must match tenantId for safety'
      });
      return;
    }
    
    // Prevent resetting system tenants without explicit override
    if ((tenantId === 'default' || tenantId === 'test-tenant') && !req.body.allowSystemTenant) {
      res.status(400).json({ 
        error: 'Cannot reset system tenant without explicit override',
        details: 'Set allowSystemTenant: true to reset system tenants'
      });
      return;
    }
    
    console.log(`[ADMIN_TENANT] Resetting tenant ${tenantId}`);
    
    // Delete and recreate tenant
    await tenantManager.deleteTenant(tenantId);
    const namespace = await tenantManager.createTenant(tenantId);
    const tenantInfo = await tenantManager.getTenantInfo(tenantId);
    
    res.json({
      message: `Tenant ${tenantId} reset successfully`,
      tenantId,
      namespace,
      tenant: tenantInfo,
      resetAt: new Date()
    });
  } catch (error) {
    const err = error as Error;
    console.error('[ADMIN_TENANT] Failed to reset tenant:', error);
    res.status(500).json(createErrorResponseFromError('Failed to reset tenant', err));
  }
});

/**
 * Get detailed tenant status and health
 * 
 * GET /api/admin/tenant/:tenantId/status
 */
router.get('/admin/tenant/:tenantId/status', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.params;
    
    if (!tenantId) {
      res.status(400).json({ error: 'Missing tenantId parameter' });
      return;
    }
    
    console.log(`[ADMIN_TENANT] Getting status for tenant ${tenantId}`);
    
    // Get basic tenant info
    const tenantInfo = await tenantManager.getTenantInfo(tenantId);
    
    // Get tenant namespace
    const namespace = await tenantManager.getTenantNamespace(tenantId);
    
    // Check if tenant exists and is accessible
    const exists = await tenantManager.tenantExists(tenantId);
    
    // TODO: Add more health checks
    // - Schema validation
    // - Data counts
    // - Connection health
    
    const status = {
      ...tenantInfo,
      namespace,
      exists,
      health: exists ? 'healthy' : 'not-accessible',
      checkedAt: new Date()
    };
    
    res.json(status);
  } catch (error) {
    const err = error as Error;
    console.error('[ADMIN_TENANT] Failed to get tenant status:', error);
    res.status(500).json(createErrorResponseFromError('Failed to get tenant status', err));
  }
});

/**
 * List all tenants with their status
 * 
 * GET /api/admin/tenant/list
 */
router.get('/admin/tenant/list', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[ADMIN_TENANT] Listing all tenants');
    
    const tenants = await tenantManager.listTenants();
    
    // Add health status for each tenant
    const tenantsWithStatus = await Promise.all(
      tenants.map(async (tenant) => {
        try {
          const exists = await tenantManager.tenantExists(tenant.tenantId);
          return {
            ...tenant,
            health: exists ? 'healthy' : 'not-accessible'
          };
        } catch (error) {
          return {
            ...tenant,
            health: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );
    
    res.json({
      tenants: tenantsWithStatus,
      count: tenantsWithStatus.length,
      checkedAt: new Date()
    });
  } catch (error) {
    const err = error as Error;
    console.error('[ADMIN_TENANT] Failed to list tenants:', error);
    res.status(500).json(createErrorResponseFromError('Failed to list tenants', err));
  }
});

/**
 * Get schema content for a tenant
 * 
 * GET /api/admin/tenant/:tenantId/schema
 */
router.get('/admin/tenant/:tenantId/schema', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.params;
    
    if (!tenantId) {
      res.status(400).json({ error: 'Missing tenantId parameter' });
      return;
    }
    
    console.log(`[ADMIN_TENANT] Getting schema content for tenant ${tenantId}`);
    
    // Get schema content for the tenant
    const schemaContent = await tenantManager.getTenantSchemaContent(tenantId);
    const schemaInfo = await tenantManager.getTenantSchemaInfo(tenantId);
    
    res.json({
      tenantId,
      schemaInfo,
      content: schemaContent,
      retrievedAt: new Date()
    });
  } catch (error) {
    const err = error as Error;
    console.error('[ADMIN_TENANT] Failed to get tenant schema:', error);
    res.status(500).json(createErrorResponseFromError('Failed to get tenant schema', err));
  }
});

export default router;
