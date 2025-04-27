import axios from 'axios';

 // Base URL for API endpoint loaded from Vite environment or fallback
 // Determine API base URL from environment or default to '/api'
 const envUrl = (import.meta.env.VITE_API_BASE_URL as string)?.trim();
 const API_BASE_URL = envUrl && envUrl.length > 0 ? envUrl.replace(/\/$/, '') : '/api';

import { NodeData, EdgeData } from '../types/graph'; // Import from centralized types

// Define interfaces for expected data structures (optional but good practice)
// These should ideally match the structure returned by your Dgraph schema/API

interface TraversalResponse {
  queryNode: NodeData[]; // Assuming traverse returns nodes matching NodeData structure
  // The actual structure might be more nested depending on the query
}

interface QueryResponse {
  // Define based on your specific queries
  queryNode?: NodeData[];
  // Add other possible query results
}

interface MutateResponse {
  addNode?: { node: NodeData[] };
  addEdge?: { edge: EdgeData[] };
  updateNode?: { node: NodeData[] };
  deleteNode?: { node: NodeData[] };
}

interface HealthStatus {
  apiStatus: string;
  dgraphStatus: string;
  error?: string;
}


/**
 * Fetches graph data using the traversal endpoint.
 * @param rootId - The ID of the node to start traversal from.
 * @param currentLevel - Optional: The level of the rootId node, used to fetch only children at level+1.
 * @param fields - The node fields to retrieve. Defaults include 'level'.
 * @returns Promise resolving to the graph data.
 */
// Update signature: remove depth, add optional currentLevel
export const fetchTraversalData = async (rootId: string, currentLevel?: number, fields: string[] = ['id', 'label', 'type', 'level']): Promise<TraversalResponse> => {
  if (!rootId) {
    console.warn('[ApiService] fetchTraversalData skipped: missing rootId');
    return { queryNode: [] };
  }
  try {
    // Ensure 'level' is always requested if using default or if not present in custom fields
    const fieldsToRequest = fields.includes('level') ? fields : [...fields, 'level'];

  // Construct payload, include currentLevel if provided
  const payload: { rootId: string; currentLevel?: number; fields: string[] } = {
    rootId,
    fields: fieldsToRequest,
  };
  if (currentLevel !== undefined) {
    payload.currentLevel = currentLevel;
  }

    console.log(`[ApiService] Fetching traversal data for rootId: ${rootId}, currentLevel: ${currentLevel ?? 'N/A'}`); // Log update
    const response = await axios.post<TraversalResponse>(`${API_BASE_URL}/traverse`, payload); // Send updated payload
    console.log(`[ApiService] Received traversal data for rootId: ${rootId}`); // Log update
    // TODO: Add data transformation here if needed to flatten edges or structure data for Cytoscape
    return response.data;
  } catch (error) {
    console.error('Error fetching traversal data:', error);
    throw error; // Re-throw to be handled by the calling component
  }
};

/**
 * Executes an arbitrary GraphQL query.
 * @param query - The GraphQL query string.
 * @param variables - Optional variables for the query.
 * @returns Promise resolving to the query result data.
 */
export const executeQuery = async (query: string, variables?: Record<string, any>): Promise<QueryResponse> => {
  try {
    const response = await axios.post<QueryResponse>(`${API_BASE_URL}/query`, {
      query,
      variables,
    });
    return response.data;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
};

/**
 * Executes an arbitrary GraphQL mutation.
 * @param mutation - The GraphQL mutation string.
 * @param variables - Optional variables for the mutation.
 * @returns Promise resolving to the mutation result data.
 */
export const executeMutation = async (mutation: string, variables?: Record<string, any>): Promise<MutateResponse> => {
  try {
    const response = await axios.post<MutateResponse>(`${API_BASE_URL}/mutate`, {
      mutation,
      variables,
    });
    // Return the mutation response data
    return response.data;
  } catch (error) {
    console.error('Error executing mutation:', error);
    throw error;
  }
};

/**
 * Fetches the GraphQL schema string.
 * @returns Promise resolving to the schema string.
 */
export const fetchSchema = async (): Promise<string> => {
  try {
    // Expecting plain text response
    const response = await axios.get<string>(`${API_BASE_URL}/schema`, { responseType: 'text' });
    return response.data;
  } catch (error) {
    console.error('Error fetching schema:', error);
    throw error;
  }
};

/**
 * Fetches the API health status.
 * @returns Promise resolving to the health status object.
 */
export const fetchHealth = async (): Promise<HealthStatus> => {
  try {
    const response = await axios.get<HealthStatus>(`${API_BASE_URL}/health`);
    return response.data;
  } catch (error) {
    console.error('Error fetching health status:', error);
    throw error;
  }
};

 // Add other API functions as needed (e.g., search)

/**
 * Fetches all node IDs from the backend.
 * @returns Promise resolving to an array of node IDs.
 */
export const fetchAllNodeIds = async (): Promise<string[]> => {
  try {
    const query = `query { queryNode { id } }`;
    const result = await executeQuery(query);
    return result.queryNode?.map(node => node.id) ?? [];
  } catch (error) {
    console.error('Error fetching all node IDs:', error);
    throw error;
  }
};
