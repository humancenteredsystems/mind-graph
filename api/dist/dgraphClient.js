"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.executeGraphQL = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = __importDefault(require("./config"));
const namespaceValidator_1 = require("./utils/namespaceValidator");
// Log the configuration values for debugging
console.log('[DGRAPHCLIENT DEBUG] Using DGRAPH_BASE_URL from config:', config_1.default.dgraphBaseUrl);
const DGRAPH_ENDPOINT = config_1.default.dgraphGraphqlUrl;
console.log('[DGRAPHCLIENT DEBUG] Final DGRAPH_ENDPOINT:', DGRAPH_ENDPOINT);
/**
 * Internal GraphQL execution function (without validation)
 */
async function executeGraphQLInternal(query, variables = {}, namespace = null) {
    const namespaceParam = namespace ? `?namespace=${namespace}` : '';
    const endpoint = `${DGRAPH_ENDPOINT}${namespaceParam}`; // eslint-disable-line enterprise/no-unguarded-namespace-usage
    console.log(`[DGRAPH] Executing query in namespace: ${namespace || 'default'}`);
    console.log(`Executing GraphQL query: ${query.substring(0, 100)}...`, variables); // Log query start
    try {
        const requestData = {
            query,
            variables,
        };
        const response = await axios_1.default.post(endpoint, requestData, {
            headers: { 'Content-Type': 'application/json' }
        });
        // Check for GraphQL errors in the response body
        if (response.data.errors) {
            console.error('GraphQL Errors:', JSON.stringify(response.data.errors, null, 2));
            throw new Error(`GraphQL query failed: ${response.data.errors.map((e) => e.message).join(', ')}`);
        }
        console.log('GraphQL query executed successfully.'); // Log success
        console.log('[DGRAPH CLIENT] response.data:', response.data);
        console.log('[DGRAPH CLIENT] returning data:', response.data.data);
        return response.data.data; // Return only the data part of the response
    }
    catch (error) {
        console.error(`Dgraph client error in namespace ${namespace || 'default'}: ${error.message}`);
        if (error.response) {
            // Error from the HTTP request itself (e.g., 4xx, 5xx)
            console.error('Dgraph response status:', error.response.status);
            console.error('Dgraph response data:', error.response.data);
        }
        else if (error.request) {
            // The request was made but no response was received
            console.error('Dgraph request error: No response received.', error.request);
        }
        else {
            // Something happened in setting up the request that triggered an Error
            console.error('Dgraph client setup error:', error.message);
            // Re-throw the original error if it's not a network/response issue
            throw error;
        }
        // If there were GraphQL errors, the error was already thrown above.
        // If we reached here, it's a different type of error (network, etc.)
        // Re-throw a generic error for the API layer to handle, or the original error
        throw new Error('Failed to communicate with Dgraph.'); // Keep this for network issues not caught by error.response/request
    }
}
/**
 * Executes a GraphQL query or mutation against the Dgraph endpoint.
 * @param query - The GraphQL query string.
 * @param variables - An object containing variables for the query.
 * @param namespace - Optional namespace for multi-tenant support.
 * @returns A promise that resolves with the 'data' part of the GraphQL response.
 * @throws Error if the request fails or if GraphQL errors are returned.
 */
exports.executeGraphQL = (0, namespaceValidator_1.withNamespaceValidationAt)(executeGraphQLInternal, 'GraphQL execution', 2);
exports.default = exports.executeGraphQL;
