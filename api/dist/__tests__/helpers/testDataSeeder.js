"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestDataSeeder = void 0;
const tenantManager_1 = require("../../services/tenantManager");
const dgraphTenant_1 = require("../../services/dgraphTenant");
const config_1 = __importDefault(require("../../config")); // Assuming config is available
const axios_1 = __importDefault(require("axios")); // Import axios for making API calls
// Helper function to make API calls (similar to Python's call_api)
async function callApi(apiBase, endpoint, apiKey, method, payload, extraHeaders) {
    const url = `${apiBase.replace(/\/+$/, '')}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...extraHeaders,
    };
    if (apiKey) {
        headers['X-Admin-API-Key'] = apiKey;
    }
    try {
        console.log(`[API_CALL] ${method} ${url}`);
        // Single, direct call to axios
        const response = await (0, axios_1.default)({
            method,
            url,
            headers,
            data: payload,
        });
        console.log(`[API_CALL] Response Status: ${response.status}`);
        // Dgraph GraphQL errors are in response.data.errors, API errors might be in response.data.error
        if (response.data && (response.data.errors || response.data.error)) {
            console.error(`[API_CALL] API Error:`, response.data.errors || response.data.error);
            return { success: false, error: response.data.error || 'GraphQL errors', details: response.data.errors, data: response.data };
        }
        return { success: true, data: response.data };
    }
    catch (error) {
        console.error(`[API_CALL] Request Error: ${error.message}`);
        if (error.response) {
            console.error(`[API_CALL] Response Status: ${error.response.status}`);
            console.error(`[API_CALL] Response Data:`, error.response.data);
            return { success: false, error: error.response.data.error || error.message, details: error.response.data, status: error.response.status };
        }
        else if (error.request) {
            console.error(`[API_CALL] No response received:`, error.request);
            return { success: false, error: 'No response received', details: error.request };
        }
        else {
            return { success: false, error: error.message };
        }
    }
}
// GraphQL mutation templates (still needed for node/edge/assignment creation)
const ADD_NODE_MUTATION = `
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
const ADD_EDGE_MUTATION = `
mutation AddEdge($input: [AddEdgeInput!]!) {
  addEdge(input: $input) {
    edge {
      from { id }
      fromId
      to { id }
      toId
      type
    }
  }
}
`;
const ADD_HIERARCHY_ASSIGNMENT_MUTATION = `
mutation AddHierarchyAssignment($input: [AddHierarchyAssignmentInput!]!) {
  addHierarchyAssignment(input: $input) {
    hierarchyAssignment {
      id
      node { id label }
      hierarchy { id name }
      level { id label levelNumber }
    }
  }
}
`;
const DELETE_NODE_MUTATION = `
mutation DeleteTestNodes($ids: [ID!]) {
  deleteNode(filter: { id: { in: $ids } }) {
    msg
    numUids
  }
}
`;
const DELETE_HIERARCHY_MUTATION = `
mutation DeleteTestHierarchy($id: ID!) {
  deleteHierarchy(filter: { id: { eq: $id } }) {
    msg
    numUids
  }
}
`;
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
            // Re-create and seed
            await this.tenantManager.createTenant(this.TEST_TENANT_ID);
            console.log('[TEST_RESET] Test tenant re-created.');
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
        console.log('[TEST_SEED] Seeding minimal test data for test-tenant');
        const testClient = dgraphTenant_1.DgraphTenantFactory.createTestTenant(); // Still need this for direct GraphQL
        // Headers for API calls, including tenant context
        const tenantHeaders = { 'X-Tenant-Id': this.TEST_TENANT_ID };
        const adminHeaders = { 'X-Admin-API-Key': this.ADMIN_API_KEY, 'X-Tenant-Id': this.TEST_TENANT_ID }; // Include tenant for admin calls
        try {
            // Explicitly delete known test entities before creating them
            const entitiesToDelete = ['test-hierarchy-1', 'test-concept-1', 'test-example-1'];
            try {
                console.log(`[TEST_SEED] Attempting pre-emptive deletion of known test entities...`);
                // Use GraphQL mutations via the testClient for deletion
                await testClient.executeGraphQL(DELETE_NODE_MUTATION, { ids: entitiesToDelete.slice(1) });
                await testClient.executeGraphQL(DELETE_HIERARCHY_MUTATION, { id: entitiesToDelete[0] });
                console.log('[TEST_SEED] Pre-emptive deletion of known test entities complete.');
            }
            catch (delError) {
                console.warn('[TEST_SEED] Warning during pre-emptive deletion (might be normal if entities did not exist):', delError);
            }
            // Add a short delay after deletion before creating
            await global.testUtils.wait(500); // Wait 500ms
            // 1. Create minimal test hierarchy using the REST API endpoint
            const hierarchyData = {
                id: 'test-hierarchy-1',
                name: 'Test Hierarchy 1',
            };
            console.log(`[TEST_SEED] Creating hierarchy via API: ${hierarchyData.id}`);
            const hierarchyCreationResp = await callApi(this.API_BASE_URL, "/hierarchy", this.ADMIN_API_KEY, "POST", hierarchyData, tenantHeaders // Send tenant header even for admin endpoint if it supports it
            );
            if (!hierarchyCreationResp.success || !hierarchyCreationResp.data?.id) {
                console.error(`❌ Failed to create hierarchy '${hierarchyData.id}': ${hierarchyCreationResp.error}`);
                if (hierarchyCreationResp.details)
                    console.error("Details:", hierarchyCreationResp.details);
                throw new Error(`Failed to create or verify creation of hierarchy ${hierarchyData.id}`);
            }
            const createdHierarchyId = hierarchyCreationResp.data.id;
            console.log(`✅ Created hierarchy '${hierarchyData.name}' (id: ${createdHierarchyId})`);
            // Add a short delay after hierarchy creation
            await global.testUtils.wait(500); // Wait 500ms
            // 2. Explicitly create levels for this hierarchy using the REST API endpoint
            const levelsToCreate = [
                { levelNumber: 1, label: 'Concepts' },
                { levelNumber: 2, label: 'Examples' }
            ];
            const createdLevelIdsMap = {}; // Map levelNumber to actual created ID
            for (const levelData of levelsToCreate) {
                console.log(`[TEST_SEED] Creating level via API: ${levelData.label} (Num: ${levelData.levelNumber}) for hierarchy ${createdHierarchyId}`);
                const levelCreationResp = await callApi(this.API_BASE_URL, "/hierarchy/level", this.ADMIN_API_KEY, "POST", {
                    hierarchyId: createdHierarchyId,
                    levelNumber: levelData.levelNumber,
                    label: levelData.label
                }, tenantHeaders // Send tenant header
                );
                if (!levelCreationResp.success || !levelCreationResp.data?.id) {
                    console.error(`❌ Failed to create level ${levelData.label} (num: ${levelData.levelNumber}): ${levelCreationResp.error}`);
                    if (levelCreationResp.details)
                        console.error("Details:", levelCreationResp.details);
                    throw new Error(`Failed to create level ${levelData.label}`);
                }
                const createdLevelId = levelCreationResp.data.id;
                createdLevelIdsMap[levelData.levelNumber] = createdLevelId;
                console.log(`✅ Created level '${levelData.label}' (levelNumber=${levelData.levelNumber}, id=${createdLevelId}) for hierarchy ${createdHierarchyId}`);
            }
            // Add a short delay after level creation
            await global.testUtils.wait(500); // Wait 500ms
            // 3. Create HierarchyLevelType entries using GraphQL mutation
            const levelTypesToCreate = [
                { levelNumber: 1, typeName: 'concept' },
                { levelNumber: 2, typeName: 'example' }
            ];
            const createLevelTypeMutation = `
        mutation AddHLT($input: [AddHierarchyLevelTypeInput!]!) {
          addHierarchyLevelType(input: $input) {
            hierarchyLevelType { id level { id } typeName }
          }
        }
      `;
            for (const levelTypeData of levelTypesToCreate) {
                const levelId = createdLevelIdsMap[levelTypeData.levelNumber];
                if (!levelId) {
                    console.warn(`⚠️ Skipping level type creation for type '${levelTypeData.typeName}' at level ${levelTypeData.levelNumber}: Level ID not found.`);
                    continue;
                }
                console.log(`[TEST_SEED] Allowing type '${levelTypeData.typeName}' for level ID '${levelId}'`);
                const levelTypeInput = {
                    level: { id: levelId },
                    typeName: levelTypeData.typeName
                };
                const levelTypeCreationResult = await testClient.executeGraphQL(createLevelTypeMutation, { input: [levelTypeInput] });
                if (!levelTypeCreationResult?.addHierarchyLevelType?.hierarchyLevelType?.[0]?.id) {
                    console.error(`❌ Failed to allow type '${levelTypeData.typeName}' for level ID '${levelId}':`, levelTypeCreationResult?.errors);
                    throw new Error(`Failed to create HierarchyLevelType for type ${levelTypeData.typeName} at level ${levelTypeData.levelNumber}`);
                }
                console.log(`✅ Successfully allowed type '${levelTypeData.typeName}' for level ID '${levelId}'.`);
            }
            // Add a short delay after level type creation
            await global.testUtils.wait(500); // Wait 500ms
            // 4. Add minimal test nodes using GraphQL mutation
            await this.createTestNodes(testClient);
            // Add a short delay after node creation
            await global.testUtils.wait(500); // Wait 500ms
            // 5. Seed specific assignments using GraphQL mutation
            const level1ActualId = createdLevelIdsMap[1]; // Use the actual ID returned
            if (!level1ActualId) {
                throw new Error("Cannot create assignment: Level 1 ID was not successfully created.");
            }
            const assignMutation = `
        mutation AssignTestNode($input: [AddHierarchyAssignmentInput!]!) {
          addHierarchyAssignment(input: $input) {
            hierarchyAssignment { id }
          }
        }`;
            const assignmentInput = [{
                    node: { id: 'test-concept-1' },
                    hierarchy: { id: createdHierarchyId }, // Use the actual hierarchy ID
                    level: { id: level1ActualId }
                }];
            console.log(`[TEST_SEED] Assigning 'test-concept-1' to hierarchy ID '${createdHierarchyId}' / level ID '${level1ActualId}'`);
            const assignmentResult = await testClient.executeGraphQL(assignMutation, { input: assignmentInput });
            if (!assignmentResult?.addHierarchyAssignment?.hierarchyAssignment?.[0]?.id) {
                console.error(`❌ Failed to create hierarchy assignment for test-concept-1:`, assignmentResult?.errors);
                throw new Error(`Failed to create or verify hierarchy assignment for test-concept-1`);
            }
            console.log(`✅ Assignment for 'test-concept-1' created/verified.`);
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
        const result = await testClient.executeGraphQL(mutation, { input: testNodes });
        if (!result?.addNode?.node) {
            console.error('[TEST_SEED] Failed to create test nodes:', result?.errors);
            throw new Error('Failed to create test nodes');
        }
        console.log(`✅ Created ${result.addNode.node.length} test nodes.`);
    }
}
exports.TestDataSeeder = TestDataSeeder;
