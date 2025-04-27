require('dotenv').config(); // Load environment variables from .env file
const axios = require('axios');

 // Normalize and construct Dgraph GraphQL endpoint URL from environment variable or default
 // Determine Dgraph GraphQL endpoint from environment or default port
 const rawDgraphUrl = process.env.DGRAPH_URL || 'http://localhost:8080';
 const baseUrl = rawDgraphUrl.match(/^https?:\/\//)
   ? rawDgraphUrl.replace(/\/$/, '')
   : `http://${rawDgraphUrl}`;
 const DGRAPH_ENDPOINT = baseUrl.endsWith('/graphql')
   ? baseUrl
   : `${baseUrl}/graphql`;

/**
 * Executes a GraphQL query or mutation against the Dgraph endpoint.
 * @param {string} query - The GraphQL query string.
 * @param {object} [variables={}] - An object containing variables for the query.
 * @returns {Promise<object>} - A promise that resolves with the 'data' part of the GraphQL response.
 * @throws {Error} - Throws an error if the request fails or if GraphQL errors are returned.
 */
async function executeGraphQL(query, variables = {}) {
  console.log(`Executing GraphQL query: ${query.substring(0, 100)}...`, variables); // Log query start
  try {
    const response = await axios.post(DGRAPH_ENDPOINT, {
      query,
      variables,
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    // Check for GraphQL errors in the response body
    if (response.data.errors) {
      console.error('GraphQL Errors:', JSON.stringify(response.data.errors, null, 2));
      throw new Error(`GraphQL query failed: ${response.data.errors.map(e => e.message).join(', ')}`);
    }

    console.log('GraphQL query executed successfully.'); // Log success
    console.log('[DGRAPH CLIENT] response.data:', response.data);
    console.log('[DGRAPH CLIENT] returning data:', response.data.data);
    return response.data.data; // Return only the data part of the response

  } catch (error) {
    console.error(`Dgraph client error: ${error.message}`);
    if (error.response) {
      // Error from the HTTP request itself (e.g., 4xx, 5xx)
      console.error('Dgraph response status:', error.response.status);
      console.error('Dgraph response data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Dgraph request error: No response received.', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Dgraph client setup error:', error.message);
      // Re-throw the original error if it's not a network/response issue
      throw error;
    }

    // If there were GraphQL errors, the error was already thrown above.
    // If we reached here, it's a different type of error (network, etc.)
    // Re-throw a generic error for the API layer to handle, or the original error
    throw new Error('Failed to communicate with Dgraph.'); // Keep this for network issues not caught by error.response/request
  }
}

module.exports = { executeGraphQL };
