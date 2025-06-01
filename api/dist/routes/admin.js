"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const config_1 = __importDefault(require("../config"));
const auth_1 = require("../middleware/auth");
const schemaRegistry = __importStar(require("../services/schemaRegistry"));
const pushSchema_1 = require("../utils/pushSchema");
const dgraphAdmin_1 = require("../utils/dgraphAdmin");
const router = express_1.default.Router();
// Use URLs from config
const DGRAPH_ADMIN_SCHEMA_URL = config_1.default.dgraphAdminUrl;
const DGRAPH_ALTER_URL = `${config_1.default.dgraphBaseUrl.replace(/\/+$/, '')}/alter`;
// Helper function to drop all data from the configured Dgraph instance
async function dropAllData(target, namespace = null) {
    // CRITICAL SAFETY CHECK: In multi-tenant mode, namespace MUST be specified
    const isMultiTenant = config_1.default.enableMultiTenant;
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
    const result = await (0, dgraphAdmin_1.sendDgraphAdminRequest)(url, payload, namespace);
    // Log the result for audit trail
    if (result.success) {
        console.log(`[DROP ALL] SUCCESS: Data dropped in namespace ${namespace || 'DEFAULT'}`);
    }
    else {
        console.error(`[DROP ALL] FAILED: ${result.error}`);
    }
    return result; // Return the single result object
}
// Helper function to push schema to the configured Dgraph instance
async function pushSchemaToConfiguredDgraph(schema, namespace = null) {
    const url = DGRAPH_ADMIN_SCHEMA_URL; // Use the derived URL
    const result = await (0, pushSchema_1.pushSchemaViaHttp)(schema, namespace || undefined, url);
    // Add verification step if needed
    return result;
}
// Admin Endpoints
// -------------------------------------------------------------------
// Endpoint to push schema directly or from registry
router.post('/admin/schema', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const { schema, schemaId } = req.body;
        // Extract namespace from tenant context
        const namespace = req.tenantContext?.namespace;
        // Determine which schema to use
        let schemaContent;
        if (schemaId) {
            console.log(`[SCHEMA PUSH] Using schema ${schemaId} from registry`);
            schemaContent = await schemaRegistry.getSchemaContent(schemaId);
        }
        else if (schema) {
            schemaContent = schema;
        }
        else {
            res.status(400).json({ error: 'Missing required field: schema or schemaId' });
            return;
        }
        console.log(`[SCHEMA PUSH] Pushing schema to configured Dgraph instance${namespace ? ` for namespace ${namespace}` : ''}`);
        const result = await pushSchemaToConfiguredDgraph(schemaContent, namespace || null);
        if (result.success) {
            res.json({ success: true, results: result });
        }
        else {
            console.error('[SCHEMA PUSH] Push failed:', result.error);
            res.status(500).json({ success: false, message: 'Schema push encountered errors', results: result });
        }
    }
    catch (err) {
        console.error('[SCHEMA PUSH] Error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ success: false, message: errorMessage });
    }
});
// POST /api/admin/dropAll - Endpoint to drop all data from Dgraph instance(s)
router.post('/admin/dropAll', auth_1.authenticateAdmin, async (req, res) => {
    const { target, confirmNamespace } = req.body;
    if (!target || !['local', 'remote', 'both'].includes(target)) {
        res.status(400).json({ error: 'Missing or invalid required field: target. Must be "local", "remote", or "both".' });
        return;
    }
    try {
        // Extract namespace from tenant context
        const namespace = req.tenantContext?.namespace || undefined;
        const tenantId = req.tenantContext?.tenantId;
        const isMultiTenant = config_1.default.enableMultiTenant;
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
        const result = await dropAllData(target, namespace || null);
        if (result.success) {
            const response = {
                success: true,
                message: `Drop all data operation completed successfully for configured Dgraph instance${namespace ? ` in namespace ${namespace}` : ''}`,
                namespace: namespace,
                tenantId: tenantId,
                data: result.data
            };
            res.json(response);
        }
        else {
            const response = {
                success: false,
                message: `Drop all data operation encountered errors`,
                error: result.error,
                details: result.details,
                namespace: namespace,
                tenantId: tenantId
            };
            res.status(500).json(response);
        }
    }
    catch (error) {
        console.error('[DROP ALL] Error in endpoint handler:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ success: false, message: errorMessage });
    }
});
exports.default = router;
