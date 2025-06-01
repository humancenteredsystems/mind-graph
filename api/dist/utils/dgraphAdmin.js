"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendDgraphAdminRequest = sendDgraphAdminRequest;
const axios_1 = __importDefault(require("axios"));
/**
 * sendDgraphAdminRequest
 *
 * A shared helper to send JSON payloads to Dgraph admin endpoints.
 * Returns an object { success: boolean, data?: any, error?: string, details?: any }
 *
 * @param url - The full URL of the Dgraph admin endpoint (e.g., /alter or /admin/schema).
 * @param payload - The JSON payload to POST.
 * @param namespace - Optional namespace for multi-tenant operations (e.g., '0x0', '0x1').
 * @returns Promise<AdminOperationResult>
 */
async function sendDgraphAdminRequest(url, payload, namespace = null) {
    // Build URL with optional namespace parameter
    const finalUrl = namespace ? `${url}?namespace=${namespace}` : url;
    try {
        console.log(`[DGRAPH ADMIN REQUEST] Sending request to ${finalUrl}${namespace ? ` (namespace: ${namespace})` : ''}`);
        const response = await axios_1.default.post(finalUrl, payload, {
            headers: { 'Content-Type': 'application/json' },
        });
        if (response.status >= 200 && response.status < 300) {
            return { success: true, data: response.data };
        }
        else {
            console.error(`[DGRAPH ADMIN REQUEST] Received non-2xx status for ${finalUrl}: ${response.status}`);
            return {
                success: false,
                error: `Dgraph admin request failed with status: ${response.status}`,
                details: response.data
            };
        }
    }
    catch (error) {
        const err = error; // Using any for axios error handling
        console.error(`[DGRAPH ADMIN REQUEST] Error sending request to ${finalUrl}:`, err.message);
        if (err.response) {
            console.error('[DGRAPH ADMIN REQUEST] Response status:', err.response.status);
            console.error('[DGRAPH ADMIN REQUEST] Response data:', err.response.data);
            return {
                success: false,
                error: `Dgraph admin request failed: ${err.response.status} - ${err.response.statusText}`,
                details: err.response.data
            };
        }
        else if (err.request) {
            return {
                success: false,
                error: `No response received from Dgraph admin at ${finalUrl}`
            };
        }
        else {
            return {
                success: false,
                error: `Error setting up Dgraph admin request: ${err.message}`
            };
        }
    }
}
