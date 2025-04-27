// api/endpoints.test.js
const request = require('supertest');
// We need to import the app instance from server.js
// This requires exporting the app from server.js first.
// Let's assume server.js will be modified to export the app.
// We will need to modify server.js after creating this file.
// const request = require('supertest'); // Removed duplicate require
const app = require('./server'); // Import the Express app instance

// Mock the dgraphClient to avoid actual DB calls during most tests
// We can unmock it for specific integration tests if needed
jest.mock('./dgraphClient', () => ({
  executeGraphQL: jest.fn(),
}));
const { executeGraphQL } = require('./dgraphClient');

// Mock axios for the /api/schema endpoint test
jest.mock('axios');
const axios = require('axios');


describe('API Endpoints (GraphQL-centric)', () => {

  // Clear mocks before each test
  beforeEach(() => {
    executeGraphQL.mockClear();
    axios.get.mockClear();
  });

  // --- Test Root Endpoint ---
  describe('GET /', () => {
    it('responds with 200 and the API welcome message', async () => {
      const response = await request(app).get('/');
      expect(response.statusCode).toBe(200);
      expect(response.text).toBe('MakeItMakeSense.io API is running!');
    });
  });

  // --- Test /api/query ---
  describe('POST /api/query', () => {
    it('responds with 200 and returns data for a valid GraphQL query', async () => {
      const mockQuery = 'query { queryNode { id } }';
      const mockData = { queryNode: [{ id: 'node1' }] };
      executeGraphQL.mockResolvedValue(mockData); // Mock successful execution

      const response = await request(app)
        .post('/api/query')
        .send({ query: mockQuery });

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(mockData);
      expect(executeGraphQL).toHaveBeenCalledWith(mockQuery, {});
    });

    it("responds with 400 when the 'query' field is missing in the request body", async () => {
      const response = await request(app)
        .post('/api/query')
        .send({}); // Missing query

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error', 'Missing required field: query');
      expect(executeGraphQL).not.toHaveBeenCalled();
    });

    it('responds with 400 when the GraphQL query execution results in an error', async () => {
      const mockQuery = 'query { invalidField }';
      const errorMessage = 'GraphQL query failed: Cannot query field "invalidField"';
      executeGraphQL.mockRejectedValue(new Error(errorMessage)); // Mock GraphQL error

      const response = await request(app)
        .post('/api/query')
        .send({ query: mockQuery });

      expect(response.statusCode).toBe(400);
      // Expect the error message *without* the "GraphQL query failed: " prefix
      expect(response.body).toHaveProperty('error', `GraphQL error: ${errorMessage.replace('GraphQL query failed: ', '')}`);
      expect(executeGraphQL).toHaveBeenCalledWith(mockQuery, {});
    });

     it('responds with 500 when a non-GraphQL server error occurs during query execution', async () => {
      const mockQuery = 'query { queryNode { id } }';
      const errorMessage = 'Failed to communicate with Dgraph.';
      executeGraphQL.mockRejectedValue(new Error(errorMessage)); // Mock connection error

      const response = await request(app)
        .post('/api/query')
        .send({ query: mockQuery });

      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('error', 'Server error executing query.');
      expect(executeGraphQL).toHaveBeenCalledWith(mockQuery, {});
    });
  });

  // --- Test /api/mutate ---
  describe('POST /api/mutate', () => {
    it('responds with 200 and returns data for a valid GraphQL mutation', async () => {
      const mockMutation = 'mutation { addNode(...) { ... } }';
      const mockVariables = { label: 'test' };
      const mockResult = { addNode: { node: [{ id: 'newId' }] } };
      executeGraphQL.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/mutate')
        .send({ mutation: mockMutation, variables: mockVariables });

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(executeGraphQL).toHaveBeenCalledWith(mockMutation, mockVariables);
    });

     it("responds with 400 when the 'mutation' field is missing in the request body", async () => {
      const response = await request(app)
        .post('/api/mutate')
        .send({}); // Missing mutation

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error', 'Missing required field: mutation');
      expect(executeGraphQL).not.toHaveBeenCalled();
    });

    it('responds with 400 when the GraphQL mutation execution results in an error', async () => {
      const mockMutation = 'mutation { invalidMutation }';
      const errorMessage = 'GraphQL query failed: Cannot mutate field "invalidMutation"';
      executeGraphQL.mockRejectedValue(new Error(errorMessage)); // Mock GraphQL error

      const response = await request(app)
        .post('/api/mutate')
        .send({ mutation: mockMutation });

      expect(response.statusCode).toBe(400);
      // Expect the error message *without* the "GraphQL query failed: " prefix
      expect(response.body).toHaveProperty('error', `GraphQL error: ${errorMessage.replace('GraphQL query failed: ', '')}`);
      expect(executeGraphQL).toHaveBeenCalledWith(mockMutation, {});
    });

    it('responds with 500 when a non-GraphQL server error occurs during mutation execution', async () => {
      const mockMutation = 'mutation { addNode(...) { ... } }';
      const errorMessage = 'Failed to communicate with Dgraph.';
      executeGraphQL.mockRejectedValue(new Error(errorMessage)); // Mock connection error

      const response = await request(app)
        .post('/api/mutate')
        .send({ mutation: mockMutation });

      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('error', 'Server error executing mutation.');
      expect(executeGraphQL).toHaveBeenCalledWith(mockMutation, {});
    });
  });

  // --- Test /api/traverse ---
  describe('POST /api/traverse', () => {
     it('responds with 200 and returns data for a valid traversal request', async () => {
      const rootId = 'node1';
      const currentLevel = 2; // Changed from depth to currentLevel
      const fields = ['id', 'label'];
      const mockResult = { queryNode: [/* ... nested data ... */] };
      executeGraphQL.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/traverse')
        .send({ rootId, currentLevel, fields }); // Changed depth to currentLevel

      expect(response.statusCode).toBe(200);
      // Expect the response body to contain the mockResult wrapped in a 'data' key
      expect(response.body).toEqual({ data: mockResult });
      // Check if executeGraphQL was called with the correct structure, ignoring whitespace
      const calledQuery = executeGraphQL.mock.calls[0][0].replace(/\s+/g, ' ');
      expect(calledQuery).toContain('query TraverseGraph($rootId: String!) { queryNode(filter: { id: { eq: $rootId } }) {');
      expect(calledQuery).toContain('id label'); // Check for requested fields
      expect(calledQuery).toContain('outgoing { type to (filter: { level: { eq: 3 } }) {'); // Check for filter based on currentLevel
      expect(calledQuery).toContain('id label level } } } }'); // Check for fields in 'to' block including level, and closing braces
      expect(executeGraphQL).toHaveBeenCalledWith(
        expect.any(String), // Query string is dynamic, just check it's a string
        { rootId } // Variables should only contain rootId
      );
    });

    it("responds with 400 when the 'rootId' field is missing in the request body", async () => {
       const response = await request(app)
        .post('/api/traverse')
        .send({ currentLevel: 1 });
       expect(response.statusCode).toBe(400);
       expect(response.body).toHaveProperty('error', 'Missing required field: rootId');
    });

    it('responds with 400 for invalid currentLevel parameter (negative)', async () => {
      const response = await request(app)
        .post('/api/traverse')
        .send({ rootId: 'node1', currentLevel: -1 });
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid depth parameter. Must be a non-negative number.');
    });

    it('responds with 400 for invalid currentLevel parameter (non-number)', async () => {
      const response = await request(app)
        .post('/api/traverse')
        .send({ rootId: 'node1', currentLevel: 'abc' });
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid depth parameter. Must be a non-negative number.');
    });

    it('responds with 200 and defaults fields for invalid fields parameter (empty array)', async () => {
      const mockResult = { queryNode: [{ id: 'node1', label: 'Node 1', type: 'concept', level: 0, description: null, outgoing: [] }] };
      executeGraphQL.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/traverse')
        .send({ rootId: 'node1', fields: [] }); // Empty fields array

      expect(response.statusCode).toBe(200);
      // Expect the response body to contain the mockResult wrapped in a 'data' key
      expect(response.body).toEqual({ data: mockResult });
      // Expect executeGraphQL to be called with default fields, ignoring whitespace
      const calledQuery = executeGraphQL.mock.calls[0][0].replace(/\s+/g, ' ');
      expect(calledQuery).toContain('id label type level description');
      expect(calledQuery).toContain('outgoing { type to { id label type level description } } } }');
    });

     it('responds with 200 and filters fields for invalid fields parameter (invalid characters)', async () => {
       const mockResult = { queryNode: [{ id: 'node1', label: 'Node 1', type: 'concept', level: 0, description: null, outgoing: [] }] };
       executeGraphQL.mockResolvedValue(mockResult);

       const response = await request(app)
        .post('/api/traverse')
        .send({ rootId: 'node1', fields: ['id', 'label; DROP TABLES;'] }); // Invalid characters

       expect(response.statusCode).toBe(200);
       // Expect the response body to contain the mockResult wrapped in a 'data' key
       expect(response.body).toEqual({ data: mockResult });
       // Expect executeGraphQL to be called with filtered fields (only 'id' in this case, as 'label; DROP TABLES;' is rejected)
       const calledQuery = executeGraphQL.mock.calls[0][0].replace(/\s+/g, ' ');
       expect(calledQuery).toContain('id'); // 'id' is an allowed field and was requested
       expect(calledQuery).not.toContain('label; DROP TABLES;'); // The invalid part should be filtered
       // The query should only include 'id' field (since all other fields including the invalid one are filtered out)
       // Simplified, more flexible assertion that verifies the structure without exact field matching
       expect(calledQuery).toContain('outgoing { type to {'); // Check basic structure
       expect(calledQuery).toContain('id'); // Should contain id field
       expect(calledQuery).not.toContain('label'); // Should not contain filtered fields
    });

    it('responds with 400 when GraphQL error occurs during traversal', async () => {
      const rootId = 'node1';
      const errorMessage = 'GraphQL query failed: Unknown field "nonExistent"';
      executeGraphQL.mockRejectedValue(new Error(errorMessage));
      const response = await request(app)
        .post('/api/traverse')
        .send({ rootId });
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error', `GraphQL error during traversal: ${errorMessage}`);
    });

    it('responds with 500 when server error occurs during traversal', async () => {
      const rootId = 'node1';
      const errorMessage = 'Failed to communicate with Dgraph.';
      executeGraphQL.mockRejectedValue(new Error(errorMessage));
      const response = await request(app)
        .post('/api/traverse')
        .send({ rootId });
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('error', 'Server error during traversal.');
    });
  });

  // --- Test /api/search ---
  describe('GET /api/search', () => {
    it('responds with 200 and returns data for a valid search term', async () => {
      const term = 'Concept';
      const mockResult = { queryNode: [/* ... search results ... */] };
      executeGraphQL.mockResolvedValue(mockResult);

      const expectedQuery = `
    query SearchNodes($term: String!) {
      queryNode(filter: { label: { allofterms: $term } }) { # Adjust field and function based on schema/Dgraph version
        id
        label
        type
      }
    }
  `;

      const response = await request(app)
        .get('/api/search')
        .query({ term });

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(executeGraphQL).toHaveBeenCalledWith(expect.stringContaining('allofterms: $term'), { term });
    });

     it("responds with 400 when the 'term' query parameter is missing", async () => {
       const response = await request(app).get('/api/search');
       expect(response.statusCode).toBe(400);
       expect(response.body).toHaveProperty('error', 'Missing required query parameter: term');
    });

    it("responds with 400 when the 'field' query parameter is invalid", async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ term: 'test', field: 'invalidField' });
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid search field: invalidField. Allowed fields: label');
    });

    it('responds with 400 when GraphQL error occurs during search', async () => {
      const term = 'test';
      const errorMessage = 'GraphQL query failed: Index not available for field "label"';
      executeGraphQL.mockRejectedValue(new Error(errorMessage));
      const response = await request(app)
        .get('/api/search')
        .query({ term });
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error', `GraphQL error during search: ${errorMessage}`);
    });

    it('responds with 500 when server error occurs during search', async () => {
      const term = 'test';
      const errorMessage = 'Failed to communicate with Dgraph.';
      executeGraphQL.mockRejectedValue(new Error(errorMessage));
      const response = await request(app)
        .get('/api/search')
        .query({ term });
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('error', 'Server error during search.');
    });
  });

  // --- Test /api/schema ---
  describe('GET /api/schema', () => {
    it('responds with 200 and returns the Dgraph schema as plain text', async () => {
      const mockSchema = 'type Node { id: String! @id }';
      axios.get.mockResolvedValue({ data: { data: { schema: mockSchema } } });

      const response = await request(app).get('/api/schema');

      expect(response.statusCode).toBe(200);
      expect(response.text).toBe(mockSchema);
      expect(response.headers['content-type']).toMatch(/text\/plain/);
      expect(axios.get).toHaveBeenCalledWith('http://localhost:8080/admin/schema');
    });

    it('responds with 500 when fetching the schema from Dgraph admin fails', async () => {
       axios.get.mockRejectedValue(new Error('Network Error'));
       const response = await request(app).get('/api/schema');
       expect(response.statusCode).toBe(500);
       expect(response.body).toHaveProperty('error', 'Failed to fetch schema from Dgraph.');
    });
  });

  // --- Test /api/health ---
  describe('GET /api/health', () => {
    it('responds with 200 and OK statuses when the Dgraph health check query succeeds', async () => {
      executeGraphQL.mockResolvedValue({}); // Mock successful minimal query

      const response = await request(app).get('/api/health');

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ apiStatus: "OK", dgraphStatus: "OK" });
      // Check only for the query string argument, as variables are not passed
      expect(executeGraphQL).toHaveBeenCalledWith('query { queryNode { id } }');
    });

    it('responds with 500 and Error status for Dgraph when the health check query fails', async () => {
       const errorMessage = 'Connection refused';
       executeGraphQL.mockRejectedValue(new Error(errorMessage)); // Mock failed query

       const response = await request(app).get('/api/health');

       expect(response.statusCode).toBe(500);
       expect(response.body).toEqual({ apiStatus: "OK", dgraphStatus: "Error", error: errorMessage });
       // Check only for the query string argument, as variables are not passed
       expect(executeGraphQL).toHaveBeenCalledWith('query { queryNode { id } }');
    });
  });

});
