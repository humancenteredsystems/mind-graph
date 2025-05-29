"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantController = void 0;
const tenantManager_1 = require("../services/tenantManager");
const adaptiveTenantFactory_1 = require("../services/adaptiveTenantFactory");
/**
 * TenantController - Universal tenant management with OSS/Enterprise compatibility
 * Provides tenant CRUD operations that adapt to available Dgraph capabilities
 */
class TenantController {
    constructor() {
        this.tenantManager = new tenantManager_1.TenantManager();
    }
    async createTenant(req, res, next) {
        try {
            const { tenantId } = req.body;
            if (!tenantId) {
                res.status(400).json({
                    error: 'tenantId is required'
                });
                return;
            }
            // Check if multi-tenant mode is supported
            const capabilities = adaptiveTenantFactory_1.adaptiveTenantFactory.getCapabilities();
            if (!capabilities?.namespacesSupported) {
                res.status(400).json({
                    error: 'Multi-tenant mode not supported in OSS deployment',
                    mode: 'oss-single-tenant'
                });
                return;
            }
            console.log(`[TENANT_CONTROLLER] Creating tenant: ${tenantId}`);
            const namespace = await this.tenantManager.createTenant(tenantId);
            res.status(201).json({
                tenantId,
                namespace,
                message: 'Tenant created successfully',
                mode: 'enterprise-multi-tenant'
            });
        }
        catch (error) {
            console.error(`[TENANT_CONTROLLER] Error creating tenant:`, error);
            next(error);
        }
    }
    async getTenantInfo(req, res, next) {
        try {
            const { tenantId } = req.params;
            console.log(`[TENANT_CONTROLLER] Getting tenant info: ${tenantId}`);
            const info = await this.tenantManager.getTenantInfo(tenantId);
            res.json(info);
        }
        catch (error) {
            console.error(`[TENANT_CONTROLLER] Error getting tenant info:`, error);
            next(error);
        }
    }
    async listTenants(req, res, next) {
        try {
            const capabilities = adaptiveTenantFactory_1.adaptiveTenantFactory.getCapabilities();
            if (!capabilities?.namespacesSupported) {
                // OSS mode: return default tenant only
                console.log(`[TENANT_CONTROLLER] OSS mode - returning default tenant`);
                res.json([{
                        tenantId: 'default',
                        namespace: '0x0',
                        mode: 'oss-single-tenant',
                        exists: true,
                        isDefaultTenant: true,
                        isTestTenant: false
                    }]);
                return;
            }
            // Enterprise mode: return all tenants
            console.log(`[TENANT_CONTROLLER] Enterprise mode - listing all tenants`);
            const tenants = await this.tenantManager.listTenants();
            res.json(tenants);
        }
        catch (error) {
            console.error(`[TENANT_CONTROLLER] Error listing tenants:`, error);
            next(error);
        }
    }
    async deleteTenant(req, res, next) {
        try {
            const { tenantId } = req.params;
            // Prevent deletion of system tenants
            if (tenantId === 'default' || tenantId === 'test-tenant') {
                res.status(400).json({
                    error: `Cannot delete system tenant: ${tenantId}`
                });
                return;
            }
            // Check if multi-tenant mode is supported
            const capabilities = adaptiveTenantFactory_1.adaptiveTenantFactory.getCapabilities();
            if (!capabilities?.namespacesSupported) {
                res.status(400).json({
                    error: 'Multi-tenant mode not supported in OSS deployment',
                    mode: 'oss-single-tenant'
                });
                return;
            }
            console.log(`[TENANT_CONTROLLER] Deleting tenant: ${tenantId}`);
            await this.tenantManager.deleteTenant(tenantId);
            res.json({
                message: 'Tenant deleted successfully',
                tenantId,
                mode: 'enterprise-multi-tenant'
            });
        }
        catch (error) {
            console.error(`[TENANT_CONTROLLER] Error deleting tenant:`, error);
            next(error);
        }
    }
    async getCapabilities(req, res, next) {
        try {
            const capabilities = adaptiveTenantFactory_1.adaptiveTenantFactory.getCapabilities();
            res.json({
                multiTenantSupported: capabilities?.namespacesSupported || false,
                enterpriseDetected: capabilities?.enterpriseDetected || false,
                mode: capabilities?.namespacesSupported ? 'enterprise-multi-tenant' : 'oss-single-tenant',
                detectedAt: capabilities?.detectedAt || new Date().toISOString(),
                capabilities
            });
        }
        catch (error) {
            console.error(`[TENANT_CONTROLLER] Error getting capabilities:`, error);
            next(error);
        }
    }
}
exports.TenantController = TenantController;
//# sourceMappingURL=tenantController.js.map