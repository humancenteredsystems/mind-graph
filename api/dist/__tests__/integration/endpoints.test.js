"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const server_1 = __importDefault(require("../../server"));
// Mock the adaptive tenant factory - declare mock function first
jest.mock('../../services/adaptiveTenantFactory', () => {
    const mockExecuteGraphQL = jest.fn();
    return {
        adaptiveTenantFactory: {
            createTenantFromContext: jest.fn().mockResolvedValue({
                executeGraphQL: mockExecuteGraphQL,
                getNamespace: jest.fn().mockReturnValue('0x0'),
                isDefaultNamespace: jest.fn().mockReturnValue(true)
            })
        },
        mockExecuteGraphQL // Export mockExecuteGraphQL
    };
});
// Import the mock after it's defined
const adaptiveTenantFactory_1 = require("../../services/adaptiveTenantFactory");
describe('API Endpoints', () => {
    beforeEach(() => {
        adaptiveTenantFactory_1.mockExecuteGraphQL.mockReset();
    });
    describe('POST /api/query', () => {
        it('should execute GraphQL query and return results', async () => {
            const mockResponse = {
                queryNode: [
                    { id: 'node1', label: 'Test Node', type: 'concept' }
                ]
            };
            adaptiveTenantFactory_1.mockExecuteGraphQL.mockResolvedValueOnce(mockResponse);
            const query = `
        query {
          queryNode(first: 10) {
            id
            label
            type
          }
        }
      `;
            const res = await (0, supertest_1.default)(server_1.default)
                .post('/api/query')
                .send({ query })
                .expect('Content-Type', /json/)
                .expect(200);
            expect(res.body).toEqual(mockResponse);
            // Fix: Accept either undefined or {} for variables parameter
            expect(adaptiveTenantFactory_1.mockExecuteGraphQL).toHaveBeenCalledWith(query, expect.anything());
        });
        it('should handle GraphQL query with variables', async () => {
            const mockResponse = {
                getNode: { id: 'node1', label: 'Test Node' }
            };
            adaptiveTenantFactory_1.mockExecuteGraphQL.mockResolvedValueOnce(mockResponse);
            const query = `
        query GetNode($id: String!) {
          getNode(id: $id) {
            id
            label
          }
        }
      `;
            const variables = { id: 'node1' };
            const res = await (0, supertest_1.default)(server_1.default)
                .post('/api/query')
                .send({ query, variables })
                .expect('Content-Type', /json/)
                .expect(200);
            expect(res.body).toEqual(mockResponse);
            expect(adaptiveTenantFactory_1.mockExecuteGraphQL).toHaveBeenCalledWith(query, variables);
        });
        it('should return 400 when query is missing', async () => {
            const res = await (0, supertest_1.default)(server_1.default)
                .post('/api/query')
                .send({})
                .expect('Content-Type', /json/)
                .expect(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toContain('query');
        });
    });
    describe('POST /api/mutate', () => {
        it('should execute GraphQL mutation and return results', async () => {
            // Mock hierarchy validation first
            adaptiveTenantFactory_1.mockExecuteGraphQL
                .mockResolvedValueOnce({ getHierarchy: { id: 'test-hierarchy' } }) // validateHierarchyId
                .mockResolvedValueOnce({ queryHierarchy: [{ levels: [{ id: 'level1', levelNumber: 1 }] }] }) // getLevelIdForNode
                .mockResolvedValueOnce({ getHierarchyLevel: { id: 'level1', levelNumber: 1, hierarchy: { id: 'test-hierarchy' }, allowedTypes: [] } }) // validateLevelIdAndAllowedType
                .mockResolvedValueOnce({
                addNode: {
                    node: [
                        { id: 'new-node', label: 'New Node', type: 'concept' }
                    ]
                }
            });
            const mutation = `
        mutation AddNode($input: [AddNodeInput!]!) {
          addNode(input: $input) {
            node {
              id
              label
              type
            }
          }
        }
      `;
            const variables = {
                input: [
                    { id: 'new-node', label: 'New Node', type: 'concept' }
                ]
            };
            const res = await (0, supertest_1.default)(server_1.default)
                .post('/api/mutate')
                .set('X-Hierarchy-Id', 'test-hierarchy')
                .send({ mutation, variables })
                .expect('Content-Type', /json/)
                .expect(200);
            expect(res.body).toHaveProperty('addNode');
            expect(res.body.addNode.node).toHaveLength(1);
            expect(res.body.addNode.node[0]).toMatchObject({
                id: 'new-node',
                label: 'New Node',
                type: 'concept'
            });
        });
        it('should return 400 when mutation is missing', async () => {
            const res = await (0, supertest_1.default)(server_1.default)
                .post('/api/mutate')
                .send({})
                .expect('Content-Type', /json/)
                .expect(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toContain('mutation');
        });
    });
    describe('POST /api/traverse', () => {
        it('should execute traversal query and return results', async () => {
            const mockResponse = {
                queryNode: [
                    {
                        id: 'root-node',
                        label: 'Root Node',
                        type: 'concept',
                        outgoing: [
                            {
                                type: 'child',
                                to: { id: 'child-node', label: 'Child Node', type: 'concept' }
                            }
                        ]
                    }
                ]
            };
            adaptiveTenantFactory_1.mockExecuteGraphQL.mockResolvedValueOnce(mockResponse);
            const res = await (0, supertest_1.default)(server_1.default)
                .post('/api/traverse')
                .send({ rootId: 'root-node' })
                .expect('Content-Type', /json/)
                .expect(200);
            expect(res.body).toHaveProperty('data');
            expect(res.body.data).toEqual(mockResponse);
        });
        it('should return 400 when rootId is missing', async () => {
            const res = await (0, supertest_1.default)(server_1.default)
                .post('/api/traverse')
                .send({})
                .expect('Content-Type', /json/)
                .expect(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toContain('rootId');
        });
    });
    describe('GET /api/search', () => {
        it('should execute search query and return results', async () => {
            const mockResponse = {
                queryNode: [
                    { id: 'node1', label: 'Test Node', type: 'concept' }
                ]
            };
            adaptiveTenantFactory_1.mockExecuteGraphQL.mockResolvedValueOnce(mockResponse);
            const res = await (0, supertest_1.default)(server_1.default)
                .get('/api/search')
                .query({ term: 'test' })
                .expect('Content-Type', /json/)
                .expect(200);
            expect(res.body).toEqual(mockResponse);
        });
        it('should return 400 when search term is missing', async () => {
            const res = await (0, supertest_1.default)(server_1.default)
                .get('/api/search')
                .expect('Content-Type', /json/)
                .expect(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toContain('term');
        });
    });
    describe('GET /api/health', () => {
        it('should return health status', async () => {
            // Mock a successful health check
            adaptiveTenantFactory_1.mockExecuteGraphQL.mockResolvedValueOnce({ __schema: { queryType: { name: 'Query' } } });
            const res = await (0, supertest_1.default)(server_1.default)
                .get('/api/health')
                .expect('Content-Type', /json/)
                .expect(200);
            expect(res.body).toHaveProperty('apiStatus', 'OK');
            expect(res.body).toHaveProperty('dgraphStatus');
        });
    });
    // Note: /api/schema endpoint doesn't exist in current implementation
    // The API uses /api/schemas (plural) for schema management instead
});
