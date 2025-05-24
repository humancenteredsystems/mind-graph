const express = require('express');
const router = express.Router();
const { executeGraphQL } = require('../dgraphClient');
const { enrichNodeInputs } = require('../services/nodeEnrichment');
const { 
  InvalidLevelError, 
  NodeTypeNotAllowedError 
} = require('../services/validation');
const axios = require('axios');

// Derive Dgraph endpoint URLs from the base URL
const DGRAPH_BASE_URL = process.env.DGRAPH_BASE_URL.replace(/\/+$/, ''); // Remove trailing slash
const DGRAPH_ADMIN_SCHEMA_URL = `${DGRAPH_BASE_URL}/admin/schema`;

// Helper function to filter outgoing edges with missing target nodes
function filterValidOutgoingEdges(node) {
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
router.post('/query', async (req, res) => {
  const { query, variables } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Missing required field: query' });
  }
  try {
    const result = await executeGraphQL(query, variables || {});
    res.json(result);
  } catch (error) {
    // Log the detailed error
    console.error(`Error in /api/query endpoint:`, error);
    // Provide a more specific error message if possible
    const errorMessage = error.message.includes('GraphQL query failed:')
      ? `GraphQL error: ${error.message.replace('GraphQL query failed: ', '')}`
      : 'Server error executing query.';
    const statusCode = error.message.includes('GraphQL query failed:') ? 400 : 500;
    res.status(statusCode).json({ error: errorMessage });
  }
});

// Endpoint to execute arbitrary GraphQL mutations
router.post('/mutate', async (req, res) => {
  let { mutation, variables = {} } = req.body;
  if (!mutation) {
    return res.status(400).json({ error: 'Missing required field: mutation' });
  }
  try {
    // Enrich addNode inputs with nested hierarchyAssignments
    // Focus on the operation being performed rather than specific mutation names
    const hierarchyIdFromHeader = req.headers['x-hierarchy-id'];
    variables = await enrichNodeInputs(variables, hierarchyIdFromHeader, mutation);
    
    // For mutations that don't need transformation, or for addNode after input enrichment, execute normally
    // Log the input being sent to Dgraph for addNode mutations
    if (mutation.includes('AddNodeWithHierarchy')) {
        console.log('[MUTATE] Sending to Dgraph (AddNodeWithHierarchy):', JSON.stringify(variables, null, 2));
    }
    const result = await executeGraphQL(mutation, variables || {});
    // Log the raw result received from Dgraph for addNode mutations
    if (mutation.includes('AddNodeWithHierarchy')) {
        console.log('[MUTATE] Received from Dgraph (AddNodeWithHierarchy):', JSON.stringify(result, null, 2));
    }
    console.log('[MUTATE] Dgraph result:', result); // Keep existing log for general mutations
    res.status(200).json(result); // Use 200 OK for mutations unless specifically creating (201)
  } catch (error) {
    console.error(`Error in /api/mutate endpoint:`, error);
    if (error instanceof InvalidLevelError || error instanceof NodeTypeNotAllowedError) {
      res.status(400).json({ error: error.message }); // Or 422 Unprocessable Entity
    } else {
      const errorMessage = error.message.includes('GraphQL query failed:')
        ? `GraphQL error: ${error.message.replace('GraphQL query failed: ', '')}`
        : 'Server error executing mutation.';
      const statusCode = error.message.includes('GraphQL query failed:') ? 400 : 500;
      res.status(statusCode).json({ error: errorMessage });
    }
  }
});

router.post('/traverse', async (req, res) => {
  const { rootId } = req.body;
  if (!rootId) {
    return res.status(400).json({ error: 'Missing required field: rootId' });
  }
  try {
    const raw = await executeGraphQL(
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
    return res.json({ data: { queryNode: safe } });
  } catch (err) {
    if (err.message?.startsWith('GraphQL query failed:')) {
      return res.status(400).json({ error: `GraphQL error during traversal: ${err.message}` });
    }
    return res.status(500).json({ error: 'Server error during traversal.' });
  }
});

// Endpoint for searching nodes (using @search directive fields)
router.get('/search', async (req, res) => {
  const { term, field = 'label' } = req.query; // Default search field to 'label'

  if (!term) {
    return res.status(400).json({ error: 'Missing required query parameter: term' });
  }

  // Basic validation for field name
  const allowedFields = ['label']; // Only allow searching indexed fields
  if (!allowedFields.includes(field)) {
      return res.status(400).json({ error: `Invalid search field: ${field}. Allowed fields: ${allowedFields.join(', ')}` });
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
    const result = await executeGraphQL(query, variables);
    res.json(result);
  } catch (error) {
    console.error(`Error in /api/search endpoint: ${error.message}`);
    if (error.message.startsWith('GraphQL query failed:')) {
       res.status(400).json({ error: `GraphQL error during search: ${error.message}` });
    } else {
       res.status(500).json({ error: 'Server error during search.' });
    }
  }
});

// Endpoint to get the current GraphQL schema from Dgraph
router.get('/schema', async (req, res) => {
    const DGRAPH_ADMIN_ENDPOINT = DGRAPH_ADMIN_SCHEMA_URL; // Use the derived URL
    try {
        // Use axios directly as dgraphClient is for the /graphql endpoint
        const response = await axios.get(DGRAPH_ADMIN_ENDPOINT);
        // Dgraph returns schema text within response.data.data.schema
        if (response.data && response.data.data && response.data.data.schema) {
             res.type('text/plain').send(response.data.data.schema);
        } else {
             throw new Error('Schema not found in Dgraph admin response.');
        }
    } catch (error) {
        console.error(`Error fetching schema from Dgraph admin: ${error.message}`);
        if (error.response) {
            console.error('Dgraph admin response status:', error.response.status);
            console.error('Dgraph admin response data:', error.response.data);
        }
        res.status(500).json({ error: 'Failed to fetch schema from Dgraph.' });
    }
});

// Cascade delete endpoint for nodes and their related edges
router.post('/deleteNodeCascade', async (req, res) => {
  const { nodeId } = req.body;

  if (!nodeId) {
    return res.status(400).json({ error: 'Missing nodeId in request body.' });
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

    const result = await executeGraphQL(deleteMutation, { nodeId });

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
    console.error('[DELETE NODE CASCADE] Error:', error);
    const errorMessage = error.message.includes('GraphQL query failed:')
      ? `GraphQL error during delete: ${error.message.replace('GraphQL query failed: ', '')}`
      : `Server error during delete: ${error.message}`;
    res.status(500).json({ error: errorMessage });
  }
});

module.exports = router;
