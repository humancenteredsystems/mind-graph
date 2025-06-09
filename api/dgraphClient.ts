import axios, { AxiosResponse } from 'axios';
import config from './config';
import { GraphQLRequest, GraphQLResponse, DgraphQueryResponse } from './src/types';
import { withNamespaceValidationAt } from './utils/namespaceValidator';

// Log the configuration values for debugging
console.log('[DGRAPHCLIENT DEBUG] Using DGRAPH_BASE_URL from config:', config.dgraphBaseUrl);
const DGRAPH_ENDPOINT = config.dgraphGraphqlUrl;
console.log('[DGRAPHCLIENT DEBUG] Final DGRAPH_ENDPOINT:', DGRAPH_ENDPOINT);

/**
 * Internal GraphQL execution function (without validation)
 */
async function executeGraphQLInternal<T = any>(
  query: string, 
  variables: Record<string, any> = {}, 
  namespace: string | null = null
): Promise<T> {
  const namespaceParam = namespace ? `?namespace=${namespace}` : '';
  const endpoint = `${DGRAPH_ENDPOINT}${namespaceParam}`;
  
  console.log(`[DGRAPH] Executing query in namespace: ${namespace || 'default'}`);
  console.log(`Executing GraphQL query: ${query.substring(0, 100)}...`, variables); // Log query start
  
  try {
    const requestData: GraphQLRequest = {
      query,
      variables,
    };

    const response: AxiosResponse<DgraphQueryResponse<T>> = await axios.post(endpoint, requestData, {
      headers: { 'Content-Type': 'application/json' }
    });

    // Check for GraphQL errors in the response body
    if (response.data.errors) {
      console.error('GraphQL Errors:', JSON.stringify(response.data.errors, null, 2));
      throw new Error(`GraphQL query failed: ${response.data.errors.map((e: any) => e.message).join(', ')}`);
    }

    console.log('GraphQL query executed successfully.'); // Log success
    console.log('[DGRAPH CLIENT] response.data:', response.data);
    console.log('[DGRAPH CLIENT] returning data:', response.data.data);
    return response.data.data; // Return only the data part of the response

  } catch (error: any) {
    console.error(`Dgraph client error in namespace ${namespace || 'default'}: ${error.message}`);
    if (error.response) {
      // Error from the HTTP request itself (e.g., 4xx, 5xx)
      console.error('Dgraph response status:', error.response.status);
      console.error('Dgraph response data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Dgraph request error: No response received.', error.request);
    } else {
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
export const executeGraphQL = withNamespaceValidationAt(
  executeGraphQLInternal,
  'GraphQL execution',
  2
);

export { executeGraphQL as default };
