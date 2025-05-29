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
        const tenantContext = req.tenantContext || { tenantId };
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
            detectionError: capabilities.error
        };
        console.log(`[SYSTEM_STATUS] Status requested for tenant ${systemStatus.currentTenant}:`, systemStatus);
        res.json(systemStatus);
    }
    catch (error) {
        console.error('[SYSTEM_STATUS] Error getting system status:', error);
        res.status(500).json({
            error: 'Failed to get system status',
            details: error.message
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
        console.error('[SYSTEM_REFRESH] Error refreshing capabilities:', error);
        res.status(500).json({
            error: 'Failed to refresh system capabilities',
            details: error.message
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
        console.error('[SYSTEM_HEALTH] Error getting health status:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date()
        });
    }
});
exports.default = router;
//# sourceMappingURL=system.js.map