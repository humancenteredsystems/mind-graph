import axios, { AxiosInstance, AxiosError } from 'axios'; // Added AxiosInstance and AxiosError

// Base URL for API endpoint loaded from Vite environment or fallback
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string)?.replace(/\/$/, '') || '/api';

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


import { NodeData, ApiMutationResponse, TraversalQueryResponse } from '../types/graph';
import { GET_ALL_NODE_IDS_QUERY } from '../graphql/queries';
import { log } from '../utils/logger';


interface QueryResponse {
  queryNode?: NodeData[];
  queryHierarchy?: Array<{
    levels: Array<{
      id: string;
      levelNumber: number;
      label?: string;
      allowedTypes: Array<{
        id: string;
        typeName: string;
      }>;
    }>;
  }>;
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
): Promise<{ success: boolean; deletedNode: string; deletedEdgesCount: number; deletedNodesCount: number }> {
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
 * Search nodes by term using the backend search endpoint.
 */
export const fetchSearch = async (
  term: string,
  field: string = 'label'
): Promise<{ queryNode?: Array<{ id: string; label: string; type: string }> }> => {
  try {
    const response = await apiClient.get(`/search`, {
      params: { term, field }
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      log('ApiService', 'Axios error searching nodes:', error.toJSON());
      if (error.response) {
        log('ApiService', 'Error response data:', error.response.data);
      }
    } else {
      log('ApiService', 'Generic error searching nodes:', error);
    }
    throw error;
  }
};

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

// Admin API Functions
// -------------------------------------------------------------------

interface TestRunOptions {
  type: 'unit' | 'integration' | 'integration-real' | 'all';
  tenantId?: string;
  pattern?: string;
  coverage?: boolean;
}

interface TestRunResult {
  id: string;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  startTime: string;
  endTime?: string;
  exitCode?: number;
  output: string[];
  summary?: {
    passed: number;
    failed: number;
    total: number;
    suites: number;
  };
}

interface TenantInfo {
  tenantId: string;
  namespace: string;
  exists: boolean;
  isTestTenant: boolean;
  isDefaultTenant: boolean;
  health: 'healthy' | 'not-accessible' | 'error' | 'unknown';
  healthDetails?: string;
  mode?: 'OSS' | 'Enterprise';
}

/**
 * Execute admin API request with authentication
 */
const executeAdminRequest = async <T = unknown>(
  endpoint: string,
  data?: unknown,
  method: 'GET' | 'POST' | 'DELETE' = 'POST',
  adminKey?: string
): Promise<T> => {
  try {
    const headers: Record<string, string> = {};
    
    if (adminKey) {
      headers['X-Admin-API-Key'] = adminKey;
    }

    const config = {
      headers,
      ...(method === 'GET' ? { params: data } : {})
    };

    let response;
    if (method === 'GET') {
      response = await apiClient.get<T>(endpoint, config);
    } else if (method === 'DELETE') {
      response = await apiClient.delete<T>(endpoint, config);
    } else {
      response = await apiClient.post<T>(endpoint, data, config);
    }

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      log('ApiService', `Admin API error (${endpoint}):`, error.toJSON());
      if (error.response) {
        log('ApiService', 'Error response data:', error.response.data);
      }
    } else {
      log('ApiService', `Generic admin API error (${endpoint}):`, error);
    }
    throw error;
  }
};

/**
 * Start a test run
 */
export const startTestRun = async (
  options: TestRunOptions,
  adminKey: string
): Promise<{ runId: string; status: string; message: string }> => {
  return executeAdminRequest('/admin/test', options, 'POST', adminKey);
};

/**
 * Get test run status and results
 */
export const getTestRun = async (
  runId: string,
  adminKey: string
): Promise<TestRunResult> => {
  return executeAdminRequest(`/admin/test/${runId}`, undefined, 'GET', adminKey);
};

/**
 * Stop a running test
 */
export const stopTestRun = async (
  runId: string,
  adminKey: string
): Promise<{ message: string; runId: string; status: string }> => {
  return executeAdminRequest(`/admin/test/${runId}/stop`, {}, 'POST', adminKey);
};

/**
 * Get all active test runs
 */
export const getActiveTestRuns = async (
  adminKey: string
): Promise<{ activeRuns: TestRunResult[]; count: number }> => {
  return executeAdminRequest('/admin/test', undefined, 'GET', adminKey);
};

/**
 * Create Server-Sent Events connection for test output streaming
 */
export const createTestStreamConnection = (
  runId: string,
  adminKey: string,
  onMessage: (data: unknown) => void,
  onError?: (error: Event) => void,
  onClose?: () => void
): EventSource => {
  const url = `${API_BASE_URL}/admin/test/${runId}/stream`;
  const eventSource = new EventSource(url);

  // Add admin key to the request (note: EventSource doesn't support custom headers)
  // We'll need to modify the backend to accept admin key as query parameter for SSE
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (error) {
      log('ApiService', 'Error parsing SSE message:', error);
    }
  };

  eventSource.onerror = (event) => {
    log('ApiService', 'SSE connection error:', event);
    if (onError) onError(event);
  };

  eventSource.addEventListener('close', () => {
    log('ApiService', 'SSE connection closed');
    if (onClose) onClose();
  });

  return eventSource;
};

/**
 * Seed test data in a tenant
 */
export const seedTenantData = async (
  tenantId: string,
  dataType: 'sample' | 'test' | 'minimal' = 'test',
  clearFirst: boolean = false,
  adminKey: string
): Promise<{ message: string; tenantId: string; tenant: TenantInfo }> => {
  return executeAdminRequest('/admin/tenant/seed', {
    tenantId,
    dataType,
    clearFirst
  }, 'POST', adminKey);
};

/**
 * Reset a tenant completely
 */
export const resetTenant = async (
  tenantId: string,
  adminKey: string,
  allowSystemTenant: boolean = false
): Promise<{ message: string; tenantId: string; tenant: TenantInfo }> => {
  return executeAdminRequest('/admin/tenant/reset', {
    tenantId,
    confirmTenantId: tenantId,
    allowSystemTenant
  }, 'POST', adminKey);
};

/**
 * Get detailed tenant status
 */
export const getTenantStatus = async (
  tenantId: string,
  adminKey: string
): Promise<TenantInfo> => {
  return executeAdminRequest(`/admin/tenant/${tenantId}/status`, undefined, 'GET', adminKey);
};

/**
 * List all tenants with their status
 */
export const listTenants = async (
  adminKey: string
): Promise<{ tenants: TenantInfo[]; count: number }> => {
  // Use the updated admin tenant list endpoint
  const result = await executeAdminRequest<{ tenants: TenantInfo[]; count: number }>('/admin/tenant/list', undefined, 'GET', adminKey);
  return {
    tenants: result.tenants || [],
    count: result.count || 0
  };
};

/**
 * Create a new tenant
 */
export const createTenant = async (
  tenantId: string,
  adminKey: string
): Promise<{ message: string; tenant: TenantInfo; namespace: string }> => {
  return executeAdminRequest('/tenant', { tenantId }, 'POST', adminKey);
};

/**
 * Delete a tenant
 */
export const deleteTenant = async (
  tenantId: string,
  adminKey: string
): Promise<{ message: string; tenantId: string }> => {
  return executeAdminRequest(`/tenant/${tenantId}`, undefined, 'DELETE', adminKey);
};

/**
 * Get schema content for a tenant
 */
export const getTenantSchema = async (
  tenantId: string,
  adminKey: string
): Promise<{
  tenantId: string;
  schemaInfo: { id: string; name: string; isDefault: boolean; };
  content: string;
  retrievedAt: string;
}> => {
  return executeAdminRequest(`/admin/tenant/${tenantId}/schema`, undefined, 'GET', adminKey);
};
