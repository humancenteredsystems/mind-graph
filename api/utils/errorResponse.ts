/**
 * Standardized error response utility for consistent API error formatting
 */

import { Response } from 'express';

export interface StandardErrorResponse {
  error: string;
  message?: string;
  details?: string;
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
  SERVER_ERROR = 'SERVER_ERROR'
}

/**
 * HTTP status code mapping for error types
 */
export const errorStatusMap = {
  [ErrorType.VALIDATION]: 400,
  [ErrorType.NOT_FOUND]: 404,
  [ErrorType.CONFLICT]: 409,
  [ErrorType.UNAUTHORIZED]: 401,
  [ErrorType.SERVER_ERROR]: 500
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
