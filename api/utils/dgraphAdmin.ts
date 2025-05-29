import axios from 'axios';
import { AdminOperationResult } from '../src/types/graphql';

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
export async function sendDgraphAdminRequest(
  url: string, 
  payload: object, 
  namespace: string | null = null
): Promise<AdminOperationResult> {
  // Build URL with optional namespace parameter
  const finalUrl = namespace ? `${url}?namespace=${namespace}` : url;
  
  try {
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
    const err = error as any; // Using any for axios error handling
    console.error(`[DGRAPH ADMIN REQUEST] Error sending request to ${finalUrl}:`, err.message);
    if (err.response) {
      console.error('[DGRAPH ADMIN REQUEST] Response status:', err.response.status);
      console.error('[DGRAPH ADMIN REQUEST] Response data:', err.response.data);
      return {
        success: false,
        error: `Dgraph admin request failed: ${err.response.status} - ${err.response.statusText}`,
        details: err.response.data
      };
    } else if (err.request) {
      return {
        success: false,
        error: `No response received from Dgraph admin at ${finalUrl}`
      };
    } else {
      return {
        success: false,
        error: `Error setting up Dgraph admin request: ${err.message}`
      };
    }
  }
}
