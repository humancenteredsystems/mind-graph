require('dotenv').config(); // Load environment variables from .env file
const fs = require('fs');
const { Client } = require('ssh2'); // For remote schema push
const schemaRegistry = require('./schemaRegistry'); // Schema registry module

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

  // Validate currentLevel
  if (currentLevel !== undefined && (typeof currentLevel !== 'number' || currentLevel < 0)) {
    return res.status(400).json({ error: 'Invalid depth parameter. Must be a non-negative number.' });
  }

  // Validate fields
  const allowedFields = ['id', 'label', 'type', 'level', 'status', 'branch']; // Include all schema fields
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

// Helper function to push schema to local Dgraph instance
async function pushSchemaToLocal(schema) {
  try {
    const DGRAPH_ADMIN_ENDPOINT = process.env.DGRAPH_ADMIN_URL || 'http://localhost:8080/admin/schema';
    
    const response = await axios.post(
      DGRAPH_ADMIN_ENDPOINT,
      schema,
      { headers: { 'Content-Type': 'application/graphql' } }
    );
    
    // Verify schema was applied
    const verificationResult = await verifySchemaLocal();
    
    return {
      success: true,
      verification: verificationResult,
      response: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      details: error.response?.data || null
    };
  }
}

// Helper function to verify schema was applied locally
async function verifySchemaLocal() {
  try {
    // Wait briefly for schema to apply
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Use introspection query to verify GraphQL schema is loaded
    const introspectionQuery = "{ __schema { queryType { name } } }";
    const response = await axios.post(
      process.env.DGRAPH_URL || 'http://localhost:8080/graphql',
      { query: introspectionQuery },
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper function to push schema to remote Dgraph instance
async function pushSchemaToRemote(schema) {
  try {
    // Get SSH connection details from environment variables
    const host = process.env.DGRAPH_SSH_HOST;
    const username = process.env.DGRAPH_SSH_USER;
    const privateKey = process.env.DGRAPH_SSH_KEY || 
                      (process.env.DGRAPH_SSH_KEY_PATH ? 
                       fs.readFileSync(process.env.DGRAPH_SSH_KEY_PATH) : 
                       undefined);
    
    if (!host || !username || !privateKey) {
      throw new Error('Missing required SSH configuration for remote push');
    }
    
    // Create temporary schema file with unique name
    const tempFilePath = `/tmp/schema_${Date.now()}.graphql`;
    fs.writeFileSync(tempFilePath, schema);
    
    // Create SSH connection
    const conn = new Client();
    
    // Promisify connection
    const connectResult = await new Promise((resolve, reject) => {
      conn.on('ready', () => {
        resolve({ success: true });
      }).on('error', (err) => {
        reject(err);
      }).connect({
        host,
        username,
        privateKey
      });
    });
    
    // SCP the schema file to the server
    const scpResult = await new Promise((resolve, reject) => {
      conn.sftp((err, sftp) => {
        if (err) return reject(err);        
        sftp.fastPut(tempFilePath, 'schema.graphql', (err) => {
          if (err) return reject(err);
          resolve({ success: true });
        });
      });
    });
    
    // Execute curl command to push schema
    const curlCommand = 'curl -X POST http://localhost:8080/admin/schema -H "Content-Type: application/graphql" --data-binary @schema.graphql';
    const execResult = await new Promise((resolve, reject) => {
      conn.exec(curlCommand, (err, stream) => {
        if (err) return reject(err);
        
        let output = '';
        stream.on('data', (data) => {
          output += data.toString();
        }).on('close', (code) => {
          if (code === 0) {
            resolve({ success: true, output });
          } else {
            reject(new Error(`Command exited with code ${code}: ${output}`));
          }
        });
      });
    });
    
    // Clean up connection and temp file
    conn.end();
    fs.unlinkSync(tempFilePath);
    
    return {
      success: true,
      scp: scpResult,
      exec: execResult
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Schema Management Endpoints
// -------------------------------------------------------------------

// GET /api/schemas - List all available schemas
app.get('/api/schemas', async (req, res) => {
  try {
    const schemas = await schemaRegistry.getAllSchemas();
    res.json(schemas);
  } catch (error) {
    console.error('[SCHEMAS] Error getting schemas:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/schemas/:id - Get a specific schema by ID
app.get('/api/schemas/:id', async (req, res) => {
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
app.get('/api/schemas/:id/content', async (req, res) => {
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
app.post('/api/schemas', async (req, res) => {
  // Check admin API key authentication
  const apiKey = req.headers['x-admin-api-key'];
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
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
app.put('/api/schemas/:id', async (req, res) => {
  // Check admin API key authentication
  const apiKey = req.headers['x-admin-api-key'];
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
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
app.post('/api/schemas/:id/push', async (req, res) => {
  // Check admin API key authentication
  const apiKey = req.headers['x-admin-api-key'];
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const schemaId = req.params.id;
    const target = req.query.target || 'local';
    
    if (!['local', 'remote', 'both'].includes(target)) {
      return res.status(400).json({ error: 'Invalid target. Must be "local", "remote", or "both"' });
    }
    
    // Get schema content
    const schemaContent = await schemaRegistry.getSchemaContent(schemaId);
    
    const results = {};
    
    // Handle local schema push
    if (target === 'local' || target === 'both') {
      console.log(`[SCHEMA PUSH] Pushing schema ${schemaId} to local Dgraph instance`);
      const localResult = await pushSchemaToLocal(schemaContent);
      results.local = localResult;
      
      if (!localResult.success) {
        console.error('[SCHEMA PUSH] Local push failed:', localResult.error);
      }
    }
    
    // Handle remote schema push
    if (target === 'remote' || target === 'both') {
      console.log(`[SCHEMA PUSH] Pushing schema ${schemaId} to remote Dgraph instance`);
      const remoteResult = await pushSchemaToRemote(schemaContent);
      results.remote = remoteResult;
      
      if (!remoteResult.success) {
        console.error('[SCHEMA PUSH] Remote push failed:', remoteResult.error);
      }
    }
    
    // Return overall success status
    const allSuccessful = Object.values(results).every(result => result.success);
    
    if (allSuccessful) {
      // If pushing the production schema, update other schemas to not be production
      const schema = await schemaRegistry.getSchemaById(schemaId);
      if (schema.is_production) {
        await schemaRegistry.updateSchema(schemaId, { is_production: true });
      }
      
      res.json({
        success: true,
        message: `Schema ${schemaId} successfully pushed to ${target}`,
        results
      });
    } else {
      res.status(500).json({
        success: false,
        message: `Schema ${schemaId} push to ${target} encountered errors`,
        results
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

// Original direct schema push endpoint (maintained for compatibility)
app.post('/api/admin/schema', async (req, res) => {
  // Check admin API key authentication
  const apiKey = req.headers['x-admin-api-key'];
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get schema from request body, or schema ID if provided
    const { schema, schemaId, target = 'local' } = req.body;
    
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
    
    if (!['local', 'remote', 'both'].includes(target)) {
      return res.status(400).json({ error: 'Invalid target. Must be "local", "remote", or "both"' });
    }
    
    const results = {};
    
    // Handle local schema push
    if (target === 'local' || target === 'both') {
      console.log('[SCHEMA PUSH] Pushing schema to local Dgraph instance');
      const localResult = await pushSchemaToLocal(schemaContent);
      results.local = localResult;
      
      if (!localResult.success) {
        console.error('[SCHEMA PUSH] Local push failed:', localResult.error);
      }
    }
    
    // Handle remote schema push
    if (target === 'remote' || target === 'both') {
      console.log('[SCHEMA PUSH] Pushing schema to remote Dgraph instance');
      const remoteResult = await pushSchemaToRemote(schemaContent);
      results.remote = remoteResult;
      
      if (!remoteResult.success) {
        console.error('[SCHEMA PUSH] Remote push failed:', remoteResult.error);
      }
    }
    
    // Return overall success status
    const allSuccessful = Object.values(results).every(result => result.success);
    
    if (allSuccessful) {
      res.json({
        success: true,
        message: `Schema successfully pushed to ${target}`,
        results
      });
    } else {
      res.status(500).json({
        success: false,
        message: `Schema push to ${target} encountered errors`,
        results
      });
    }
    
  } catch (error) {
    console.error('[SCHEMA PUSH] Error:', error);
    res.status(500).json({ 
      success: false,
      error: `Server error during schema push: ${error.message}` 
    });
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
module.exports = app;

// Start the server only if this file is run directly (e.g. node server.js or via nodemon)
// Use !module.parent which is more reliable than require.main === module in some scenarios
if (!module.parent) {
  app.listen(PORT, () => {
    console.log(`API server listening on port ${PORT}`);
  });
}
