/**
 * Standardized error response utility for consistent API error formatting
 */

export interface StandardErrorResponse {
  error: string;
  details?: string;
  timestamp?: string;
}

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
