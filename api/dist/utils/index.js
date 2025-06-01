"use strict";
/**
 * @fileoverview Backend Utilities Module
 *
 * This module exports utility functions for database administration,
 * schema management, and tenant operations.
 *
 * @module Utilities
 */
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
exports.pushSchemaViaHttp = void 0;
// Database administration utilities
var pushSchema_1 = require("./pushSchema");
Object.defineProperty(exports, "pushSchemaViaHttp", { enumerable: true, get: function () { return pushSchema_1.pushSchemaViaHttp; } });
// Re-export from dgraphAdmin if it has exports
__exportStar(require("./dgraphAdmin"), exports);
// Tenant migration utilities  
__exportStar(require("./tenantMigration"), exports);
