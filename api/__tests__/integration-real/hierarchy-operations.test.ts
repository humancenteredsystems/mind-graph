import request from 'supertest';
import app from '../../server';
import { testRequest, verifyInTestTenant, createTestNodeData } from '../helpers/realTestHelpers';

describe('Real Integration: Hierarchy Operations', () => {
  beforeAll(async () => {
    await global.testUtils.setupTestDatabase();
  });

  afterAll(async () => {
    await global.testUtils.cleanupTestDatabase();
  });

  beforeEach(async () => {
    await global.testUtils.resetTestDatabase();
    await global.testUtils.seedTestData();
  });

  describe('Hierarchy Management', () => {
    it('should list existing hierarchies in test tenant', async () => {
      const response = await testRequest(app)
        .get('/api/hierarchy')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      // Should contain the seeded test hierarchy
      const hierarchyIds = response.body.map((h: any) => h.id);
      expect(hierarchyIds).toContain('test-hierarchy-1');
      
      const testHierarchy = response.body.find((h: any) => h.id === 'test-hierarchy-1');
      expect(testHierarchy).toBeTruthy();
      expect(testHierarchy.name).toBe('Test Hierarchy 1');
    });

    it('should create new hierarchy', async () => {
      const newHierarchy = {
        id: `hierarchy-${Date.now()}`,
        name: 'Test Created Hierarchy'
      };

      const response = await testRequest(app)
        .post('/api/hierarchy')
        .send(newHierarchy)
        .expect(201);

      expect(response.body.id).toBe(newHierarchy.id);
      expect(response.body.name).toBe(newHierarchy.name);

      // Verify hierarchy exists in test tenant
      const verification = await verifyInTestTenant(`
        query {
          getHierarchy(id: "${newHierarchy.id}") {
            id
            name
          }
        }
      `);

      expect(verification.getHierarchy).toBeTruthy();
      expect(verification.getHierarchy.id).toBe(newHierarchy.id);
    });
  });

  describe('Level Management', () => {
    it('should create new level in existing hierarchy', async () => {
      // DEBUG: Check what hierarchies actually exist
      console.log('[DEBUG] Checking existing hierarchies before test...');
      const existingHierarchies = await verifyInTestTenant(`
        query {
          queryHierarchy {
            id
            name
          }
        }
      `);
      console.log('[DEBUG] Existing hierarchies:', JSON.stringify(existingHierarchies, null, 2));

      // DEBUG: Try to get the specific hierarchy
      const specificHierarchy = await verifyInTestTenant(`
        query {
          getHierarchy(id: "test-hierarchy-1") {
            id
            name
            levels {
              id
              levelNumber
              label
            }
          }
        }
      `);
      console.log('[DEBUG] Specific hierarchy test-hierarchy-1:', JSON.stringify(specificHierarchy, null, 2));

      const newLevel = {
        hierarchyId: 'test-hierarchy-1',
        levelNumber: 3,
        label: 'Test Level 3',
        allowedTypes: [{ typeName: 'concept' }]
      };

      const response = await testRequest(app)
        .post('/api/hierarchy/level')
        .send(newLevel);

      console.log('[DEBUG] Level creation response status:', response.status);
      console.log('[DEBUG] Level creation response body:', JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(201);
      expect(response.body.levelNumber).toBe(3);
      expect(response.body.label).toBe('Test Level 3');

      // Verify level exists in hierarchy
      const verification = await verifyInTestTenant(`
        query {
          getHierarchy(id: "test-hierarchy-1") {
            id
            levels {
              levelNumber
              label
            }
          }
        }
      `);

      const levelNumbers = verification.getHierarchy.levels.map((l: any) => l.levelNumber);
      expect(levelNumbers).toContain(3);
    });

    it('should validate level number uniqueness', async () => {
      const duplicateLevel = {
        hierarchyId: 'test-hierarchy-1',
        levelNumber: 1, // Already exists
        label: 'Duplicate Level'
      };

      const response = await testRequest(app)
        .post('/api/hierarchy/level')
        .send(duplicateLevel)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('CONFLICT');
      expect(response.body.message).toContain('Level number 1 already exists in hierarchy test-hierarchy-1');
    });
  });

  describe('Hierarchy Assignments', () => {
    it('should create hierarchy assignment for existing node', async () => {
      const assignment = {
        nodeId: 'test-concept-1',
        hierarchyId: 'test-hierarchy-1',
        levelId: 'test-level-1'
      };

      const response = await testRequest(app)
        .post('/api/hierarchy/assignment')
        .send(assignment)
        .expect(201);

      expect(response.body.node.id).toBe('test-concept-1');
      expect(response.body.hierarchy.id).toBe('test-hierarchy-1');

      // Verify assignment exists
      const verification = await verifyInTestTenant(`
        query {
          getNode(id: "test-concept-1") {
            id
            hierarchyAssignments {
              hierarchy {
                id
              }
              level {
                id
              }
            }
          }
        }
      `);

      const assignments = verification.getNode.hierarchyAssignments;
      const hierarchyIds = assignments.map((a: any) => a.hierarchy.id);
      expect(hierarchyIds).toContain('test-hierarchy-1');
    });

    it('should validate node existence for assignment', async () => {
      const invalidAssignment = {
        nodeId: 'non-existent-node',
        hierarchyId: 'test-hierarchy-1',
        levelId: 'test-level-1'
      };

      const response = await testRequest(app)
        .post('/api/hierarchy/assignment')
        .send(invalidAssignment)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('NOT_FOUND');
      expect(response.body.message).toContain('Node with ID \'non-existent-node\' does not exist');
    });
  });

  describe('Node Creation with Hierarchy Context', () => {
    it('should create node with hierarchy assignment automatically', async () => {
      const nodeData = createTestNodeData({
        label: 'Hierarchy Context Node',
        type: 'concept'
      });

      const response = await testRequest(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'test-hierarchy-1')
        .send({
          mutation: `
            mutation AddNode($input: [AddNodeInput!]!) {
              addNode(input: $input) {
                node {
                  id
                  label
                  hierarchyAssignments {
                    hierarchy {
                      id
                      name
                    }
                    level {
                      levelNumber
                      label
                    }
                  }
                }
              }
            }
          `,
          variables: {
            input: [{
              id: nodeData.id,
              label: nodeData.label,
              type: nodeData.type
            }]
          }
        })
        .expect(200);

      const createdNode = response.body.addNode.node[0];
      expect(createdNode.hierarchyAssignments).toBeDefined();
      
      // Verify hierarchy assignment was automatically created
      const hierarchyIds = createdNode.hierarchyAssignments.map((a: any) => a.hierarchy.id);
      expect(hierarchyIds).toContain('test-hierarchy-1');
    });

    it('should require hierarchy header for node creation', async () => {
      const nodeData = createTestNodeData();

      const response = await testRequest(app)
        .post('/api/mutate')
        // Intentionally omit X-Hierarchy-Id header
        .send({
          mutation: `
            mutation AddNode($input: [AddNodeInput!]!) {
              addNode(input: $input) {
                node { id }
              }
            }
          `,
          variables: {
            input: [{
              id: nodeData.id,
              label: nodeData.label,
              type: nodeData.type
            }]
          }
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('X-Hierarchy-Id header is required for node creation mutations');
    });

    it('should respect level type constraints', async () => {
      // Create a node with type that doesn't match level constraints
      const nodeData = createTestNodeData({
        label: 'Wrong Type Node',
        type: 'invalidType'  // Not allowed in test hierarchy levels
      });

      const response = await testRequest(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'test-hierarchy-1')
        .send({
          mutation: `
            mutation AddNode($input: [AddNodeInput!]!) {
              addNode(input: $input) {
                node { id }
              }
            }
          `,
          variables: {
            input: [{
              id: nodeData.id,
              label: nodeData.label,
              type: nodeData.type
            }]
          }
        })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Hierarchy Queries', () => {
    it('should query nodes by hierarchy level', async () => {
      // Create nodes in specific levels
      const conceptNode = createTestNodeData({ label: 'Level 1 Concept', type: 'concept' });
      const exampleNode = createTestNodeData({ label: 'Level 2 Example', type: 'example' });

      // Create concept node (should go to level 1)
      await testRequest(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'test-hierarchy-1')
        .send({
          mutation: `
            mutation AddNode($input: [AddNodeInput!]!) {
              addNode(input: $input) {
                node { id }
              }
            }
          `,
          variables: {
            input: [{
              id: conceptNode.id,
              label: conceptNode.label,
              type: conceptNode.type
            }]
          }
        });

      // Create example node (should go to level 2)
      await testRequest(app)
        .post('/api/mutate')
        .set('X-Hierarchy-Id', 'test-hierarchy-1')
        .send({
          mutation: `
            mutation AddNode($input: [AddNodeInput!]!) {
              addNode(input: $input) {
                node { id }
              }
            }
          `,
          variables: {
            input: [{
              id: exampleNode.id,
              label: exampleNode.label,
              type: exampleNode.type
            }]
          }
        });

      // Query nodes by level
      const levelQuery = await testRequest(app)
        .post('/api/query')
        .send({
          query: `
            query {
              queryNode(filter: {
                hierarchyAssignments: {
                  level: { levelNumber: { eq: 1 } }
                }
              }) {
                id
                label
                type
                hierarchyAssignments {
                  level {
                    levelNumber
                  }
                }
              }
            }
          `
        })
        .expect(200);

      // Should find concept nodes at level 1
      const level1Nodes = levelQuery.body.queryNode;
      const level1NodeIds = level1Nodes.map((n: any) => n.id);
      expect(level1NodeIds).toContain(conceptNode.id);
    });

    it('should query hierarchy structure', async () => {
      const response = await testRequest(app)
        .post('/api/query')
        .send({
          query: `
            query {
              getHierarchy(id: "test-hierarchy-1") {
                id
                name
                levels {
                  levelNumber
                  label
                  allowedTypes {
                    typeName
                  }
                }
              }
            }
          `
        })
        .expect(200);

      const hierarchy = response.body.getHierarchy;
      expect(hierarchy).toBeTruthy();
      expect(hierarchy.id).toBe('test-hierarchy-1');
      expect(hierarchy.levels).toBeDefined();
      expect(Array.isArray(hierarchy.levels)).toBe(true);
      expect(hierarchy.levels.length).toBeGreaterThan(0);
    });
  });
});
