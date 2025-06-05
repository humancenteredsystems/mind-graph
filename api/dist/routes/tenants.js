"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const errorResponse_1 = require("../utils/errorResponse");
const tenantContext_1 = require("../middleware/tenantContext");
const router = express_1.default.Router();
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
router.get('/tenant/info', async (req, res) => {
    try {
        const { tenantId } = req.tenantContext;
        const tenantInfo = await tenantManager.getTenantInfo(tenantId);
        res.json({
            ...tenantInfo,
            context: req.tenantContext
        });
    }
    catch (error) {
        const err = error;
        console.error('[TENANT_INFO] Error:', err);
        res.status(500).json((0, errorResponse_1.createErrorResponseFromError)('Failed to get tenant information', err));
    }
});
// --- Admin-Protected Tenant Operations ---
router.use(auth_1.authenticateAdmin);
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
router.post('/tenant', tenantContext_1.ensureTenant, async (req, res) => {
    try {
        const { tenantId } = req.body;
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
    }
    catch (error) {
        const err = error;
        console.error('[CREATE_TENANT] Error:', err);
        res.status(500).json((0, errorResponse_1.createErrorResponseFromError)('Failed to create tenant', err));
    }
});
// List all tenants
router.get('/tenant', async (req, res) => {
    try {
        const tenants = await tenantManager.listTenants();
        res.json(tenants);
    }
    catch (error) {
        const err = error;
        console.error('[LIST_TENANTS] Error:', err);
        res.status(500).json((0, errorResponse_1.createErrorResponseFromError)('Failed to list tenants', err));
    }
});
// Get specific tenant information
router.get('/tenant/:tenantId', async (req, res) => {
    try {
        const { tenantId } = req.params;
        const tenantInfo = await tenantManager.getTenantInfo(tenantId);
        res.json(tenantInfo);
    }
    catch (error) {
        const err = error;
        console.error('[GET_TENANT] Error:', err);
        res.status(500).json((0, errorResponse_1.createErrorResponseFromError)('Failed to get tenant information', err));
    }
});
// Delete a tenant
router.delete('/tenant/:tenantId', async (req, res) => {
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
    }
    catch (error) {
        const err = error;
        console.error('[DELETE_TENANT] Error:', err);
        res.status(500).json((0, errorResponse_1.createErrorResponseFromError)('Failed to delete tenant', err));
    }
});
// Initialize test tenant (for development)
router.post('/tenant/test/init', async (req, res) => {
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
    }
    catch (error) {
        const err = error;
        console.error('[INIT_TEST_TENANT] Error:', err);
        res.status(500).json((0, errorResponse_1.createErrorResponseFromError)('Failed to initialize test tenant', err));
    }
});
// Reset test tenant (clear all data)
router.post('/tenant/test/reset', async (req, res) => {
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
    }
    catch (error) {
        const err = error;
        console.error('[RESET_TEST_TENANT] Error:', err);
        res.status(500).json((0, errorResponse_1.createErrorResponseFromError)('Failed to reset test tenant', err));
    }
});
exports.default = router;
