/**
 * @fileoverview Backend Services Module
 * 
 * This module exports all core backend services for the MakeItMakeSense.io platform.
 * Services handle business logic, data operations, and multi-tenant functionality.
 * 
 * @module Services
 */

// Multi-tenant management services
export { TenantManager } from './tenantManager';
export { DgraphTenantFactory } from './dgraphTenant';
export { AdaptiveTenantFactory } from './adaptiveTenantFactory';

// Import/Export services
export { ImportExportService } from './importExportService';

// Validation functions and error types
export { 
  InvalidLevelError,
  NodeTypeNotAllowedError,
  validateHierarchyId,
  validateLevelIdAndAllowedType,
  getLevelIdForNode
} from './validation';

// Re-export key types for convenience
export type { TenantInfo, CreateTenantResponse } from '../src/types/tenant';
export type { DgraphTenant } from './dgraphTenant';
