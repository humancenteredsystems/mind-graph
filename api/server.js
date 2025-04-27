require('dotenv').config(); // Load environment variables from .env file

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
const app = express();
const PORT = process.env.PORT || 3000; // Use PORT from .env or default to 3000

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


app.get('/', (req, res) => {
  res.send('MakeItMakeSense.io API is running!');
});

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
  const { mutation, variables } = req.body;
  if (!mutation) {
    return res.status(400).json({ error: 'Missing required field: mutation' });
  }
  try {
    // Note: Consider adding validation/sanitization here if needed
    const result = await executeGraphQL(mutation, variables || {});
    console.log('[MUTATE] Dgraph result for addNode:', result);
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

  if (!rootId) {
    return res.status(400).json({ error: 'Missing required field: rootId' });
  }

  // Validate fields
  const allowedFields = ['id', 'label', 'type', 'level', 'description']; // Add only whitelisted fields
  const safeFields = Array.isArray(fields) && fields.length > 0
    ? fields.filter(f => allowedFields.includes(f))
    : allowedFields; // Default to allowed fields if none provided or invalid

  // Ensure 'level' is included if currentLevel is used for filtering
  if (currentLevel !== undefined && !safeFields.includes('level')) {
    safeFields.push('level');
  }

  if (safeFields.length === 0) {
    // This case should ideally not happen if default is allowedFields, but good to check
    return res.status(400).json({ error: 'Invalid fields array. No allowed fields provided.' });
  }

  const fieldBlock = safeFields.join('\n    '); // Indent fields correctly
  const targetLevel = currentLevel !== undefined ? currentLevel + 1 : null;

  // Construct the 'to' block conditionally
  const toBlock = targetLevel !== null
    ? `to (filter: { level: { eq: ${targetLevel} } }) {\n      ${fieldBlock}\n    }` // Note indentation
    : `to {\n      ${fieldBlock}\n    }`; // Note indentation

  // Construct the full query using array join for clarity and safety
  const query = [
    'query TraverseGraph($rootId: String!) {',
    '  queryNode(filter: { id: { eq: $rootId } }) {',
    `    ${fieldBlock}`, // Fields for the root node
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
    console.log(`[TRAVERSE] Query:\n${query}`);
    console.log(`[TRAVERSE] Variables:`, variables);
    const result = await executeGraphQL(query, variables);

    // Filter out null 'to' nodes if the level filter resulted in no matches for an edge
    // Important: executeGraphQL now returns the 'data' part directly
    if (result && result.queryNode && result.queryNode.length > 0) {
        result.queryNode.forEach(node => {
            if (node.outgoing) {
                node.outgoing = node.outgoing.filter(edge => edge.to !== null);
            }
        });
    }

    console.log(`[TRAVERSE] Query successful for rootId: ${rootId}`);
    res.json({ data: result }); // Wrap result in 'data' key to match expected frontend structure if needed
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
    const DGRAPH_ADMIN_ENDPOINT = 'http://localhost:8080/admin/schema'; // Dgraph Admin endpoint
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
  const raw = process.env.DGRAPH_URL || 'http://localhost:8080';
  let base = raw.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const host = base.split(':')[0];
  try {
    const dnsStart = Date.now();
    const { address } = await dns.lookup(host);
    const lookupMs = Date.now() - dnsStart;

    // Test HTTP admin API reachability
    await axios.head(`${raw}/admin/schema`);

    // Test GraphQL introspection
    const gqlRes = await axios.post(
      `${raw}/graphql`,
      { query: '{ __schema { queryType { name } } }' },
      { headers: { 'Content-Type': 'application/json' } }
    );

    res.json({
      dns: { host: address, lookupMs },
      httpAdmin: 'reachable',
      graphql: gqlRes.data
    });
  } catch (err) {
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
    console.log(`[DELETE NODE CASCADE] Attempting to delete node: ${nodeId}`);

    const deleteNodeMutation = `
      mutation DeleteNode($id: String!) {
        deleteNode(filter: { id: { eq: $id } }) {
          msg
          numUids
        }
      }
    `;
    const deleteNodeResult = await executeGraphQL(deleteNodeMutation, { id: nodeId });

    console.log(`[DELETE NODE CASCADE] Delete node result:`, deleteNodeResult);

    // Check if the node was actually deleted
    if (deleteNodeResult?.deleteNode?.numUids > 0) {
       console.log(`[DELETE NODE CASCADE] Successfully deleted node: ${nodeId}`);
       res.json({
         success: true,
         deletedNode: nodeId,
         numUids: deleteNodeResult.deleteNode.numUids
       });
    } else {
       console.warn(`[DELETE NODE CASCADE] Node ${nodeId} not found or not deleted.`);
       res.status(404).json({ error: `Node ${nodeId} not found or not deleted.` });
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
module.exports = app;

// Start the server only if this file is run directly (e.g. node server.js or via nodemon)
// Use !module.parent which is more reliable than require.main === module in some scenarios
if (!module.parent) {
  app.listen(PORT, () => {
    console.log(`API server listening on port ${PORT}`);
  });
}
