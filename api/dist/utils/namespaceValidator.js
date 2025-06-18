"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.namespaceValidators = void 0;
exports.bypassNamespaceValidation = bypassNamespaceValidation;
exports.withNamespaceValidation = withNamespaceValidation;
exports.withNamespaceValidationAt = withNamespaceValidationAt;
exports.withNamespaceValidationConstructor = withNamespaceValidationConstructor;
exports.validateNamespaceUrl = validateNamespaceUrl;
exports.validateNamespaceParam = validateNamespaceParam;
const capabilityHelpers_1 = require("./capabilityHelpers");
// Internal flag to bypass validation for capability detection
let bypassValidation = false;
/**
 * Temporarily bypass namespace validation (for capability detection)
 */
function bypassNamespaceValidation(bypass) {
    bypassValidation = bypass;
}
/**
 * Centralized namespace validation for all namespace-aware operations
 *
 * This wrapper provides a single point of validation for operations that
 * accept namespace parameters, ensuring developers get clear feedback
 * when attempting to use Enterprise features on OSS installations.
 */
/**
 * Extract namespace parameter from function arguments
 * Supports common namespace parameter patterns in our codebase
 */
function extractNamespaceFromArgs(args) {
    // Check each argument for namespace patterns
    for (const arg of args) {
        // Direct string namespace (including '0x1', '0x2', etc. or empty strings for validation)
        if (typeof arg === 'string' && (arg.startsWith('0x') || arg === '')) {
            return arg;
        }
        // Object with namespace property
        if (arg && typeof arg === 'object' && 'namespace' in arg) {
            return arg.namespace;
        }
    }
    return null;
}
/**
 * Wrapper that adds namespace validation to any function
 * @param fn - The function to wrap
 * @param operationName - Name of the operation for error messages
 * @returns Wrapped function with namespace validation
 */
function withNamespaceValidation(fn, operationName) {
    return ((...args) => {
        if (bypassValidation)
            return fn(...args);
        // Check each argument to see if it's a namespace
        for (const arg of args) {
            // Direct string namespace (including '0x1', '0x2', etc. or empty strings for validation)
            if (typeof arg === 'string' && (arg.startsWith('0x') || arg === '')) {
                // Allow operations on default namespace (0x0) in OSS mode
                if (arg === '0x0' || arg === 'default') {
                    console.log(`[NAMESPACE_VALIDATOR] Allowing ${operationName} on default namespace ${arg} (OSS compatible)`);
                    continue;
                }
                (0, capabilityHelpers_1.requiresMultiTenant)(operationName);
                break;
            }
            // Object with namespace property
            if (arg && typeof arg === 'object' && 'namespace' in arg && arg.namespace) {
                // Allow operations on default namespace (0x0) in OSS mode
                if (arg.namespace === '0x0' || arg.namespace === 'default') {
                    console.log(`[NAMESPACE_VALIDATOR] Allowing ${operationName} on default namespace ${arg.namespace} (OSS compatible)`);
                    continue;
                }
                (0, capabilityHelpers_1.requiresMultiTenant)(operationName);
                break;
            }
        }
        return fn(...args);
    });
}
/**
 * Validate namespace for specific parameter positions
 * @param fn - The function to wrap
 * @param operationName - Name of the operation for error messages
 * @param namespaceParamIndex - Index of the namespace parameter
 * @returns Wrapped function with namespace validation
 */
function withNamespaceValidationAt(fn, operationName, namespaceParamIndex) {
    return ((...args) => {
        if (bypassValidation)
            return fn(...args);
        const namespace = args[namespaceParamIndex];
        // Only validate if a namespace is actually provided (including empty strings)
        if (namespace !== null && namespace !== undefined) {
            // Allow operations on default namespace (0x0) in OSS mode
            // This enables core tenant operations without requiring Enterprise
            if (namespace === '0x0' || namespace === 'default') {
                console.log(`[NAMESPACE_VALIDATOR] Allowing ${operationName} on default namespace ${namespace} (OSS compatible)`);
                return fn(...args);
            }
            // For non-default namespaces, require multi-tenant support
            (0, capabilityHelpers_1.requiresMultiTenant)(operationName);
        }
        return fn(...args);
    });
}
/**
 * Validate namespace for constructor functions
 * @param ConstructorFn - The constructor to wrap
 * @param operationName - Name of the operation for error messages
 * @param namespaceParamIndex - Index of the namespace parameter (default: 0)
 * @returns Wrapped constructor with namespace validation
 */
function withNamespaceValidationConstructor(ConstructorFn, operationName, namespaceParamIndex = 0) {
    return class extends ConstructorFn {
        constructor(...args) {
            if (!bypassValidation) {
                const namespace = args[namespaceParamIndex];
                // Only validate if a namespace is actually provided (including empty strings)
                if (namespace !== null && namespace !== undefined) {
                    // Allow operations on default namespace (0x0) in OSS mode
                    if (namespace === '0x0' || namespace === 'default') {
                        console.log(`[NAMESPACE_VALIDATOR] Allowing ${operationName} on default namespace ${namespace} (OSS compatible)`);
                    }
                    else {
                        (0, capabilityHelpers_1.requiresMultiTenant)(operationName);
                    }
                }
            }
            super(...args);
        }
    };
}
/**
 * Pre-configured validation functions for common patterns
 */
exports.namespaceValidators = {
    /**
     * For functions where namespace is the 3rd parameter (index 2)
     * Common pattern: (query, variables, namespace)
     */
    withNamespaceAsThirdParam: (fn, operationName) => withNamespaceValidationAt(fn, operationName, 2),
    /**
     * For functions where namespace is the 2nd parameter (index 1)
     * Common pattern: (schema, namespace)
     */
    withNamespaceAsSecondParam: (fn, operationName) => withNamespaceValidationAt(fn, operationName, 1),
    /**
     * For constructors where namespace is the first parameter (index 0)
     * Common pattern: new Class(namespace)
     */
    withNamespaceAsFirstParam: (ConstructorFn, operationName) => withNamespaceValidationConstructor(ConstructorFn, operationName, 0)
};
/**
 * Validate namespace parameter in URLs before making direct HTTP calls
 * @param url - The URL that may contain namespace parameter
 * @param operationName - Name of the operation for error messages
 */
function validateNamespaceUrl(url, operationName) {
    if (bypassValidation)
        return;
    // Check if URL contains namespace parameter
    if (url.includes('namespace=') || url.includes('?namespace') || url.includes('&namespace')) {
        // Allow default namespace operations in OSS mode
        if (url.includes('namespace=0x0') || url.includes('namespace=default')) {
            console.log(`[NAMESPACE_VALIDATOR] Allowing ${operationName} URL with default namespace (OSS compatible)`);
            return;
        }
        (0, capabilityHelpers_1.requiresMultiTenant)(operationName);
    }
}
/**
 * Validate namespace parameter before constructing URLs
 * @param namespace - The namespace value that will be used in URL
 * @param operationName - Name of the operation for error messages
 */
function validateNamespaceParam(namespace, operationName) {
    if (bypassValidation)
        return;
    if (namespace !== null && namespace !== undefined) {
        // Allow operations on default namespace (0x0) in OSS mode
        if (namespace === '0x0' || namespace === 'default') {
            console.log(`[NAMESPACE_VALIDATOR] Allowing ${operationName} with default namespace ${namespace} (OSS compatible)`);
            return;
        }
        (0, capabilityHelpers_1.requiresMultiTenant)(operationName);
    }
}
exports.default = {
    withNamespaceValidation,
    withNamespaceValidationAt,
    withNamespaceValidationConstructor,
    namespaceValidators: exports.namespaceValidators,
    validateNamespaceUrl,
    validateNamespaceParam,
    bypassNamespaceValidation
};
