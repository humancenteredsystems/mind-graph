"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const tenantManager_1 = require("../services/tenantManager");
const auth_1 = require("../middleware/auth");
const tenantContext_1 = require("../middleware/tenantContext");
const router = express_1.default.Router();
const tenantManager = new tenantManager_1.TenantManager();
// Simple error response helper
const errorResponse = (res, message, status = 500) => {
    res.status(status).json({ error: message });
};
// --- Public Tenant Operations ---
// Get current tenant information
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
        console.error('[TENANT_INFO] Error:', error);
        errorResponse(res, 'Failed to get tenant information');
    }
});
// --- Admin-Protected Tenant Operations ---
router.use(auth_1.authenticateAdmin);
// Create a new tenant
router.post('/tenant', tenantContext_1.ensureTenant, async (req, res) => {
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
    }
    catch (error) {
        console.error('[CREATE_TENANT] Error:', error);
        errorResponse(res, 'Failed to create tenant');
    }
});
// List all tenants
router.get('/tenant', async (req, res) => {
    try {
        const tenants = await tenantManager.listTenants();
        res.json(tenants);
    }
    catch (error) {
        console.error('[LIST_TENANTS] Error:', error);
        errorResponse(res, 'Failed to list tenants');
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
        console.error('[GET_TENANT] Error:', error);
        errorResponse(res, 'Failed to get tenant information');
    }
});
// Delete a tenant
router.delete('/tenant/:tenantId', async (req, res) => {
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
    }
    catch (error) {
        console.error('[DELETE_TENANT] Error:', error);
        errorResponse(res, 'Failed to delete tenant');
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
        console.error('[INIT_TEST_TENANT] Error:', error);
        errorResponse(res, 'Failed to initialize test tenant');
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
        console.error('[RESET_TEST_TENANT] Error:', error);
        errorResponse(res, 'Failed to reset test tenant');
    }
});
exports.default = router;
//# sourceMappingURL=tenants.js.map