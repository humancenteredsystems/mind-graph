import { adaptiveTenantFactory } from '../services/adaptiveTenantFactory';
import { TenantCapabilities } from '../src/types';

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
export function isEnterpriseAvailable(): boolean {
  const capabilities = adaptiveTenantFactory.getCapabilities();
  return capabilities?.enterpriseDetected || false;
}

/**
 * Check if multi-tenant namespace operations are supported
 * @returns True if namespace isolation is available
 */
export function isMultiTenantSupported(): boolean {
  const capabilities = adaptiveTenantFactory.getCapabilities();
  return capabilities?.namespacesSupported || false;
}

/**
 * Get current capabilities synchronously (from cache)
 * @returns Current capabilities or null if not yet detected
 */
export function getCapabilitiesSync(): TenantCapabilities | null {
  return adaptiveTenantFactory.getCapabilities();
}

/**
 * Require Enterprise features for an operation
 * Throws descriptive error if Enterprise features are not available
 * @param operation - Name of the operation requiring Enterprise features
 */
export function requiresEnterprise(operation: string): void {
  if (!isEnterpriseAvailable()) {
    throw new Error(
      `Operation '${operation}' requires Dgraph Enterprise features which are not available. ` +
      'Please ensure you are running Dgraph Enterprise with a valid license.'
    );
  }
}

/**
 * Require multi-tenant support for an operation
 * Throws descriptive error if namespace isolation is not available
 * @param operation - Name of the operation requiring multi-tenant support
 */
export function requiresMultiTenant(operation: string): void {
  if (!isMultiTenantSupported()) {
    const capabilities = getCapabilitiesSync();
    const reason = capabilities?.enterpriseDetected 
      ? 'namespace isolation is not functional'
      : 'Dgraph Enterprise is not available';
      
    throw new Error(
      `Operation '${operation}' requires multi-tenant support which is not available. ` +
      `Reason: ${reason}. Please ensure you are running Dgraph Enterprise with namespace support.`
    );
  }
}

/**
 * Get deployment mode string for logging and responses
 * @returns Descriptive string indicating current deployment mode
 */
export function getDeploymentMode(): string {
  if (isMultiTenantSupported()) {
    return 'enterprise-multi-tenant';
  } else if (isEnterpriseAvailable()) {
    return 'enterprise-single-tenant';
  } else {
    return 'oss-single-tenant';
  }
}

/**
 * Check if capability detection has completed
 * @returns True if capabilities have been detected (successfully or with errors)
 */
export function isCapabilityDetectionComplete(): boolean {
  const capabilities = getCapabilitiesSync();
  return capabilities !== null;
}

/**
 * Get capability detection error if any
 * @returns Error message if detection failed, undefined otherwise
 */
export function getCapabilityDetectionError(): string | undefined {
  const capabilities = getCapabilitiesSync();
  return capabilities?.error;
}

/**
 * Ensure capability detection has completed before proceeding
 * This is useful for routes that need to wait for async detection
 * @returns Promise that resolves when capabilities are available
 */
export async function ensureCapabilitiesDetected(): Promise<TenantCapabilities> {
  // Initialize the factory if not already done
  await adaptiveTenantFactory.initialize();
  
  const capabilities = getCapabilitiesSync();
  if (!capabilities) {
    throw new Error('Failed to detect Dgraph capabilities after initialization');
  }
  
  return capabilities;
}

/**
 * Capability checking utilities object for easy importing
 */
export const capabilityHelpers = {
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
export default capabilityHelpers;
