require('dotenv').config(); // Load environment variables from .env file
const axios = require('axios');

// Construct Dgraph GraphQL endpoint URL from environment variable or default
let base = process.env.DGRAPH_URL || 'http://localhost:8080';
// Prepend protocol if missing
if (!/^https?:\/\//i.test(base)) {
  base = 'http://' + base;
}
// Remove trailing slash if present
base = base.replace(/\/$/, '');
const DGRAPH_ENDPOINT = `${base}/graphql`;

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
    }

    // Re-throw a generic error for the API layer to handle
    throw new Error('Failed to communicate with Dgraph.');
  }
}

module.exports = { executeGraphQL };
