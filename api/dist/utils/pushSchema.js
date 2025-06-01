"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushSchemaViaHttp = pushSchemaViaHttp;
exports.pushSchemaViaHttpLegacy = pushSchemaViaHttpLegacy;
const axios_1 = __importDefault(require("axios"));
const config_1 = __importDefault(require("../config"));
/**
 * Push schema to Dgraph admin endpoint with optional namespace support
 * @param schema - The GraphQL schema content
 * @param namespace - Optional namespace (e.g., '0x1')
 * @param customAdminUrl - Optional custom admin URL
 * @returns Result object with success status
 */
async function pushSchemaViaHttp(schema, namespace = null, customAdminUrl = null) {
    try {
        // Build admin URL with optional namespace
        const baseAdminUrl = customAdminUrl || config_1.default.dgraphAdminUrl;
        const adminUrl = namespace ? `${baseAdminUrl}?namespace=${namespace}` : baseAdminUrl;
        console.log(`[PUSH_SCHEMA] Pushing schema to ${adminUrl}`);
        const response = await axios_1.default.post(adminUrl, schema, {
            headers: { 'Content-Type': 'application/graphql' },
        });
        // Dgraph admin schema push returns {"data":{"code":"Success","message":"Done"}} on success
        // Extract the actual data from the nested response structure
        const responseData = response.data?.data || response.data;
        console.log(`[PUSH_SCHEMA] Schema pushed successfully to namespace ${namespace || 'default'}`);
        return { success: true, response: responseData, namespace };
    }
    catch (err) {
        console.error(`[PUSH_SCHEMA] Error pushing schema to ${namespace || 'default'}:`, err.message);
        // Provide more details if available in the response
        const errorDetails = err.response?.data || err.message;
        return { success: false, error: errorDetails, namespace };
    }
}
/**
 * Legacy function for backwards compatibility
 * @param adminUrl - The admin URL
 * @param schema - The schema content
 * @returns Result object
 */
async function pushSchemaViaHttpLegacy(adminUrl, schema) {
    return pushSchemaViaHttp(schema, null, adminUrl);
}
