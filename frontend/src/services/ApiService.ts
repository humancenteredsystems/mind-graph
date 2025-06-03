import axios, { AxiosInstance, AxiosError } from 'axios'; // Added AxiosInstance and AxiosError

// Base URL for API endpoint loaded from Vite environment or fallback
const envUrl = (import.meta.env.VITE_API_BASE_URL as string)?.trim();
export const API_BASE_URL = envUrl && envUrl.length > 0 ? envUrl.replace(/\/$/, '') : '/api';

// Create a dedicated Axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Added: Assuming cookie-based sessions are used
});

// Axios interceptor to inject hierarchy and tenant headers for all requests made by apiClient
apiClient.interceptors.request.use(config => {
  config.headers = config.headers || {};

  // Always add tenant header (including 'default' for OSS mode)
  const tenantId = localStorage.getItem('tenantId') || 'default';
  config.headers['X-Tenant-Id'] = tenantId;

  // Add hierarchy header for mutations (if this logic is still needed here)
  // Ensure this doesn't conflict with headers passed directly to post/get calls
  // The interceptor runs for *all* requests made by this instance.
  // For mutations, the original code checked config.data.mutation.
  // This check needs to be adapted if you want it specific to certain calls.
  // A common pattern is to have specific functions add specific headers if they aren't universally needed.
  if (config.method === 'post' && config.data && typeof config.data === 'object' && 'mutation' in config.data) {
     const hierarchyId = localStorage.getItem('hierarchyId');
     if (hierarchyId) {
       config.headers['X-Hierarchy-Id'] = hierarchyId;
     }
  }

  return config;
}, error => Promise.reject(error));


import { NodeData, ApiMutationResponse, TraversalQueryResponse, RawNodeResponse } from '../types/graph';
import { GET_ALL_NODE_IDS_QUERY } from '../graphql/queries';
import { log } from '../utils/logger';


interface QueryResponse {
  queryNode?: NodeData[];
}

interface RawEdgeResponse {
  from?: { id: string };
  fromId?: string;
  to?: { id: string };
  toId?: string;
  type?: string;
}

interface HealthStatus {
  apiStatus: string;
  dgraphStatus: string;
  error?: string;
}

interface SystemStatus {
  dgraphEnterprise: boolean;
  multiTenantVerified: boolean;
  currentTenant: string;
  namespace: string | null;
  mode: 'multi-tenant' | 'single-tenant';
  detectedAt: string;
  version?: string;
  detectionError?: string;
  namespacesSupported?: boolean;
}

/**
 * Fetch traversal data given rootId and hierarchyId.
 */
export const fetchTraversalData = async (
  rootId: string,
  hierarchyId: string  // Changed from number to string
): Promise<TraversalQueryResponse> => {
  if (!rootId || !hierarchyId) { // Check for falsy hierarchyId (empty string or undefined)
    log('ApiService', 'fetchTraversalData skipped: missing rootId or hierarchyId');
    return { queryNode: [] };
  }
  try {
    const response = await apiClient.post<{ data: TraversalQueryResponse }>( // Changed axios to apiClient
      `/traverse`, // Removed API_BASE_URL as it's in the instance config
      { rootId, hierarchyId }  // hierarchyId is now a string
    );
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) { // Enhanced error logging
      log('ApiService', 'Axios error fetching traversal data:', error.toJSON());
      if (error.response) {
        log('ApiService', 'Error response data:', error.response.data);
      }
    } else {
      log('ApiService', 'Generic error fetching traversal data:', error);
    }
    throw error;
  }
};


/**
 * Executes arbitrary GraphQL query.
 */
export const executeQuery = async (
  query: string,
  variables?: Record<string, unknown>
): Promise<QueryResponse> => {
  try {
    const response = await apiClient.post<QueryResponse>(`/query`, { // Changed axios to apiClient, removed API_BASE_URL
      query,
      variables
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) { // Enhanced error logging
      log('ApiService', 'Axios error executing query:', error.toJSON());
      if (error.response) {
        log('ApiService', 'Error response data:', error.response.data);
      }
    } else {
      log('ApiService', 'Generic error executing query:', error);
    }
    throw error;
  }
};

/**
 * Executes arbitrary GraphQL mutation.
 */
export const executeMutation = async (
  mutation: string,
  variables?: Record<string, unknown>,
  headers?: Record<string, string>
): Promise<ApiMutationResponse> => {
  try {
    // Log the mutation and variables for debugging
    log('ApiService', 'Executing mutation:', mutation);
    log('ApiService', 'Mutation variables:', JSON.stringify(variables, null, 2));

    // Use let instead of const for config so we can modify it
    const config = headers ? { headers } : undefined;
    if (config) {
      log('ApiService', 'Using custom headers:', config.headers);
    }

    // Removed redundant X-Hierarchy-Id logic - handled by interceptor

    const response = await apiClient.post<ApiMutationResponse>( // Changed axios to apiClient, removed API_BASE_URL
      `/mutate`,
      { mutation, variables },
      config
    );

    log('ApiService', 'Mutation response:', response.data);
    return response.data;
  } catch (error: unknown) {
    // const axiosError = error as { response?: { data?: unknown } }; // Removed redundant type assertion
    if (axios.isAxiosError(error)) { // Enhanced error logging
      log('ApiService', 'Axios error executing mutation:', error.toJSON());
      if (error.response) {
        log('ApiService', 'Mutation error response data:', error.response.data);
      }
    } else {
      log('ApiService', 'Generic error executing mutation:', error);
    }

    // Log additional details about the request that failed
    log('ApiService', 'Failed mutation:', mutation);
    log('ApiService', 'Failed variables:', JSON.stringify(variables, null, 2));

    throw error;
  }
};

/**
 * Fetch GraphQL schema string.
 */
export const fetchSchema = async (): Promise<string> => {
  try {
    const response = await apiClient.get<string>(`/schema`, { // Changed axios to apiClient, removed API_BASE_URL
      responseType: 'text'
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) { // Enhanced error logging
      log('ApiService', 'Axios error fetching schema:', error.toJSON());
      if (error.response) {
        log('ApiService', 'Error response data:', error.response.data);
      }
    } else {
      log('ApiService', 'Generic error fetching schema:', error);
    }
    throw error;
  }
};

/**
 * Fetch API health status.
 */
export const fetchHealth = async (): Promise<HealthStatus> => {
  try {
    const response = await apiClient.get<HealthStatus>(`/health`); // Changed axios to apiClient, removed API_BASE_URL
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) { // Enhanced error logging
      log('ApiService', 'Axios error fetching health status:', error.toJSON());
      if (error.response) {
        log('ApiService', 'Error response data:', error.response.data);
      }
    } else {
      log('ApiService', 'Generic error fetching health status:', error);
    }
    throw error;
  }
};

/**
 * Fetch system status including multi-tenant capabilities.
 */
export const fetchSystemStatus = async (): Promise<SystemStatus> => {
  try {
    const response = await apiClient.get<SystemStatus>(`/system/status`); // Changed axios to apiClient, removed API_BASE_URL
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) { // Enhanced error logging
      log('ApiService', 'Axios error fetching system status:', error.toJSON());
      if (error.response) {
        log('ApiService', 'Error response data:', error.response.data);
      }
    } else {
      log('ApiService', 'Generic error fetching system status:', error);
    }
    throw error;
  }
};

export const fetchHierarchies = async (): Promise<{ id: string; name: string }[]> => {
  try {
    const response = await apiClient.get<{ id: string; name: string }[]>(`/hierarchy`); // Changed axios to apiClient, removed API_BASE_URL
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) { // Enhanced error logging
      log('ApiService', 'Axios error fetching hierarchies:', error.toJSON());
      if (error.response) {
        log('ApiService', 'Error response data:', error.response.data);
      }
    } else {
      log('ApiService', 'Generic error fetching hierarchies:', error);
    }
    throw error;
  }
};

/**
 * Delete node and associated edges (cascade).
 */
export async function deleteNodeCascade(
  nodeId: string
): Promise<{ deletedEdgesCount: number; deletedNodesCount: number; deletedNodeId: string }> {
  try {
    const response = await apiClient.post(`/deleteNodeCascade`, { nodeId }, { // Changed axios to apiClient, removed API_BASE_URL
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error: unknown) {
    // const axiosError = error as { response?: { data?: { error?: string } } }; // Removed redundant type assertion
    if (axios.isAxiosError(error)) { // Enhanced error logging
      log('ApiService', 'Axios error deleting node cascade:', error.toJSON());
      if (error.response) {
        log('ApiService', 'Error response data:', error.response.data);
      }
    } else {
      log('ApiService', 'Generic error deleting node cascade:', error);
    }
    // log('ApiService', 'Error deleting node cascade:', error); // Removed redundant log
    throw new Error((error as AxiosError<{ error?: string }>).response?.data?.error || 'Failed to delete node.'); // Adjusted error handling
  }
}

/**
 * Fetch all node IDs.
 */
export const fetchAllNodeIds = async (): Promise<string[]> => {
  try {
    const result = await executeQuery(GET_ALL_NODE_IDS_QUERY);
    return result.queryNode?.map(node => node.id) ?? [];
  } catch (error) {
    log('ApiService', 'Error fetching all node IDs:', error);
    throw error;
  }
};
