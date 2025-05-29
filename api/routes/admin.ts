import express, { Request, Response } from 'express';
import config from '../config';
import { authenticateAdmin } from '../middleware/auth';
import * as schemaRegistry from '../services/schemaRegistry';
import { pushSchemaViaHttp } from '../utils/pushSchema';
import { sendDgraphAdminRequest } from '../utils/dgraphAdmin';
import { TenantRequest } from '../src/types';

const router = express.Router();

// Use URLs from config
const DGRAPH_ADMIN_SCHEMA_URL = config.dgraphAdminUrl;
const DGRAPH_ALTER_URL = `${config.dgraphBaseUrl.replace(/\/+$/, '')}/alter`;

// Types for admin operations
interface DropAllRequest {
  target: 'local' | 'remote' | 'both';
  confirmNamespace?: string;
}

interface SchemaRequest {
  schema?: string;
  schemaId?: string;
}

// Simple error helper
const errorResponse = (res: Response, message: string, status = 500, details?: any) => {
  res.status(status).json({ error: message, ...(details && { details }) });
};

// Helper function to drop all data from the configured Dgraph instance
async function dropAllData(target: string, namespace: string | null = null) {
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
  const url = DGRAPH_ALTER_URL;

  // Enhanced logging for safety audit trail
  console.log(`[DROP ALL] === NAMESPACE-SCOPED OPERATION ===`);
  console.log(`[DROP ALL] Target: ${target}`);
  console.log(`[DROP ALL] Namespace: ${namespace || 'DEFAULT (non-multi-tenant)'}`);
  console.log(`[DROP ALL] URL: ${url}${namespace ? `?namespace=${namespace}` : ''}`);
  console.log(`[DROP ALL] Multi-tenant mode: ${isMultiTenant}`);
  console.log(`[DROP ALL] ===================================`);
  
  const result = await sendDgraphAdminRequest(url, payload, namespace);

  // Log the result for audit trail
  if (result.success) {
    console.log(`[DROP ALL] SUCCESS: Data dropped in namespace ${namespace || 'DEFAULT'}`);
  } else {
    console.error(`[DROP ALL] FAILED: ${result.error}`);
  }

  return result;
}

// Helper function to push schema to the configured Dgraph instance
async function pushSchemaToConfiguredDgraph(schema: string, namespace: string | null = null) {
  const url = DGRAPH_ADMIN_SCHEMA_URL;
  return await pushSchemaViaHttp(schema, namespace, url);
}

// Admin Endpoints
// -------------------------------------------------------------------

// Endpoint to push schema directly or from registry
router.post('/admin/schema', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { schema, schemaId }: SchemaRequest = req.body;

    // Extract namespace from tenant context
    const namespace = (req as TenantRequest).tenantContext?.namespace;

    // Determine which schema to use
    let schemaContent: string;

    if (schemaId) {
      console.log(`[SCHEMA PUSH] Using schema ${schemaId} from registry`);
      schemaContent = await schemaRegistry.getSchemaContent(schemaId);
    } else if (schema) {
      schemaContent = schema;
    } else {
      errorResponse(res, 'Missing required field: schema or schemaId', 400);
      return;
    }

    console.log(`[SCHEMA PUSH] Pushing schema to configured Dgraph instance${namespace ? ` for namespace ${namespace}` : ''}`);
    const result = await pushSchemaToConfiguredDgraph(schemaContent, namespace);

    if (result.success) {
      res.json({ success: true, results: result });
    } else {
      console.error('[SCHEMA PUSH] Push failed:', result.error);
      res.status(500).json({ 
        success: false, 
        message: 'Schema push encountered errors', 
        results: result 
      });
    }
  } catch (err: any) {
    console.error('[SCHEMA PUSH] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/dropAll - Endpoint to drop all data from Dgraph instance(s)
router.post('/admin/dropAll', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  const { target, confirmNamespace }: DropAllRequest = req.body;

  if (!target || !['local', 'remote', 'both'].includes(target)) {
    errorResponse(res, 'Missing or invalid required field: target. Must be "local", "remote", or "both".', 400);
    return;
  }

  try {
    // Extract namespace from tenant context
    const tenantReq = req as TenantRequest;
    const namespace = tenantReq.tenantContext?.namespace;
    const tenantId = tenantReq.tenantContext?.tenantId;
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
    
    const result = await dropAllData(target, namespace);

    if (result.success) {
      res.json({
        success: true,
        message: `Drop all data operation completed successfully for configured Dgraph instance${namespace ? ` in namespace ${namespace}` : ''}`,
        namespace: namespace,
        tenantId: tenantId,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: `Drop all data operation encountered errors`,
        error: result.error,
        details: result.details,
        namespace: namespace,
        tenantId: tenantId
      });
    }
  } catch (error: any) {
    console.error('[DROP ALL] Error in endpoint handler:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
