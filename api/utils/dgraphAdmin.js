const axios = require('axios');

/**
 * sendDgraphAdminRequest
 *
 * A shared helper to send JSON payloads to Dgraph admin endpoints.
 * Returns an object { success: boolean, data?: any, error?: string, details?: any }
 *
 * @param {string} url - The full URL of the Dgraph admin endpoint (e.g., /alter or /admin/schema).
 * @param {object} payload - The JSON payload to POST.
 * @param {string|null} namespace - Optional namespace for multi-tenant operations (e.g., '0x0', '0x1').
 * @returns {Promise<object>}
 */
async function sendDgraphAdminRequest(url, payload, namespace = null) {
  try {
    // Build URL with optional namespace parameter
    const finalUrl = namespace ? `${url}?namespace=${namespace}` : url;
    console.log(`[DGRAPH ADMIN REQUEST] Sending request to ${finalUrl}${namespace ? ` (namespace: ${namespace})` : ''}`);
    
    const response = await axios.post(finalUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.status >= 200 && response.status < 300) {
      return { success: true, data: response.data };
    } else {
      console.error(`[DGRAPH ADMIN REQUEST] Received non-2xx status for ${finalUrl}: ${response.status}`);
      return {
        success: false,
        error: `Dgraph admin request failed with status: ${response.status}`,
        details: response.data
      };
    }
  } catch (error) {
    console.error(`[DGRAPH ADMIN REQUEST] Error sending request to ${finalUrl}:`, error.message);
    if (error.response) {
      console.error('[DGRAPH ADMIN REQUEST] Response status:', error.response.status);
      console.error('[DGRAPH ADMIN REQUEST] Response data:', error.response.data);
      return {
        success: false,
        error: `Dgraph admin request failed: ${error.response.status} - ${error.response.statusText}`,
        details: error.response.data
      };
    } else if (error.request) {
      return {
        success: false,
        error: `No response received from Dgraph admin at ${finalUrl}`
      };
    } else {
      return {
        success: false,
        error: `Error setting up Dgraph admin request: ${error.message}`
      };
    }
  }
}

module.exports = { sendDgraphAdminRequest };
