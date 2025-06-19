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
        // DEGRADE_GRACEFULLY for READ operations - fallback to default tenant with context
        const { createMultiTenantErrorResponse } = await Promise.resolve().then(() => __importStar(require('../utils/errorResponse')));
        const { TenantManager } = await Promise.resolve().then(() => __importStar(require('../services/tenantManager')));
        req.tenantContext = {
            tenantId: 'default',
            namespace: '0x0',
            isTestTenant: false,
            isDefaultTenant: true,
            error: error.message,
            fallbackReason: 'Multi-tenant context resolution failed, using default tenant'
        };
        console.log('[TENANT_CONTEXT] Degrading gracefully to default tenant for READ operations');
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
