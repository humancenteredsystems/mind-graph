const request = require('supertest');
const app = require('../../server');
const { testRequest } = require('../helpers/realTestHelpers');

describe('Real Integration: Diagnostic Tests', () => {
  // These tests check basic connectivity and setup,
  // so they don't need the full test database setup/cleanup
  // beforeAll(async () => {
  //   await global.testUtils.testDataSeeder.setupTestDatabase();
  // });

  // afterAll(async () => {
  //   await global.testUtils.testDataSeeder.cleanupTestDatabase();
  // });

  // beforeEach(async () => {
  //   await global.testUtils.testDataSeeder.resetTestDatabase();
  // });

  describe('Basic Connectivity', () => {
    it('should connect to the API server', async () => {
      await request(app).get('/').expect(200);
    });

    it('should check adaptiveTenantFactory capabilities', async () => {
      const response = await testRequest(app).get('/api/system/status').expect(200);
      expect(response.body).toHaveProperty('dgraphEnterprise');
      expect(response.body).toHaveProperty('multiTenantVerified');
      expect(response.body).toHaveProperty('mode');
    });

    it('should attempt to create test tenant client', async () => {
      // This test verifies that the test tenant client can be created,
      // which implicitly checks Dgraph connectivity and namespace setup.
      try {
        const testClient = global.testUtils.getTestTenantClient();
        expect(testClient).toBeDefined();
        // Optionally, perform a simple query to confirm connectivity
        const result = await testClient.executeGraphQL('query { queryNode { id } }');
        expect(result).toBeDefined();
      } catch (error) {
        console.error('Failed to create test tenant client or query:', error);
        throw error; // Fail the test if client creation or query fails
      }
    });

    it('should check test database setup utilities', async () => {
      // This test verifies that the testDataSeeder methods are available
      // and can be called without throwing errors.
      try {
        // Try to setup test database
        const setupResult = await global.testUtils.testDataSeeder.setupTestDatabase();
        console.log('Setup test database result:', setupResult);
        expect(setupResult).toBe(true);

        // Try to reset test database
        const resetResult = await global.testUtils.testDataSeeder.resetTestDatabase();
        console.log('Reset test database result:', resetResult);
        expect(resetResult).toBe(true);

        // Try to cleanup test database
        const cleanupResult = await global.testUtils.testDataSeeder.cleanupTestDatabase();
        console.log('Cleanup test database result:', cleanupResult);
        expect(cleanupResult).toBe(true);

      } catch (error) {
        console.error('Test database setup utilities failed:', error.message);
        throw error; // Fail the test if any utility call fails
      }
    });
  });

  describe('Simple Query Test', () => {
    // These tests require basic schema to be present, but not necessarily seeded data
    it('should handle basic query without tenant header', async () => {
      const query = `query { queryHierarchy { id name } }`; // Querying Hierarchy now that schema is updated
      const response = await testRequest(app).post('/api/query').send({ query }).expect(200);
      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body.queryHierarchy)).toBe(true);
    });

    it('should handle basic query with test tenant header', async () => {
      const query = `query { queryHierarchy { id name } }`; // Querying Hierarchy now that schema is updated
      const response = await testRequest(app)
        .post('/api/query')
        .set('X-Tenant-Id', 'test-tenant')
        .send({ query })
        .expect(200);
      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body.queryHierarchy)).toBe(true);
    });
  });
});
