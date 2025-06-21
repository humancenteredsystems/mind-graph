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
  type: 'unit' | 'integration' | 'integration-real' | 'linting' | 'all';
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
  compilationErrors?: {
    count: number;
    files: string[];
    hasErrors: boolean;
  };
  lintResults?: {
    frontend: LintProjectResult;
    backend: LintProjectResult;
    summary: {
      totalErrors: number;
      totalWarnings: number;
      totalFiles: number;
    };
  };
}

interface LintProjectResult {
  errors: number;
  warnings: number;
  files: LintFile[];
  configured: boolean;
}

interface LintFile {
  filePath: string;
  errorCount: number;
  warningCount: number;
  issues: LintIssue[];
}

interface LintIssue {
  line: number;
  column: number;
  rule: string;
  severity: 'error' | 'warning';
  message: string;
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
  return executeAdminRequest('/test', options, 'POST', adminKey);
};

/**
 * Get test run status and results
 */
export const getTestRun = async (
  runId: string,
  adminKey: string
): Promise<TestRunResult> => {
  return executeAdminRequest(`/test/${runId}`, undefined, 'GET', adminKey);
};

/**
 * Stop a running test
 */
export const stopTestRun = async (
  runId: string,
  adminKey: string
): Promise<{ message: string; runId: string; status: string }> => {
  return executeAdminRequest(`/test/${runId}/stop`, {}, 'POST', adminKey);
};

/**
 * Get all active test runs
 */
export const getActiveTestRuns = async (
  adminKey: string
): Promise<{ activeRuns: TestRunResult[]; count: number }> => {
  return executeAdminRequest('/test', undefined, 'GET', adminKey);
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
  const url = `${API_BASE_URL}/test/${runId}/stream?adminKey=${encodeURIComponent(adminKey)}`;
  const eventSource = new EventSource(url);
  
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

/**
 * Run linting on frontend and backend code
 */
export const runLinting = async (
  adminKey: string
): Promise<{
  success: boolean;
  results: {
    frontend: LintProjectResult;
    backend: LintProjectResult;
    summary: {
      totalErrors: number;
      totalWarnings: number;
      totalFiles: number;
    };
  };
  executedAt: string;
}> => {
  return executeAdminRequest('/admin/test/lint', {}, 'POST', adminKey);
};

/**
 * Push schema to a tenant
 */
export const pushTenantSchema = async (
  tenantId: string,
  schema?: string,
  schemaId?: string,
  adminKey?: string
): Promise<{
  success: boolean;
  results: {
    success: boolean;
    error?: string;
    details?: string;
  };
}> => {
  const headers: Record<string, string> = {};
  
  if (adminKey) {
    headers['X-Admin-API-Key'] = adminKey;
  }
  
  // Add tenant header for the schema push
  headers['X-Tenant-Id'] = tenantId;
  
  const payload: any = {};
  if (schema) payload.schema = schema;
  if (schemaId) payload.schemaId = schemaId;
  
  return executeAdminRequest('/admin/schema', payload, 'POST', adminKey);
};

/**
 * Clear nodes and edges from a tenant (safe namespace-scoped deletion)
 */
export const clearTenantData = async (
  tenantId: string,
  adminKey: string
): Promise<{
  success: boolean;
  message: string;
  deletedNodes: number;
  deletedEdges: number;
  tenantId: string;
  error?: string;
}> => {
  const headers: Record<string, string> = {};
  
  if (adminKey) {
    headers['X-Admin-API-Key'] = adminKey;
  }
  
  // Add tenant header for the operation
  headers['X-Tenant-Id'] = tenantId;
  
  return executeAdminRequest('/admin/tenant/clear-data', {
    tenantId
  }, 'POST', adminKey);
};

/**
 * Clear schema from a tenant (push minimal schema)
 */
export const clearTenantSchema = async (
  tenantId: string,
  adminKey: string
): Promise<{
  success: boolean;
  message: string;
  tenantId: string;
  error?: string;
}> => {
  return executeAdminRequest('/admin/tenant/clear-schema', {
    tenantId
  }, 'POST', adminKey);
};

// Schema Management Functions
// -------------------------------------------------------------------

/**
 * Push a specific schema to a tenant by schema ID
 */
export const pushSchema = async (
  tenantId: string,
  schemaId: string,
  adminKey: string
): Promise<{
  success: boolean;
  results: {
    success: boolean;
    error?: string;
    details?: string;
  };
}> => {
  // Set tenant header for this specific request
  const headers: Record<string, string> = {
    'X-Tenant-Id': tenantId
  };
  
  if (adminKey) {
    headers['X-Admin-API-Key'] = adminKey;
  }

  try {
    const response = await apiClient.post('/admin/schema', {
      schemaId
    }, { headers });
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      log('ApiService', `Error pushing schema ${schemaId} to tenant ${tenantId}:`, error.toJSON());
      if (error.response) {
        log('ApiService', 'Error response data:', error.response.data);
      }
    } else {
      log('ApiService', `Generic error pushing schema ${schemaId} to tenant ${tenantId}:`, error);
    }
    throw error;
  }
};

/**
 * Read current schema information for a tenant
 */
export const readSchema = async (
  tenantId: string,
  adminKey: string
): Promise<{
  tenantId: string;
  schemaInfo: { id: string; name: string; isDefault: boolean; };
  retrievedAt: string;
}> => {
  const result = await getTenantSchema(tenantId, adminKey);
  return {
    tenantId: result.tenantId,
    schemaInfo: result.schemaInfo,
    retrievedAt: result.retrievedAt
  };
};

interface SchemaInfo {
  id: string;
  name: string;
  description: string;
  path: string;
  owner: string;
  created_at: string;
  updated_at: string;
  is_production?: boolean;
  is_template?: boolean;
}

/**
 * List all available schemas from the schema registry
 */
export const listAvailableSchemas = async (
  adminKey: string
): Promise<{ schemas: SchemaInfo[] }> => {
  return executeAdminRequest('/schemas', undefined, 'GET', adminKey);
};

/**
 * Get schema content by ID from the schema registry
 */
export const getSchemaContent = async (
  schemaId: string,
  adminKey: string
): Promise<string> => {
  try {
    const response = await apiClient.get<string>(`/schemas/${schemaId}/content`, {
      headers: {
        'X-Admin-API-Key': adminKey
      },
      responseType: 'text'
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      log('ApiService', `Error fetching schema content for ${schemaId}:`, error.toJSON());
      if (error.response) {
        log('ApiService', 'Error response data:', error.response.data);
      }
    } else {
      log('ApiService', `Generic error fetching schema content for ${schemaId}:`, error);
    }
    throw error;
  }
};

/**
 * Get schema metadata by ID from the schema registry
 */
export const getSchemaById = async (
  schemaId: string,
  adminKey: string
): Promise<SchemaInfo> => {
  return executeAdminRequest(`/schemas/${schemaId}`, undefined, 'GET', adminKey);
};

/**
 * Push a specific schema by ID to a tenant
 */
export const pushSchemaById = async (
  tenantId: string,
  schemaId: string,
  adminKey: string
): Promise<{
  success: boolean;
  results: {
    success: boolean;
    error?: string;
    details?: string;
  };
}> => {
  // Use the existing pushTenantSchema function with schemaId
  return pushTenantSchema(tenantId, undefined, schemaId, adminKey);
};

/**
 * Read current schema information for a tenant
 */
export const readTenantSchemaInfo = async (
  tenantId: string,
  adminKey: string
): Promise<{
  tenantId: string;
  schemaInfo: { id: string; name: string; isDefault: boolean; };
  retrievedAt: string;
}> => {
  const result = await getTenantSchema(tenantId, adminKey);
  return {
    tenantId: result.tenantId,
    schemaInfo: result.schemaInfo,
    retrievedAt: result.retrievedAt
  };
};


/**
 * Full tenant reset with fresh schema
 */
export const fullTenantReset = async (
  tenantId: string,
  adminKey: string,
  useDefaultSchema: boolean = true
): Promise<{
  success: boolean;
  message: string;
  steps: string[];
  errors?: string[];
}> => {
  const steps: string[] = [];
  const errors: string[] = [];
  
  try {
    // Step 1: Clear all data
    steps.push('Clearing tenant data...');
    await clearTenantData(tenantId, adminKey);
    steps.push('✅ Data cleared');
    
    // Step 2: Push fresh schema using schemaId
    if (useDefaultSchema) {
      steps.push('Pushing default schema...');
      await pushTenantSchema(tenantId, undefined, 'default', adminKey);
      steps.push('✅ Schema pushed');
    }
    
    // Step 3: Seed basic test data (optional)
    steps.push('Seeding test data...');
    await seedTenantData(tenantId, 'test', false, adminKey);
    steps.push('✅ Test data seeded');
    
    return {
      success: true,
      message: `Tenant ${tenantId} fully reset and ready`,
      steps
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(errorMsg);
    steps.push(`❌ Error: ${errorMsg}`);
    
    return {
      success: false,
      message: `Tenant reset failed: ${errorMsg}`,
      steps,
      errors
    };
  }
};

// Import/Export API Functions
// -------------------------------------------------------------------

export interface ImportFileAnalysis {
  fileId: string;
  format: 'json' | 'csv' | 'graphml';
  nodeCount: number;
  edgeCount: number;
  hierarchyCount: number;
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  preview: {
    nodes: any[];
    edges: any[];
    hierarchies: any[];
    sampleSize: number;
  };
}

export interface ImportPreview {
  nodes: any[];
  edges: any[];
  hierarchies: any[];
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  conflicts: Array<{
    type: 'node' | 'edge' | 'hierarchy';
    id: string;
    action: 'create' | 'update' | 'skip';
    reason: string;
  }>;
}

export interface JobStatus {
  jobId: string;
  type: 'import' | 'export';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message: string;
  startedAt: string;
  completedAt?: string;
  error?: string;
  result?: any;
}

export interface ExportFormat {
  id: string;
  name: string;
  description: string;
  extension: string;
  mimeType: string;
  supportsFiltering: boolean;
}

/**
 * Upload and analyze import file
 */
export const uploadImportFile = async (
  file: File
): Promise<{
  success: boolean;
  fileId: string;
  analysis: ImportFileAnalysis;
  uploadedAt: string;
}> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await apiClient.post('/import/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      log('ApiService', 'Error uploading import file:', error.toJSON());
      if (error.response) {
        log('ApiService', 'Error response data:', error.response.data);
      }
    } else {
      log('ApiService', 'Generic error uploading import file:', error);
    }
    throw error;
  }
};

/**
 * Generate import preview with field mapping
 */
export const generateImportPreview = async (
  fileId: string,
  mapping: any
): Promise<{
  success: boolean;
  preview: ImportPreview;
}> => {
  try {
    const response = await apiClient.post('/import/preview', {
      fileId,
      mapping
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      log('ApiService', 'Error generating import preview:', error.toJSON());
      if (error.response) {
        log('ApiService', 'Error response data:', error.response.data);
      }
    } else {
      log('ApiService', 'Generic error generating import preview:', error);
    }
    throw error;
  }
};

/**
 * Execute import with specified options
 */
export const executeImport = async (
  fileId: string,
  options: any
): Promise<{
  success: boolean;
  jobId: string;
  message: string;
  startedAt: string;
}> => {
  try {
    const response = await apiClient.post('/import/execute', {
      fileId,
      options
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      log('ApiService', 'Error executing import:', error.toJSON());
      if (error.response) {
        log('ApiService', 'Error response data:', error.response.data);
      }
    } else {
      log('ApiService', 'Generic error executing import:', error);
    }
    throw error;
  }
};

/**
 * Get import job status
 */
export const getImportJobStatus = async (
  jobId: string
): Promise<{
  success: boolean;
  job: JobStatus;
}> => {
  try {
    const response = await apiClient.get(`/import/status/${jobId}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      log('ApiService', 'Error getting import job status:', error.toJSON());
      if (error.response) {
        log('ApiService', 'Error response data:', error.response.data);
      }
    } else {
      log('ApiService', 'Generic error getting import job status:', error);
    }
    throw error;
  }
};

/**
 * Get available export formats
 */
export const getExportFormats = async (): Promise<{
  success: boolean;
  formats: ExportFormat[];
}> => {
  try {
    const response = await apiClient.get('/export/formats');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      log('ApiService', 'Error getting export formats:', error.toJSON());
      if (error.response) {
        log('ApiService', 'Error response data:', error.response.data);
      }
    } else {
      log('ApiService', 'Generic error getting export formats:', error);
    }
    throw error;
  }
};

/**
 * Execute export with specified options
 */
export const executeExport = async (
  format: string,
  filters: any,
  options: any
): Promise<{
  success: boolean;
  jobId: string;
  format: string;
  message: string;
  startedAt: string;
}> => {
  try {
    const response = await apiClient.post('/export/execute', {
      format,
      filters,
      options
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      log('ApiService', 'Error executing export:', error.toJSON());
      if (error.response) {
        log('ApiService', 'Error response data:', error.response.data);
      }
    } else {
      log('ApiService', 'Generic error executing export:', error);
    }
    throw error;
  }
};

/**
 * Get export job status
 */
export const getExportJobStatus = async (
  jobId: string
): Promise<{
  success: boolean;
  job: JobStatus;
}> => {
  try {
    const response = await apiClient.get(`/export/status/${jobId}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      log('ApiService', 'Error getting export job status:', error.toJSON());
      if (error.response) {
        log('ApiService', 'Error response data:', error.response.data);
      }
    } else {
      log('ApiService', 'Generic error getting export job status:', error);
    }
    throw error;
  }
};

/**
 * Download exported file
 */
export const downloadExportFile = async (
  jobId: string
): Promise<void> => {
  try {
    const response = await apiClient.get(`/export/download/${jobId}`, {
      responseType: 'blob'
    });

    // Extract filename from Content-Disposition header
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'export.json';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    // Create download link
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

  } catch (error) {
    if (axios.isAxiosError(error)) {
      log('ApiService', 'Error downloading export file:', error.toJSON());
      if (error.response) {
        log('ApiService', 'Error response data:', error.response.data);
      }
    } else {
      log('ApiService', 'Generic error downloading export file:', error);
    }
    throw error;
  }
};

/**
 * Cancel import/export job
 */
export const cancelJob = async (
  jobId: string
): Promise<{
  success: boolean;
  jobId: string;
  message: string;
  cancelledAt: string;
}> => {
  try {
    const response = await apiClient.post(`/job/${jobId}/cancel`, {});
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      log('ApiService', 'Error cancelling job:', error.toJSON());
      if (error.response) {
        log('ApiService', 'Error response data:', error.response.data);
      }
    } else {
      log('ApiService', 'Generic error cancelling job:', error);
    }
    throw error;
  }
};

/**
 * Execute direct export and trigger download immediately
 */
export const executeDirectExport = async (
  format: string,
  filters: any,
  options: any
): Promise<void> => {
  try {
    const response = await apiClient.post('/export/direct', {
      format,
      filters,
      options
    }, {
      responseType: 'blob'
    });

    // Extract filename from Content-Disposition header
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'export.json';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    // Create download link
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

  } catch (error) {
    if (axios.isAxiosError(error)) {
      log('ApiService', 'Error executing direct export:', error.toJSON());
      if (error.response) {
        log('ApiService', 'Error response data:', error.response.data);
      }
    } else {
      log('ApiService', 'Generic error executing direct export:', error);
    }
    throw error;
  }
};

/**
 * Execute direct import and return result immediately
 */
export const executeDirectImport = async (
  file: File
): Promise<{
  success: boolean;
  message: string;
  result: {
    nodesImported: number;
    edgesImported: number;
    hierarchiesImported: number;
  };
  importedAt: string;
}> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await apiClient.post('/import/direct', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      log('ApiService', 'Error executing direct import:', error.toJSON());
      if (error.response) {
        log('ApiService', 'Error response data:', error.response.data);
      }
    } else {
      log('ApiService', 'Generic error executing direct import:', error);
    }
    throw error;
  }
};
