"use strict";
/**
 * @fileoverview Backend Services Module
 *
 * This module exports all core backend services for the MakeItMakeSense.io platform.
 * Services handle business logic, data operations, and multi-tenant functionality.
 *
 * @module Services
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLevelIdForNode = exports.validateLevelIdAndAllowedType = exports.validateHierarchyId = exports.NodeTypeNotAllowedError = exports.InvalidLevelError = exports.AdaptiveTenantFactory = exports.DgraphTenantFactory = exports.TenantManager = void 0;
// Multi-tenant management services
var tenantManager_1 = require("./tenantManager");
Object.defineProperty(exports, "TenantManager", { enumerable: true, get: function () { return tenantManager_1.TenantManager; } });
var dgraphTenant_1 = require("./dgraphTenant");
Object.defineProperty(exports, "DgraphTenantFactory", { enumerable: true, get: function () { return dgraphTenant_1.DgraphTenantFactory; } });
var adaptiveTenantFactory_1 = require("./adaptiveTenantFactory");
Object.defineProperty(exports, "AdaptiveTenantFactory", { enumerable: true, get: function () { return adaptiveTenantFactory_1.AdaptiveTenantFactory; } });
// Validation functions and error types
var validation_1 = require("./validation");
Object.defineProperty(exports, "InvalidLevelError", { enumerable: true, get: function () { return validation_1.InvalidLevelError; } });
Object.defineProperty(exports, "NodeTypeNotAllowedError", { enumerable: true, get: function () { return validation_1.NodeTypeNotAllowedError; } });
Object.defineProperty(exports, "validateHierarchyId", { enumerable: true, get: function () { return validation_1.validateHierarchyId; } });
Object.defineProperty(exports, "validateLevelIdAndAllowedType", { enumerable: true, get: function () { return validation_1.validateLevelIdAndAllowedType; } });
Object.defineProperty(exports, "getLevelIdForNode", { enumerable: true, get: function () { return validation_1.getLevelIdForNode; } });
