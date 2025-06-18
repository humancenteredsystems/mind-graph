"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestDataSeeder = void 0;
const tenantManager_1 = require("../../services/tenantManager");
const dgraphTenant_1 = require("../../services/dgraphTenant");
const config_1 = __importDefault(require("../../config")); // Assuming config is available
class TestDataSeeder {
    constructor() {
        this.tenantManager = new tenantManager_1.TenantManager();
        this.TEST_TENANT_ID = 'test-tenant';
        // Use config for API base URL and Admin API Key
        this.API_BASE_URL = config_1.default.dgraphBaseUrl;
        this.ADMIN_API_KEY = config_1.default.adminApiKey; // Use non-null assertion
        // Ensure admin API key is set for real integration tests
        if (!config_1.default.adminApiKey) { // Check the original config value
            throw new Error("ADMIN_API_KEY is not set in config. Real integration tests require an admin API key.");
        }
    }
    async setupTestDatabase() {
        console.log('[TEST_SETUP] Initializing real test database');
        try {
            // Ensure test tenant exists
            const exists = await this.tenantManager.tenantExists(this.TEST_TENANT_ID);
            if (!exists) {
                console.log(`[TEST_SETUP] Test tenant '${this.TEST_TENANT_ID}' does not exist, creating...`);
                await this.tenantManager.createTenant(this.TEST_TENANT_ID);
                console.log(`[TEST_SETUP] Test tenant '${this.TEST_TENANT_ID}' created.`);
            }
            else {
                console.log(`[TEST_SETUP] Test tenant '${this.TEST_TENANT_ID}' already exists.`);
            }
            // Seed with minimal test data
            await this.seedTestData();
            console.log('[TEST_SETUP] Real test database ready');
            return true;
        }
        catch (error) {
            console.error('[TEST_SETUP] Failed to setup real test database:', error);
            // Propagate the error so Jest setup can potentially catch it
            if (error instanceof Error)
                throw error;
            else
                throw new Error(String(error));
        }
    }
    async cleanupTestDatabase() {
        console.log('[TEST_CLEANUP] Cleaning real test database');
        try {
            // Use the safe namespace-scoped deletion via TenantManager
            await this.tenantManager.deleteTenant(this.TEST_TENANT_ID);
            console.log('[TEST_CLEANUP] Real test database cleaned');
            return true;
        }
        catch (error) {
            console.error('[TEST_CLEANUP] Failed to cleanup real test database:', error);
            return false;
        }
    }
    async resetTestDatabase() {
        console.log('[TEST_RESET] Resetting real test database');
        try {
            // Use the safe namespace-scoped deletion via TenantManager
            await this.tenantManager.deleteTenant(this.TEST_TENANT_ID);
            console.log('[TEST_RESET] Test tenant data cleared.');
            // Wait a bit for deletion to complete
            await global.testUtils.wait(1000);
            // Re-create and seed
            await this.tenantManager.createTenant(this.TEST_TENANT_ID);
            console.log('[TEST_RESET] Test tenant re-created.');
            // Wait a bit for creation to complete
            await global.testUtils.wait(1000);
            await this.seedTestData();
            console.log('[TEST_RESET] Test tenant database reset successfully.');
            return true;
        }
        catch (error) {
            console.error('[TEST_RESET] Failed to reset real test database:', error);
            if (error instanceof Error)
                throw error;
            else
                throw new Error(String(error));
        }
    }
    async seedTestData() {
        console.log('[TEST_SEED] Seeding test data using working seed script approach');
        const testClient = await dgraphTenant_1.DgraphTenantFactory.createTestTenant();
        try {
            // 1. Create test hierarchy
            console.log('[TEST_SEED] Creating test hierarchy...');
            const hierarchyMutation = `
        mutation CreateTestHierarchy($input: [AddHierarchyInput!]!) {
          addHierarchy(input: $input) {
            hierarchy {
              id
              name
            }
          }
        }
      `;
            const hierarchyResult = await testClient.executeGraphQL(hierarchyMutation, {
                input: [{
                        id: 'test-hierarchy-1',
                        name: 'Test Hierarchy 1'
                    }]
            });
            if (!hierarchyResult?.addHierarchy?.hierarchy?.[0]?.id) {
                throw new Error('Failed to create test hierarchy');
            }
            console.log('[TEST_SEED] ✅ Created hierarchy:', hierarchyResult.addHierarchy.hierarchy[0]);
            // 2. Create hierarchy levels
            console.log('[TEST_SEED] Creating hierarchy levels...');
            const levelMutation = `
        mutation CreateTestLevels($input: [AddHierarchyLevelInput!]!) {
          addHierarchyLevel(input: $input) {
            hierarchyLevel {
              id
              levelNumber
              label
            }
          }
        }
      `;
            const levelsResult = await testClient.executeGraphQL(levelMutation, {
                input: [
                    {
                        levelNumber: 1,
                        label: 'Concepts',
                        hierarchy: { id: 'test-hierarchy-1' }
                    },
                    {
                        levelNumber: 2,
                        label: 'Examples',
                        hierarchy: { id: 'test-hierarchy-1' }
                    }
                ]
            });
            if (!levelsResult?.addHierarchyLevel?.hierarchyLevel) {
                throw new Error('Failed to create test levels');
            }
            console.log('[TEST_SEED] ✅ Created levels:', levelsResult.addHierarchyLevel.hierarchyLevel);
            // Get the actual level IDs
            const level1Id = levelsResult.addHierarchyLevel.hierarchyLevel.find((l) => l.levelNumber === 1)?.id;
            const level2Id = levelsResult.addHierarchyLevel.hierarchyLevel.find((l) => l.levelNumber === 2)?.id;
            if (!level1Id || !level2Id) {
                throw new Error('Failed to get level IDs');
            }
            // 3. Create hierarchy level types
            console.log('[TEST_SEED] Creating hierarchy level types...');
            const levelTypeMutation = `
        mutation CreateTestLevelTypes($input: [AddHierarchyLevelTypeInput!]!) {
          addHierarchyLevelType(input: $input) {
            hierarchyLevelType {
              id
              typeName
            }
          }
        }
      `;
            const levelTypesResult = await testClient.executeGraphQL(levelTypeMutation, {
                input: [
                    {
                        level: { id: level1Id },
                        typeName: 'concept'
                    },
                    {
                        level: { id: level2Id },
                        typeName: 'example'
                    }
                ]
            });
            if (!levelTypesResult?.addHierarchyLevelType?.hierarchyLevelType) {
                throw new Error('Failed to create test level types');
            }
            console.log('[TEST_SEED] ✅ Created level types:', levelTypesResult.addHierarchyLevelType.hierarchyLevelType);
            // 4. Create test nodes
            console.log('[TEST_SEED] Creating test nodes...');
            const nodeMutation = `
        mutation CreateTestNodes($input: [AddNodeInput!]!) {
          addNode(input: $input) {
            node {
              id
              label
              type
            }
          }
        }
      `;
            const nodesResult = await testClient.executeGraphQL(nodeMutation, {
                input: [
                    {
                        id: 'test-concept-1',
                        label: 'Test Concept',
                        type: 'concept'
                    },
                    {
                        id: 'test-example-1',
                        label: 'Test Example',
                        type: 'example'
                    }
                ]
            });
            if (!nodesResult?.addNode?.node) {
                throw new Error('Failed to create test nodes');
            }
            console.log('[TEST_SEED] ✅ Created nodes:', nodesResult.addNode.node);
            // 5. Create hierarchy assignments
            console.log('[TEST_SEED] Creating hierarchy assignments...');
            const assignmentMutation = `
        mutation CreateTestAssignments($input: [AddHierarchyAssignmentInput!]!) {
          addHierarchyAssignment(input: $input) {
            hierarchyAssignment {
              id
              node { id label }
              hierarchy { id name }
              level { id levelNumber label }
            }
          }
        }
      `;
            const assignmentsResult = await testClient.executeGraphQL(assignmentMutation, {
                input: [
                    {
                        node: { id: 'test-concept-1' },
                        hierarchy: { id: 'test-hierarchy-1' },
                        level: { id: level1Id }
                    },
                    {
                        node: { id: 'test-example-1' },
                        hierarchy: { id: 'test-hierarchy-1' },
                        level: { id: level2Id }
                    }
                ]
            });
            if (!assignmentsResult?.addHierarchyAssignment?.hierarchyAssignment) {
                throw new Error('Failed to create test assignments');
            }
            console.log('[TEST_SEED] ✅ Created assignments:', assignmentsResult.addHierarchyAssignment.hierarchyAssignment);
            // 6. CRITICAL: Verify all data exists after seeding
            console.log('[TEST_SEED] Verifying all seeded data exists...');
            // Wait a moment for data to be fully persisted
            await new Promise(resolve => setTimeout(resolve, 1000));
            const verifyHierarchy = await testClient.executeGraphQL(`
        query {
          queryHierarchy {
            id
            name
          }
        }
      `);
            const verifyNodes = await testClient.executeGraphQL(`
        query {
          queryNode {
            id
            label
            type
          }
        }
      `);
            console.log('[TEST_SEED] Verification - Hierarchies:', JSON.stringify(verifyHierarchy, null, 2));
            console.log('[TEST_SEED] Verification - Nodes:', JSON.stringify(verifyNodes, null, 2));
            if (!verifyHierarchy?.queryHierarchy?.length || !verifyNodes?.queryNode?.length) {
                throw new Error('Seeded data verification failed - data not found after seeding');
            }
            console.log('[TEST_SEED] ✅ All seeded data verified successfully');
            console.log('[TEST_SEED] Test data seeded successfully');
            return true;
        }
        catch (error) {
            console.error('[TEST_SEED] Failed to seed test data:', error);
            if (error instanceof Error)
                throw error;
            else
                throw new Error(String(error));
        }
    }
    async createTestNodes(testClient) {
        const testNodes = [
            { id: 'test-concept-1', label: 'Test Concept', type: 'concept' },
            { id: 'test-example-1', label: 'Test Example', type: 'example' }
        ];
        const mutation = `
      mutation AddTestNodes($input: [AddNodeInput!]!) {
        addNode(input: $input) {
          node { id label type }
        }
      }
    `;
        console.log('[TEST_SEED] Creating test nodes: test-concept-1, test-example-1');
        const result = await testClient.executeGraphQL(mutation, { input: testNodes });
        if (!result?.addNode?.node) {
            console.error('[TEST_SEED] Failed to create test nodes:', result?.errors);
            throw new Error('Failed to create test nodes');
        }
        console.log(`✅ Created ${result.addNode.node.length} test nodes.`);
    }
}
exports.TestDataSeeder = TestDataSeeder;
