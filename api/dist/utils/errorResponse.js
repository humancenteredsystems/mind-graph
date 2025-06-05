"use strict";
/**
 * Standardized error response utility for consistent API error formatting
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createErrorResponse = createErrorResponse;
exports.createErrorResponseFromError = createErrorResponseFromError;
/**
 * Creates a standardized error response object
 * @param message - The main error message
 * @param details - Optional detailed error information
 * @param includeTimestamp - Whether to include a timestamp (default: false)
 */
function createErrorResponse(message, details, includeTimestamp = false) {
    const response = {
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
function createErrorResponseFromError(message, error, includeTimestamp = false) {
    return createErrorResponse(message, error.message, includeTimestamp);
}
