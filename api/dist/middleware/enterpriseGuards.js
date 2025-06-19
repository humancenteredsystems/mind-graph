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
exports.protectEnterpriseAdmin = exports.protectNamespaceOperation = exports.protectTenantManagement = exports.protectEnterpriseFeature = exports.logEnterpriseFeatureUsage = exports.addCapabilityHeaders = exports.ensureCapabilitiesDetected = exports.validateNamespaceParam = exports.validateTenantCapabilities = exports.requireNamespaceSupport = exports.requireEnterprise = void 0;
const enterpriseGuards_1 = require("../utils/enterpriseGuards");
const errorResponse_1 = require("../utils/errorResponse");
/**
 * Express middleware for Enterprise feature validation
 *
 * These middleware functions provide route-level protection for Enterprise features,
 * ensuring consistent error handling and validation across the API.
 */
/**
 * Helper function to convert TenantCapabilities to the format expected by error response functions
 */
function getCapabilitySubset(capabilities) {
    if (!capabilities)
        return undefined;
    return {
        namespacesSupported: capabilities.namespacesSupported,
        enterpriseDetected: capabilities.enterpriseDetected
    };
}
/**
 * Middleware to require Enterprise features for a route
 * @param operation - Name of the operation requiring Enterprise features
 * @returns Express middleware function
 */
const requireEnterprise = (operation) => {
    return (req, res, next) => {
        try {
            enterpriseGuards_1.EnterpriseGuards.requireEnterprise(operation);
            next();
        }
        catch (error) {
            if (error instanceof enterpriseGuards_1.EnterpriseFeatureNotAvailableError) {
                const capabilities = enterpriseGuards_1.EnterpriseGuards.getCapabilities();
                const errorResponse = (0, errorResponse_1.createEnterpriseErrorResponse)(operation, '', capabilities || undefined);
                res.status(400).json(errorResponse);
            }
            else {
                // Unexpected error, pass to error handler
                next(error);
            }
        }
    };
};
exports.requireEnterprise = requireEnterprise;
/**
 * Middleware to require namespace support for a route
 * @param operation - Name of the operation requiring namespace support
 * @returns Express middleware function
 */
const requireNamespaceSupport = (operation) => {
    return (req, res, next) => {
        try {
            const namespace = req.tenantContext?.namespace;
            enterpriseGuards_1.EnterpriseGuards.requireNamespaceSupport(operation, namespace || undefined);
            next();
        }
        catch (error) {
            if (error instanceof enterpriseGuards_1.NamespaceNotSupportedError) {
                const capabilities = enterpriseGuards_1.EnterpriseGuards.getCapabilities();
                const capabilitySubset = capabilities ? {
                    namespacesSupported: capabilities.namespacesSupported,
                    enterpriseDetected: capabilities.enterpriseDetected
                } : undefined;
                const errorResponse = (0, errorResponse_1.createNamespaceErrorResponse)(operation, error.namespace, capabilitySubset);
                res.status(400).json(errorResponse);
            }
            else {
                // Unexpected error, pass to error handler
                next(error);
            }
        }
    };
};
exports.requireNamespaceSupport = requireNamespaceSupport;
/**
 * Middleware to validate tenant capabilities for multi-tenant operations
 * @param operation - Name of the operation being performed
 * @returns Express middleware function
 */
const validateTenantCapabilities = (operation) => {
    return (req, res, next) => {
        try {
            const tenantId = req.tenantContext?.tenantId || 'default';
            const namespace = req.tenantContext?.namespace || null;
            enterpriseGuards_1.EnterpriseGuards.validateTenantContext(tenantId, namespace, operation);
            next();
        }
        catch (error) {
            if (error instanceof enterpriseGuards_1.NamespaceNotSupportedError) {
                const capabilities = enterpriseGuards_1.EnterpriseGuards.getCapabilities();
                const errorResponse = (0, errorResponse_1.createNamespaceErrorResponse)(operation, error.namespace, getCapabilitySubset(capabilities));
                res.status(400).json(errorResponse);
            }
            else if (error instanceof enterpriseGuards_1.EnterpriseFeatureNotAvailableError) {
                const capabilities = enterpriseGuards_1.EnterpriseGuards.getCapabilities();
                const errorResponse = (0, errorResponse_1.createEnterpriseErrorResponse)(operation, '', getCapabilitySubset(capabilities));
                res.status(400).json(errorResponse);
            }
            else {
                // Unexpected error, pass to error handler
                next(error);
            }
        }
    };
};
exports.validateTenantCapabilities = validateTenantCapabilities;
/**
 * Middleware to validate namespace parameter from request
 * @param operation - Name of the operation being performed
 * @returns Express middleware function
 */
const validateNamespaceParam = (operation) => {
    return (req, res, next) => {
        try {
            // Check for namespace in various request locations
            const namespace = req.tenantContext?.namespace ||
                req.headers['x-namespace'] ||
                req.query.namespace ||
                req.body?.namespace;
            enterpriseGuards_1.EnterpriseGuards.validateNamespace(namespace, operation);
            next();
        }
        catch (error) {
            if (error instanceof enterpriseGuards_1.NamespaceNotSupportedError) {
                const capabilities = enterpriseGuards_1.EnterpriseGuards.getCapabilities();
                const errorResponse = (0, errorResponse_1.createNamespaceErrorResponse)(operation, error.namespace, getCapabilitySubset(capabilities));
                res.status(400).json(errorResponse);
            }
            else {
                // Unexpected error, pass to error handler
                next(error);
            }
        }
    };
};
exports.validateNamespaceParam = validateNamespaceParam;
/**
 * Middleware to ensure Enterprise capabilities have been detected
 * @param operation - Name of the operation requiring capability detection
 * @returns Express middleware function
 */
const ensureCapabilitiesDetected = (operation) => {
    return async (req, res, next) => {
        try {
            if (!enterpriseGuards_1.EnterpriseGuards.isCapabilityDetectionComplete()) {
                // Initialize capability detection if not yet done
                const { adaptiveTenantFactory } = await Promise.resolve().then(() => __importStar(require('../services/adaptiveTenantFactory')));
                await adaptiveTenantFactory.initialize();
            }
            if (!enterpriseGuards_1.EnterpriseGuards.isCapabilityDetectionComplete()) {
                res.status(500).json({
                    error: 'CAPABILITY_DETECTION_FAILED',
                    message: `Could not detect Dgraph capabilities for operation: ${operation}`,
                    details: enterpriseGuards_1.EnterpriseGuards.getCapabilityDetectionError() || 'Unknown detection error'
                });
                return;
            }
            next();
        }
        catch (error) {
            res.status(500).json({
                error: 'CAPABILITY_DETECTION_ERROR',
                message: `Error during capability detection for operation: ${operation}`,
                details: error.message
            });
        }
    };
};
exports.ensureCapabilitiesDetected = ensureCapabilitiesDetected;
/**
 * Middleware to add capability information to response headers
 * @returns Express middleware function
 */
const addCapabilityHeaders = () => {
    return (req, res, next) => {
        try {
            const summary = enterpriseGuards_1.EnterpriseGuards.getCapabilitySummary();
            // Add capability headers for client awareness
            res.setHeader('X-Dgraph-Enterprise', summary.enterpriseDetected.toString());
            res.setHeader('X-Dgraph-Namespaces', summary.namespacesSupported.toString());
            res.setHeader('X-Dgraph-Mode', summary.mode);
            next();
        }
        catch (error) {
            // Don't fail the request if capability headers can't be set
            console.warn('[ENTERPRISE_MIDDLEWARE] Failed to set capability headers:', error);
            next();
        }
    };
};
exports.addCapabilityHeaders = addCapabilityHeaders;
/**
 * Middleware to log Enterprise feature usage for monitoring
 * @param operation - Name of the operation being logged
 * @returns Express middleware function
 */
const logEnterpriseFeatureUsage = (operation) => {
    return (req, res, next) => {
        const summary = enterpriseGuards_1.EnterpriseGuards.getCapabilitySummary();
        const tenantId = req.tenantContext?.tenantId || 'default';
        const namespace = req.tenantContext?.namespace || 'default';
        console.log(`[ENTERPRISE_USAGE] Operation: ${operation}, Tenant: ${tenantId}, Namespace: ${namespace}, Mode: ${summary.mode}`);
        next();
    };
};
exports.logEnterpriseFeatureUsage = logEnterpriseFeatureUsage;
/**
 * Composite middleware for complete Enterprise feature protection
 * Combines capability detection, validation, and logging
 * @param operation - Name of the operation requiring protection
 * @param options - Configuration options for the middleware
 * @returns Array of Express middleware functions
 */
const protectEnterpriseFeature = (operation, options = {}) => {
    const middlewares = [];
    // Always ensure capabilities are detected first
    middlewares.push((0, exports.ensureCapabilitiesDetected)(operation));
    // Add specific validations based on options
    if (options.requireEnterprise) {
        middlewares.push((0, exports.requireEnterprise)(operation));
    }
    if (options.requireNamespace) {
        middlewares.push((0, exports.requireNamespaceSupport)(operation));
    }
    if (options.validateTenant) {
        middlewares.push((0, exports.validateTenantCapabilities)(operation));
    }
    // Add optional features
    if (options.addHeaders) {
        middlewares.push((0, exports.addCapabilityHeaders)());
    }
    if (options.logUsage) {
        middlewares.push((0, exports.logEnterpriseFeatureUsage)(operation));
    }
    return middlewares;
};
exports.protectEnterpriseFeature = protectEnterpriseFeature;
/**
 * Convenience middleware combinations for common use cases
 */
/**
 * Middleware for tenant management operations (create, delete, etc.)
 */
const protectTenantManagement = (operation) => (0, exports.protectEnterpriseFeature)(operation, {
    requireEnterprise: true,
    requireNamespace: true,
    validateTenant: true,
    logUsage: true
});
exports.protectTenantManagement = protectTenantManagement;
/**
 * Middleware for namespace-aware operations (queries, mutations)
 */
const protectNamespaceOperation = (operation) => (0, exports.protectEnterpriseFeature)(operation, {
    validateTenant: true,
    addHeaders: true
});
exports.protectNamespaceOperation = protectNamespaceOperation;
/**
 * Middleware for admin operations requiring Enterprise features
 */
const protectEnterpriseAdmin = (operation) => (0, exports.protectEnterpriseFeature)(operation, {
    requireEnterprise: true,
    addHeaders: true,
    logUsage: true
});
exports.protectEnterpriseAdmin = protectEnterpriseAdmin;
