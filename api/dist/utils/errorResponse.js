"use strict";
/**
 * Standardized error response utility for consistent API error formatting
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FallbackBehavior = exports.MultiTenantNotSupportedError = exports.NamespaceNotSupportedError = exports.EnterpriseFeatureNotAvailableError = exports.errorStatusMap = exports.ErrorType = void 0;
exports.createErrorResponse = createErrorResponse;
exports.createErrorResponseFromError = createErrorResponseFromError;
exports.validationError = validationError;
exports.sendErrorResponse = sendErrorResponse;
exports.createEnterpriseErrorResponse = createEnterpriseErrorResponse;
exports.createNamespaceErrorResponse = createNamespaceErrorResponse;
exports.createMultiTenantErrorResponse = createMultiTenantErrorResponse;
exports.getFallbackBehavior = getFallbackBehavior;
/**
 * Error types for consistent API responses
 */
var ErrorType;
(function (ErrorType) {
    ErrorType["VALIDATION"] = "VALIDATION_ERROR";
    ErrorType["NOT_FOUND"] = "NOT_FOUND";
    ErrorType["CONFLICT"] = "CONFLICT";
    ErrorType["UNAUTHORIZED"] = "UNAUTHORIZED";
    ErrorType["SERVER_ERROR"] = "SERVER_ERROR";
    ErrorType["ENTERPRISE_FEATURE_NOT_AVAILABLE"] = "ENTERPRISE_FEATURE_NOT_AVAILABLE";
    ErrorType["NAMESPACE_NOT_SUPPORTED"] = "NAMESPACE_NOT_SUPPORTED";
    ErrorType["MULTI_TENANT_NOT_AVAILABLE"] = "MULTI_TENANT_NOT_AVAILABLE";
})(ErrorType || (exports.ErrorType = ErrorType = {}));
/**
 * HTTP status code mapping for error types
 */
exports.errorStatusMap = {
    [ErrorType.VALIDATION]: 400,
    [ErrorType.NOT_FOUND]: 404,
    [ErrorType.CONFLICT]: 409,
    [ErrorType.UNAUTHORIZED]: 401,
    [ErrorType.SERVER_ERROR]: 500,
    [ErrorType.ENTERPRISE_FEATURE_NOT_AVAILABLE]: 400,
    [ErrorType.NAMESPACE_NOT_SUPPORTED]: 400,
    [ErrorType.MULTI_TENANT_NOT_AVAILABLE]: 400
};
/**
 * Creates a standardized error response object
 * @param message - The main error message
 * @param details - Optional detailed error information
 * @param includeTimestamp - Whether to include a timestamp (default: false)
 */
function createErrorResponse(message, details, includeTimestamp = false) {
    const response = {
        error: message
    };
    if (details) {
        response.details = details;
    }
    if (includeTimestamp) {
        response.timestamp = new Date().toISOString();
    }
    return response;
}
/**
 * Creates a standardized error response from an Error object
 * @param message - The main error message
 * @param error - The Error object to extract details from
 * @param includeTimestamp - Whether to include a timestamp (default: false)
 */
function createErrorResponseFromError(message, error, includeTimestamp = false) {
    return createErrorResponse(message, error.message, includeTimestamp);
}
/**
 * Creates a validation error response
 * @param message - The validation error message
 * @param field - Optional field name that failed validation
 */
function validationError(message, field) {
    return {
        error: ErrorType.VALIDATION,
        message,
        ...(field && { field })
    };
}
/**
 * Sends a standardized error response
 * @param res - Express response object
 * @param type - Error type
 * @param message - Error message
 * @param details - Optional error details
 */
function sendErrorResponse(res, type, message, details) {
    const status = exports.errorStatusMap[type];
    const response = {
        error: type,
        message,
        ...(details && { details })
    };
    res.status(status).json(response);
}
/**
 * Base class for Enterprise feature errors
 */
class EnterpriseFeatureNotAvailableError extends Error {
    constructor(feature, context = {}) {
        const message = `${feature} requires Dgraph Enterprise with valid license`;
        super(message);
        this.name = 'EnterpriseFeatureNotAvailableError';
        this.context = {
            operation: context.operation || feature,
            currentMode: context.currentMode || 'oss-single-tenant',
            requiredMode: context.requiredMode || 'enterprise-multi-tenant',
            suggestion: context.suggestion || 'Please upgrade to Dgraph Enterprise',
            upgradeInfo: context.upgradeInfo || 'https://dgraph.io/enterprise',
            ...context
        };
    }
}
exports.EnterpriseFeatureNotAvailableError = EnterpriseFeatureNotAvailableError;
/**
 * Specialized error for namespace operations
 */
class NamespaceNotSupportedError extends EnterpriseFeatureNotAvailableError {
    constructor(operation, namespace, suggestion) {
        super(`Namespace operations (${operation} in namespace '${namespace}')`, {
            operation,
            namespace,
            suggestion: suggestion || 'Upgrade to Dgraph Enterprise or use default namespace'
        });
        this.name = 'NamespaceNotSupportedError';
    }
}
exports.NamespaceNotSupportedError = NamespaceNotSupportedError;
/**
 * Specialized error for multi-tenant operations
 */
class MultiTenantNotSupportedError extends EnterpriseFeatureNotAvailableError {
    constructor(operation, suggestion) {
        super(`Multi-tenant operations (${operation})`, {
            operation,
            suggestion: suggestion || 'Multi-tenant support requires Dgraph Enterprise with namespace isolation'
        });
        this.name = 'MultiTenantNotSupportedError';
    }
}
exports.MultiTenantNotSupportedError = MultiTenantNotSupportedError;
/**
 * Enterprise Error Response Builders
 */
/**
 * Creates a standardized Enterprise feature error response
 */
function createEnterpriseErrorResponse(feature, operation, capabilities) {
    const currentMode = capabilities?.namespacesSupported
        ? 'enterprise-multi-tenant'
        : capabilities?.enterpriseDetected
            ? 'enterprise-single-tenant'
            : 'oss-single-tenant';
    return {
        error: ErrorType.ENTERPRISE_FEATURE_NOT_AVAILABLE,
        message: `${feature} requires Dgraph Enterprise with valid license`,
        details: {
            operation,
            currentMode,
            requiredMode: 'enterprise-multi-tenant',
            suggestion: 'Upgrade to Dgraph Enterprise or use default namespace',
            upgradeInfo: 'https://dgraph.io/enterprise'
        }
    };
}
/**
 * Creates a standardized namespace error response
 */
function createNamespaceErrorResponse(operation, namespace, capabilities) {
    const currentMode = capabilities?.namespacesSupported
        ? 'enterprise-multi-tenant'
        : capabilities?.enterpriseDetected
            ? 'enterprise-single-tenant'
            : 'oss-single-tenant';
    return {
        error: ErrorType.NAMESPACE_NOT_SUPPORTED,
        message: `Namespace operations (${operation} in namespace '${namespace}') require Dgraph Enterprise with valid license`,
        details: {
            operation,
            namespace,
            currentMode,
            requiredMode: 'enterprise-multi-tenant',
            suggestion: 'Upgrade to Dgraph Enterprise or use default namespace',
            upgradeInfo: 'https://dgraph.io/enterprise'
        }
    };
}
/**
 * Creates a standardized multi-tenant error response
 */
function createMultiTenantErrorResponse(operation, capabilities) {
    const currentMode = capabilities?.namespacesSupported
        ? 'enterprise-multi-tenant'
        : capabilities?.enterpriseDetected
            ? 'enterprise-single-tenant'
            : 'oss-single-tenant';
    return {
        error: ErrorType.MULTI_TENANT_NOT_AVAILABLE,
        message: `Multi-tenant operations (${operation}) require Dgraph Enterprise with valid license`,
        details: {
            operation,
            currentMode,
            requiredMode: 'enterprise-multi-tenant',
            suggestion: 'Multi-tenant support requires Dgraph Enterprise with namespace isolation',
            upgradeInfo: 'https://dgraph.io/enterprise'
        }
    };
}
/**
 * Fallback Behavior Constants
 * Defines consistent patterns for handling Enterprise feature unavailability
 */
var FallbackBehavior;
(function (FallbackBehavior) {
    FallbackBehavior["FAIL_HARD"] = "FAIL_HARD";
    FallbackBehavior["DEGRADE_GRACEFULLY"] = "DEGRADE_GRACEFULLY";
    FallbackBehavior["FAIL_WITH_CONTEXT"] = "FAIL_WITH_CONTEXT"; // Provide detailed error context (admin operations)
})(FallbackBehavior || (exports.FallbackBehavior = FallbackBehavior = {}));
/**
 * Determines appropriate fallback behavior for an operation type
 */
function getFallbackBehavior(operationType) {
    switch (operationType) {
        case 'CREATE':
            return FallbackBehavior.FAIL_HARD;
        case 'READ':
            return FallbackBehavior.DEGRADE_GRACEFULLY;
        case 'ADMIN':
            return FallbackBehavior.FAIL_WITH_CONTEXT;
        default:
            return FallbackBehavior.FAIL_WITH_CONTEXT;
    }
}
