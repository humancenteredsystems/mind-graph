import { Response } from 'express';
import { logger } from './logger';

export enum ErrorType {
  VALIDATION = 'VALIDATION',
  GRAPHQL = 'GRAPHQL',
  TENANT = 'TENANT',
  DATABASE = 'DATABASE',
  SERVER = 'SERVER',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED'
}

export interface ApiError extends Error {
  type: ErrorType;
  statusCode: number;
  details?: any;
}

export class ValidationError extends Error implements ApiError {
  type = ErrorType.VALIDATION;
  statusCode = 400;
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class GraphQLError extends Error implements ApiError {
  type = ErrorType.GRAPHQL;
  statusCode = 400;
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'GraphQLError';
  }
}

export class TenantError extends Error implements ApiError {
  type = ErrorType.TENANT;
  statusCode = 400;
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'TenantError';
  }
}

export class DatabaseError extends Error implements ApiError {
  type = ErrorType.DATABASE;
  statusCode = 500;
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class NotFoundError extends Error implements ApiError {
  type = ErrorType.NOT_FOUND;
  statusCode = 404;
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ErrorHandler {
  /**
   * Handle and respond to API errors consistently
   */
  static handleError(error: any, res: Response, context?: string): void {
    const contextPrefix = context ? `[${context}]` : '[API]';
    
    // Check if it's our custom error type
    if (this.isApiError(error)) {
      logger.warn(`${contextPrefix} ${error.type} Error: ${error.message}`, {
        type: error.type,
        details: error.details,
        context
      });
      
      res.status(error.statusCode).json({
        error: error.message,
        type: error.type,
        ...(error.details && { details: error.details })
      });
      return;
    }
    
    // Handle GraphQL errors from Dgraph
    if (this.isGraphQLError(error)) {
      const graphQLError = new GraphQLError(
        error.message.replace('GraphQL query failed: ', ''),
        { originalError: error.message }
      );
      this.handleError(graphQLError, res, context);
      return;
    }
    
    // Handle validation errors from our services
    if (this.isValidationError(error)) {
      const validationError = new ValidationError(error.message);
      this.handleError(validationError, res, context);
      return;
    }
    
    // Default server error
    logger.error(`${contextPrefix} Unexpected error: ${error.message}`, {
      stack: error.stack,
      context
    });
    
    res.status(500).json({
      error: 'Internal server error',
      type: ErrorType.SERVER
    });
  }
  
  /**
   * Simple error response helper for basic cases
   */
  static sendError(res: Response, message: string, statusCode = 500, type = ErrorType.SERVER): void {
    res.status(statusCode).json({
      error: message,
      type
    });
  }
  
  /**
   * Check if error is our custom ApiError type
   */
  private static isApiError(error: any): error is ApiError {
    return error && typeof error.type === 'string' && typeof error.statusCode === 'number';
  }
  
  /**
   * Check if error is a GraphQL error from Dgraph
   */
  private static isGraphQLError(error: any): boolean {
    return error?.message?.includes('GraphQL query failed:') || 
           error?.message?.includes('GraphQL error');
  }
  
  /**
   * Check if error is a validation error from our services
   */
  private static isValidationError(error: any): boolean {
    return error?.name === 'InvalidLevelError' || 
           error?.name === 'NodeTypeNotAllowedError' ||
           error?.message?.includes('validation failed');
  }
}

/**
 * Express middleware for global error handling
 */
export const globalErrorHandler = (error: any, req: any, res: Response, next: any) => {
  ErrorHandler.handleError(error, res, 'GLOBAL');
};

/**
 * Async wrapper for route handlers to catch errors
 */
export const asyncHandler = (fn: Function) => {
  return (req: any, res: Response, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
