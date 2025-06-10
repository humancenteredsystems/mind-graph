"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.capabilityHelpers = void 0;
exports.isEnterpriseAvailable = isEnterpriseAvailable;
exports.isMultiTenantSupported = isMultiTenantSupported;
exports.getCapabilitiesSync = getCapabilitiesSync;
exports.requiresEnterprise = requiresEnterprise;
exports.requiresMultiTenant = requiresMultiTenant;
exports.getDeploymentMode = getDeploymentMode;
exports.isCapabilityDetectionComplete = isCapabilityDetectionComplete;
exports.getCapabilityDetectionError = getCapabilityDetectionError;
exports.ensureCapabilitiesDetected = ensureCapabilitiesDetected;
const adaptiveTenantFactory_1 = require("../services/adaptiveTenantFactory");
/**
 * Standardized capability checking utilities
 *
 * This module provides a consistent interface for checking Dgraph Enterprise
 * capabilities across the application. All production code should use these
 * utilities instead of directly calling capability detectors.
 *
 * Standard Pattern:
 * - Use adaptiveTenantFactory as the single source of truth
 * - Provide synchronous access to cached capabilities
 * - Offer convenience methods for common checks
 * - Throw descriptive errors for unsupported operations
 */
/**
 * Check if Dgraph Enterprise features are currently available and active
 * @returns True if Enterprise features are detected and functional
 */
function isEnterpriseAvailable() {
    const capabilities = adaptiveTenantFactory_1.adaptiveTenantFactory.getCapabilities();
    return capabilities?.enterpriseDetected || false;
}
/**
 * Check if multi-tenant namespace operations are supported
 * @returns True if namespace isolation is available
 */
function isMultiTenantSupported() {
    const capabilities = adaptiveTenantFactory_1.adaptiveTenantFactory.getCapabilities();
    return capabilities?.namespacesSupported || false;
}
/**
 * Get current capabilities synchronously (from cache)
 * @returns Current capabilities or null if not yet detected
 */
function getCapabilitiesSync() {
    return adaptiveTenantFactory_1.adaptiveTenantFactory.getCapabilities();
}
/**
 * Require Enterprise features for an operation
 * Throws descriptive error if Enterprise features are not available
 * @param operation - Name of the operation requiring Enterprise features
 */
function requiresEnterprise(operation) {
    if (!isEnterpriseAvailable()) {
        const capabilities = getCapabilitiesSync();
        const { EnterpriseFeatureNotAvailableError } = require('./errorResponse');
        throw new EnterpriseFeatureNotAvailableError(`Enterprise features (${operation})`, {
            operation,
            currentMode: capabilities?.enterpriseDetected ? 'enterprise-single-tenant' : 'oss-single-tenant',
            suggestion: 'Please ensure you are running Dgraph Enterprise with a valid license'
        });
    }
}
/**
 * Require multi-tenant support for an operation
 * Throws descriptive error if namespace isolation is not available
 * @param operation - Name of the operation requiring multi-tenant support
 */
function requiresMultiTenant(operation) {
    if (!isMultiTenantSupported()) {
        const capabilities = getCapabilitiesSync();
        const { MultiTenantNotSupportedError } = require('./errorResponse');
        const suggestion = capabilities?.enterpriseDetected
            ? 'Check namespace isolation configuration - Enterprise detected but namespace operations not functional'
            : 'Upgrade to Dgraph Enterprise with namespace support';
        throw new MultiTenantNotSupportedError(operation, suggestion);
    }
}
/**
 * Get deployment mode string for logging and responses
 * @returns Descriptive string indicating current deployment mode
 */
function getDeploymentMode() {
    if (isMultiTenantSupported()) {
        return 'enterprise-multi-tenant';
    }
    else if (isEnterpriseAvailable()) {
        return 'enterprise-single-tenant';
    }
    else {
        return 'oss-single-tenant';
    }
}
/**
 * Check if capability detection has completed
 * @returns True if capabilities have been detected (successfully or with errors)
 */
function isCapabilityDetectionComplete() {
    const capabilities = getCapabilitiesSync();
    return capabilities !== null;
}
/**
 * Get capability detection error if any
 * @returns Error message if detection failed, undefined otherwise
 */
function getCapabilityDetectionError() {
    const capabilities = getCapabilitiesSync();
    return capabilities?.error;
}
/**
 * Ensure capability detection has completed before proceeding
 * This is useful for routes that need to wait for async detection
 * @returns Promise that resolves when capabilities are available
 */
async function ensureCapabilitiesDetected() {
    // Initialize the factory if not already done
    await adaptiveTenantFactory_1.adaptiveTenantFactory.initialize();
    const capabilities = getCapabilitiesSync();
    if (!capabilities) {
        throw new Error('Failed to detect Dgraph capabilities after initialization');
    }
    return capabilities;
}
/**
 * Capability checking utilities object for easy importing
 */
exports.capabilityHelpers = {
    isEnterpriseAvailable,
    isMultiTenantSupported,
    getCapabilitiesSync,
    requiresEnterprise,
    requiresMultiTenant,
    getDeploymentMode,
    isCapabilityDetectionComplete,
    getCapabilityDetectionError,
    ensureCapabilitiesDetected
};
/**
 * Default export for convenience
 */
exports.default = exports.capabilityHelpers;
