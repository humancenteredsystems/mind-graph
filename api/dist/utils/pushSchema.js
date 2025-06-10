"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushSchemaViaHttp = void 0;
exports.pushSchemaViaHttpLegacy = pushSchemaViaHttpLegacy;
const axios_1 = __importDefault(require("axios"));
const config_1 = __importDefault(require("../config"));
const namespaceValidator_1 = require("./namespaceValidator");
/**
 * Internal schema push function (without validation)
 */
async function pushSchemaViaHttpInternal(schema, namespace = null, customAdminUrl = null) {
    try {
        // Build admin URL with optional namespace
        const baseAdminUrl = customAdminUrl || config_1.default.dgraphAdminUrl;
        const adminUrl = namespace ? `${baseAdminUrl}?namespace=${namespace}` : baseAdminUrl;
        console.log(`[PUSH_SCHEMA] Pushing schema to ${adminUrl}`);
        console.log(`[PUSH_SCHEMA] Schema content preview: ${schema.substring(0, 200)}...`);
        const response = await axios_1.default.post(adminUrl, schema, {
            headers: { 'Content-Type': 'application/graphql' },
            timeout: 30000, // 30 second timeout for schema push
        });
        // Dgraph admin schema push returns {"data":{"code":"Success","message":"Done"}} on success
        // Extract the actual data from the nested response structure
        const responseData = response.data?.data || response.data;
        // Validate the response indicates success
        const isSuccess = response.status === 200 &&
            (responseData?.code === 'Success' ||
                responseData?.message === 'Done' ||
                !responseData?.error);
        if (isSuccess) {
            console.log(`[PUSH_SCHEMA] ✅ Schema pushed successfully to namespace ${namespace || 'default'}: ${JSON.stringify(responseData)}`);
            return { success: true, response: responseData, namespace };
        }
        else {
            console.error(`[PUSH_SCHEMA] ❌ Schema push returned non-success response: ${JSON.stringify(responseData)}`);
            return {
                success: false,
                error: `Schema push failed: ${responseData?.message || 'Unknown error'}`,
                namespace
            };
        }
    }
    catch (err) {
        console.error(`[PUSH_SCHEMA] ❌ Error pushing schema to ${namespace || 'default'}:`, err.message);
        // Enhanced error reporting
        let errorDetails = err.message;
        if (err.response) {
            console.error(`[PUSH_SCHEMA] HTTP Status: ${err.response.status}`);
            console.error(`[PUSH_SCHEMA] Response Headers:`, err.response.headers);
            console.error(`[PUSH_SCHEMA] Response Data:`, err.response.data);
            errorDetails = {
                status: err.response.status,
                statusText: err.response.statusText,
                data: err.response.data,
                originalError: err.message
            };
        }
        else if (err.request) {
            console.error(`[PUSH_SCHEMA] No response received:`, err.request);
            const baseAdminUrl = customAdminUrl || config_1.default.dgraphAdminUrl;
            const targetUrl = namespace ? `${baseAdminUrl}?namespace=${namespace}` : baseAdminUrl;
            errorDetails = `No response received from ${targetUrl}`;
        }
        return { success: false, error: errorDetails, namespace };
    }
}
/**
 * Push schema to Dgraph admin endpoint with optional namespace support
 * @param schema - The GraphQL schema content
 * @param namespace - Optional namespace (e.g., '0x1')
 * @param customAdminUrl - Optional custom admin URL
 * @returns Result object with success status
 */
exports.pushSchemaViaHttp = (0, namespaceValidator_1.withNamespaceValidationAt)(pushSchemaViaHttpInternal, 'Schema push', 1);
/**
 * Legacy function for backwards compatibility
 * @param adminUrl - The admin URL
 * @param schema - The schema content
 * @returns Result object
 */
async function pushSchemaViaHttpLegacy(adminUrl, schema) {
    return (0, exports.pushSchemaViaHttp)(schema, null, adminUrl);
}
