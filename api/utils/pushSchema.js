const axios = require('axios');
const config = require('../config');

/**
 * Push schema to Dgraph admin endpoint with optional namespace support
 * @param {string} schema - The GraphQL schema content
 * @param {string|null} namespace - Optional namespace (e.g., '0x1')
 * @param {string|null} customAdminUrl - Optional custom admin URL
 * @returns {Promise<object>} - Result object with success status
 */
async function pushSchemaViaHttp(schema, namespace = null, customAdminUrl = null) {
  try {
    // Build admin URL with optional namespace
    const baseAdminUrl = customAdminUrl || config.dgraphAdminUrl;
    const adminUrl = namespace ? `${baseAdminUrl}?namespace=${namespace}` : baseAdminUrl;
    
    console.log(`[PUSH_SCHEMA] Pushing schema to ${adminUrl}`);
    
    const response = await axios.post(adminUrl, schema, {
      headers: { 'Content-Type': 'application/graphql' },
    });

    // Dgraph admin schema push returns {"data":{"code":"Success","message":"Done"}} on success
    console.log(`[PUSH_SCHEMA] Schema pushed successfully to namespace ${namespace || 'default'}`);
    return { success: true, response: response.data, namespace };
  } catch (err) {
    console.error(`[PUSH_SCHEMA] Error pushing schema to ${namespace || 'default'}:`, err.message);
    // Provide more details if available in the response
    const errorDetails = err.response?.data || err.message;
    return { success: false, error: errorDetails, namespace };
  }
}

/**
 * Legacy function for backwards compatibility
 * @param {string} adminUrl - The admin URL
 * @param {string} schema - The schema content
 * @returns {Promise<object>} - Result object
 */
async function pushSchemaViaHttpLegacy(adminUrl, schema) {
  return pushSchemaViaHttp(schema, null, adminUrl);
}

module.exports = { 
  pushSchemaViaHttp,
  pushSchemaViaHttpLegacy
};
