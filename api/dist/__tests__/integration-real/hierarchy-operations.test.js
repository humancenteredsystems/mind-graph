"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("../../server"));
const realTestHelpers_1 = require("../helpers/realTestHelpers");
describe('Real Integration: Hierarchy Operations', () => {
    beforeAll(async () => {
        await global.testUtils.setupTestDatabase();
    });
    afterAll(async () => {
        await global.testUtils.cleanupTestDatabase();
    });
    beforeEach(async () => {
        await global.testUtils.resetTestDatabase();
        // Ensure specific test data, including 'test-hierarchy-1', is seeded after reset
        await global.testUtils.seedTestData();
        // Add a small delay to allow Dgraph to fully process writes/schema changes from seeding
        console.log('[TEST_HIERARCHY_OPS] Waiting after seed for Dgraph processing...');
        await global.testUtils.wait(1000); // Wait 1 second
        console.log('[TEST_HIERARCHY_OPS] Proceeding with test.');
    });
    describe('Hierarchy Management', () => {
        it('should list existing hierarchies in test tenant', async () => {
            const response = await (0, realTestHelpers_1.testRequest)(server_1.default)
                .get('/api/hierarchy')
                .expect(200);
            expect(Array.isArray(response.body)).toBe(true);
            // Should contain the seeded test hierarchy
            const hierarchyIds = response.body.map((h) => h.id);
            expect(hierarchyIds).toContain('test-hierarchy-1');
            const testHierarchy = response.body.find((h) => h.id === 'test-hierarchy-1');
            expect(testHierarchy).toBeTruthy();
            expect(testHierarchy.name).toBe('Test Hierarchy 1');
        });
        it('should create new hierarchy with admin key', async () => {
            const newHierarchy = {
                id: `hierarchy-${Date.now()}`,
                name: 'Test Created Hierarchy'
            };
            const response = await (0, realTestHelpers_1.testRequest)(server_1.default)
                .post('/api/hierarchy')
                .set('X-Admin-API-Key', process.env.ADMIN_API_KEY)
                .send(newHierarchy)
                .expect(201);
            expect(response.body.id).toBe(newHierarchy.id);
            expect(response.body.name).toBe(newHierarchy.name);
            // Verify hierarchy exists in test tenant
            const verification = await (0, realTestHelpers_1.verifyInTestTenant)(`
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
        it('should reject hierarchy creation without admin key', async () => {
            const newHierarchy = {
                id: 'unauthorized-hierarchy',
                name: 'Should Not Be Created'
            };
            await (0, realTestHelpers_1.testRequest)(server_1.default)
                .post('/api/hierarchy')
                .send(newHierarchy)
                .expect(401);
        });
    });
    describe('Level Management', () => {
        it('should create new level in existing hierarchy', async () => {
            const newLevel = {
                hierarchyId: 'test-hierarchy-1',
                levelNumber: 3,
                label: 'Test Level 3',
                allowedTypes: [{ typeName: 'concept' }]
            };
            const response = await (0, realTestHelpers_1.testRequest)(server_1.default)
                .post('/api/hierarchy/level')
                .set('X-Admin-API-Key', process.env.ADMIN_API_KEY)
                .send(newLevel)
                .expect(201);
            expect(response.body.hierarchyId).toBe('test-hierarchy-1');
            expect(response.body.levelNumber).toBe(3);
            expect(response.body.label).toBe('Test Level 3');
            // Verify level exists in hierarchy
            const verification = await (0, realTestHelpers_1.verifyInTestTenant)(`
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
            const levelNumbers = verification.getHierarchy.levels.map((l) => l.levelNumber);
            expect(levelNumbers).toContain(3);
        });
        it('should reject level creation without admin key', async () => {
            const newLevel = {
                hierarchyId: 'test-hierarchy-1',
                levelNumber: 4,
                label: 'Unauthorized Level'
            };
            await (0, realTestHelpers_1.testRequest)(server_1.default)
                .post('/api/hierarchy/level')
                .send(newLevel)
                .expect(401);
        });
        it('should validate level number uniqueness', async () => {
            const duplicateLevel = {
                hierarchyId: 'test-hierarchy-1',
                levelNumber: 1, // Already exists
                label: 'Duplicate Level'
            };
            const response = await (0, realTestHelpers_1.testRequest)(server_1.default)
                .post('/api/hierarchy/level')
                .set('X-Admin-API-Key', process.env.ADMIN_API_KEY)
                .send(duplicateLevel)
                .expect(500);
            expect(response.body).toHaveProperty('error');
        });
    });
    describe('Hierarchy Assignments', () => {
        it('should create hierarchy assignment for existing node', async () => {
            const assignment = {
                nodeId: 'test-concept-1',
                hierarchyId: 'test-hierarchy-1',
                levelId: 'test-level-1'
            };
            const response = await (0, realTestHelpers_1.testRequest)(server_1.default)
                .post('/api/hierarchy/assignment')
                .set('X-Admin-API-Key', process.env.ADMIN_API_KEY)
                .send(assignment)
                .expect(201);
            expect(response.body.nodeId).toBe('test-concept-1');
            expect(response.body.hierarchyId).toBe('test-hierarchy-1');
            // Verify assignment exists
            const verification = await (0, realTestHelpers_1.verifyInTestTenant)(`
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
            const hierarchyIds = assignments.map((a) => a.hierarchy.id);
            expect(hierarchyIds).toContain('test-hierarchy-1');
        });
        it('should reject assignment without admin key', async () => {
            const assignment = {
                nodeId: 'test-concept-1',
                hierarchyId: 'test-hierarchy-1',
                levelId: 'test-level-1'
            };
            await (0, realTestHelpers_1.testRequest)(server_1.default)
                .post('/api/hierarchy/assignment')
                .send(assignment)
                .expect(401);
        });
        it('should validate node existence for assignment', async () => {
            const invalidAssignment = {
                nodeId: 'non-existent-node',
                hierarchyId: 'test-hierarchy-1',
                levelId: 'test-level-1'
            };
            const response = await (0, realTestHelpers_1.testRequest)(server_1.default)
                .post('/api/hierarchy/assignment')
                .set('X-Admin-API-Key', process.env.ADMIN_API_KEY)
                .send(invalidAssignment)
                .expect(500);
            expect(response.body).toHaveProperty('error');
        });
    });
    describe('Node Creation with Hierarchy Context', () => {
        it('should create node with hierarchy assignment automatically', async () => {
            const nodeData = (0, realTestHelpers_1.createTestNodeData)({
                label: 'Hierarchy Context Node',
                type: 'concept'
            });
            const response = await (0, realTestHelpers_1.testRequest)(server_1.default)
                .post('/api/mutate')
                .set('X-Hierarchy-Id', 'test-hierarchy-1')
                .send({
                mutation: `
            mutation {
              addNode(input: [{ 
                id: "${nodeData.id}", 
                label: "${nodeData.label}", 
                type: "${nodeData.type}" 
              }]) {
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
          `
            })
                .expect(200);
            const createdNode = response.body.addNode.node[0];
            expect(createdNode.hierarchyAssignments).toBeDefined();
            // Verify hierarchy assignment was automatically created
            const hierarchyIds = createdNode.hierarchyAssignments.map((a) => a.hierarchy.id);
            expect(hierarchyIds).toContain('test-hierarchy-1');
        });
        it('should require hierarchy header for node creation', async () => {
            const nodeData = (0, realTestHelpers_1.createTestNodeData)();
            const response = await (0, realTestHelpers_1.testRequest)(server_1.default)
                .post('/api/mutate')
                // Intentionally omit X-Hierarchy-Id header
                .send({
                mutation: `
            mutation {
              addNode(input: [{ 
                id: "${nodeData.id}", 
                label: "${nodeData.label}", 
                type: "${nodeData.type}" 
              }]) {
                node { id }
              }
            }
          `
            })
                .expect(500);
            expect(response.body).toHaveProperty('error');
        });
        it('should respect level type constraints', async () => {
            // Create a node with type that doesn't match level constraints
            const nodeData = (0, realTestHelpers_1.createTestNodeData)({
                label: 'Wrong Type Node',
                type: 'invalidType' // Not allowed in test hierarchy levels
            });
            const response = await (0, realTestHelpers_1.testRequest)(server_1.default)
                .post('/api/mutate')
                .set('X-Hierarchy-Id', 'test-hierarchy-1')
                .send({
                mutation: `
            mutation {
              addNode(input: [{ 
                id: "${nodeData.id}", 
                label: "${nodeData.label}", 
                type: "${nodeData.type}" 
              }]) {
                node { id }
              }
            }
          `
            })
                .expect(500);
            expect(response.body).toHaveProperty('error');
        });
    });
    describe('Hierarchy Queries', () => {
        it('should query nodes by hierarchy level', async () => {
            // Create nodes in specific levels
            const conceptNode = (0, realTestHelpers_1.createTestNodeData)({ label: 'Level 1 Concept', type: 'concept' });
            const exampleNode = (0, realTestHelpers_1.createTestNodeData)({ label: 'Level 2 Example', type: 'example' });
            // Create concept node (should go to level 1)
            await (0, realTestHelpers_1.testRequest)(server_1.default)
                .post('/api/mutate')
                .set('X-Hierarchy-Id', 'test-hierarchy-1')
                .send({
                mutation: `
            mutation {
              addNode(input: [{ 
                id: "${conceptNode.id}", 
                label: "${conceptNode.label}", 
                type: "${conceptNode.type}" 
              }]) {
                node { id }
              }
            }
          `
            });
            // Create example node (should go to level 2)
            await (0, realTestHelpers_1.testRequest)(server_1.default)
                .post('/api/mutate')
                .set('X-Hierarchy-Id', 'test-hierarchy-1')
                .send({
                mutation: `
            mutation {
              addNode(input: [{ 
                id: "${exampleNode.id}", 
                label: "${exampleNode.label}", 
                type: "${exampleNode.type}" 
              }]) {
                node { id }
              }
            }
          `
            });
            // Query nodes by level
            const levelQuery = await (0, realTestHelpers_1.testRequest)(server_1.default)
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
            const level1NodeIds = level1Nodes.map((n) => n.id);
            expect(level1NodeIds).toContain(conceptNode.id);
        });
        it('should query hierarchy structure', async () => {
            const response = await (0, realTestHelpers_1.testRequest)(server_1.default)
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
