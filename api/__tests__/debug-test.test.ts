import request from 'supertest';
import app from '../server';

describe('Debug Test', () => {
  it('should get a response from root endpoint', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);
    
    console.log('=== ROOT ENDPOINT DEBUG ===');
    console.log('Status:', response.status);
    console.log('Body:', response.text);
    console.log('=== END DEBUG ===');
  });

  it('should get a response from API mutate endpoint', async () => {
    const response = await request(app)
      .post('/api/mutate')
      .set('X-Tenant-Id', 'test-tenant')
      .send({
        mutation: 'query { __schema { queryType { name } } }'
      });
    
    console.log('=== MUTATE ENDPOINT DEBUG ===');
    console.log('Status:', response.status);
    console.log('Headers:', response.headers);
    console.log('Body:', JSON.stringify(response.body, null, 2));
    console.log('Text:', response.text);
    console.log('=== END DEBUG ===');
  });
});
