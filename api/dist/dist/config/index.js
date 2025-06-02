"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Load environment variables ONCE when this module is first imported
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const config = {
    // Server
    port: parseInt(process.env.PORT || '3000', 10),
    // Dgraph URLs - computed from base URL
    dgraphBaseUrl: process.env.DGRAPH_BASE_URL || 'http://localhost:8080',
    dgraphGraphqlUrl: '', // computed below
    dgraphAdminUrl: '', // computed below 
    dgraphAlterUrl: '', // computed below
    // Multi-tenant
    enableMultiTenant: process.env.ENABLE_MULTI_TENANT === 'true',
    defaultNamespace: process.env.DGRAPH_NAMESPACE_DEFAULT || '0x0',
    testNamespace: process.env.DGRAPH_NAMESPACE_TEST || '0x1',
    namespacePrefix: process.env.DGRAPH_NAMESPACE_PREFIX || '0x',
    // Security
    adminApiKey: process.env.ADMIN_API_KEY || undefined,
    // CORS
    corsOrigin: process.env.CORS_ORIGIN || '*',
};
// Compute derived URLs from base URL
const baseUrl = config.dgraphBaseUrl.replace(/\/+$/, '');
config.dgraphGraphqlUrl = `${baseUrl}/graphql`;
config.dgraphAdminUrl = process.env.DGRAPH_ADMIN_URL || `${baseUrl}/admin/schema`;
config.dgraphAlterUrl = process.env.DGRAPH_ALTER_URL || `${baseUrl}/alter`;
// Simple validation - only what's critical
if (!config.dgraphBaseUrl) {
    throw new Error('DGRAPH_BASE_URL environment variable is required');
}
exports.default = config;
