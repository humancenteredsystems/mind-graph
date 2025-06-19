/**
 * Reusable validation helpers for API routes
 */

import { Response } from 'express';
import { sendErrorResponse, ErrorType } from './errorResponse';

/**
 * Validates that an entity is unique by executing a GraphQL query
 * @param tenantClient - The tenant-aware GraphQL client
 * @param query - GraphQL query to check for existing entities
 * @param variables - Variables for the GraphQL query
 * @param path - Array of keys to navigate to the result array (e.g., ['queryHierarchy', '0', 'levels'])
 * @returns Promise<boolean> - true if unique, false if duplicate exists
 */
export async function validateUniqueness(
  tenantClient: any,
  query: string,
  variables: any,
  path: string[]
): Promise<boolean> {
  const result = await tenantClient.executeGraphQL(query, variables);
  
  // Navigate through the path to find the array
  let data = result;
  for (const key of path) {
    data = data?.[key];
  }
  
  // Return true if no existing entities found
  return !data || data.length === 0;
}

/**
 * Validates that all required fields are present in the request body
 * @param res - Express response object
 * @param fields - Object containing the request fields
 * @param requiredFields - Array of required field names
 * @returns boolean - true if all fields present, false if validation failed (response sent)
 */
export function validateRequiredFields(
  res: Response,
  fields: Record<string, any>,
  requiredFields: string[]
): boolean {
  const missing = requiredFields.filter(field => !fields[field]);
  
  if (missing.length > 0) {
    sendErrorResponse(
      res, 
      ErrorType.VALIDATION,
      `Missing required fields: ${missing.join(', ')}`
    );
    return false;
  }
  
  return true;
}

/**
 * Validates that an ID is a non-empty string
 * @param res - Express response object
 * @param id - The ID to validate
 * @param fieldName - Name of the field for error message
 * @returns boolean - true if valid, false if validation failed (response sent)
 */
export function validateId(
  res: Response,
  id: any,
  fieldName: string = 'ID'
): boolean {
  if (typeof id !== 'string' || !id.trim()) {
    sendErrorResponse(
      res,
      ErrorType.VALIDATION,
      `Invalid ${fieldName}: must be a non-empty string.`
    );
    return false;
  }
  
  return true;
}

/**
 * Validates that an entity exists by checking GraphQL query result
 * @param res - Express response object
 * @param queryResult - Result from GraphQL query
 * @param entityName - Name of the entity for error message
 * @param entityId - ID of the entity for error message
 * @returns boolean - true if exists, false if not found (response sent)
 */
export function validateEntityExists(
  res: Response,
  queryResult: any,
  entityName: string,
  entityId: string
): boolean {
  if (!queryResult) {
    sendErrorResponse(
      res,
      ErrorType.NOT_FOUND,
      `${entityName} with ID '${entityId}' does not exist`
    );
    return false;
  }
  
  return true;
}
