import axios from 'axios';

// Axios interceptor to inject hierarchy and tenant headers for all requests
axios.interceptors.request.use(config => {
  config.headers = config.headers || {};
  
  // Add hierarchy header for mutations
  if (config.data && config.data.mutation) {
    const hierarchyId = localStorage.getItem('hierarchyId');
    if (hierarchyId) {
      config.headers['X-Hierarchy-Id'] = hierarchyId;
    }
  }
  
  // Only add tenant header if not in default/OSS mode
  const tenantId = localStorage.getItem('tenantId') || 'default';
  if (tenantId !== 'default') {
    config.headers['X-Tenant-Id'] = tenantId;
  }
  
  return config;
}, error => Promise.reject(error));

import { NodeData, ApiMutationResponse, TraversalQueryResponse, RawNodeResponse } from '../types/graph';
import { GET_ALL_NODE_IDS_QUERY } from '../graphql/queries';
import { log } from '../utils/logger';

// Base URL for API endpoint loaded from Vite environment or fallback
const envUrl = (import.meta.env.VITE_API_BASE_URL as string)?.trim();
export const API_BASE_URL = envUrl && envUrl.length > 0 ? envUrl.replace(/\/$/, '') : '/api';

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
    const response = await axios.post<{ data: TraversalQueryResponse }>(
      `${API_BASE_URL}/traverse`,
      { rootId, hierarchyId }  // hierarchyId is now a string
    );
    return response.data.data;
  } catch (error) {
    log('ApiService', 'Error fetching traversal data:', error);
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
    const response = await axios.post<QueryResponse>(`${API_BASE_URL}/query`, {
      query,
      variables
    });
    return response.data;
  } catch (error) {
    log('ApiService', 'Error executing query:', error);
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
    let config = headers ? { headers } : undefined;
    if (config) {
      log('ApiService', 'Using custom headers:', config.headers);
    }
    
    // Ensure hierarchyId header is set from localStorage if not provided
    if (!headers?.['X-Hierarchy-Id']) {
      const hierarchyId = localStorage.getItem('hierarchyId');
      if (hierarchyId) {
        log('ApiService', 'Adding X-Hierarchy-Id header from localStorage:', hierarchyId);
        if (!config) {
          config = { headers: { 'X-Hierarchy-Id': hierarchyId } };
        } else {
          config.headers = { ...config.headers, 'X-Hierarchy-Id': hierarchyId };
        }
      }
    }
    
    const response = await axios.post<ApiMutationResponse>(
      `${API_BASE_URL}/mutate`,
      { mutation, variables },
      config
    );
    
    log('ApiService', 'Mutation response:', response.data);
    return response.data;
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: unknown } };
    if (axiosError.response && axiosError.response.data) {
      log('ApiService', 'Mutation error response data:', axiosError.response.data);
    }
    log('ApiService', 'Error executing mutation:', error);
    
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
    const response = await axios.get<string>(`${API_BASE_URL}/schema`, {
      responseType: 'text'
    });
    return response.data;
  } catch (error) {
    log('ApiService', 'Error fetching schema:', error);
    throw error;
  }
};

/**
 * Fetch API health status.
 */
export const fetchHealth = async (): Promise<HealthStatus> => {
  try {
    const response = await axios.get<HealthStatus>(`${API_BASE_URL}/health`);
    return response.data;
  } catch (error) {
    log('ApiService', 'Error fetching health status:', error);
    throw error;
  }
};

/**
 * Fetch system status including multi-tenant capabilities.
 */
export const fetchSystemStatus = async (): Promise<SystemStatus> => {
  try {
    const response = await axios.get<SystemStatus>(`${API_BASE_URL}/system/status`);
    return response.data;
  } catch (error) {
    log('ApiService', 'Error fetching system status:', error);
    throw error;
  }
};

export const fetchHierarchies = async (): Promise<{ id: string; name: string }[]> => {
  try {
    const response = await axios.get<{ id: string; name: string }[]>(`${API_BASE_URL}/hierarchy`);
    return response.data;
  } catch (error) {
    log('ApiService', 'Error fetching hierarchies:', error);
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
    const response = await axios.post(`${API_BASE_URL}/deleteNodeCascade`, { nodeId }, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { error?: string } } };
    log('ApiService', 'Error deleting node cascade:', error);
    throw new Error(axiosError?.response?.data?.error || 'Failed to delete node.');
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
