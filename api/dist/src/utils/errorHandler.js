"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.globalErrorHandler = exports.ErrorHandler = exports.NotFoundError = exports.DatabaseError = exports.TenantError = exports.GraphQLError = exports.ValidationError = exports.ErrorType = void 0;
const logger_1 = require("./logger");
var ErrorType;
(function (ErrorType) {
    ErrorType["VALIDATION"] = "VALIDATION";
    ErrorType["GRAPHQL"] = "GRAPHQL";
    ErrorType["TENANT"] = "TENANT";
    ErrorType["DATABASE"] = "DATABASE";
    ErrorType["SERVER"] = "SERVER";
    ErrorType["NOT_FOUND"] = "NOT_FOUND";
    ErrorType["UNAUTHORIZED"] = "UNAUTHORIZED";
})(ErrorType || (exports.ErrorType = ErrorType = {}));
class ValidationError extends Error {
    constructor(message, details) {
        super(message);
        this.details = details;
        this.type = ErrorType.VALIDATION;
        this.statusCode = 400;
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class GraphQLError extends Error {
    constructor(message, details) {
        super(message);
        this.details = details;
        this.type = ErrorType.GRAPHQL;
        this.statusCode = 400;
        this.name = 'GraphQLError';
    }
}
exports.GraphQLError = GraphQLError;
class TenantError extends Error {
    constructor(message, details) {
        super(message);
        this.details = details;
        this.type = ErrorType.TENANT;
        this.statusCode = 400;
        this.name = 'TenantError';
    }
}
exports.TenantError = TenantError;
class DatabaseError extends Error {
    constructor(message, details) {
        super(message);
        this.details = details;
        this.type = ErrorType.DATABASE;
        this.statusCode = 500;
        this.name = 'DatabaseError';
    }
}
exports.DatabaseError = DatabaseError;
class NotFoundError extends Error {
    constructor(message, details) {
        super(message);
        this.details = details;
        this.type = ErrorType.NOT_FOUND;
        this.statusCode = 404;
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class ErrorHandler {
    /**
     * Handle and respond to API errors consistently
     */
    static handleError(error, res, context) {
        const contextPrefix = context ? `[${context}]` : '[API]';
        // Check if it's our custom error type
        if (this.isApiError(error)) {
            logger_1.logger.warn(`${contextPrefix} ${error.type} Error: ${error.message}`, {
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
            const graphQLError = new GraphQLError(error.message.replace('GraphQL query failed: ', ''), { originalError: error.message });
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
        logger_1.logger.error(`${contextPrefix} Unexpected error: ${error.message}`, {
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
    static sendError(res, message, statusCode = 500, type = ErrorType.SERVER) {
        res.status(statusCode).json({
            error: message,
            type
        });
    }
    /**
     * Check if error is our custom ApiError type
     */
    static isApiError(error) {
        return error && typeof error.type === 'string' && typeof error.statusCode === 'number';
    }
    /**
     * Check if error is a GraphQL error from Dgraph
     */
    static isGraphQLError(error) {
        return error?.message?.includes('GraphQL query failed:') ||
            error?.message?.includes('GraphQL error');
    }
    /**
     * Check if error is a validation error from our services
     */
    static isValidationError(error) {
        return error?.name === 'InvalidLevelError' ||
            error?.name === 'NodeTypeNotAllowedError' ||
            error?.message?.includes('validation failed');
    }
}
exports.ErrorHandler = ErrorHandler;
/**
 * Express middleware for global error handling
 */
const globalErrorHandler = (error, req, res, next) => {
    ErrorHandler.handleError(error, res, 'GLOBAL');
};
exports.globalErrorHandler = globalErrorHandler;
/**
 * Async wrapper for route handlers to catch errors
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=errorHandler.js.map