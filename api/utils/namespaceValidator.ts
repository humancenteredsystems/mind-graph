import { requiresMultiTenant } from './capabilityHelpers';

// Internal flag to bypass validation for capability detection
let bypassValidation = false;

/**
 * Temporarily bypass namespace validation (for capability detection)
 */
export function bypassNamespaceValidation(bypass: boolean): void {
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
function extractNamespaceFromArgs(args: any[]): string | null {
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
export function withNamespaceValidation<T extends (...args: any[]) => any>(
  fn: T,
  operationName: string
): T {
  return ((...args: Parameters<T>) => {
    if (bypassValidation) return fn(...args);
    
    // Check each argument to see if it's a namespace
    for (const arg of args) {
      // Direct string namespace (including '0x1', '0x2', etc. or empty strings for validation)
      if (typeof arg === 'string' && (arg.startsWith('0x') || arg === '')) {
        // Allow operations on default namespace (0x0) in OSS mode
        if (arg === '0x0' || arg === 'default') {
          console.log(`[NAMESPACE_VALIDATOR] Allowing ${operationName} on default namespace ${arg} (OSS compatible)`);
          continue;
        }
        requiresMultiTenant(operationName);
        break;
      }
      // Object with namespace property
      if (arg && typeof arg === 'object' && 'namespace' in arg && arg.namespace) {
        // Allow operations on default namespace (0x0) in OSS mode
        if (arg.namespace === '0x0' || arg.namespace === 'default') {
          console.log(`[NAMESPACE_VALIDATOR] Allowing ${operationName} on default namespace ${arg.namespace} (OSS compatible)`);
          continue;
        }
        requiresMultiTenant(operationName);
        break;
      }
    }
    
    return fn(...args);
  }) as T;
}

/**
 * Validate namespace for specific parameter positions
 * @param fn - The function to wrap
 * @param operationName - Name of the operation for error messages
 * @param namespaceParamIndex - Index of the namespace parameter
 * @returns Wrapped function with namespace validation
 */
export function withNamespaceValidationAt<T extends (...args: any[]) => any>(
  fn: T,
  operationName: string,
  namespaceParamIndex: number
): T {
  return ((...args: Parameters<T>) => {
    if (bypassValidation) return fn(...args);
    
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
      requiresMultiTenant(operationName);
    }
    
    return fn(...args);
  }) as T;
}

/**
 * Validate namespace for constructor functions
 * @param ConstructorFn - The constructor to wrap
 * @param operationName - Name of the operation for error messages
 * @param namespaceParamIndex - Index of the namespace parameter (default: 0)
 * @returns Wrapped constructor with namespace validation
 */
export function withNamespaceValidationConstructor<T extends new (...args: any[]) => any>(
  ConstructorFn: T,
  operationName: string,
  namespaceParamIndex: number = 0
): T {
  return class extends ConstructorFn {
    constructor(...args: any[]) {
      if (!bypassValidation) {
        const namespace = args[namespaceParamIndex];
        
        // Only validate if a namespace is actually provided (including empty strings)
        if (namespace !== null && namespace !== undefined) {
          // Allow operations on default namespace (0x0) in OSS mode
          if (namespace === '0x0' || namespace === 'default') {
            console.log(`[NAMESPACE_VALIDATOR] Allowing ${operationName} on default namespace ${namespace} (OSS compatible)`);
          } else {
            requiresMultiTenant(operationName);
          }
        }
      }
      
      super(...args);
    }
  } as T;
}

/**
 * Pre-configured validation functions for common patterns
 */
export const namespaceValidators = {
  /**
   * For functions where namespace is the 3rd parameter (index 2)
   * Common pattern: (query, variables, namespace)
   */
  withNamespaceAsThirdParam: <T extends (...args: any[]) => any>(fn: T, operationName: string) =>
    withNamespaceValidationAt(fn, operationName, 2),
    
  /**
   * For functions where namespace is the 2nd parameter (index 1)  
   * Common pattern: (schema, namespace)
   */
  withNamespaceAsSecondParam: <T extends (...args: any[]) => any>(fn: T, operationName: string) =>
    withNamespaceValidationAt(fn, operationName, 1),
    
  /**
   * For constructors where namespace is the first parameter (index 0)
   * Common pattern: new Class(namespace)
   */
  withNamespaceAsFirstParam: <T extends new (...args: any[]) => any>(ConstructorFn: T, operationName: string) =>
    withNamespaceValidationConstructor(ConstructorFn, operationName, 0)
};

/**
 * Validate namespace parameter in URLs before making direct HTTP calls
 * @param url - The URL that may contain namespace parameter
 * @param operationName - Name of the operation for error messages
 */
export function validateNamespaceUrl(url: string, operationName: string): void {
  if (bypassValidation) return;
  
  // Check if URL contains namespace parameter
  if (url.includes('namespace=') || url.includes('?namespace') || url.includes('&namespace')) {
    // Allow default namespace operations in OSS mode
    if (url.includes('namespace=0x0') || url.includes('namespace=default')) {
      console.log(`[NAMESPACE_VALIDATOR] Allowing ${operationName} URL with default namespace (OSS compatible)`);
      return;
    }
    requiresMultiTenant(operationName);
  }
}

/**
 * Validate namespace parameter before constructing URLs
 * @param namespace - The namespace value that will be used in URL
 * @param operationName - Name of the operation for error messages
 */
export function validateNamespaceParam(namespace: string | null | undefined, operationName: string): void {
  if (bypassValidation) return;
  
  if (namespace !== null && namespace !== undefined) {
    // Allow operations on default namespace (0x0) in OSS mode
    if (namespace === '0x0' || namespace === 'default') {
      console.log(`[NAMESPACE_VALIDATOR] Allowing ${operationName} with default namespace ${namespace} (OSS compatible)`);
      return;
    }
    requiresMultiTenant(operationName);
  }
}

export default {
  withNamespaceValidation,
  withNamespaceValidationAt,
  withNamespaceValidationConstructor,
  namespaceValidators,
  validateNamespaceUrl,
  validateNamespaceParam,
  bypassNamespaceValidation
};
