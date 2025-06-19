import { adaptiveTenantFactory } from '../services/adaptiveTenantFactory';
import { TenantCapabilities } from '../src/types';

/**
 * Specialized error classes for Enterprise feature requirements
 */
export class EnterpriseFeatureNotAvailableError extends Error {
  public readonly operation: string;
  public readonly currentMode: string;
  public readonly suggestion: string;
  
  constructor(operation: string, context?: {
    operation?: string;
    currentMode?: string;
    suggestion?: string;
  }) {
    const currentMode = context?.currentMode || 'unknown';
    const suggestion = context?.suggestion || 'Please ensure you are running Dgraph Enterprise with a valid license';
    
    super(`Enterprise feature not available: ${operation}. Current mode: ${currentMode}. ${suggestion}`);
    this.name = 'EnterpriseFeatureNotAvailableError';
    this.operation = context?.operation || operation;
    this.currentMode = currentMode;
    this.suggestion = suggestion;
  }
}

export class NamespaceNotSupportedError extends Error {
  public readonly operation: string;
  public readonly namespace: string;
  public readonly suggestion: string;
  
  constructor(operation: string, namespace?: string, suggestion?: string) {
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

/**
 * EnterpriseGuards - Centralized Enterprise capability validation utilities
 * 
 * This class provides consistent, reusable methods for validating Enterprise
 * feature availability and throwing appropriate errors when features are unavailable.
 */
export class EnterpriseGuards {
  /**
   * Require Enterprise features for operation (throws on failure)
   * @param operation - Name of the operation requiring Enterprise features
   * @throws {EnterpriseFeatureNotAvailableError} When Enterprise features unavailable
   */
  static requireEnterprise(operation: string): void {
    const capabilities = adaptiveTenantFactory.getCapabilities();
    
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
  static requireNamespaceSupport(operation: string, namespace?: string): void {
    const capabilities = adaptiveTenantFactory.getCapabilities();
    
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
  static isEnterpriseAvailable(): boolean {
    const capabilities = adaptiveTenantFactory.getCapabilities();
    return capabilities?.enterpriseDetected || false;
  }

  /**
   * Check if namespace operations are supported (non-throwing)
   * @returns True if namespace isolation is available
   */
  static isNamespaceSupported(): boolean {
    const capabilities = adaptiveTenantFactory.getCapabilities();
    return capabilities?.namespacesSupported || false;
  }

  /**
   * Get comprehensive Enterprise capability summary
   * @returns Object with capability details and deployment mode
   */
  static getCapabilitySummary(): {
    enterpriseDetected: boolean;
    namespacesSupported: boolean;
    licenseType: string;
    mode: string;
    detectedAt: string;
    error?: string;
  } {
    const capabilities = adaptiveTenantFactory.getCapabilities();
    
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
  static getDeploymentMode(): string {
    if (EnterpriseGuards.isNamespaceSupported()) {
      return 'enterprise-multi-tenant';
    } else if (EnterpriseGuards.isEnterpriseAvailable()) {
      return 'enterprise-single-tenant';
    } else {
      return 'oss-single-tenant';
    }
  }

  /**
   * Validate namespace parameter for operations
   * @param namespace - Namespace string to validate
   * @param operation - Operation name for error context
   * @throws {NamespaceNotSupportedError} When namespace specified but not supported
   */
  static validateNamespace(namespace: string | null, operation: string): void {
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
  static validateTenantContext(tenantId: string, namespace: string | null, operation: string): void {
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
  static getCapabilities(): TenantCapabilities | null {
    return adaptiveTenantFactory.getCapabilities();
  }

  /**
   * Check if capability detection has completed
   * @returns True if capabilities have been detected (successfully or with errors)
   */
  static isCapabilityDetectionComplete(): boolean {
    const capabilities = EnterpriseGuards.getCapabilities();
    return capabilities !== null;
  }

  /**
   * Get capability detection error if any
   * @returns Error message if detection failed, undefined otherwise
   */
  static getCapabilityDetectionError(): string | undefined {
    const capabilities = EnterpriseGuards.getCapabilities();
    return capabilities?.error;
  }
}

/**
 * Convenience functions that mirror the class methods for easier importing
 */
export const requireEnterprise = EnterpriseGuards.requireEnterprise.bind(EnterpriseGuards);
export const requireNamespaceSupport = EnterpriseGuards.requireNamespaceSupport.bind(EnterpriseGuards);
export const isEnterpriseAvailable = EnterpriseGuards.isEnterpriseAvailable.bind(EnterpriseGuards);
export const isNamespaceSupported = EnterpriseGuards.isNamespaceSupported.bind(EnterpriseGuards);
export const validateNamespace = EnterpriseGuards.validateNamespace.bind(EnterpriseGuards);
export const validateTenantContext = EnterpriseGuards.validateTenantContext.bind(EnterpriseGuards);
export const getCapabilitySummary = EnterpriseGuards.getCapabilitySummary.bind(EnterpriseGuards);
export const getDeploymentMode = EnterpriseGuards.getDeploymentMode.bind(EnterpriseGuards);

/**
 * Default export for convenience
 */
export default EnterpriseGuards;
