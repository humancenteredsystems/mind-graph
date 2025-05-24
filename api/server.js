require('dotenv').config(); // Load environment variables from .env file
const schemaRegistry = require('./services/schemaRegistry'); // Schema registry module
const { pushSchemaViaHttp } = require('./utils/pushSchema'); // Import the new helper
const { 
  InvalidLevelError, 
  NodeTypeNotAllowedError, 
  validateHierarchyId, 
  validateLevelIdAndAllowedType, 
  getLevelIdForNode 
} = require('./services/validation');
const { authenticateAdmin } = require('./middleware/auth');

// --- Global Error Handlers ---
process.on('uncaughtException', (err, origin) => {
  console.error('[GLOBAL] Uncaught Exception:', err);
  console.error('[GLOBAL] Origin:', origin);
  // Optionally exit gracefully, but for debugging, just log for now
  // process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[GLOBAL] Unhandled Rejection at:', promise);
  console.error('[GLOBAL] Reason:', reason);
  // Optionally exit gracefully
  // process.exit(1);
});
// --- End Global Error Handlers ---

const express = require('express');
const { executeGraphQL } = require('./dgraphClient'); // Import the client
const { v4: uuidv4 } = require('uuid'); // Import UUID generator
const axios = require('axios'); // Import axios for /api/schema
const { sendDgraphAdminRequest } = require('./utils/dgraphAdmin');
const app = express();

// Add a simple logging middleware to see incoming requests
app.use((req, res, next) => {
  console.log(`[INCOMING REQUEST] ${req.method} ${req.url}`);
  next();
});

const PORT = process.env.PORT || 3000; // Use PORT from .env or default to 3000

// Ensure DGRAPH_BASE_URL is set
if (!process.env.DGRAPH_BASE_URL) {
  console.error("FATAL ERROR: DGRAPH_BASE_URL environment variable is not set.");
  console.error("Please set DGRAPH_BASE_URL to your Dgraph instance's base URL (e.g., http://localhost:8080 or https://your-remote-dgraph.onrender.com).");
  process.exit(1);
}

// Derive Dgraph endpoint URLs from the base URL
const DGRAPH_BASE_URL = process.env.DGRAPH_BASE_URL.replace(/\/+$/, ''); // Remove trailing slash
const DGRAPH_GRAPHQL_URL = `${DGRAPH_BASE_URL}/graphql`;
const DGRAPH_ADMIN_SCHEMA_URL = `${DGRAPH_BASE_URL}/admin/schema`;
const DGRAPH_ALTER_URL = `${DGRAPH_BASE_URL}/alter`;

// Middleware
app.use(express.json()); // Parse JSON bodies

// CORS Middleware - Allow specified origins or all (*)
app.use((req, res, next) => {
  const allowedOrigin = process.env.CORS_ORIGIN || '*';
  res.set('Access-Control-Allow-Origin', allowedOrigin);
  // Allow common methods and headers needed for GraphQL/API requests
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Hierarchy-Id');
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Helper function to drop all data from the configured Dgraph instance
async function dropAllData(target) { // Keep target parameter for potential future validation/logging
  const payload = { "drop_all": true };
  const url = DGRAPH_ALTER_URL; // Use the derived URL

  console.log(`[DROP ALL] Sending drop_all to configured Dgraph at ${url}`);
  const result = await sendDgraphAdminRequest(url, payload);

  return result; // Return the single result object
}

// Helper function to push schema to the configured Dgraph instance
async function pushSchemaToConfiguredDgraph(schema) {
  const url = DGRAPH_ADMIN_SCHEMA_URL; // Use the derived URL
  const result = await pushSchemaViaHttp(url, schema);

  // Add verification step if needed

  return result;
}

app.get('/', (req, res) => {
  res.send('MakeItMakeSense.io API is running!');
});

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

// --- GraphQL-centric Endpoints ---

// Endpoint to execute arbitrary GraphQL queries
app.post('/api/query', async (req, res) => {
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
app.post('/api/mutate', async (req, res) => {
  let { mutation, variables = {} } = req.body;
  if (!mutation) {
    return res.status(400).json({ error: 'Missing required field: mutation' });
  }
  try {
    // Enrich addNode inputs with nested hierarchyAssignments
    // Focus on the operation being performed rather than specific mutation names
    // Enrich only AddNodeWithHierarchy mutations; simple AddNode mutations bypass enrichment
    if (Array.isArray(variables.input) && mutation.includes('AddNodeWithHierarchy')) {
      const hierarchyIdFromHeader = req.headers['x-hierarchy-id'];
      const enrichedInputs = [];
      for (const inputObj of variables.input) {
        // Client can override hierarchyId per input item, this also needs validation
        let itemHierarchyId = inputObj.hierarchyId || hierarchyIdFromHeader;

        if (inputObj.hierarchyId && inputObj.hierarchyId !== hierarchyIdFromHeader) {
          const isItemHierarchyValid = await validateHierarchyId(inputObj.hierarchyId);
          if (!isItemHierarchyValid) {
            return res.status(400).json({ error: `Invalid hierarchyId in input item: ${inputObj.hierarchyId}. Hierarchy not found.` });
          }
        }
        // itemHierarchyId is now validated (either it's the validated header one, or a validated one from input)

        // Process each input object for node creation
        let finalLevelId = null; // Will hold the levelId if an assignment is to be made
        let shouldCreateAssignment = false;

        // Case 1: Client provides hierarchyAssignments array (standard frontend structure)
        if (inputObj.hierarchyAssignments && Array.isArray(inputObj.hierarchyAssignments) && inputObj.hierarchyAssignments.length > 0) {
          const hierarchyAssignment = inputObj.hierarchyAssignments[0];
          const itemHierarchyIdFromAssignment = hierarchyAssignment.hierarchy?.id;
          finalLevelId = hierarchyAssignment.level?.id;
          
          if (itemHierarchyIdFromAssignment && finalLevelId) {
            console.log(`[MUTATE] Processing client-provided hierarchyAssignments: hierarchyId=${itemHierarchyIdFromAssignment}, levelId=${finalLevelId} for node type ${inputObj.type}`);
            await validateLevelIdAndAllowedType(finalLevelId, inputObj.type, itemHierarchyIdFromAssignment);
            shouldCreateAssignment = true;
          } else {
            throw new Error("Invalid hierarchyAssignments structure provided by client. Missing hierarchy.id or level.id.");
          }
        } else if (inputObj.levelId) { // Case 2: Client explicitly provides top-level levelId
          console.log(`[MUTATE] Validating client-provided levelId: ${inputObj.levelId} for node type ${inputObj.type}`);
          await validateLevelIdAndAllowedType(inputObj.levelId, inputObj.type, itemHierarchyId);
          finalLevelId = inputObj.levelId;
          shouldCreateAssignment = true;
        } else if (inputObj.parentId) { // Case 3: Client provides parentId, calculate level
          console.log(`[MUTATE] Looking up levelId for parentId: ${inputObj.parentId} in hierarchy ${itemHierarchyId}`);
          const calculatedLevelId = await getLevelIdForNode(inputObj.parentId, itemHierarchyId);
          console.log(`[MUTATE] Validating calculated levelId: ${calculatedLevelId} for node type ${inputObj.type}`);
          await validateLevelIdAndAllowedType(calculatedLevelId, inputObj.type, itemHierarchyId);
          finalLevelId = calculatedLevelId;
          shouldCreateAssignment = true;
        }

        const nodeInput = {
          id: inputObj.id,
          label: inputObj.label,
          type: inputObj.type,
        };

        if (shouldCreateAssignment && finalLevelId) {
          // Use the client-provided hierarchyAssignments if available, otherwise construct from server logic
          if (inputObj.hierarchyAssignments && Array.isArray(inputObj.hierarchyAssignments) && inputObj.hierarchyAssignments.length > 0) {
            nodeInput.hierarchyAssignments = inputObj.hierarchyAssignments;
          } else {
            nodeInput.hierarchyAssignments = [
              { hierarchy: { id: itemHierarchyId }, level: { id: finalLevelId } }
            ];
          }
        } else if (!inputObj.hierarchyAssignments && !inputObj.levelId && !inputObj.parentId) {
          // If no hierarchy assignment information provided, do not automatically create an assignment here.
          // The node will be created without an assignment.
          // This allows seed_data.py to explicitly assign later.
          console.log(`[MUTATE] Node ${inputObj.id} (${inputObj.type}) will be created without an initial hierarchy assignment by addNode.`);
        }

        enrichedInputs.push(nodeInput);
      }
      variables = { ...variables, input: enrichedInputs };
    }
    
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

app.post('/api/traverse', async (req, res) => {
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
app.get('/api/search', async (req, res) => {
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
app.get('/api/schema', async (req, res) => {
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

// Schema Management Endpoints
// -------------------------------------------------------------------

// GET /api/schemas - List all available schemas
app.get('/api/schemas', authenticateAdmin, async (req, res) => {
  try {
    const schemas = await schemaRegistry.getAllSchemas();
    res.json(schemas);
  } catch (error) {
    console.error('[SCHEMAS] Error getting schemas:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/schemas/:id - Get a specific schema by ID
app.get('/api/schemas/:id', authenticateAdmin, async (req, res) => {
  try {
    const schema = await schemaRegistry.getSchemaById(req.params.id);
    if (!schema) {
      return res.status(404).json({ error: `Schema not found: ${req.params.id}` });
    }
    res.json(schema);
  } catch (error) {
    console.error(`[SCHEMAS] Error getting schema ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/schemas/:id/content - Get the schema content
app.get('/api/schemas/:id/content', authenticateAdmin, async (req, res) => {
  try {
    const content = await schemaRegistry.getSchemaContent(req.params.id);
    res.type('text/plain').send(content);
  } catch (error) {
    console.error(`[SCHEMAS] Error getting schema content ${req.params.id}:`, error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/schemas - Create a new schema
app.post('/api/schemas', authenticateAdmin, async (req, res) => {
  try {
    const { schemaInfo, content } = req.body;

    if (!schemaInfo || !content) {
      return res.status(400).json({ error: 'Missing required fields: schemaInfo and content' });
    }

    if (!schemaInfo.id || !schemaInfo.name) {
      return res.status(400).json({ error: 'Schema must have an id and name' });
    }

    const newSchema = await schemaRegistry.addSchema(schemaInfo, content);
    res.status(201).json(newSchema);
  } catch (error) {
    console.error('[SCHEMAS] Error creating schema:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/schemas/:id - Update an existing schema
app.put('/api/schemas/:id', authenticateAdmin, async (req, res) => {
  try {
    const { updates, content } = req.body;

    if (!updates) {
      return res.status(400).json({ error: 'Missing required field: updates' });
    }

    const updatedSchema = await schemaRegistry.updateSchema(req.params.id, updates, content);
    res.json(updatedSchema);
  } catch (error) {
    console.error(`[SCHEMAS] Error updating schema ${req.params.id}:`, error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/schemas/:id/push - Push a specific schema to Dgraph
app.post('/api/schemas/:id/push', authenticateAdmin, async (req, res) => {
  try {
    const schemaId = req.params.id;

    // Get schema content
    const schemaContent = await schemaRegistry.getSchemaContent(schemaId);

    console.log(`[SCHEMA PUSH] Pushing schema ${schemaId} to configured Dgraph instance`);
    const result = await pushSchemaToConfiguredDgraph(schemaContent);

    if (result.success) {
      const schema = await schemaRegistry.getSchemaById(schemaId);
      if (schema.is_production) {
        await schemaRegistry.updateSchema(schemaId, { is_production: true });
      }

      res.json({
        success: true,
        message: `Schema ${schemaId} successfully pushed to configured Dgraph instance`,
        results: result
      });
    } else {
      console.error('[SCHEMA PUSH] Push failed:', result.error);
      res.status(500).json({
        success: false,
        message: `Schema ${schemaId} push encountered errors`,
        results: result
      });
    }
  } catch (error) {
    console.error(`[SCHEMA PUSH] Error pushing schema ${req.params.id}:`, error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to push schema directly or from registry
app.post('/api/admin/schema', authenticateAdmin, async (req, res) => {
  try {
    const { schema, schemaId } = req.body;

    // Determine which schema to use
    let schemaContent;

    if (schemaId) {
      console.log(`[SCHEMA PUSH] Using schema ${schemaId} from registry`);
      schemaContent = await schemaRegistry.getSchemaContent(schemaId);
    } else if (schema) {
      schemaContent = schema;
    } else {
      return res.status(400).json({ error: 'Missing required field: schema or schemaId' });
    }

    console.log('[SCHEMA PUSH] Pushing schema to configured Dgraph instance');
    const result = await pushSchemaToConfiguredDgraph(schemaContent);

    if (result.success) {
      return res.json({ success: true, results: result });
    } else {
      console.error('[SCHEMA PUSH] Push failed:', result.error);
      return res.status(500).json({ success: false, message: 'Schema push encountered errors', results: result });
    }
  } catch (err) {
    console.error('[SCHEMA PUSH] Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/dropAll - Endpoint to drop all data from Dgraph instance(s)
app.post('/api/admin/dropAll', authenticateAdmin, async (req, res) => {
  const { target } = req.body;

  if (!target || !['local', 'remote', 'both'].includes(target)) {
    return res.status(400).json({ error: 'Missing or invalid required field: target. Must be "local", "remote", or "both".' });
  }

  try {
    console.log(`[DROP ALL] Received request to drop data for target: ${target}`);
    const result = await dropAllData(target);

    if (result.success) {
      res.json({
        success: true,
        message: `Drop all data operation completed successfully for configured Dgraph instance`,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: `Drop all data operation encountered errors`,
        error: result.error,
        details: result.details
      });
    }
  } catch (error) {
    console.error('[DROP ALL] Error in endpoint handler:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Endpoint for health check
app.get('/api/health', async (req, res) => {
  const healthQuery = `query { queryNode { id } }`; // Minimal query
  try {
    await executeGraphQL(healthQuery);
    res.json({ apiStatus: "OK", dgraphStatus: "OK" });
  } catch (error) {
    console.error(`Health check failed: ${error.message}`);
    res.status(500).json({ apiStatus: "OK", dgraphStatus: "Error", error: error.message });
  }
});

// Diagnostic endpoint for Dgraph connectivity
const dns = require('dns').promises;
app.get('/api/debug/dgraph', async (req, res) => {
  const graphqlUrl = DGRAPH_GRAPHQL_URL;
  const adminSchemaUrl = DGRAPH_ADMIN_SCHEMA_URL;
  const baseUrl = DGRAPH_BASE_URL;

  let host = baseUrl.replace(/^https?:\/\//, '').split(':')[0];

  try {
    const dnsStart = Date.now();
    const { address } = await dns.lookup(host);
    const lookupMs = Date.now() - dnsStart;

    console.log(`[DEBUG] Attempting POST request to Dgraph admin schema endpoint: ${adminSchemaUrl}`);
    const adminRes = await axios.post(
      adminSchemaUrl,
      "# Empty schema for testing connectivity",
      { headers: { 'Content-Type': 'application/graphql' } }
    );
    console.log('[DEBUG] POST request to Dgraph admin schema endpoint successful.');
    console.log('[DEBUG] Dgraph admin response data:', adminRes.data);

    console.log(`[DEBUG] Attempting POST request to Dgraph GraphQL endpoint: ${graphqlUrl}`);
    const gqlRes = await axios.post(
      graphqlUrl,
      { query: '{ __schema { queryType { name } } }', variables: null },
      { headers: { 'Content-Type': 'application/json' } }
    );
    console.log('[DEBUG] POST request to Dgraph GraphQL endpoint successful.');

    res.json({
      dns: { host: address, lookupMs },
      httpAdmin: 'reachable',
      graphql: gqlRes.data
    });
  } catch (err) {
    console.error('[DEBUG] Error in /api/debug/dgraph:', err.message);
    if (err.response) {
      console.error('[DEBUG] Dgraph response status:', err.response.status);
      console.error('[DEBUG] Dgraph response data:', err.response.data);
    }
    res.status(500).json({
      dnsError: err.code || null,
      httpError: err.response?.status || err.message,
      graphqlError: err.response?.data?.errors || null
    });
  }
});

// Cascade delete endpoint for nodes and their related edges
app.post('/api/deleteNodeCascade', async (req, res) => {
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

// Mount hierarchy routes
const hierarchyRoutes = require('./routes/hierarchy');
app.use('/api', hierarchyRoutes);

module.exports = app;

// Start the server only if this file is run directly
if (!module.parent) {
  app.listen(PORT, () => {
    console.log(`API server listening on port ${PORT}`);
  });
}
