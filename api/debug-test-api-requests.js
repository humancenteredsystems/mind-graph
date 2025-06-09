// Use ts-node to run TypeScript files directly
require('ts-node/register');

const request = require('supertest');
const app = require('./server.ts').default;

async function debugApiRequests() {
  console.log('🔍 DEBUG: Testing API requests through server...');

  try {
    // Test 1: Check if tenant context is working by testing hierarchy endpoint
    console.log('\n📋 Test 1: Testing tenant context resolution with hierarchy endpoint...');

    // Test 2: Test hierarchy endpoint through API
    console.log('\n📋 Test 2: Testing hierarchy endpoint...');
    const hierarchyResponse = await request(app)
      .get('/api/hierarchy')
      .set('X-Tenant-Id', 'test-tenant');
    
    console.log('Hierarchy response status:', hierarchyResponse.status);
    console.log('Hierarchy response body:', JSON.stringify(hierarchyResponse.body, null, 2));

    // Test 3: Test GraphQL query endpoint
    console.log('\n📋 Test 3: Testing GraphQL query endpoint...');
    const graphqlResponse = await request(app)
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
    
    console.log('GraphQL response status:', graphqlResponse.status);
    console.log('GraphQL response body:', JSON.stringify(graphqlResponse.body, null, 2));

    // Test 4: Test specific node query
    console.log('\n📋 Test 4: Testing specific node query...');
    const nodeResponse = await request(app)
      .post('/api/query')
      .set('X-Tenant-Id', 'test-tenant')
      .send({
        query: `
          query {
            getNode(id: "test-concept-1") {
              id
              label
              type
            }
          }
        `
      });
    
    console.log('Node query response status:', nodeResponse.status);
    console.log('Node query response body:', JSON.stringify(nodeResponse.body, null, 2));

    console.log('\n✅ DEBUG: API request testing completed!');

  } catch (error) {
    console.error('\n❌ DEBUG: API request testing failed:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response body:', error.response.body);
    }
    process.exit(1);
  }
}

// Run the debug
debugApiRequests().catch(console.error);
