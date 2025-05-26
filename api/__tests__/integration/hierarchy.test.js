const { jest } = require('@jest/globals');
const request = require('supertest');
const app = require('../../server');
const { mockHierarchies } = require('../helpers/mockData');

// Mock the dgraphClient
jest.mock('../../dgraphClient', () => ({
  executeQuery: jest.fn(),
  executeMutation: jest.fn()
}));

const dgraphClient = require('../../dgraphClient');

describe('Hierarchy API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_API_KEY = 'test-admin-key';
  });

  describe('GET /api/hierarchy', () => {
    it('should return all hierarchies', async () => {
      dgraphClient.executeQuery.mockResolvedValueOnce({
        data: {
          queryHierarchy: mockHierarchies
        }
      });

      const response = await request(app)
        .get('/api/hierarchy')
        .expect(200);

      expect(response.body).toEqual(mockHierarchies);
    });

    it('should handle empty hierarchy list', async () => {
      dgraphClient.executeQuery.mockResolvedValueOnce({
        data: {
          queryHierarchy: []
        }
      });

      const response = await request(app)
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

      dgraphClient.executeMutation.mockResolvedValueOnce({
        data: {
          addHierarchy: {
            hierarchy: [newHierarchy]
          }
        }
      });

      const response = await request(app)
        .post('/api/hierarchy')
        .set('X-Admin-API-Key', 'test-admin-key')
        .send(newHierarchy)
        .expect(201);

      expect(response.body).toEqual(newHierarchy);
    });

    it('should reject creation without admin key', async () => {
      const newHierarchy = {
        id: 'new-hierarchy',
        name: 'New Hierarchy'
      };

      await request(app)
        .post('/api/hierarchy')
        .send(newHierarchy)
        .expect(401);
    });

    it('should validate required fields', async () => {
      await request(app)
        .post('/api/hierarchy')
        .set('X-Admin-API-Key', 'test-admin-key')
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

      dgraphClient.executeMutation.mockResolvedValueOnce({
        data: {
          addHierarchyLevel: {
            hierarchyLevel: [{ id: 'new-level', ...newLevel }]
          }
        }
      });

      const response = await request(app)
        .post('/api/hierarchy/level')
        .set('X-Admin-API-Key', 'test-admin-key')
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

      dgraphClient.executeMutation.mockRejectedValueOnce(
        new Error('Level number already exists')
      );

      await request(app)
        .post('/api/hierarchy/level')
        .set('X-Admin-API-Key', 'test-admin-key')
        .send(duplicateLevel)
        .expect(400);
    });
  });

  describe('POST /api/hierarchy/assignment', () => {
    it('should create hierarchy assignment', async () => {
      const assignment = {
        nodeId: 'node1',
        hierarchyId: 'hierarchy1',
        levelId: 'level1'
      };

      dgraphClient.executeMutation.mockResolvedValueOnce({
        data: {
          addHierarchyAssignment: {
            hierarchyAssignment: [{ id: 'new-assignment', ...assignment }]
          }
        }
      });

      const response = await request(app)
        .post('/api/hierarchy/assignment')
        .set('X-Admin-API-Key', 'test-admin-key')
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

      dgraphClient.executeMutation.mockRejectedValueOnce(
        new Error('Node not found')
      );

      await request(app)
        .post('/api/hierarchy/assignment')
        .set('X-Admin-API-Key', 'test-admin-key')
        .send(invalidAssignment)
        .expect(400);
    });
  });
});
