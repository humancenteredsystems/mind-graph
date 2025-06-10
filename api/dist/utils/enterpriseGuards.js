"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDeploymentMode = exports.getCapabilitySummary = exports.validateTenantContext = exports.validateNamespace = exports.isNamespaceSupported = exports.isEnterpriseAvailable = exports.requireNamespaceSupport = exports.requireEnterprise = exports.EnterpriseGuards = exports.NamespaceNotSupportedError = exports.EnterpriseFeatureNotAvailableError = void 0;
const adaptiveTenantFactory_1 = require("../services/adaptiveTenantFactory");
/**
 * Specialized error classes for Enterprise feature requirements
 */
class EnterpriseFeatureNotAvailableError extends Error {
    constructor(operation, context) {
        const currentMode = context?.currentMode || 'unknown';
        const suggestion = context?.suggestion || 'Please ensure you are running Dgraph Enterprise with a valid license';
        super(`Enterprise feature not available: ${operation}. Current mode: ${currentMode}. ${suggestion}`);
        this.name = 'EnterpriseFeatureNotAvailableError';
        this.operation = context?.operation || operation;
        this.currentMode = currentMode;
        this.suggestion = suggestion;
    }
}
exports.EnterpriseFeatureNotAvailableError = EnterpriseFeatureNotAvailableError;
class NamespaceNotSupportedError extends Error {
    constructor(operation, namespace, suggestion) {
        const ns = namespace || 'unknown';
        const defaultSuggestion = 'Upgrade to Dgraph Enterprise with namespace support';
        const sug = suggestion || defaultSuggestion;
        super(`Namespace operation not supported: ${operation} (namespace: ${ns}). ${sug}`);
        this.name = 'NamespaceNotSupportedError';
        this.operation = operation;
        this.namespace = ns;
        this.suggestion = sug;
    }
}
exports.NamespaceNotSupportedError = NamespaceNotSupportedError;
/**
 * EnterpriseGuards - Centralized Enterprise capability validation utilities
 *
 * This class provides consistent, reusable methods for validating Enterprise
 * feature availability and throwing appropriate errors when features are unavailable.
 */
class EnterpriseGuards {
    /**
     * Require Enterprise features for operation (throws on failure)
     * @param operation - Name of the operation requiring Enterprise features
     * @throws {EnterpriseFeatureNotAvailableError} When Enterprise features unavailable
     */
    static requireEnterprise(operation) {
        const capabilities = adaptiveTenantFactory_1.adaptiveTenantFactory.getCapabilities();
        if (!capabilities?.enterpriseDetected) {
            const currentMode = capabilities?.namespacesSupported
                ? 'enterprise-single-tenant'
                : 'oss-single-tenant';
            throw new EnterpriseFeatureNotAvailableError(operation, {
                operation,
                currentMode,
                suggestion: 'Please ensure you are running Dgraph Enterprise with a valid license'
            });
        }
    }
    /**
     * Require namespace support for operation (throws on failure)
     * @param operation - Name of the operation requiring namespace support
     * @param namespace - Optional namespace being accessed
     * @throws {NamespaceNotSupportedError} When namespace operations unavailable
     */
    static requireNamespaceSupport(operation, namespace) {
        const capabilities = adaptiveTenantFactory_1.adaptiveTenantFactory.getCapabilities();
        if (!capabilities?.namespacesSupported) {
            const suggestion = capabilities?.enterpriseDetected
                ? 'Check namespace isolation configuration - Enterprise detected but namespace operations not functional'
                : 'Upgrade to Dgraph Enterprise with namespace support';
            throw new NamespaceNotSupportedError(operation, namespace, suggestion);
        }
    }
    /**
     * Check if Enterprise features are available (non-throwing)
     * @returns True if Enterprise features are detected and functional
     */
    static isEnterpriseAvailable() {
        const capabilities = adaptiveTenantFactory_1.adaptiveTenantFactory.getCapabilities();
        return capabilities?.enterpriseDetected || false;
    }
    /**
     * Check if namespace operations are supported (non-throwing)
     * @returns True if namespace isolation is available
     */
    static isNamespaceSupported() {
        const capabilities = adaptiveTenantFactory_1.adaptiveTenantFactory.getCapabilities();
        return capabilities?.namespacesSupported || false;
    }
    /**
     * Get comprehensive Enterprise capability summary
     * @returns Object with capability details and deployment mode
     */
    static getCapabilitySummary() {
        const capabilities = adaptiveTenantFactory_1.adaptiveTenantFactory.getCapabilities();
        return {
            enterpriseDetected: capabilities?.enterpriseDetected || false,
            namespacesSupported: capabilities?.namespacesSupported || false,
            licenseType: capabilities?.licenseType || 'unknown',
            mode: EnterpriseGuards.getDeploymentMode(),
            detectedAt: capabilities?.detectedAt?.toISOString() || new Date().toISOString(),
            error: capabilities?.error
        };
    }
    /**
     * Get deployment mode string for logging and responses
     * @returns Descriptive string indicating current deployment mode
     */
    static getDeploymentMode() {
        if (EnterpriseGuards.isNamespaceSupported()) {
            return 'enterprise-multi-tenant';
        }
        else if (EnterpriseGuards.isEnterpriseAvailable()) {
            return 'enterprise-single-tenant';
        }
        else {
            return 'oss-single-tenant';
        }
    }
    /**
     * Validate namespace parameter for operations
     * @param namespace - Namespace string to validate
     * @param operation - Operation name for error context
     * @throws {NamespaceNotSupportedError} When namespace specified but not supported
     */
    static validateNamespace(namespace, operation) {
        // Only validate if namespace is specified and not the default
        if (namespace && namespace !== '0x0') {
            EnterpriseGuards.requireNamespaceSupport(operation, namespace);
        }
    }
    /**
     * Validate tenant context for multi-tenant operations
     * @param tenantId - Tenant identifier
     * @param namespace - Namespace for the tenant
     * @param operation - Operation name for error context
     * @throws {NamespaceNotSupportedError} When multi-tenant operation attempted without support
     */
    static validateTenantContext(tenantId, namespace, operation) {
        // If this is a non-default tenant, require namespace support
        if (tenantId !== 'default' && tenantId !== '0x0') {
            EnterpriseGuards.requireNamespaceSupport(operation, namespace || tenantId);
        }
        // Validate namespace parameter
        EnterpriseGuards.validateNamespace(namespace, operation);
    }
    /**
     * Get current capabilities (convenience method)
     * @returns Current capabilities or null if not yet detected
     */
    static getCapabilities() {
        return adaptiveTenantFactory_1.adaptiveTenantFactory.getCapabilities();
    }
    /**
     * Check if capability detection has completed
     * @returns True if capabilities have been detected (successfully or with errors)
     */
    static isCapabilityDetectionComplete() {
        const capabilities = EnterpriseGuards.getCapabilities();
        return capabilities !== null;
    }
    /**
     * Get capability detection error if any
     * @returns Error message if detection failed, undefined otherwise
     */
    static getCapabilityDetectionError() {
        const capabilities = EnterpriseGuards.getCapabilities();
        return capabilities?.error;
    }
}
exports.EnterpriseGuards = EnterpriseGuards;
/**
 * Convenience functions that mirror the class methods for easier importing
 */
exports.requireEnterprise = EnterpriseGuards.requireEnterprise.bind(EnterpriseGuards);
exports.requireNamespaceSupport = EnterpriseGuards.requireNamespaceSupport.bind(EnterpriseGuards);
exports.isEnterpriseAvailable = EnterpriseGuards.isEnterpriseAvailable.bind(EnterpriseGuards);
exports.isNamespaceSupported = EnterpriseGuards.isNamespaceSupported.bind(EnterpriseGuards);
exports.validateNamespace = EnterpriseGuards.validateNamespace.bind(EnterpriseGuards);
exports.validateTenantContext = EnterpriseGuards.validateTenantContext.bind(EnterpriseGuards);
exports.getCapabilitySummary = EnterpriseGuards.getCapabilitySummary.bind(EnterpriseGuards);
exports.getDeploymentMode = EnterpriseGuards.getDeploymentMode.bind(EnterpriseGuards);
/**
 * Default export for convenience
 */
exports.default = EnterpriseGuards;
