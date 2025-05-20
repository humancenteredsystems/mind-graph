const request = require('supertest');
const app = require('./server');

jest.mock('./dgraphClient', () => ({
  executeGraphQL: jest.fn(),
}));
const { executeGraphQL } = require('./dgraphClient');

jest.mock('axios');
const axios = require('axios');

describe('API Endpoints (GraphQL-centric)', () => {
  beforeEach(() => {
    executeGraphQL.mockClear();
    axios.get.mockClear();
  });

  // GET /
  describe('GET /', () => {
    it('responds with 200 and welcome message', async () => {
      const res = await request(app).get('/');
      expect(res.statusCode).toBe(200);
      expect(res.text).toBe('MakeItMakeSense.io API is running!');
    });
  });

  // POST /api/query
  describe('POST /api/query', () => {
    it('returns data for valid query', async () => {
      const query = 'query { queryNode { id } }';
      const data = { queryNode: [{ id: 'n1' }] };
      executeGraphQL.mockResolvedValue(data);

      const res = await request(app).post('/api/query').send({ query });
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(data);
      expect(executeGraphQL).toHaveBeenCalledWith(query, {});
    });

    it('errors 400 if query missing', async () => {
      const res = await request(app).post('/api/query').send({});
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'Missing required field: query');
    });

    it('errors 400 on GraphQL failure', async () => {
      const query = 'query { bad }';
      const msg = 'GraphQL query failed: bad';
      executeGraphQL.mockRejectedValue(new Error(msg));

      const res = await request(app).post('/api/query').send({ query });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', `GraphQL error: ${msg.replace('GraphQL query failed: ', '')}`);
    });

    it('errors 500 on server error', async () => {
      const query = 'query { n }';
      executeGraphQL.mockRejectedValue(new Error('connection'));

      const res = await request(app).post('/api/query').send({ query });
      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'Server error executing query.');
    });
  });

  // POST /api/mutate
  describe('POST /api/mutate', () => {
    it('returns data for valid mutation', async () => {
      const mutation = 'mutation { add }';
      const vars = { x: 1 };
      const data = { add: [{ id: 'new' }] };
      executeGraphQL.mockResolvedValue(data);

      const res = await request(app).post('/api/mutate').send({ mutation, variables: vars });
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(data);
      expect(executeGraphQL).toHaveBeenCalledWith(mutation, vars);
    });

    it('errors 400 if mutation missing', async () => {
      const res = await request(app).post('/api/mutate').send({});
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'Missing required field: mutation');
    });

    it('errors 400 on GraphQL failure', async () => {
      const mutation = 'mutation { bad }';
      const msg = 'GraphQL query failed: bad';
      executeGraphQL.mockRejectedValue(new Error(msg));

      const res = await request(app).post('/api/mutate').send({ mutation });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', `GraphQL error: ${msg.replace('GraphQL query failed: ', '')}`);
    });

    it('errors 500 on server error', async () => {
      const mutation = 'mutation { a }';
      executeGraphQL.mockRejectedValue(new Error('failure'));

      const res = await request(app).post('/api/mutate').send({ mutation });
      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'Server error executing mutation.');
    });
  });

  // POST /api/traverse
  describe('POST /api/traverse', () => {
    it('returns data for valid rootId', async () => {
      const rootId = 'n1';
      const data = { queryNode: [{ id: rootId }] };
      executeGraphQL.mockResolvedValue(data);

      const res = await request(app).post('/api/traverse').send({ rootId });
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ data });
      expect(executeGraphQL).toHaveBeenCalledWith(expect.any(String), { rootId });
    });

    it('errors 400 if rootId missing', async () => {
      const res = await request(app).post('/api/traverse').send({});
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'Missing required field: rootId');
    });

    it('errors 400 on GraphQL failure', async () => {
      executeGraphQL.mockRejectedValue(new Error('GraphQL query failed: err'));
      const res = await request(app).post('/api/traverse').send({ rootId: 'x' });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/^GraphQL error during traversal:/);
    });

    it('errors 500 on server error', async () => {
      executeGraphQL.mockRejectedValue(new Error('network'));
      const res = await request(app).post('/api/traverse').send({ rootId: 'x' });
      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'Server error during traversal.');
    });
  });

  // GET /api/search
  describe('GET /api/search', () => {
    it('returns data for valid term', async () => {
      const term = 't';
      const data = { queryNode: [{ id: 'n' }] };
      executeGraphQL.mockResolvedValue(data);

      const res = await request(app).get('/api/search').query({ term });
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(data);
      expect(executeGraphQL).toHaveBeenCalledWith(expect.stringContaining('allofterms: $term'), { term });
    });

    it('errors 400 if term missing', async () => {
      const res = await request(app).get('/api/search');
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'Missing required query parameter: term');
    });

    it('errors 400 if field invalid', async () => {
      const res = await request(app).get('/api/search').query({ term: 'x', field: 'bad' });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/Invalid search field/);
    });

    it('errors 400 on GraphQL failure', async () => {
      executeGraphQL.mockRejectedValue(new Error('GraphQL query failed: err'));
      const res = await request(app).get('/api/search').query({ term: 'x' });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/^GraphQL error during search:/);
    });

    it('errors 500 on server error', async () => {
      executeGraphQL.mockRejectedValue(new Error('fail'));
      const res = await request(app).get('/api/search').query({ term: 'x' });
      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'Server error during search.');
    });
  });

  // GET /api/schema
  describe('GET /api/schema', () => {
    it('returns schema text', async () => {
      const schema = 's';
      axios.get.mockResolvedValue({ data: { data: { schema } } });

      const res = await request(app).get('/api/schema');
      expect(res.statusCode).toBe(200);
      expect(res.text).toBe(schema);
    });

    it('errors 500 on failure', async () => {
      axios.get.mockRejectedValue(new Error('err'));
      const res = await request(app).get('/api/schema');
      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'Failed to fetch schema from Dgraph.');
    });
  });

  // GET /api/health
  describe('GET /api/health', () => {
    it('returns OK statuses', async () => {
      executeGraphQL.mockResolvedValue({});
      const res = await request(app).get('/api/health');
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ apiStatus: 'OK', dgraphStatus: 'OK' });
    });

    it('errors 500 on failure', async () => {
      executeGraphQL.mockRejectedValue(new Error('fail'));
      const res = await request(app).get('/api/health');
      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error');
    });
  });
});
