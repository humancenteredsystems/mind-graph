const { TenantManager } = require('../../services/tenantManager');
const { DgraphTenantFactory } = require('../../services/dgraphTenant');

class TestDataSeeder {
  constructor() {
    this.tenantManager = new TenantManager();
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
    } catch (error) {
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
    } catch (error) {
      console.error('[TEST_CLEANUP] Failed to cleanup real test database:', error);
      return false;
    }
  }

  async seedTestData() {
    console.log('[TEST_SEED] Seeding minimal test data');
    
    try {
      const testClient = DgraphTenantFactory.createTestTenant();
      
      // Create minimal test hierarchy (different from production data)
      const testHierarchy = {
        id: 'test-hierarchy-1',
        name: 'Test Hierarchy 1',
        levels: [
          { levelNumber: 1, label: 'Concepts', allowedTypes: ['concept'] },
          { levelNumber: 2, label: 'Examples', allowedTypes: ['example'] }
        ]
      };

      const mutation = `
        mutation CreateTestHierarchy($hierarchy: AddHierarchyInput!) {
          addHierarchy(input: [$hierarchy]) {
            hierarchy { id name }
          }
        }
      `;
      
      await testClient.executeGraphQL(mutation, { hierarchy: testHierarchy });
      
      // Add minimal test nodes
      await this.createTestNodes(testClient);
      
      console.log('[TEST_SEED] Test data seeded successfully');
      return true;
    } catch (error) {
      console.error('[TEST_SEED] Failed to seed test data:', error);
      return false;
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

    await testClient.executeGraphQL(mutation, { input: testNodes });
  }
}

// Enhanced test utilities
global.testUtils = {
  ...global.testUtils,
  testDataSeeder: new TestDataSeeder(),
  
  setupTestDatabase: async () => {
    return await global.testUtils.testDataSeeder.setupTestDatabase();
  },
  
  cleanupTestDatabase: async () => {
    return await global.testUtils.testDataSeeder.cleanupTestDatabase();
  },
  
  seedTestData: async () => {
    return await global.testUtils.testDataSeeder.seedTestData();
  }
};

module.exports = { TestDataSeeder };
