import { Request, Response, NextFunction } from 'express';
import { EnterpriseGuards, EnterpriseFeatureNotAvailableError, NamespaceNotSupportedError } from '../utils/enterpriseGuards';
import { createEnterpriseErrorResponse, createNamespaceErrorResponse } from '../utils/errorResponse';
import { TenantCapabilities } from '../src/types';

/**
 * Express middleware for Enterprise feature validation
 * 
 * These middleware functions provide route-level protection for Enterprise features,
 * ensuring consistent error handling and validation across the API.
 */

/**
 * Helper function to convert TenantCapabilities to the format expected by error response functions
 */
function getCapabilitySubset(capabilities: TenantCapabilities | null): { namespacesSupported?: boolean; enterpriseDetected?: boolean } | undefined {
  if (!capabilities) return undefined;
  
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
export const requireEnterprise = (operation: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      EnterpriseGuards.requireEnterprise(operation);
      next();
    } catch (error) {
      if (error instanceof EnterpriseFeatureNotAvailableError) {
        const capabilities = EnterpriseGuards.getCapabilities();
        const errorResponse = createEnterpriseErrorResponse(operation, '', capabilities || undefined);
        res.status(400).json(errorResponse);
      } else {
        // Unexpected error, pass to error handler
        next(error);
      }
    }
  };
};

/**
 * Middleware to require namespace support for a route
 * @param operation - Name of the operation requiring namespace support
 * @returns Express middleware function
 */
export const requireNamespaceSupport = (operation: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const namespace = req.tenantContext?.namespace;
      EnterpriseGuards.requireNamespaceSupport(operation, namespace || undefined);
      next();
    } catch (error) {
      if (error instanceof NamespaceNotSupportedError) {
        const capabilities = EnterpriseGuards.getCapabilities();
        const capabilitySubset = capabilities ? {
          namespacesSupported: capabilities.namespacesSupported,
          enterpriseDetected: capabilities.enterpriseDetected
        } : undefined;
        const errorResponse = createNamespaceErrorResponse(operation, error.namespace, capabilitySubset);
        res.status(400).json(errorResponse);
      } else {
        // Unexpected error, pass to error handler
        next(error);
      }
    }
  };
};

/**
 * Middleware to validate tenant capabilities for multi-tenant operations
 * @param operation - Name of the operation being performed
 * @returns Express middleware function
 */
export const validateTenantCapabilities = (operation: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const tenantId = req.tenantContext?.tenantId || 'default';
      const namespace = req.tenantContext?.namespace || null;
      
      EnterpriseGuards.validateTenantContext(tenantId, namespace, operation);
      next();
    } catch (error) {
      if (error instanceof NamespaceNotSupportedError) {
        const capabilities = EnterpriseGuards.getCapabilities();
        const errorResponse = createNamespaceErrorResponse(operation, error.namespace, getCapabilitySubset(capabilities));
        res.status(400).json(errorResponse);
      } else if (error instanceof EnterpriseFeatureNotAvailableError) {
        const capabilities = EnterpriseGuards.getCapabilities();
        const errorResponse = createEnterpriseErrorResponse(operation, '', getCapabilitySubset(capabilities));
        res.status(400).json(errorResponse);
      } else {
        // Unexpected error, pass to error handler
        next(error);
      }
    }
  };
};

/**
 * Middleware to validate namespace parameter from request
 * @param operation - Name of the operation being performed
 * @returns Express middleware function
 */
export const validateNamespaceParam = (operation: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Check for namespace in various request locations
      const namespace = req.tenantContext?.namespace || 
                       req.headers['x-namespace'] as string ||
                       req.query.namespace as string ||
                       req.body?.namespace;
      
      EnterpriseGuards.validateNamespace(namespace, operation);
      next();
    } catch (error) {
      if (error instanceof NamespaceNotSupportedError) {
        const capabilities = EnterpriseGuards.getCapabilities();
        const errorResponse = createNamespaceErrorResponse(operation, error.namespace, getCapabilitySubset(capabilities));
        res.status(400).json(errorResponse);
      } else {
        // Unexpected error, pass to error handler
        next(error);
      }
    }
  };
};

/**
 * Middleware to ensure Enterprise capabilities have been detected
 * @param operation - Name of the operation requiring capability detection
 * @returns Express middleware function
 */
export const ensureCapabilitiesDetected = (operation: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!EnterpriseGuards.isCapabilityDetectionComplete()) {
        // Initialize capability detection if not yet done
        const { adaptiveTenantFactory } = require('../services/adaptiveTenantFactory');
        await adaptiveTenantFactory.initialize();
      }
      
      if (!EnterpriseGuards.isCapabilityDetectionComplete()) {
        res.status(500).json({
          error: 'CAPABILITY_DETECTION_FAILED',
          message: `Could not detect Dgraph capabilities for operation: ${operation}`,
          details: EnterpriseGuards.getCapabilityDetectionError() || 'Unknown detection error'
        });
        return;
      }
      
      next();
    } catch (error) {
      res.status(500).json({
        error: 'CAPABILITY_DETECTION_ERROR',
        message: `Error during capability detection for operation: ${operation}`,
        details: (error as Error).message
      });
    }
  };
};

/**
 * Middleware to add capability information to response headers
 * @returns Express middleware function
 */
export const addCapabilityHeaders = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const summary = EnterpriseGuards.getCapabilitySummary();
      
      // Add capability headers for client awareness
      res.setHeader('X-Dgraph-Enterprise', summary.enterpriseDetected.toString());
      res.setHeader('X-Dgraph-Namespaces', summary.namespacesSupported.toString());
      res.setHeader('X-Dgraph-Mode', summary.mode);
      
      next();
    } catch (error) {
      // Don't fail the request if capability headers can't be set
      console.warn('[ENTERPRISE_MIDDLEWARE] Failed to set capability headers:', error);
      next();
    }
  };
};

/**
 * Middleware to log Enterprise feature usage for monitoring
 * @param operation - Name of the operation being logged
 * @returns Express middleware function
 */
export const logEnterpriseFeatureUsage = (operation: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const summary = EnterpriseGuards.getCapabilitySummary();
    const tenantId = req.tenantContext?.tenantId || 'default';
    const namespace = req.tenantContext?.namespace || 'default';
    
    console.log(`[ENTERPRISE_USAGE] Operation: ${operation}, Tenant: ${tenantId}, Namespace: ${namespace}, Mode: ${summary.mode}`);
    
    next();
  };
};

/**
 * Composite middleware for complete Enterprise feature protection
 * Combines capability detection, validation, and logging
 * @param operation - Name of the operation requiring protection
 * @param options - Configuration options for the middleware
 * @returns Array of Express middleware functions
 */
export const protectEnterpriseFeature = (
  operation: string, 
  options: {
    requireEnterprise?: boolean;
    requireNamespace?: boolean;
    validateTenant?: boolean;
    addHeaders?: boolean;
    logUsage?: boolean;
  } = {}
) => {
  const middlewares: Array<(req: Request, res: Response, next: NextFunction) => void | Promise<void>> = [];
  
  // Always ensure capabilities are detected first
  middlewares.push(ensureCapabilitiesDetected(operation));
  
  // Add specific validations based on options
  if (options.requireEnterprise) {
    middlewares.push(requireEnterprise(operation));
  }
  
  if (options.requireNamespace) {
    middlewares.push(requireNamespaceSupport(operation));
  }
  
  if (options.validateTenant) {
    middlewares.push(validateTenantCapabilities(operation));
  }
  
  // Add optional features
  if (options.addHeaders) {
    middlewares.push(addCapabilityHeaders());
  }
  
  if (options.logUsage) {
    middlewares.push(logEnterpriseFeatureUsage(operation));
  }
  
  return middlewares;
};

/**
 * Convenience middleware combinations for common use cases
 */

/**
 * Middleware for tenant management operations (create, delete, etc.)
 */
export const protectTenantManagement = (operation: string) =>
  protectEnterpriseFeature(operation, {
    requireEnterprise: true,
    requireNamespace: true,
    validateTenant: true,
    logUsage: true
  });

/**
 * Middleware for namespace-aware operations (queries, mutations)
 */
export const protectNamespaceOperation = (operation: string) =>
  protectEnterpriseFeature(operation, {
    validateTenant: true,
    addHeaders: true
  });

/**
 * Middleware for admin operations requiring Enterprise features
 */
export const protectEnterpriseAdmin = (operation: string) =>
  protectEnterpriseFeature(operation, {
    requireEnterprise: true,
    addHeaders: true,
    logUsage: true
  });
