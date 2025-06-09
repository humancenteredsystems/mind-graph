import axios, { AxiosResponse } from 'axios';
import config from '../config';
import { withNamespaceValidationAt } from './namespaceValidator';

// Schema push response types
interface SchemaPushResponse {
  data?: {
    code?: string;
    message?: string;
    error?: string;
  };
  code?: string;
  message?: string;
  error?: string;
}

interface PushSchemaResult {
  success: boolean;
  response?: any;
  error?: any;
  namespace: string | null;
}

/**
 * Internal schema push function (without validation)
 */
async function pushSchemaViaHttpInternal(
  schema: string, 
  namespace: string | null = null, 
  customAdminUrl: string | null = null
): Promise<PushSchemaResult> {
  try {
    // Build admin URL with optional namespace
    const baseAdminUrl = customAdminUrl || config.dgraphAdminUrl;
    const adminUrl = namespace ? `${baseAdminUrl}?namespace=${namespace}` : baseAdminUrl;
    
    console.log(`[PUSH_SCHEMA] Pushing schema to ${adminUrl}`);
    console.log(`[PUSH_SCHEMA] Schema content preview: ${schema.substring(0, 200)}...`);
    
    const response: AxiosResponse<SchemaPushResponse> = await axios.post(adminUrl, schema, {
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
    } else {
      console.error(`[PUSH_SCHEMA] ❌ Schema push returned non-success response: ${JSON.stringify(responseData)}`);
      return { 
        success: false, 
        error: `Schema push failed: ${responseData?.message || 'Unknown error'}`, 
        namespace 
      };
    }
  } catch (err: any) {
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
    } else if (err.request) {
      console.error(`[PUSH_SCHEMA] No response received:`, err.request);
      const baseAdminUrl = customAdminUrl || config.dgraphAdminUrl;
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
export const pushSchemaViaHttp = withNamespaceValidationAt(
  pushSchemaViaHttpInternal,
  'Schema push',
  1
);

/**
 * Legacy function for backwards compatibility
 * @param adminUrl - The admin URL
 * @param schema - The schema content
 * @returns Result object
 */
export async function pushSchemaViaHttpLegacy(adminUrl: string, schema: string): Promise<PushSchemaResult> {
  return pushSchemaViaHttp(schema, null, adminUrl);
}
