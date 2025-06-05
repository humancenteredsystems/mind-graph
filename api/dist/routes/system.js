"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dgraphCapabilities_1 = require("../services/dgraphCapabilities");
const adaptiveTenantFactory_1 = require("../services/adaptiveTenantFactory");
const router = express_1.default.Router();
// System status endpoint
router.get('/system/status', async (req, res) => {
    try {
        // Get current capabilities
        const capabilities = await dgraphCapabilities_1.dgraphCapabilityDetector.detectCapabilities();
        // Manually parse tenant header since system routes run before tenant middleware
        const tenantId = req.headers['x-tenant-id'] || 'default';
        const tenantContext = req.tenantContext || { tenantId, namespace: null, isTestTenant: false, isDefaultTenant: true };
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
            version: 'unknown', // Version detection not implemented yet
            licenseType: capabilities.licenseType || 'unknown',
            licenseExpiry: capabilities.licenseExpiry ? capabilities.licenseExpiry.toISOString() : null,
            detectionError: undefined
        };
        // Add error info if detection failed
        if (capabilities.error) {
            systemStatus.detectionError = capabilities.error;
        }
        console.log(`[SYSTEM_STATUS] Status requested for tenant ${systemStatus.currentTenant}:`, systemStatus);
        res.json(systemStatus);
    }
    catch (error) {
        const err = error;
        console.error('[SYSTEM_STATUS] Failed to get system status:', error);
        res.status(500).json({
            error: 'Failed to get system status',
            details: err.message
        });
    }
});
// Refresh capabilities endpoint (admin only)
router.post('/system/refresh', async (req, res) => {
    try {
        console.log('[SYSTEM_REFRESH] Refreshing Dgraph capabilities...');
        // Refresh both capability detector and adaptive factory
        await dgraphCapabilities_1.dgraphCapabilityDetector.refreshCapabilities();
        await adaptiveTenantFactory_1.adaptiveTenantFactory.refresh();
        // Get fresh status
        const capabilities = dgraphCapabilities_1.dgraphCapabilityDetector.getCachedCapabilities();
        res.json({
            message: 'System capabilities refreshed successfully',
            capabilities,
            refreshedAt: new Date()
        });
    }
    catch (error) {
        const err = error;
        console.error('[SYSTEM_REFRESH] Failed to refresh system capabilities:', error);
        res.status(500).json({
            error: 'Failed to refresh system capabilities',
            details: err.message
        });
    }
});
// Health check with capability info
router.get('/system/health', async (req, res) => {
    try {
        const capabilities = dgraphCapabilities_1.dgraphCapabilityDetector.getCachedCapabilities();
        const isMultiTenantSupported = adaptiveTenantFactory_1.adaptiveTenantFactory.isMultiTenantSupported();
        res.json({
            status: 'healthy',
            timestamp: new Date(),
            capabilities: capabilities || 'not-detected',
            multiTenantSupported: isMultiTenantSupported,
            mode: isMultiTenantSupported ? 'multi-tenant' : 'single-tenant'
        });
    }
    catch (error) {
        const err = error;
        console.error('[SYSTEM_HEALTH] Failed to get health status:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: err.message,
            timestamp: new Date()
        });
    }
});
exports.default = router;
