import { Response } from 'express';
export declare enum ErrorType {
    VALIDATION = "VALIDATION",
    GRAPHQL = "GRAPHQL",
    TENANT = "TENANT",
    DATABASE = "DATABASE",
    SERVER = "SERVER",
    NOT_FOUND = "NOT_FOUND",
    UNAUTHORIZED = "UNAUTHORIZED"
}
export interface ApiError extends Error {
    type: ErrorType;
    statusCode: number;
    details?: any;
}
export declare class ValidationError extends Error implements ApiError {
    details?: any | undefined;
    type: ErrorType;
    statusCode: number;
    constructor(message: string, details?: any | undefined);
}
export declare class GraphQLError extends Error implements ApiError {
    details?: any | undefined;
    type: ErrorType;
    statusCode: number;
    constructor(message: string, details?: any | undefined);
}
export declare class TenantError extends Error implements ApiError {
    details?: any | undefined;
    type: ErrorType;
    statusCode: number;
    constructor(message: string, details?: any | undefined);
}
export declare class DatabaseError extends Error implements ApiError {
    details?: any | undefined;
    type: ErrorType;
    statusCode: number;
    constructor(message: string, details?: any | undefined);
}
export declare class NotFoundError extends Error implements ApiError {
    details?: any | undefined;
    type: ErrorType;
    statusCode: number;
    constructor(message: string, details?: any | undefined);
}
export declare class ErrorHandler {
    /**
     * Handle and respond to API errors consistently
     */
    static handleError(error: any, res: Response, context?: string): void;
    /**
     * Simple error response helper for basic cases
     */
    static sendError(res: Response, message: string, statusCode?: number, type?: ErrorType): void;
    /**
     * Check if error is our custom ApiError type
     */
    private static isApiError;
    /**
     * Check if error is a GraphQL error from Dgraph
     */
    private static isGraphQLError;
    /**
     * Check if error is a validation error from our services
     */
    private static isValidationError;
}
/**
 * Express middleware for global error handling
 */
export declare const globalErrorHandler: (error: any, req: any, res: Response, next: any) => void;
/**
 * Async wrapper for route handlers to catch errors
 */
export declare const asyncHandler: (fn: Function) => (req: any, res: Response, next: any) => void;
//# sourceMappingURL=errorHandler.d.ts.map