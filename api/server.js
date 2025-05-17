require('dotenv').config(); // Load environment variables from .env file
const schemaRegistry = require('./schemaRegistry'); // Schema registry module
const { pushSchemaViaHttp } = require('./utils/pushSchema'); // Import the new helper

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

// Helper to determine levelId for a new node within a hierarchy
async function getLevelIdForNode(parentId, hierarchyId) {
  let targetLevelNumber = 1; // Default if no parent or no matching assignment

  if (parentId) {
    const parentQuery = `
      query ParentLevel($nodeId: String!) {
        queryNode(filter: { id: { eq: $nodeId } }) {
          hierarchyAssignments {
            hierarchy { id }
            level { levelNumber }
          }
        }
      }
    `;
    const parentResp = await executeGraphQL(parentQuery, { nodeId: parentId });
    const allAssignments = parentResp.queryNode[0]?.hierarchyAssignments;
    let relevantAssignment = null;

    if (allAssignments && allAssignments.length > 0) {
      relevantAssignment = allAssignments.find(asn => asn.hierarchy.id === hierarchyId);
    }

    if (relevantAssignment) {
      targetLevelNumber = relevantAssignment.level.levelNumber + 1;
    } else {
      // Parent node exists but is not in the target hierarchy, or has no assignments.
      // Defaulting the new node to level 1 of the target hierarchy.
      targetLevelNumber = 1; // Explicitly set, though it's the default
      console.warn(`Parent node ${parentId} found, but has no assignment for hierarchy ${hierarchyId}. New node will be at level 1 of this hierarchy.`);
    }
  }
  // Fetch all levels for the hierarchy and pick by levelNumber
  const levelsQuery = `
    query LevelsForHierarchy($h: String!) {
      queryHierarchy(filter: { id: { eq: $h } }) {
        levels {
          id
          levelNumber
        }
      }
    }
  `;
  const levelsResp = await executeGraphQL(levelsQuery, { h: hierarchyId });
  const levels = levelsResp.queryHierarchy[0].levels;
  const level = levels.find(l => l.levelNumber === targetLevelNumber);
  if (!level) {
    throw new Error(`Level ${targetLevelNumber} not found for hierarchy ${hierarchyId}`);
  }
  return level.id;
}

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
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Middleware to authenticate admin requests
const authenticateAdmin = (req, res, next) => {
  const apiKey = req.headers['x-admin-api-key'];
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};


// Helper function to drop all data from the configured Dgraph instance
async function dropAllData(target) { // Keep target parameter for potential future validation/logging
  const payload = { "drop_all": true };
  const url = DGRAPH_ALTER_URL; // Use the derived URL

  console.log(`[DROP ALL] Sending drop_all to configured Dgraph at ${url}`);
  const result = await sendDgraphAdminRequest(url, payload);

  return result; // Return the single result object
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
  } // End catch block
}); // End app.post('/api/query')

// Endpoint to execute arbitrary GraphQL mutations
app.post('/api/mutate', async (req, res) => {
  let { mutation, variables } = req.body;
  if (!mutation) {
    return res.status(400).json({ error: 'Missing required field: mutation' });
  }
  try {
    // Enrich addNode inputs with nested hierarchyAssignments
    // Focus on the operation being performed rather than specific mutation names
    if (Array.isArray(variables.input) && 
        (mutation.includes('addNode') || mutation.includes('AddNode'))) {
      // Determine hierarchyId from header or fallback to first hierarchy
      let hierarchyIdVal = req.headers['x-hierarchy-id'];
      if (!hierarchyIdVal) {
        const hierRes = await executeGraphQL(`query { queryHierarchy { id } }`, {});
        hierarchyIdVal = hierRes.queryHierarchy[0].id;
      }
      const enrichedInputs = [];
      for (const inputObj of variables.input) {
        // Use client-provided levelId if available, otherwise look it up
        let levelId;
        if (inputObj.levelId) {
          console.log(`[MUTATE] Using client-provided levelId: ${inputObj.levelId}`);
          levelId = inputObj.levelId;
        } else {
          console.log(`[MUTATE] Looking up levelId for parentId: ${inputObj.parentId}`);
          levelId = await getLevelIdForNode(inputObj.parentId, hierarchyIdVal);
        }
        
        // Use client-provided hierarchyId if available, otherwise use the one from header/fallback
        const finalHierarchyId = inputObj.hierarchyId || hierarchyIdVal;
        
        enrichedInputs.push({
          id: inputObj.id,
          label: inputObj.label,
          type: inputObj.type,
          hierarchyAssignments: [
            { hierarchy: { id: finalHierarchyId }, level: { id: levelId } }
          ]
        });
      }
      variables = { ...variables, input: enrichedInputs };
      
      // The problematic transformation block has been removed.
      // The original mutation will now proceed to the executeGraphQL call below.
    }
    
    // For mutations that don't need transformation, or for addNode after input enrichment, execute normally
    const result = await executeGraphQL(mutation, variables || {});
    console.log('[MUTATE] Dgraph result:', result);
    res.status(200).json(result); // Use 200 OK for mutations unless specifically creating (201)
  } catch (error) {
    console.error(`Error in /api/mutate endpoint:`, error);
     // Provide a more specific error message if possible
    const errorMessage = error.message.includes('GraphQL query failed:')
      ? `GraphQL error: ${error.message.replace('GraphQL query failed: ', '')}`
      : 'Server error executing mutation.';
    const statusCode = error.message.includes('GraphQL query failed:') ? 400 : 500;
    res.status(statusCode).json({ error: errorMessage });
  } // End catch block
}); // End app.post('/api/mutate')

 // Stable version using string concatenation
 app.post('/api/traverse', async (req, res) => {
  const { rootId, currentLevel, fields } = req.body;
  // Determine hierarchyId for traversal (header or fallback)
  let hierarchyId = req.headers['x-hierarchy-id'] || req.body.hierarchyId;
  if (!hierarchyId) {
    const hierRes = await executeGraphQL(`query { queryHierarchy { id } }`, {});
    hierarchyId = hierRes.queryHierarchy[0].id;
  }

  if (!rootId) {
      return res.status(400).json({ error: 'Missing required field: rootId' });
    }
  // Removed explicit hierarchyId missing check; using fallback instead

  // Validate hierarchyId is a non-empty string
  // Removed validation for hierarchyId type since it's guaranteed
  console.log('[TRAVERSE] Using hierarchyId:', hierarchyId);

  // Validate currentLevel
  if (currentLevel !== undefined && (typeof currentLevel !== 'number' || currentLevel < 0)) {
    return res.status(400).json({ error: 'Invalid depth parameter. Must be a non-negative number.' });
  }

  // Validate fields
  const allowedFields = ['id', 'label', 'type', 'status', 'branch']; // Removed 'level'
  const safeFields = Array.isArray(fields) && fields.length > 0
    ? fields.filter(f => allowedFields.includes(f))
    : allowedFields; // Default to allowed fields if none provided or invalid

  // Ensure 'level' is included if currentLevel is used for filtering - This logic is no longer needed as 'level' is not a direct field.

  if (safeFields.length === 0) {
    // This case should ideally not happen if default is allowedFields, but good to check
    return res.status(400).json({ error: 'Invalid fields array. No allowed fields provided.' });
  }

  const fieldBlock = safeFields.join('\n    '); // Indent fields correctly
  const targetLevel = currentLevel !== undefined ? currentLevel + 1 : null;

  // Construct the 'to' block conditionally
  // Use hierarchyId directly as an integer in the GraphQL query
  const toBlock = targetLevel !== null
    ? `to (filter: { hierarchyAssignments: { some: { hierarchyId: { eq: ${hierarchyId} }, levelNumber: { eq: ${targetLevel} } } } }) {\n      ${fieldBlock}\n      hierarchyAssignments {\n        hierarchy { id name }\n        level { id levelNumber label }\n      }\n    }`
    : `to {\n      ${fieldBlock}\n      hierarchyAssignments {\n        hierarchy { id name }\n        level { id levelNumber label }\n      }\n    }`; // Note indentation

  // Construct the full query using array join for clarity and safety
  const query = [
    'query TraverseGraph($rootId: String!) {',
    '  queryNode(filter: { id: { eq: $rootId } }) {',
    `    ${fieldBlock}`, // Fields for the root node
    '    hierarchyAssignments {',
    '      hierarchy { id name }',
    '      level { id levelNumber label }',
    '    }',
    '    outgoing {',
    '      type',
    `      ${toBlock}`, // The conditionally constructed 'to' block
    '    }',
    '  }',
    '}'
  ].join('\n');

  const variables = { rootId };

  try {
    console.log(`[TRAVERSE] Attempting query for rootId: ${rootId}, targetLevel: ${targetLevel ?? 'N/A'}`);
    // console.log(`[TRAVERSE] Query:\n${query}`); // Original log, replaced by more detailed one below
    // console.log(`[TRAVERSE] Variables:`, variables); // Original log, replaced by more detailed one below
    console.log('[TRAVERSE] Constructed GraphQL Query:\n', query);
    console.log('[TRAVERSE] Query Variables:', JSON.stringify(variables, null, 2));
    const result = await executeGraphQL(query, variables);

    // Apply the filterValidOutgoingEdges helper function to the results
    const rawTraversalData = result.queryNode;
    const safeTraversalData = rawTraversalData.map(filterValidOutgoingEdges);

    console.log(`[TRAVERSE] Query successful for rootId: ${rootId}`);
    res.json({ data: { queryNode: safeTraversalData } }); // Wrap result in 'data' key to match expected frontend structure
  } catch (err) {
    console.error(`[TRAVERSE] Error occurred for rootId: ${rootId}:`, err);
    // Keep existing response logic
    if (err.message?.startsWith('GraphQL query failed:')) {
       res.status(400).json({ error: `GraphQL error during traversal: ${err.message}` });
    } else {
       res.status(500).json({ error: 'Server error during traversal.' });
    }
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

  // Construct query using allofterms (adjust if different search logic needed)
  // Note: Dgraph GraphQL search syntax might require specific function names
  // This assumes a function like 'allofterms' is available via custom query or schema extension
  // A more reliable way might be to use queryNode with filter functions if available
  // Let's try a filter approach assuming standard filters work with @search
  const query = `
    query SearchNodes($term: String!) {
      queryNode(filter: { label: { allofterms: $term } }) { # Adjust field and function based on schema/Dgraph version
        id
        label
        type
      }
    }
  `;
  // If searching other fields, the filter structure might change:
  // e.g., queryNode(filter: { type: { eq: $term } }) { ... }

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

// Helper function to push schema to the configured Dgraph instance
async function pushSchemaToConfiguredDgraph(schema) {
  const url = DGRAPH_ADMIN_SCHEMA_URL; // Use the derived URL
  const result = await pushSchemaViaHttp(url, schema);

  // Add verification step if needed

  return result;
}

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
// This endpoint will now push to the Dgraph instance configured by the API's DGRAPH_BASE_URL.
// The 'target' query parameter is now redundant for the API's action, but we can keep it
// for potential future validation or logging if needed.
app.post('/api/schemas/:id/push', authenticateAdmin, async (req, res) => {
  try {
    const schemaId = req.params.id;
    // const target = req.query.target || 'local'; // Target parameter is now less relevant for API action

    // Get schema content
    const schemaContent = await schemaRegistry.getSchemaContent(schemaId);

    console.log(`[SCHEMA PUSH] Pushing schema ${schemaId} to configured Dgraph instance`);
    const result = await pushSchemaToConfiguredDgraph(schemaContent);

    if (result.success) {
      // If pushing the production schema, update other schemas to not be production
      // This logic might need adjustment depending on how production schema is managed
      // with a single DGRAPH_BASE_URL. Assuming the API instance is tied to a specific
      // Dgraph instance (local or remote), the concept of "production" might apply
      // to the schema pushed to the remote instance.
      // Let's keep this logic for now, assuming it's intended for the schema registry state.
      const schema = await schemaRegistry.getSchemaById(schemaId);
      if (schema.is_production) {
        // This update is to the schema registry, not Dgraph itself.
        // It marks this schema as the currently active production schema in the registry.
        await schemaRegistry.updateSchema(schemaId, { is_production: true });
      }

      res.json({
        success: true,
        message: `Schema ${schemaId} successfully pushed to configured Dgraph instance`,
        results: result // Return the single result object
      });
    } else {
      console.error('[SCHEMA PUSH] Push failed:', result.error);
      res.status(500).json({
        success: false,
        message: `Schema ${schemaId} push encountered errors`,
        results: result // Return the single result object
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
// This endpoint will also push to the Dgraph instance configured by the API's DGRAPH_BASE_URL.
// The 'target' parameter in the request body is now redundant for the API's action.
app.post('/api/admin/schema', authenticateAdmin, async (req, res) => {
  try {
    // Get schema from request body, or schema ID if provided
    const { schema, schemaId /*, target = 'local'*/ } = req.body; // Target parameter is now less relevant

    // Determine which schema to use
    let schemaContent;

    if (schemaId) {
      // If schemaId is provided, use schema from registry
      console.log(`[SCHEMA PUSH] Using schema ${schemaId} from registry`);
      schemaContent = await schemaRegistry.getSchemaContent(schemaId);
    } else if (schema) {
      // If schema content is provided directly, use it
      schemaContent = schema;
    } else {
      return res.status(400).json({ error: 'Missing required field: schema or schemaId' });
    }

    // The API instance is configured for a single Dgraph target via DGRAPH_BASE_URL.
    // We will push the schema to *that* configured instance.
    console.log('[SCHEMA PUSH] Pushing schema to configured Dgraph instance');
    const result = await pushSchemaToConfiguredDgraph(schemaContent);

    if (result.success) {
      return res.json({ success: true, results: result });
    } else {
      console.error('[SCHEMA PUSH] Push failed:', result.error);
      // Return 500 status code if the push failed
      return res.status(500).json({ success: false, message: 'Schema push encountered errors', results: result });
    }
  } catch (err) {
    console.error('[SCHEMA PUSH] Error:', err);
    // Return 500 status code for unexpected errors
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
    const result = await dropAllData(target); // dropAllData now returns a single result object

    // The API endpoint should now return the single result from dropAllData
    if (result.success) {
      res.json({
        success: true,
        message: `Drop all data operation completed successfully for configured Dgraph instance`,
        data: result.data // Include the data from the Dgraph response
      });
    } else {
      // Return 500 status code if the drop failed
      res.status(500).json({
        success: false,
        message: `Drop all data operation encountered errors`,
        error: result.error, // Include the error message from the result
        details: result.details // Include any details from the result
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
    // Use executeGraphQL which is configured with DGRAPH_GRAPHQL_URL
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
  // Use the derived URLs for testing connectivity
  const graphqlUrl = DGRAPH_GRAPHQL_URL;
  const adminSchemaUrl = DGRAPH_ADMIN_SCHEMA_URL;
  const baseUrl = DGRAPH_BASE_URL; // Use the base URL for DNS lookup

  let host = baseUrl.replace(/^https?:\/\//, '').split(':')[0];

  try {
    const dnsStart = Date.now();
    const { address } = await dns.lookup(host);
    const lookupMs = Date.now() - dnsStart;

    console.log(`[DEBUG] Attempting POST request to Dgraph admin schema endpoint: ${adminSchemaUrl}`);
    // Test HTTP admin API reachability using POST with empty schema
    const adminRes = await axios.post(
      adminSchemaUrl,
      "# Empty schema for testing connectivity",
      { headers: { 'Content-Type': 'application/graphql' } }
    );
    console.log('[DEBUG] POST request to Dgraph admin schema endpoint successful.');
    console.log('[DEBUG] Dgraph admin response data:', adminRes.data);


    console.log(`[DEBUG] Attempting POST request to Dgraph GraphQL endpoint: ${graphqlUrl}`);
    // Test GraphQL introspection
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

    // Mutation to delete incoming and outgoing edges, then the node using scalar IDs
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
       // Even if the node wasn't found, edges might have been deleted if they pointed to it.
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

// Export the app instance for testing purposes
const hierarchyRoutes = require('./hierarchyRoutes');
app.use('/api', hierarchyRoutes);

module.exports = app;

// Start the server only if this file is run directly (e.g. node server.js or via nodemon)
// Use !module.parent which is more reliable than require.main === module in some scenarios
if (!module.parent) {
  app.listen(PORT, () => {
    console.log(`API server listening on port ${PORT}`);
  });
}
