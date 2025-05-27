const request = require('supertest');
const app = require('../../server');
const { adaptiveTenantFactory } = require('../../services/adaptiveTenantFactory');

describe('Real Integration: Diagnostic Tests', () => {
  describe('Basic Connectivity', () => {
    it('should connect to the API server', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      console.log('Health check response:', response.body);
    });

    it('should check adaptiveTenantFactory capabilities', async () => {
      const capabilities = adaptiveTenantFactory.getCapabilities();
      console.log('Tenant factory capabilities:', capabilities);
      
      const isMultiTenantSupported = adaptiveTenantFactory.isMultiTenantSupported();
      console.log('Multi-tenant supported:', isMultiTenantSupported);
    });

    it('should attempt to create test tenant client', async () => {
      try {
        const testClient = await adaptiveTenantFactory.createTestTenant();
        console.log('Test client created successfully');
        console.log('Test client namespace:', testClient.getNamespace());
        
        // Try a simple query to see if the client works
        const result = await testClient.executeGraphQL('query { __schema { types { name } } }');
        console.log('Schema query result:', !!result);
      } catch (error) {
        console.error('Failed to create test client:', error.message);
        throw error;
      }
    });

    it('should check test database setup utilities', async () => {
      try {
        console.log('Available test utils:', Object.keys(global.testUtils));
        
        // Try to setup test database
        const setupResult = await global.testUtils.setupTestDatabase();
        console.log('Setup test database result:', setupResult);
      } catch (error) {
        console.error('Test database setup failed:', error.message);
        throw error;
      }
    });
  });

  describe('Simple Query Test', () => {
    it('should handle basic query without tenant header', async () => {
      const response = await request(app)
        .post('/api/query')
        .send({
          query: 'query { __schema { types { name } } }'
        });
      
      console.log('Basic query status:', response.status);
      console.log('Basic query body:', response.body);
      
      // Don't expect specific status, just log what we get
      expect([200, 400, 500]).toContain(response.status);
    });

    it('should handle basic query with test tenant header', async () => {
      const response = await request(app)
        .post('/api/query')
        .set('X-Tenant-Id', 'test-tenant')
        .send({
          query: 'query { __schema { types { name } } }'
        });
      
      console.log('Tenant query status:', response.status);
      console.log('Tenant query body:', response.body);
      
      // Don't expect specific status, just log what we get
      expect([200, 400, 500]).toContain(response.status);
    });
  });
});
