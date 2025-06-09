/**
 * Standardized error response utility for consistent API error formatting
 */

import { Response } from 'express';

export interface StandardErrorResponse {
  error: string;
  message?: string;
  details?: string | object;
  field?: string;
  timestamp?: string;
}

/**
 * Error types for consistent API responses
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  SERVER_ERROR = 'SERVER_ERROR',
  ENTERPRISE_FEATURE_NOT_AVAILABLE = 'ENTERPRISE_FEATURE_NOT_AVAILABLE',
  NAMESPACE_NOT_SUPPORTED = 'NAMESPACE_NOT_SUPPORTED',
  MULTI_TENANT_NOT_AVAILABLE = 'MULTI_TENANT_NOT_AVAILABLE'
}

/**
 * HTTP status code mapping for error types
 */
export const errorStatusMap = {
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
export function createErrorResponse(
  message: string, 
  details?: string, 
  includeTimestamp: boolean = false
): StandardErrorResponse {
  const response: StandardErrorResponse = {
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
export function createErrorResponseFromError(
  message: string, 
  error: Error, 
  includeTimestamp: boolean = false
): StandardErrorResponse {
  return createErrorResponse(message, error.message, includeTimestamp);
}

/**
 * Creates a validation error response
 * @param message - The validation error message
 * @param field - Optional field name that failed validation
 */
export function validationError(message: string, field?: string): StandardErrorResponse {
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
export function sendErrorResponse(
  res: Response, 
  type: ErrorType, 
  message: string, 
  details?: string
): void {
  const status = errorStatusMap[type];
  const response: StandardErrorResponse = {
    error: type,
    message,
    ...(details && { details })
  };
  
  res.status(status).json(response);
}

/**
 * Enterprise Error Classes
 * Specialized error types for Enterprise feature scenarios
 */

export interface EnterpriseErrorContext {
  operation: string;
  namespace?: string;
  currentMode?: string;
  requiredMode?: string;
  suggestion?: string;
  upgradeInfo?: string;
}

export interface EnterpriseErrorResponse extends StandardErrorResponse {
  details: EnterpriseErrorContext;
}

/**
 * Base class for Enterprise feature errors
 */
export class EnterpriseFeatureNotAvailableError extends Error {
  public readonly context: EnterpriseErrorContext;

  constructor(feature: string, context: Partial<EnterpriseErrorContext> = {}) {
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

/**
 * Specialized error for namespace operations
 */
export class NamespaceNotSupportedError extends EnterpriseFeatureNotAvailableError {
  constructor(operation: string, namespace: string, suggestion?: string) {
    super(
      `Namespace operations (${operation} in namespace '${namespace}')`,
      {
        operation,
        namespace,
        suggestion: suggestion || 'Upgrade to Dgraph Enterprise or use default namespace'
      }
    );
    this.name = 'NamespaceNotSupportedError';
  }
}

/**
 * Specialized error for multi-tenant operations
 */
export class MultiTenantNotSupportedError extends EnterpriseFeatureNotAvailableError {
  constructor(operation: string, suggestion?: string) {
    super(
      `Multi-tenant operations (${operation})`,
      {
        operation,
        suggestion: suggestion || 'Multi-tenant support requires Dgraph Enterprise with namespace isolation'
      }
    );
    this.name = 'MultiTenantNotSupportedError';
  }
}

/**
 * Enterprise Error Response Builders
 */

/**
 * Creates a standardized Enterprise feature error response
 */
export function createEnterpriseErrorResponse(
  feature: string,
  operation: string,
  capabilities?: { namespacesSupported?: boolean; enterpriseDetected?: boolean }
): EnterpriseErrorResponse {
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
export function createNamespaceErrorResponse(
  operation: string,
  namespace: string,
  capabilities?: { namespacesSupported?: boolean; enterpriseDetected?: boolean }
): EnterpriseErrorResponse {
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
export function createMultiTenantErrorResponse(
  operation: string,
  capabilities?: { namespacesSupported?: boolean; enterpriseDetected?: boolean }
): EnterpriseErrorResponse {
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
export enum FallbackBehavior {
  FAIL_HARD = 'FAIL_HARD',           // Throw error immediately (creation operations)
  DEGRADE_GRACEFULLY = 'DEGRADE_GRACEFULLY', // Fall back to default behavior (read operations)
  FAIL_WITH_CONTEXT = 'FAIL_WITH_CONTEXT'    // Provide detailed error context (admin operations)
}

/**
 * Determines appropriate fallback behavior for an operation type
 */
export function getFallbackBehavior(operationType: 'CREATE' | 'READ' | 'ADMIN'): FallbackBehavior {
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
