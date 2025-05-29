"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setTenantContext = setTenantContext;
exports.ensureTenant = ensureTenant;
exports.validateTenantAccess = validateTenantAccess;
const tenantManager_1 = require("../services/tenantManager");
const tenantManager = new tenantManager_1.TenantManager();
/**
 * Middleware to set tenant context for each request
 * Resolves tenant ID to namespace and attaches to request context
 */
async function setTenantContext(req, res, next) {
    try {
        // Extract tenant ID from headers, JWT, or default to test tenant for development
        const tenantId = req.headers['x-tenant-id'] ||
            req.user?.tenantId ||
            (process.env.NODE_ENV === 'test' ? 'test-tenant' : 'default');
        // Resolve tenant's namespace
        const namespace = await tenantManager.getTenantNamespace(tenantId);
        // Attach to request context
        req.tenantContext = {
            tenantId,
            namespace,
            isTestTenant: tenantId === 'test-tenant',
            isDefaultTenant: tenantId === 'default'
        };
        console.log(`[TENANT_CONTEXT] Request for tenant ${tenantId} -> namespace ${namespace}`);
        next();
    }
    catch (error) {
        console.error('[TENANT_CONTEXT] Failed to resolve tenant context:', error);
        // Fallback to default tenant
        req.tenantContext = {
            tenantId: 'default',
            namespace: tenantManager.defaultNamespace,
            isTestTenant: false,
            isDefaultTenant: true,
            error: error.message
        };
        console.log('[TENANT_CONTEXT] Falling back to default tenant');
        next();
    }
}
/**
 * Middleware to ensure tenant exists, creating it if necessary
 */
async function ensureTenant(req, res, next) {
    try {
        const { tenantId } = req.tenantContext;
        // Skip for default tenant
        if (tenantId === 'default') {
            return next();
        }
        // Check if tenant exists
        const exists = await tenantManager.tenantExists(tenantId);
        if (!exists) {
            console.log(`[TENANT_CONTEXT] Creating new tenant: ${tenantId}`);
            await tenantManager.createTenant(tenantId);
            // Update context with creation info
            req.tenantContext.wasCreated = true;
        }
        next();
    }
    catch (error) {
        console.error('[TENANT_CONTEXT] Failed to ensure tenant exists:', error);
        // For development, continue with error logged
        req.tenantContext.ensureError = error.message;
        next();
    }
}
/**
 * Middleware to validate tenant access (placeholder for future auth)
 */
async function validateTenantAccess(req, res, next) {
    try {
        const { tenantId } = req.tenantContext;
        // For development, allow all access
        // In production, this would validate JWT claims, API keys, etc.
        console.log(`[TENANT_CONTEXT] Validated access for tenant: ${tenantId}`);
        next();
    }
    catch (error) {
        console.error('[TENANT_CONTEXT] Access validation failed:', error);
        res.status(403).json({
            error: 'Tenant access denied',
            tenantId: req.tenantContext?.tenantId
        });
    }
}
//# sourceMappingURL=tenantContext.js.map