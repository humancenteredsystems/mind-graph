"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestDataSeeder = void 0;
const tenantManager_1 = require("../../services/tenantManager");
const dgraphTenant_1 = require("../../services/dgraphTenant");
class TestDataSeeder {
    constructor() {
        this.tenantManager = new tenantManager_1.TenantManager();
        this.TEST_TENANT_ID = 'test-tenant';
    }
    async setupTestDatabase() {
        console.log('[TEST_SETUP] Initializing real test database');
        try {
            // Ensure test tenant exists
            const exists = await this.tenantManager.tenantExists(this.TEST_TENANT_ID);
            if (!exists) {
                await this.tenantManager.createTenant(this.TEST_TENANT_ID);
            }
            // Seed with minimal test data
            await this.seedTestData();
            console.log('[TEST_SETUP] Real test database ready');
            return true;
        }
        catch (error) {
            console.error('[TEST_SETUP] Failed to setup real test database:', error);
            return false;
        }
    }
    async cleanupTestDatabase() {
        console.log('[TEST_CLEANUP] Cleaning real test database');
        try {
            await this.tenantManager.deleteTenant(this.TEST_TENANT_ID);
            console.log('[TEST_CLEANUP] Real test database cleaned');
            return true;
        }
        catch (error) {
            console.error('[TEST_CLEANUP] Failed to cleanup real test database:', error);
            return false;
        }
    }
    async seedTestData() {
        console.log('[TEST_SEED] Seeding minimal test data for test-tenant');
        const testClient = dgraphTenant_1.DgraphTenantFactory.createTestTenant();
        try {
            // Explicitly delete known test entities before creating them
            const entitiesToDelete = ['test-hierarchy-1', 'test-concept-1', 'test-example-1'];
            const deleteNodeMutation = `mutation DeleteTestNodes($ids: [ID!]) { deleteNode(filter: { id: { in: $ids } }) { numUids } }`;
            const deleteHierarchyMutation = `mutation DeleteTestHierarchy($id: ID!) { deleteHierarchy(filter: { id: { eq: $id } }) { numUids } }`;
            try {
                console.log(`[TEST_SEED] Attempting to delete existing test nodes: ${entitiesToDelete.slice(1).join(', ')}`);
                await testClient.executeGraphQL(deleteNodeMutation, { ids: entitiesToDelete.slice(1) });
                console.log(`[TEST_SEED] Attempting to delete existing test hierarchy: ${entitiesToDelete[0]}`);
                await testClient.executeGraphQL(deleteHierarchyMutation, { id: entitiesToDelete[0] });
                console.log('[TEST_SEED] Pre-emptive deletion of known test entities complete.');
            }
            catch (delError) {
                console.warn('[TEST_SEED] Warning during pre-emptive deletion (might be normal if entities did not exist):', delError);
            }
            // Create minimal test hierarchy (without levels initially)
            const hierarchyData = {
                id: 'test-hierarchy-1',
                name: 'Test Hierarchy 1',
            };
            const createHierarchyMutation = `
        mutation CreateTestHierarchy($hierarchy: AddHierarchyInput!) {
          addHierarchy(input: [$hierarchy]) {
            hierarchy { id name }
          }
        }
      `;
            console.log(`[TEST_SEED] Creating hierarchy: ${hierarchyData.id}`);
            const hierarchyCreationResult = await testClient.executeGraphQL(createHierarchyMutation, { hierarchy: hierarchyData });
            if (!hierarchyCreationResult?.addHierarchy?.hierarchy?.[0]?.id) {
                throw new Error(`Failed to create or verify creation of hierarchy ${hierarchyData.id}`);
            }
            console.log(`[TEST_SEED] Hierarchy ${hierarchyData.id} created/verified.`);
            // Explicitly create levels for this hierarchy
            const levelsToCreate = [
                { id: 'test-level-1', hierarchyId: 'test-hierarchy-1', levelNumber: 1, label: 'Concepts', allowedTypes: [{ typeName: 'concept' }] },
                { id: 'test-level-2', hierarchyId: 'test-hierarchy-1', levelNumber: 2, label: 'Examples', allowedTypes: [{ typeName: 'example' }] }
            ];
            const createLevelMutation = `
        mutation CreateTestLevel($input: [AddHierarchyLevelInput!]!) {
          addHierarchyLevel(input: $input) {
            hierarchyLevel { id levelNumber label }
          }
        }
      `;
            for (const levelData of levelsToCreate) {
                console.log(`[TEST_SEED] Creating level: ${levelData.label} (ID: ${levelData.id}) for hierarchy ${levelData.hierarchyId}`);
                const levelInputPayload = {
                    id: levelData.id, // Attempt to provide the specific ID
                    hierarchy: { id: levelData.hierarchyId },
                    levelNumber: levelData.levelNumber,
                    label: levelData.label,
                    allowedTypes: levelData.allowedTypes
                };
                const levelCreationResult = await testClient.executeGraphQL(createLevelMutation, { input: [levelInputPayload] });
                const createdLevel = levelCreationResult?.addHierarchyLevel?.hierarchyLevel?.[0];
                if (!createdLevel?.id || (levelInputPayload.id && createdLevel.id !== levelInputPayload.id)) {
                    // If ID was provided but doesn't match, or if no ID came back, it's an issue.
                    // Dgraph might auto-generate ID if the provided one isn't allowed by schema/directive or if 'id' field isn't in AddHierarchyLevelInput.
                    console.error(`[TEST_SEED] Level creation issue for ${levelData.label}. Provided ID: ${levelData.id}, Created ID: ${createdLevel?.id}`);
                    // For now, we'll proceed, but this could be a source of failure if tests rely on 'test-level-1' as a specific UID.
                    // If Dgraph auto-generates IDs, the assignment logic below needs to use the *returned* ID.
                }
                console.log(`[TEST_SEED] Level ${levelData.label} (Attempted ID: ${levelData.id}, Resulting ID: ${createdLevel?.id}) created for hierarchy ${levelData.hierarchyId}`);
            }
            // Add minimal test nodes
            await this.createTestNodes(testClient);
            // Seed specific assignments
            // Query for the actual level ID first to ensure it exists, as 'test-level-1' might not be the Dgraph ID
            let level1ActualId = 'test-level-1'; // Default to test ID
            try {
                const levelQuery = `query GetLevel($hId: ID!, $lvlNum: Int!) { queryHierarchyLevel(filter: {hierarchy: {id: {eq: $hId}}, levelNumber: {eq: $lvlNum}}) { id } }`;
                const levelQueryResult = await testClient.executeGraphQL(levelQuery, { hId: 'test-hierarchy-1', lvlNum: 1 });
                if (levelQueryResult?.queryHierarchyLevel?.[0]?.id) {
                    level1ActualId = levelQueryResult.queryHierarchyLevel[0].id;
                    console.log(`[TEST_SEED] Verified Level 1 ID for assignment: ${level1ActualId}`);
                }
                else {
                    console.warn(`[TEST_SEED] Could not verify Level 1 ID for assignment, using default 'test-level-1'. This might fail.`);
                }
            }
            catch (levelQueryError) {
                console.warn(`[TEST_SEED] Error querying Level 1 ID: ${levelQueryError}. Using default 'test-level-1'.`);
            }
            const assignMutation = `
        mutation AssignTestNode($input: [AddHierarchyAssignmentInput!]!) {
          addHierarchyAssignment(input: $input) {
            hierarchyAssignment { id }
          }
        }`;
            const assignmentInput = [{
                    node: { id: 'test-concept-1' },
                    hierarchy: { id: 'test-hierarchy-1' },
                    level: { id: level1ActualId }
                }];
            console.log(`[TEST_SEED] Assigning 'test-concept-1' to 'test-hierarchy-1' / level ID '${level1ActualId}'`);
            const assignmentResult = await testClient.executeGraphQL(assignMutation, { input: assignmentInput });
            if (!assignmentResult?.addHierarchyAssignment?.hierarchyAssignment?.[0]?.id) {
                throw new Error(`Failed to create or verify hierarchy assignment for test-concept-1`);
            }
            console.log(`[TEST_SEED] Assignment for 'test-concept-1' created/verified.`);
            console.log('[TEST_SEED] Test data seeded successfully');
            return true;
        }
        catch (error) {
            console.error('[TEST_SEED] Failed to seed test data:', error);
            // Propagate the error so Jest setup can potentially catch it
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
        await testClient.executeGraphQL(mutation, { input: testNodes });
    }
}
exports.TestDataSeeder = TestDataSeeder;
