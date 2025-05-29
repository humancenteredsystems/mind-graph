import express, { Request, Response } from 'express';
import config from '../config';
import { enrichNodeInputs } from '../services/nodeEnrichment';
import { GraphQLService } from '../src/services/graphqlService';
import { ErrorHandler, ValidationError, asyncHandler } from '../src/utils/errorHandler';
import { logger } from '../src/utils/logger';
import { InvalidLevelError, NodeTypeNotAllowedError } from '../services/validation';
import axios from 'axios';
import { TenantRequest } from '../src/types';

const router = express.Router();

// Use admin URL from config
const DGRAPH_ADMIN_SCHEMA_URL = config.dgraphAdminUrl;

// Request types
interface GraphQLQueryRequest {
  query: string;
  variables?: any;
}

interface GraphQLMutationRequest {
  mutation: string;
  variables?: any;
}

interface TraversalRequest {
  rootId: string;
}

interface SearchQuery {
  term: string;
  field?: string;
}

interface DeleteNodeRequest {
  nodeId: string;
}

// Helper function to filter outgoing edges with missing target nodes
function filterValidOutgoingEdges(node: any) {
  if (!node.outgoing) return node;

  const validOutgoing = node.outgoing.filter((edge: any) =>
    edge.to && edge.to.id && edge.to.label
  );

  if (validOutgoing.length !== node.outgoing.length) {
    logger.warn(`[TRAVERSAL] Node ${node.id} has ${node.outgoing.length - validOutgoing.length} invalid outgoing edges.`);
  }

  return { ...node, outgoing: validOutgoing };
}

// GraphQL Endpoints using centralized services
// -------------------------------------------------------------------

// Endpoint to execute arbitrary GraphQL queries
router.post('/query', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { query, variables }: GraphQLQueryRequest = req.body;
  
  const validation = GraphQLService.validateRequiredFields(req.body, ['query']);
  if (!validation.isValid) {
    GraphQLService.sendValidationError(res, validation.missingFields);
    return;
  }

  await GraphQLService.executeAndRespond(
    req, 
    res, 
    query, 
    variables || {}, 
    { context: 'QUERY', logQuery: true }
  );
}));

// Endpoint to execute arbitrary GraphQL mutations
router.post('/mutate', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  let { mutation, variables = {} }: GraphQLMutationRequest = req.body;
  
  const validation = GraphQLService.validateRequiredFields(req.body, ['mutation']);
  if (!validation.isValid) {
    GraphQLService.sendValidationError(res, validation.missingFields);
    return;
  }

  try {
    // Enrich addNode inputs with nested hierarchyAssignments
    const hierarchyIdFromHeader = req.headers['x-hierarchy-id'] as string;
    variables = await enrichNodeInputs(variables, hierarchyIdFromHeader, mutation);
    
    // Log the input being sent to Dgraph for addNode mutations
    if (mutation.includes('AddNodeWithHierarchy')) {
      logger.debug('[MUTATE] Sending to Dgraph (AddNodeWithHierarchy)', { variables });
    }
    
    const result = await GraphQLService.executeMutation(
      req, 
      mutation, 
      variables, 
      { context: 'MUTATION', logResult: true }
    );
    
    // Log the raw result received from Dgraph for addNode mutations
    if (mutation.includes('AddNodeWithHierarchy')) {
      logger.debug('[MUTATE] Received from Dgraph (AddNodeWithHierarchy)', { result });
    }
    
    res.status(200).json(result);
  } catch (error: any) {
    if (error instanceof InvalidLevelError || error instanceof NodeTypeNotAllowedError) {
      ErrorHandler.sendError(res, error.message, 400);
    } else {
      ErrorHandler.handleError(error, res, 'MUTATION');
    }
  }
}));

// Traversal endpoint with edge filtering
router.post('/traverse', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { rootId }: TraversalRequest = req.body;
  
  const validation = GraphQLService.validateRequiredFields(req.body, ['rootId']);
  if (!validation.isValid) {
    GraphQLService.sendValidationError(res, validation.missingFields);
    return;
  }

  const query = `
    query($rootId: String!) {
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
    }
  `;

  const raw = await GraphQLService.executeQuery(
    req, 
    query, 
    { rootId }, 
    { context: 'TRAVERSAL' }
  );
  
  const data = raw.queryNode || [];
  const safe = data.map(filterValidOutgoingEdges);
  res.json({ data: { queryNode: safe } });
}));

// Endpoint for searching nodes (using @search directive fields)
router.get('/search', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { term, field = 'label' }: SearchQuery = req.query as any;

  if (!term) {
    ErrorHandler.sendError(res, 'Missing required query parameter: term', 400);
    return;
  }

  // Basic validation for field name
  const allowedFields = ['label']; // Only allow searching indexed fields
  if (!allowedFields.includes(field)) {
    ErrorHandler.sendError(
      res, 
      `Invalid search field: ${field}. Allowed fields: ${allowedFields.join(', ')}`, 
      400
    );
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

  await GraphQLService.executeAndRespond(
    req, 
    res, 
    query, 
    { term }, 
    { context: 'SEARCH' }
  );
}));

// Endpoint to get the current GraphQL schema from Dgraph
router.get('/schema', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Build namespace-aware admin URL
  const namespace = (req as TenantRequest).tenantContext?.namespace;
  const adminUrl = namespace 
    ? `${DGRAPH_ADMIN_SCHEMA_URL}?namespace=${namespace}`
    : DGRAPH_ADMIN_SCHEMA_URL;
  
  logger.debug(`[SCHEMA] Fetching schema from: ${adminUrl}`);
  
  // Use axios directly as this is an admin endpoint
  const response = await axios.get(adminUrl);
  
  // Dgraph returns schema text within response.data.data.schema
  if (response.data && response.data.data && response.data.data.schema) {
    res.type('text/plain').send(response.data.data.schema);
  } else {
    throw new Error('Schema not found in Dgraph admin response.');
  }
}));

// Cascade delete endpoint for nodes and their related edges
router.post('/deleteNodeCascade', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { nodeId }: DeleteNodeRequest = req.body;

  const validation = GraphQLService.validateRequiredFields(req.body, ['nodeId']);
  if (!validation.isValid) {
    GraphQLService.sendValidationError(res, validation.missingFields);
    return;
  }

  logger.info(`[DELETE NODE CASCADE] Attempting to delete node and connected edges for node: ${nodeId}`);

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

  const result = await GraphQLService.executeMutation(
    req, 
    deleteMutation, 
    { nodeId }, 
    { context: 'DELETE_CASCADE', logResult: true }
  );

  const deletedNodesCount = result?.deleteNode?.numUids || 0;
  const deletedIncomingEdgesCount = result?.deleteIncomingEdges?.numUids || 0;
  const deletedOutgoingEdgesCount = result?.deleteOutgoingEdges?.numUids || 0;
  const totalDeletedEdges = deletedIncomingEdgesCount + deletedOutgoingEdgesCount;

  if (deletedNodesCount > 0) {
    logger.info(`[DELETE NODE CASCADE] Successfully deleted node: ${nodeId}, ${totalDeletedEdges} associated edges.`);
    res.json({
      success: true,
      deletedNode: nodeId,
      deletedEdgesCount: totalDeletedEdges,
      deletedNodesCount: deletedNodesCount
    });
  } else {
    logger.warn(`[DELETE NODE CASCADE] Node ${nodeId} not found or not deleted.`);
    res.status(404).json({
      error: `Node ${nodeId} not found or not deleted.`,
      deletedEdgesCount: totalDeletedEdges
    });
  }
}));

// Simple health check endpoint for compatibility
router.get('/health', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Execute a simple introspection query to test GraphQL connectivity
  await GraphQLService.executeQuery(
    req, 
    '{ __schema { queryType { name } } }', 
    {}, 
    { context: 'HEALTH_CHECK' }
  );
  
  res.json({
    apiStatus: 'OK',
    dgraphStatus: 'connected',
    timestamp: new Date()
  });
}));

export default router;
