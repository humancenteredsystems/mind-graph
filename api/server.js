const express = require('express');
const { executeGraphQL } = require('./dgraphClient'); // Import the client
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


app.listen(PORT, () => {
  console.log(`API server listening on port ${PORT}`);
});
