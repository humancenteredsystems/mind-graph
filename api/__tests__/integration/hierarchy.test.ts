import request from 'supertest';
import app from '../../server';
import { mockHierarchies } from '../helpers/mockData';

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
        queryHierarchy: mockHierarchies
      });

      const response = await request(app)
        .get('/api/hierarchy')
        .expect(200);

      expect(response.body).toEqual(mockHierarchies);
    });

    it('should handle empty hierarchy list', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        queryHierarchy: []
      });

      const response = await request(app)
        .get('/api/hierarchy')
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('POST /api/hierarchy', () => {
    it('should create new hierarchy', async () => {
      const newHierarchy = {
        id: 'new-hierarchy',
        name: 'New Hierarchy'
      };

      mockExecuteGraphQL.mockResolvedValueOnce({
        addHierarchy: {
          hierarchy: [newHierarchy]
        }
      });

      const response = await request(app)
        .post('/api/hierarchy')
        .send(newHierarchy)
        .expect(201);

      expect(response.body).toEqual(newHierarchy);
    });

    it('should validate required fields', async () => {
      await request(app)
        .post('/api/hierarchy')
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

      // First mock the uniqueness check (no existing levels)
      mockExecuteGraphQL.mockResolvedValueOnce({
        queryHierarchy: [{
          levels: [] // No existing levels with this number
        }]
      });

      // Then mock the creation
      mockExecuteGraphQL.mockResolvedValueOnce({
        addHierarchyLevel: {
          hierarchyLevel: [{ id: 'new-level', ...newLevel }]
        }
      });

      const response = await request(app)
        .post('/api/hierarchy/level')
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

      // Mock the validation query to return existing levels
      mockExecuteGraphQL.mockResolvedValueOnce({
        queryHierarchy: [{
          levels: [{ id: 'existing-level', levelNumber: 1 }]
        }]
      });

      // Server returns 409 for conflict errors
      const response = await request(app)
        .post('/api/hierarchy/level')
        .send(duplicateLevel)
        .expect(409);

      expect(response.body.error).toBe('CONFLICT');
      expect(response.body.message).toContain('Level number 1 already exists in hierarchy hierarchy1');
    });
  });

  describe('POST /api/hierarchy/assignment', () => {
    it('should create hierarchy assignment', async () => {
      const assignment = {
        nodeId: 'node1',
        hierarchyId: 'hierarchy1',
        levelId: 'level1'
      };

      // First mock the node existence check (node exists with type)
      mockExecuteGraphQL.mockResolvedValueOnce({
        getNode: { id: 'node1', label: 'Test Node', type: 'concept' }
      });

      // Second mock the level validation check (level exists and allows concept type)
      mockExecuteGraphQL.mockResolvedValueOnce({
        getHierarchyLevel: {
          id: 'level1',
          levelNumber: 1,
          hierarchy: { id: 'hierarchy1' },
          allowedTypes: [{ typeName: 'concept' }]
        }
      });

      // Then mock the assignment creation
      mockExecuteGraphQL.mockResolvedValueOnce({
        addHierarchyAssignment: {
          hierarchyAssignment: [{ id: 'new-assignment', ...assignment }]
        }
      });

      const response = await request(app)
        .post('/api/hierarchy/assignment')
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

      // Mock the node existence query to return null (node not found)
      mockExecuteGraphQL.mockResolvedValueOnce({
        getNode: null
      });

      // Server returns 404 for not found errors
      const response = await request(app)
        .post('/api/hierarchy/assignment')
        .send(invalidAssignment)
        .expect(404);

      expect(response.body.error).toBe('NOT_FOUND');
      expect(response.body.message).toContain('Node with ID \'nonexistent-node\' does not exist');
    });
  });
});
