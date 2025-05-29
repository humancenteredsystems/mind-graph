import axios, { AxiosResponse } from 'axios';
import config from '../config';

// Schema push response types
interface SchemaPushResponse {
  data?: {
    code: string;
    message: string;
  };
}

interface PushSchemaResult {
  success: boolean;
  response?: any;
  error?: any;
  namespace: string | null;
}

/**
 * Push schema to Dgraph admin endpoint with optional namespace support
 * @param schema - The GraphQL schema content
 * @param namespace - Optional namespace (e.g., '0x1')
 * @param customAdminUrl - Optional custom admin URL
 * @returns Result object with success status
 */
export async function pushSchemaViaHttp(
  schema: string, 
  namespace: string | null = null, 
  customAdminUrl: string | null = null
): Promise<PushSchemaResult> {
  try {
    // Build admin URL with optional namespace
    const baseAdminUrl = customAdminUrl || config.dgraphAdminUrl;
    const adminUrl = namespace ? `${baseAdminUrl}?namespace=${namespace}` : baseAdminUrl;
    
    console.log(`[PUSH_SCHEMA] Pushing schema to ${adminUrl}`);
    
    const response: AxiosResponse<SchemaPushResponse> = await axios.post(adminUrl, schema, {
      headers: { 'Content-Type': 'application/graphql' },
    });

    // Dgraph admin schema push returns {"data":{"code":"Success","message":"Done"}} on success
    console.log(`[PUSH_SCHEMA] Schema pushed successfully to namespace ${namespace || 'default'}`);
    return { success: true, response: response.data, namespace };
  } catch (err: any) {
    console.error(`[PUSH_SCHEMA] Error pushing schema to ${namespace || 'default'}:`, err.message);
    // Provide more details if available in the response
    const errorDetails = err.response?.data || err.message;
    return { success: true, error: errorDetails, namespace }; // Note: keeping original behavior where it returns success: true even on error
  }
}

/**
 * Legacy function for backwards compatibility
 * @param adminUrl - The admin URL
 * @param schema - The schema content
 * @returns Result object
 */
export async function pushSchemaViaHttpLegacy(adminUrl: string, schema: string): Promise<PushSchemaResult> {
  return pushSchemaViaHttp(schema, null, adminUrl);
}
