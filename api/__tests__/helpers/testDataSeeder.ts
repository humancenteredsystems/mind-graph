import { TenantManager } from '../../services/tenantManager';
import { DgraphTenantFactory } from '../../services/dgraphTenant';
import config from '../../config'; // Assuming config is available
import axios from 'axios'; // Import axios for making API calls

// Helper function to make API calls (similar to Python's call_api)
async function callApi(apiBase: string, endpoint: string, apiKey: string, method: 'GET' | 'POST' | 'DELETE', payload?: any, extraHeaders?: Record<string, string>): Promise<any> {
  const url = `${apiBase.replace(/\/+$/, '')}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
  if (apiKey) {
    headers['X-Admin-API-Key'] = apiKey;
  }

  try {
    console.log(`[API_CALL] ${method} ${url}`);
    // Single, direct call to axios
    const response = await axios({
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
  } catch (error: any) {
    console.error(`[API_CALL] Request Error: ${error.message}`);
    if (error.response) {
      console.error(`[API_CALL] Response Status: ${error.response.status}`);
      console.error(`[API_CALL] Response Data:`, error.response.data);
      return { success: false, error: error.response.data.error || error.message, details: error.response.data, status: error.response.status };
    } else if (error.request) {
      console.error(`[API_CALL] No response received:`, error.request);
      return { success: false, error: 'No response received', details: error.request };
    } else {
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


export class TestDataSeeder {
  private tenantManager: TenantManager;
  private TEST_TENANT_ID: string;
  private API_BASE_URL: string;
  private ADMIN_API_KEY: string;

  constructor() {
    this.tenantManager = new TenantManager();
    this.TEST_TENANT_ID = 'test-tenant';
    // Use config for API base URL and Admin API Key
    this.API_BASE_URL = config.dgraphBaseUrl;
    this.ADMIN_API_KEY = config.adminApiKey!; // Use non-null assertion

    // Ensure admin API key is set for real integration tests
    if (!config.adminApiKey) { // Check the original config value
      throw new Error("ADMIN_API_KEY is not set in config. Real integration tests require an admin API key.");
    }
  }

  async setupTestDatabase(): Promise<boolean> {
    console.log('[TEST_SETUP] Initializing real test database');

    try {
      // Ensure test tenant exists
      const exists = await this.tenantManager.tenantExists(this.TEST_TENANT_ID);
      if (!exists) {
        console.log(`[TEST_SETUP] Test tenant '${this.TEST_TENANT_ID}' does not exist, creating...`);
        await this.tenantManager.createTenant(this.TEST_TENANT_ID);
        console.log(`[TEST_SETUP] Test tenant '${this.TEST_TENANT_ID}' created.`);
      } else {
         console.log(`[TEST_SETUP] Test tenant '${this.TEST_TENANT_ID}' already exists.`);
      }

      // Seed with minimal test data
      await this.seedTestData();

      console.log('[TEST_SETUP] Real test database ready');
      return true;
    } catch (error) {
      console.error('[TEST_SETUP] Failed to setup real test database:', error);
      // Propagate the error so Jest setup can potentially catch it
      if (error instanceof Error) throw error;
      else throw new Error(String(error));
    }
  }

  async cleanupTestDatabase(): Promise<boolean> {
    console.log('[TEST_CLEANUP] Cleaning real test database');

    try {
      // Use the safe namespace-scoped deletion via TenantManager
      await this.tenantManager.deleteTenant(this.TEST_TENANT_ID);
      console.log('[TEST_CLEANUP] Real test database cleaned');
      return true;
    } catch (error) {
      console.error('[TEST_CLEANUP] Failed to cleanup real test database:', error);
      return false;
    }
  }

  async resetTestDatabase(): Promise<boolean> {
      console.log('[TEST_RESET] Resetting real test database');
      try {
          // Use the safe namespace-scoped deletion via TenantManager
          await this.tenantManager.deleteTenant(this.TEST_TENANT_ID);
          console.log('[TEST_RESET] Test tenant data cleared.');
          
          // Wait a bit for deletion to complete
          await (global as any).testUtils.wait(1000);
          
          // Re-create and seed
          await this.tenantManager.createTenant(this.TEST_TENANT_ID);
          console.log('[TEST_RESET] Test tenant re-created.');
          
          // Wait a bit for creation to complete
          await (global as any).testUtils.wait(1000);
          
          await this.seedTestData();
          console.log('[TEST_RESET] Test tenant database reset successfully.');
          return true;
      } catch (error) {
          console.error('[TEST_RESET] Failed to reset real test database:', error);
          if (error instanceof Error) throw error;
          else throw new Error(String(error));
      }
  }

  async seedTestData(): Promise<boolean> {
    console.log('[TEST_SEED] Seeding test data using working seed script approach');
    const testClient = DgraphTenantFactory.createTestTenant();

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
      const level1Id = levelsResult.addHierarchyLevel.hierarchyLevel.find((l: any) => l.levelNumber === 1)?.id;
      const level2Id = levelsResult.addHierarchyLevel.hierarchyLevel.find((l: any) => l.levelNumber === 2)?.id;
      
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
      
      console.log('[TEST_SEED] Test data seeded successfully');
      return true;
    } catch (error) {
      console.error('[TEST_SEED] Failed to seed test data:', error);
      if (error instanceof Error) throw error;
      else throw new Error(String(error));
    }
  }

  async createTestNodes(testClient: any): Promise<void> {
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
