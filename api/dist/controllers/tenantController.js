"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantController = void 0;
const tenantManager_1 = require("../services/tenantManager");
const enterpriseGuards_1 = require("../utils/enterpriseGuards");
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
            // Use centralized Enterprise guard for tenant creation
            enterpriseGuards_1.EnterpriseGuards.requireNamespaceSupport('tenant creation', tenantId);
            console.log(`[TENANT_CONTROLLER] Creating tenant: ${tenantId}`);
            const namespace = await this.tenantManager.createTenant(tenantId);
            const deploymentMode = enterpriseGuards_1.EnterpriseGuards.getDeploymentMode();
            res.status(201).json({
                tenantId,
                namespace,
                message: 'Tenant created successfully',
                mode: deploymentMode
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
            if (!enterpriseGuards_1.EnterpriseGuards.isNamespaceSupported()) {
                // OSS mode: return default tenant only
                console.log(`[TENANT_CONTROLLER] OSS mode - returning default tenant`);
                const deploymentMode = enterpriseGuards_1.EnterpriseGuards.getDeploymentMode();
                res.json([{
                        tenantId: 'default',
                        namespace: '0x0',
                        mode: deploymentMode,
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
            // Use centralized Enterprise guard for tenant deletion
            enterpriseGuards_1.EnterpriseGuards.requireNamespaceSupport('tenant deletion', tenantId);
            console.log(`[TENANT_CONTROLLER] Deleting tenant: ${tenantId}`);
            await this.tenantManager.deleteTenant(tenantId);
            const deploymentMode = enterpriseGuards_1.EnterpriseGuards.getDeploymentMode();
            res.json({
                message: 'Tenant deleted successfully',
                tenantId,
                mode: deploymentMode
            });
        }
        catch (error) {
            console.error(`[TENANT_CONTROLLER] Error deleting tenant:`, error);
            next(error);
        }
    }
    async getCapabilities(req, res, next) {
        try {
            const summary = enterpriseGuards_1.EnterpriseGuards.getCapabilitySummary();
            const capabilities = enterpriseGuards_1.EnterpriseGuards.getCapabilities();
            res.json({
                multiTenantSupported: summary.namespacesSupported,
                enterpriseDetected: summary.enterpriseDetected,
                mode: summary.mode,
                detectedAt: summary.detectedAt,
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
