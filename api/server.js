require('dotenv').config(); // Load environment variables from .env file
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
    res.status(200).json(result); // Use 200 OK for mutations unless specifically creating (201)
  } catch (error) {
    // Log the detailed error
    console.error(`Error in /api/mutate endpoint:`, error);
     // Provide a more specific error message if possible
    const errorMessage = error.message.includes('GraphQL query failed:')
      ? `GraphQL error: ${error.message.replace('GraphQL query failed: ', '')}`
      : 'Server error executing mutation.';
    const statusCode = error.message.includes('GraphQL query failed:') ? 400 : 500;
    res.status(statusCode).json({ error: errorMessage });
  } // End catch block
}); // End app.post('/api/mutate')

// Endpoint for graph traversal using @recurse
app.post('/api/traverse', async (req, res) => {
  const { rootId, depth = 3, fields = ['id', 'label', 'type'] } = req.body;

  if (!rootId) {
    return res.status(400).json({ error: 'Missing required field: rootId' });
  }
  if (typeof depth !== 'number' || depth < 0) {
      return res.status(400).json({ error: 'Invalid depth parameter. Must be a non-negative number.' });
  }
  if (!Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({ error: 'Invalid fields parameter. Must be a non-empty array of strings.' });
  }

  // Basic field validation (prevent injecting complex structures)
  const allowedChars = /^[a-zA-Z0-9_]+$/;
  if (!fields.every(field => allowedChars.test(field))) {
      return res.status(400).json({ error: 'Invalid characters in fields parameter.' });
  }
  const fieldsString = fields.join('\n          '); // Format for GraphQL query

  // Construct the recursive query
  const query = `
    query TraverseGraph($rootId: String!, $depth: Int!) {
      queryNode(filter: { id: [$rootId] }) @recurse(depth: $depth) {
          ${fieldsString}
          # Always include outgoing to allow traversal, even if not in requested fields initially
          outgoing {
            type
            to {
              # Include fields needed for next level of recursion
              ${fieldsString}
            }
          }
      }
    }
  `;
  const variables = { rootId, depth };

  try {
    const result = await executeGraphQL(query, variables);
    res.json(result);
  } catch (error) {
    console.error(`Error in /api/traverse endpoint: ${error.message}`);
    if (error.message.startsWith('GraphQL query failed:')) {
       res.status(400).json({ error: `GraphQL error during traversal: ${error.message}` });
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
  const healthQuery = `query { queryNode(limit: 0) { id } }`; // Minimal query
  try {
    await executeGraphQL(healthQuery);
    res.json({ apiStatus: "OK", dgraphStatus: "OK" });
  } catch (error) {
    console.error(`Health check failed: ${error.message}`);
    res.status(500).json({ apiStatus: "OK", dgraphStatus: "Error", error: error.message });
  }
});

// Export the app instance for testing purposes
module.exports = app;

// Start the server only if this file is run directly (not required by a test runner)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`API server listening on port ${PORT}`);
  });
}
