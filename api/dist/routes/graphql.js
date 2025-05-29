"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const config_1 = __importDefault(require("../config"));
const nodeEnrichment_1 = require("../services/nodeEnrichment");
const graphqlService_1 = require("../src/services/graphqlService");
const errorHandler_1 = require("../src/utils/errorHandler");
const logger_1 = require("../src/utils/logger");
const validation_1 = require("../services/validation");
const axios_1 = __importDefault(require("axios"));
const router = express_1.default.Router();
// Use admin URL from config
const DGRAPH_ADMIN_SCHEMA_URL = config_1.default.dgraphAdminUrl;
// Helper function to filter outgoing edges with missing target nodes
function filterValidOutgoingEdges(node) {
    if (!node.outgoing)
        return node;
    const validOutgoing = node.outgoing.filter((edge) => edge.to && edge.to.id && edge.to.label);
    if (validOutgoing.length !== node.outgoing.length) {
        logger_1.logger.warn(`[TRAVERSAL] Node ${node.id} has ${node.outgoing.length - validOutgoing.length} invalid outgoing edges.`);
    }
    return { ...node, outgoing: validOutgoing };
}
// GraphQL Endpoints using centralized services
// -------------------------------------------------------------------
// Endpoint to execute arbitrary GraphQL queries
router.post('/query', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { query, variables } = req.body;
    const validation = graphqlService_1.GraphQLService.validateRequiredFields(req.body, ['query']);
    if (!validation.isValid) {
        graphqlService_1.GraphQLService.sendValidationError(res, validation.missingFields);
        return;
    }
    await graphqlService_1.GraphQLService.executeAndRespond(req, res, query, variables || {}, { context: 'QUERY', logQuery: true });
}));
// Endpoint to execute arbitrary GraphQL mutations
router.post('/mutate', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    let { mutation, variables = {} } = req.body;
    const validation = graphqlService_1.GraphQLService.validateRequiredFields(req.body, ['mutation']);
    if (!validation.isValid) {
        graphqlService_1.GraphQLService.sendValidationError(res, validation.missingFields);
        return;
    }
    try {
        // Enrich addNode inputs with nested hierarchyAssignments
        const hierarchyIdFromHeader = req.headers['x-hierarchy-id'];
        variables = await (0, nodeEnrichment_1.enrichNodeInputs)(variables, hierarchyIdFromHeader, mutation);
        // Log the input being sent to Dgraph for addNode mutations
        if (mutation.includes('AddNodeWithHierarchy')) {
            logger_1.logger.debug('[MUTATE] Sending to Dgraph (AddNodeWithHierarchy)', { variables });
        }
        const result = await graphqlService_1.GraphQLService.executeMutation(req, mutation, variables, { context: 'MUTATION', logResult: true });
        // Log the raw result received from Dgraph for addNode mutations
        if (mutation.includes('AddNodeWithHierarchy')) {
            logger_1.logger.debug('[MUTATE] Received from Dgraph (AddNodeWithHierarchy)', { result });
        }
        res.status(200).json(result);
    }
    catch (error) {
        if (error instanceof validation_1.InvalidLevelError || error instanceof validation_1.NodeTypeNotAllowedError) {
            errorHandler_1.ErrorHandler.sendError(res, error.message, 400);
        }
        else {
            errorHandler_1.ErrorHandler.handleError(error, res, 'MUTATION');
        }
    }
}));
// Traversal endpoint with edge filtering
router.post('/traverse', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { rootId } = req.body;
    const validation = graphqlService_1.GraphQLService.validateRequiredFields(req.body, ['rootId']);
    if (!validation.isValid) {
        graphqlService_1.GraphQLService.sendValidationError(res, validation.missingFields);
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
    const raw = await graphqlService_1.GraphQLService.executeQuery(req, query, { rootId }, { context: 'TRAVERSAL' });
    const data = raw.queryNode || [];
    const safe = data.map(filterValidOutgoingEdges);
    res.json({ data: { queryNode: safe } });
}));
// Endpoint for searching nodes (using @search directive fields)
router.get('/search', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { term, field = 'label' } = req.query;
    if (!term) {
        errorHandler_1.ErrorHandler.sendError(res, 'Missing required query parameter: term', 400);
        return;
    }
    // Basic validation for field name
    const allowedFields = ['label']; // Only allow searching indexed fields
    if (!allowedFields.includes(field)) {
        errorHandler_1.ErrorHandler.sendError(res, `Invalid search field: ${field}. Allowed fields: ${allowedFields.join(', ')}`, 400);
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
    await graphqlService_1.GraphQLService.executeAndRespond(req, res, query, { term }, { context: 'SEARCH' });
}));
// Endpoint to get the current GraphQL schema from Dgraph
router.get('/schema', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    // Build namespace-aware admin URL
    const namespace = req.tenantContext?.namespace;
    const adminUrl = namespace
        ? `${DGRAPH_ADMIN_SCHEMA_URL}?namespace=${namespace}`
        : DGRAPH_ADMIN_SCHEMA_URL;
    logger_1.logger.debug(`[SCHEMA] Fetching schema from: ${adminUrl}`);
    // Use axios directly as this is an admin endpoint
    const response = await axios_1.default.get(adminUrl);
    // Dgraph returns schema text within response.data.data.schema
    if (response.data && response.data.data && response.data.data.schema) {
        res.type('text/plain').send(response.data.data.schema);
    }
    else {
        throw new Error('Schema not found in Dgraph admin response.');
    }
}));
// Cascade delete endpoint for nodes and their related edges
router.post('/deleteNodeCascade', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { nodeId } = req.body;
    const validation = graphqlService_1.GraphQLService.validateRequiredFields(req.body, ['nodeId']);
    if (!validation.isValid) {
        graphqlService_1.GraphQLService.sendValidationError(res, validation.missingFields);
        return;
    }
    logger_1.logger.info(`[DELETE NODE CASCADE] Attempting to delete node and connected edges for node: ${nodeId}`);
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
    const result = await graphqlService_1.GraphQLService.executeMutation(req, deleteMutation, { nodeId }, { context: 'DELETE_CASCADE', logResult: true });
    const deletedNodesCount = result?.deleteNode?.numUids || 0;
    const deletedIncomingEdgesCount = result?.deleteIncomingEdges?.numUids || 0;
    const deletedOutgoingEdgesCount = result?.deleteOutgoingEdges?.numUids || 0;
    const totalDeletedEdges = deletedIncomingEdgesCount + deletedOutgoingEdgesCount;
    if (deletedNodesCount > 0) {
        logger_1.logger.info(`[DELETE NODE CASCADE] Successfully deleted node: ${nodeId}, ${totalDeletedEdges} associated edges.`);
        res.json({
            success: true,
            deletedNode: nodeId,
            deletedEdgesCount: totalDeletedEdges,
            deletedNodesCount: deletedNodesCount
        });
    }
    else {
        logger_1.logger.warn(`[DELETE NODE CASCADE] Node ${nodeId} not found or not deleted.`);
        res.status(404).json({
            error: `Node ${nodeId} not found or not deleted.`,
            deletedEdgesCount: totalDeletedEdges
        });
    }
}));
// Simple health check endpoint for compatibility
router.get('/health', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    // Execute a simple introspection query to test GraphQL connectivity
    await graphqlService_1.GraphQLService.executeQuery(req, '{ __schema { queryType { name } } }', {}, { context: 'HEALTH_CHECK' });
    res.json({
        apiStatus: 'OK',
        dgraphStatus: 'connected',
        timestamp: new Date()
    });
}));
exports.default = router;
//# sourceMappingURL=graphql.js.map