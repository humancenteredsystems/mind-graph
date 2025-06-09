import express, { Request, Response } from 'express';
import config from '../config';
import { adaptiveTenantFactory } from '../services/adaptiveTenantFactory';
import { enrichNodeInputs } from '../services/nodeEnrichment';
import { 
  InvalidLevelError, 
  NodeTypeNotAllowedError 
} from '../services/validation';
import axios from 'axios';
import { 
  GraphQLRequest, 
  GraphQLResponse,
  GraphQLOperation 
} from '../src/types/graphql';
import { Node } from '../src/types/domain';
import { validateNamespaceParam } from '../utils/namespaceValidator';

const router = express.Router();

// Use admin URL from config
const DGRAPH_ADMIN_SCHEMA_URL = config.dgraphAdminUrl;

// Helper function to get adaptive tenant-aware Dgraph client from request context
async function getTenantClient(req: Request) {
  // Convert TenantContext to UserContext format expected by adaptiveTenantFactory
  const userContext = req.tenantContext ? {
    namespace: req.tenantContext.namespace,
    tenantId: req.tenantContext.tenantId
  } : null;
  
  return await adaptiveTenantFactory.createTenantFromContext(userContext);
}

// Helper function to filter outgoing edges with missing target nodes
function filterValidOutgoingEdges(node: Node): Node {
  if (!node.outgoing) return node;

  const validOutgoing = node.outgoing.filter(edge =>
    edge.to && edge.to.id && edge.to.label
  );

  if (validOutgoing.length !== node.outgoing.length) {
    console.warn(`[TRAVERSAL] Node ${node.id} has ${node.outgoing.length - validOutgoing.length} invalid outgoing edges.`);
  }

  return { ...node, outgoing: validOutgoing };
}

// GraphQL Endpoints
// -------------------------------------------------------------------

// Endpoint to execute arbitrary GraphQL queries
router.post('/query', async (req: Request, res: Response): Promise<void> => {
  const { query, variables }: GraphQLRequest = req.body;
  if (!query) {
    res.status(400).json({ error: 'Missing required field: query' });
    return;
  }
    try {
      const tenantClient = await getTenantClient(req);
      const result = await tenantClient.executeGraphQL(query, variables || {});
      res.json(result);
  } catch (error) {
    const err = error as Error;
    console.error('[GRAPHQL] Failed to execute query:', error);
    const errorMessage = err.message.includes('GraphQL query failed:')
      ? `GraphQL error: ${err.message.replace('GraphQL query failed: ', '')}`
      : 'Server error executing query';
    const statusCode = err.message.includes('GraphQL query failed:') ? 400 : 500;
    res.status(statusCode).json({ error: errorMessage, details: err.message });
  }
});

// Endpoint to execute arbitrary GraphQL mutations
router.post('/mutate', async (req: Request, res: Response): Promise<void> => {
  let { mutation, variables = {} }: { mutation: string; variables?: any } = req.body;
  if (!mutation) {
    res.status(400).json({ error: 'Missing required field: mutation' });
    return;
  }

  // Check if this is a node creation mutation
  const isNodeCreation = mutation.includes('addNode') && variables && variables.input;
  const hierarchyIdFromHeader = req.headers['x-hierarchy-id'] as string;

  try {
    // Enrich addNode inputs with nested hierarchyAssignments
    // Focus on the operation being performed rather than specific mutation names
    
    // Only call enrichNodeInputs if variables has the expected structure
    if (variables && typeof variables === 'object' && 'input' in variables) {
      const tenantClient = await getTenantClient(req);
      variables = await enrichNodeInputs(variables, hierarchyIdFromHeader, mutation, tenantClient);
    }
    
    // For mutations that don't need transformation, or for addNode after input enrichment, execute normally
    // Log the input being sent to Dgraph for addNode mutations
    if (mutation.includes('AddNodeWithHierarchy')) {
        console.log('[MUTATE] Sending to Dgraph (AddNodeWithHierarchy):', JSON.stringify(variables, null, 2));
    }
    
    const tenantClient = await getTenantClient(req);
    const result = await tenantClient.executeGraphQL(mutation, variables || {});
    
    // Log the raw result received from Dgraph for addNode mutations
    if (mutation.includes('AddNodeWithHierarchy')) {
        console.log('[MUTATE] Received from Dgraph (AddNodeWithHierarchy):', JSON.stringify(result, null, 2));
    }
    console.log('[MUTATE] Dgraph result:', result); // Keep existing log for general mutations
    res.status(200).json(result); // Use 200 OK for mutations unless specifically creating (201)
  } catch (error) {
    const err = error as Error;
    console.error('[GRAPHQL] Failed to execute mutation:', error);
    
    // Handle validation errors with 400 status
    if (error instanceof InvalidLevelError || error instanceof NodeTypeNotAllowedError) {
      res.status(400).json({ error: err.message });
    } else if (err.message.includes('X-Hierarchy-Id header is required') ||
               err.message.includes('Invalid hierarchyId in header') ||
               err.message.includes('Hierarchy not found') ||
               err.message.includes('Invalid level or node type constraint violation') ||
               err.message.includes('Node type') && err.message.includes('is not allowed')) {
      // Handle enrichment validation errors as 400 Bad Request
      res.status(400).json({ error: err.message });
    } else if (err.message.includes('GraphQL query failed:')) {
      // Handle GraphQL-specific errors as 400 Bad Request
      const errorMessage = `GraphQL error: ${err.message.replace('GraphQL query failed: ', '')}`;
      res.status(400).json({ error: errorMessage, details: err.message });
    } else {
      // Handle genuine server errors as 500 Internal Server Error
      res.status(500).json({ error: 'Server error executing mutation', details: err.message });
    }
  }
});

router.post('/traverse', async (req: Request, res: Response): Promise<void> => {
  const { rootId }: { rootId: string } = req.body;
  if (!rootId) {
    res.status(400).json({ error: 'Missing required field: rootId' });
    return;
  }
  try {
    const tenantClient = await getTenantClient(req);
    const raw = await tenantClient.executeGraphQL(
      `query($rootId: String!) {
        queryNode(filter: { id: { eq: $rootId } }) {
          id
          label
          type
          status
          branch
          hierarchyAssignments {
            hierarchy { id name }
            level { id levelNumber label }
          }
          outgoing {
            type
            to { id label type status branch }
          }
        }
      }`,
      { rootId }
    );
    const data = raw.queryNode || [];
    const safe = data.map(filterValidOutgoingEdges);
    res.json({ data: { queryNode: safe } });
  } catch (error) {
    const err = error as Error;
    console.error('[GRAPHQL] Failed to execute traversal:', error);
    if (err.message?.startsWith('GraphQL query failed:')) {
      res.status(400).json({ error: `GraphQL error during traversal: ${err.message}`, details: err.message });
      return;
    }
    res.status(500).json({ error: 'Server error during traversal', details: err.message });
  }
});

// Endpoint for searching nodes (using @search directive fields)
router.get('/search', async (req: Request, res: Response): Promise<void> => {
  const { term, field = 'label' }: { term?: string; field?: string } = req.query;

  if (!term) {
    res.status(400).json({ error: 'Missing required query parameter: term' });
    return;
  }

  // Basic validation for field name
  const allowedFields = ['label']; // Only allow searching indexed fields
  if (!allowedFields.includes(field)) {
      res.status(400).json({ error: `Invalid search field: ${field}. Allowed fields: ${allowedFields.join(', ')}` });
      return;
  }

  const query = `
    query SearchNodes($term: String!) {
      queryNode(filter: { label: { allofterms: $term } }) {
        id
        label
        type
      }
    }
  `;

  const variables = { term };

  try {
    const tenantClient = await getTenantClient(req);
    const result = await tenantClient.executeGraphQL(query, variables);
    res.json(result);
  } catch (error) {
    const err = error as Error;
    console.error('[GRAPHQL] Failed to execute search:', error);
    if (err.message.startsWith('GraphQL query failed:')) {
       res.status(400).json({ error: `GraphQL error during search: ${err.message}`, details: err.message });
    } else {
       res.status(500).json({ error: 'Server error during search', details: err.message });
    }
  }
});

// Endpoint to get the current GraphQL schema from Dgraph
router.get('/schema', async (req: Request, res: Response): Promise<void> => {
    try {
        // Build namespace-aware admin URL
        const namespace = req.tenantContext?.namespace;
        
        // Validate namespace parameter before making request
        validateNamespaceParam(namespace, 'Schema fetch');
        
        const adminUrl = namespace 
          ? `${DGRAPH_ADMIN_SCHEMA_URL}?namespace=${namespace}`
          : DGRAPH_ADMIN_SCHEMA_URL;
        
        console.log(`[SCHEMA] Fetching schema from: ${adminUrl}`);
        
        // Use axios directly as this is an admin endpoint
        const response = await axios.get(adminUrl);
        // Dgraph returns schema text within response.data.data.schema
        if (response.data && response.data.data && response.data.data.schema) {
             res.type('text/plain').send(response.data.data.schema);
        } else {
             throw new Error('Schema not found in Dgraph admin response.');
        }
    } catch (error) {
        const err = error as Error;
        console.error('[GRAPHQL] Failed to fetch schema from Dgraph admin:', error);
        if (axios.isAxiosError(error) && error.response) {
            console.error('[GRAPHQL] Dgraph admin response status:', error.response.status);
            console.error('[GRAPHQL] Dgraph admin response data:', error.response.data);
        }
        res.status(500).json({ error: 'Failed to fetch schema from Dgraph', details: err.message });
    }
});

// Cascade delete endpoint for nodes and their related edges
router.post('/deleteNodeCascade', async (req: Request, res: Response): Promise<void> => {
  const { nodeId }: { nodeId: string } = req.body;

  if (!nodeId) {
    res.status(400).json({ error: 'Missing nodeId in request body.' });
    return;
  }

  try {
    console.log(`[DELETE NODE CASCADE] Attempting to delete node and connected edges for node: ${nodeId}`);

    const deleteMutation = `
      mutation DeleteNodeAndEdges($nodeId: String!) {
        deleteIncomingEdges: deleteEdge(filter: { toId: { eq: $nodeId } }) {
          msg
          numUids
        }
        deleteOutgoingEdges: deleteEdge(filter: { fromId: { eq: $nodeId } }) {
          msg
          numUids
        }
        deleteNode(filter: { id: { eq: $nodeId } }) {
          msg
          numUids
        }
      }
    `;

    const tenantClient = await getTenantClient(req);
    const result = await tenantClient.executeGraphQL(deleteMutation, { nodeId });

    console.log(`[DELETE NODE CASCADE] Dgraph delete result:`, result);

    const deletedNodesCount = result?.deleteNode?.numUids || 0;
    const deletedIncomingEdgesCount = result?.deleteIncomingEdges?.numUids || 0;
    const deletedOutgoingEdgesCount = result?.deleteOutgoingEdges?.numUids || 0;
    const totalDeletedEdges = deletedIncomingEdgesCount + deletedOutgoingEdgesCount;

    if (deletedNodesCount > 0) {
       console.log(`[DELETE NODE CASCADE] Successfully deleted node: ${nodeId}, ${totalDeletedEdges} associated edges.`);
       res.json({
         success: true,
         deletedNode: nodeId,
         deletedEdgesCount: totalDeletedEdges,
         deletedNodesCount: deletedNodesCount
       });
    } else {
       console.warn(`[DELETE NODE CASCADE] Node ${nodeId} not found or not deleted.`);
       res.status(404).json({
         error: `Node ${nodeId} not found or not deleted.`,
         deletedEdgesCount: totalDeletedEdges
       });
    }

  } catch (error) {
    const err = error as Error;
    console.error('[GRAPHQL] Failed to delete node cascade:', error);
    const errorMessage = err.message.includes('GraphQL query failed:')
      ? `GraphQL error during delete: ${err.message.replace('GraphQL query failed: ', '')}`
      : `Server error during delete: ${err.message}`;
    res.status(500).json({ error: errorMessage, details: err.message });
  }
});

// Simple health check endpoint for compatibility
router.get('/health', async (req: Request, res: Response): Promise<void> => {
  try {
    // Execute a simple introspection query to test GraphQL connectivity
    const tenantClient = await getTenantClient(req);
    const result = await tenantClient.executeGraphQL('{ __schema { queryType { name } } }');
    
    res.json({
      apiStatus: 'OK',
      dgraphStatus: 'connected',
      timestamp: new Date()
    });
  } catch (error) {
    const err = error as Error;
    console.error('[GRAPHQL] Failed health check:', error);
    res.status(500).json({
      apiStatus: 'ERROR',
      dgraphStatus: 'disconnected',
      error: err.message,
      timestamp: new Date()
    });
  }
});

export default router;
