"use strict";
// Type definitions index
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DgraphError = exports.TenantError = exports.UnauthorizedError = exports.NotFoundError = exports.ValidationError = void 0;
// Domain types
__exportStar(require("./domain"), exports);
// Configuration types
__exportStar(require("./config"), exports);
// GraphQL types
__exportStar(require("./graphql"), exports);
// Express types
__exportStar(require("./express"), exports);
// Tenant types
__exportStar(require("./tenant"), exports);
// Error types
class ValidationError extends Error {
    constructor(message, field) {
        super(message);
        this.field = field;
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends Error {
    constructor(message) {
        super(message);
        this.name = 'UnauthorizedError';
    }
}
exports.UnauthorizedError = UnauthorizedError;
class TenantError extends Error {
    constructor(message, tenantId) {
        super(message);
        this.tenantId = tenantId;
        this.name = 'TenantError';
    }
}
exports.TenantError = TenantError;
class DgraphError extends Error {
    constructor(message, originalError) {
        super(message);
        this.originalError = originalError;
        this.name = 'DgraphError';
    }
}
exports.DgraphError = DgraphError;
//# sourceMappingURL=index.js.map