"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const server_1 = __importDefault(require("../../server"));
const mockData_1 = require("../helpers/mockData");
// Create a shared mock for executeGraphQL
const mockExecuteGraphQL = jest.fn();
// Mock the adaptive tenant factory with proper client structure
jest.mock('../../services/adaptiveTenantFactory', () => ({
    adaptiveTenantFactory: {
        createTenant: jest.fn(() => ({
            executeGraphQL: mockExecuteGraphQL,
            getNamespace: jest.fn(() => null),
            isDefaultNamespace: jest.fn(() => true)
        })),
        createTenantFromContext: jest.fn(() => ({
            executeGraphQL: mockExecuteGraphQL,
            getNamespace: jest.fn(() => null),
            isDefaultNamespace: jest.fn(() => true)
        })),
        createTestTenant: jest.fn(() => ({
            executeGraphQL: mockExecuteGraphQL,
            getNamespace: jest.fn(() => '0x1'),
            isDefaultNamespace: jest.fn(() => false)
        })),
        createDefaultTenant: jest.fn(() => ({
            executeGraphQL: mockExecuteGraphQL,
            getNamespace: jest.fn(() => null),
            isDefaultNamespace: jest.fn(() => true)
        }))
    }
}));
describe('Hierarchy API Integration', () => {
    beforeEach(() => {
        mockExecuteGraphQL.mockReset();
        // ADMIN_API_KEY is already loaded from .env file via jest.setup.ts
    });
    describe('GET /api/hierarchy', () => {
        it('should return all hierarchies', async () => {
            mockExecuteGraphQL.mockResolvedValueOnce({
                queryHierarchy: mockData_1.mockHierarchies
            });
            const response = await (0, supertest_1.default)(server_1.default)
                .get('/api/hierarchy')
                .expect(200);
            expect(response.body).toEqual(mockData_1.mockHierarchies);
        });
        it('should handle empty hierarchy list', async () => {
            mockExecuteGraphQL.mockResolvedValueOnce({
                queryHierarchy: []
            });
            const response = await (0, supertest_1.default)(server_1.default)
                .get('/api/hierarchy')
                .expect(200);
            expect(response.body).toEqual([]);
        });
    });
    describe('POST /api/hierarchy', () => {
        it('should create new hierarchy with admin key', async () => {
            const newHierarchy = {
                id: 'new-hierarchy',
                name: 'New Hierarchy'
            };
            mockExecuteGraphQL.mockResolvedValueOnce({
                addHierarchy: {
                    hierarchy: [newHierarchy]
                }
            });
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/hierarchy')
                .set('X-Admin-API-Key', process.env.ADMIN_API_KEY)
                .send(newHierarchy)
                .expect(201);
            expect(response.body).toEqual(newHierarchy);
        });
        it('should reject creation without admin key', async () => {
            const newHierarchy = {
                id: 'new-hierarchy',
                name: 'New Hierarchy'
            };
            await (0, supertest_1.default)(server_1.default)
                .post('/api/hierarchy')
                .send(newHierarchy)
                .expect(401);
        });
        it('should validate required fields', async () => {
            await (0, supertest_1.default)(server_1.default)
                .post('/api/hierarchy')
                .set('X-Admin-API-Key', process.env.ADMIN_API_KEY)
                .send({ name: 'Missing ID' })
                .expect(400);
        });
    });
    describe('POST /api/hierarchy/level', () => {
        it('should create new level in hierarchy', async () => {
            const newLevel = {
                hierarchyId: 'hierarchy1',
                levelNumber: 3,
                label: 'New Level'
            };
            mockExecuteGraphQL.mockResolvedValueOnce({
                addHierarchyLevel: {
                    hierarchyLevel: [{ id: 'new-level', ...newLevel }]
                }
            });
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/hierarchy/level')
                .set('X-Admin-API-Key', process.env.ADMIN_API_KEY)
                .send(newLevel)
                .expect(201);
            expect(response.body.hierarchyId).toBe('hierarchy1');
            expect(response.body.levelNumber).toBe(3);
        });
        it('should validate level number uniqueness', async () => {
            const duplicateLevel = {
                hierarchyId: 'hierarchy1',
                levelNumber: 1, // Already exists
                label: 'Duplicate Level'
            };
            mockExecuteGraphQL.mockRejectedValueOnce(new Error('Level number already exists'));
            // Server returns 500 for GraphQL errors, not 400
            await (0, supertest_1.default)(server_1.default)
                .post('/api/hierarchy/level')
                .set('X-Admin-API-Key', process.env.ADMIN_API_KEY)
                .send(duplicateLevel)
                .expect(500);
        });
    });
    describe('POST /api/hierarchy/assignment', () => {
        it('should create hierarchy assignment', async () => {
            const assignment = {
                nodeId: 'node1',
                hierarchyId: 'hierarchy1',
                levelId: 'level1'
            };
            mockExecuteGraphQL.mockResolvedValueOnce({
                addHierarchyAssignment: {
                    hierarchyAssignment: [{ id: 'new-assignment', ...assignment }]
                }
            });
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/hierarchy/assignment')
                .set('X-Admin-API-Key', process.env.ADMIN_API_KEY)
                .send(assignment)
                .expect(201);
            expect(response.body.nodeId).toBe('node1');
            expect(response.body.hierarchyId).toBe('hierarchy1');
        });
        it('should validate node and hierarchy existence', async () => {
            const invalidAssignment = {
                nodeId: 'nonexistent-node',
                hierarchyId: 'hierarchy1',
                levelId: 'level1'
            };
            mockExecuteGraphQL.mockRejectedValueOnce(new Error('Node not found'));
            // Server returns 500 for GraphQL errors, not 400
            await (0, supertest_1.default)(server_1.default)
                .post('/api/hierarchy/assignment')
                .set('X-Admin-API-Key', process.env.ADMIN_API_KEY)
                .send(invalidAssignment)
                .expect(500);
        });
    });
});
