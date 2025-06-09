const request = require('supertest');
const app = require('./server.ts').default;

async function debugTestRequest() {
  try {
    console.log('Making test request to verify namespace resolution...');
    
    const response = await request(app)
      .post('/api/query')
      .set('X-Tenant-Id', 'test-tenant')
      .send({
        query: `
          query {
            queryHierarchy {
              id
              name
            }
          }
        `
      });
    
    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(response.body, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugTestRequest();
