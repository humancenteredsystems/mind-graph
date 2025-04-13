const express = require('express');
const { executeGraphQL } = require('./dgraphClient'); // Import the client
const { v4: uuidv4 } = require('uuid'); // Import UUID generator
const app = express();
const PORT = process.env.PORT || 3001; // Use port 3001 to avoid Dgraph conflicts

// Middleware to parse JSON bodies (useful for future POST requests)
app.use(express.json());

app.get('/', (req, res) => {
  res.send('MakeItMakeSense.io API is running!');
});

// Endpoint to get all nodes (basic example)
app.get('/api/graph/all', async (req, res) => {
  // Define the GraphQL query to fetch nodes
  // Adjust fields based on your actual schema.graphql if needed
  const query = `
    query GetAllNodes {
      queryNode { # Assuming 'queryNode' fetches all nodes based on schema
        id
        label
        type
        # Add other fields you want to retrieve initially
        # level
        # status
        # branch
      }
    }
  `;
  try {
    // Execute the query using the Dgraph client
    const data = await executeGraphQL(query);
    // Send the Dgraph data as JSON response
    // The data structure will be { queryNode: [...] }
    res.json(data);
  } catch (error) {
    // If executeGraphQL throws an error, send a 500 status
    console.error(`Error in /api/graph/all endpoint: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch graph data from Dgraph.' });
  }
});

// Endpoint to submit a new node
app.post('/api/submit-node', async (req, res) => {
  // Extract node data from request body
  const { label, type, level, status, branch } = req.body;

  // Basic validation
  if (!label || !type) {
    return res.status(400).json({ error: 'Missing required fields: label and type' });
  }

  // Generate a unique ID for the new node
  const newNodeId = uuidv4();

  // Define the GraphQL mutation to add a node, now including the ID
  const mutation = `
    mutation AddSingleNode($id: String!, $label: String!, $type: String!, $level: Int, $status: String, $branch: String) {
      addNode(input: [{
        id: $id, # Provide the generated ID
        label: $label,
        type: $type,
        level: $level,
        status: $status,
        branch: $branch
      }]) {
        node { # Return the created node details
          id # Should match the ID we provided
          label
          type
          level
          status
          branch
        }
      }
    }
  `;

  // Prepare variables for the mutation, including the new ID
  const variables = {
    id: newNodeId, // Add the generated ID here
    label,
    type,
    level: level !== undefined ? level : null, // Handle optional level
    status: status || 'pending', // Default status
    branch: branch || 'main' // Default branch for now
  };

  try {
    // Execute the mutation using the Dgraph client
    const result = await executeGraphQL(mutation, variables);

    // Check if the node was created and return its data
    if (result && result.addNode && result.addNode.node && result.addNode.node.length > 0) {
      res.status(201).json(result.addNode.node[0]); // Return the first created node
    } else {
      // Should not happen if executeGraphQL doesn't throw, but good practice
      console.error('Mutation executed but no node data returned:', result);
      throw new Error('Node creation mutation did not return expected data.');
    }
  } catch (error) {
    // If executeGraphQL throws an error, send a 500 status
    console.error(`Error in /api/submit-node endpoint: ${error.message}`);
    // Distinguish between GraphQL errors and connection errors if possible
    if (error.message.startsWith('GraphQL query failed:')) {
       res.status(400).json({ error: `Failed to add node: ${error.message}` });
    } else {
       res.status(500).json({ error: 'Failed to add node due to server error.' });
    }
  }
});


app.listen(PORT, () => {
  console.log(`API server listening on port ${PORT}`);
});
