import axios, { AxiosResponse } from 'axios';
import { TenantManager } from '../../services/tenantManager';
import { DgraphTenantFactory, DgraphTenant } from '../../services/dgraphTenant';
import config from '../../config'; // Assuming config is also in TypeScript

interface TestHierarchy {
  id: string;
  name: string;
  levels: { levelNumber: number; label: string; allowedTypes?: string[] }[];
}

interface TestNode {
  id: string;
  label: string;
  type: string;
}

interface AddHierarchyInput {
  id: string;
  name: string;
}

interface AddNodeInput {
  id: string;
  label: string;
  type: string;
}

interface AddHierarchyResponse {
  addHierarchy: {
    hierarchy: { id: string; name: string }[];
  };
}

interface AddNodeResponse {
  addNode: {
    node: { id: string; label: string; type: string }[];
  };
}


class TestDataSeeder {
  private tenantManager: TenantManager;
  private TEST_TENANT_ID: string;

  constructor() {
    this.tenantManager = new TenantManager();
    this.TEST_TENANT_ID = 'test-tenant';
  }

  async setupTestDatabase(): Promise<boolean> {
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
    } catch (error: any) {
      console.error('[TEST_SETUP] Failed to setup real test database:', error);
      return false;
    }
  }

  async resetTestDatabase(): Promise<boolean> {
    console.log('[TEST_RESET] Resetting real test database');

    try {
      // Delete existing test tenant
      await this.tenantManager.deleteTenant(this.TEST_TENANT_ID);

      // Recreate test tenant
      await this.tenantManager.createTenant(this.TEST_TENANT_ID);

      // Re-seed data
      await this.seedTestData();

      console.log('[TEST_RESET] Real test database reset');
      return true;
    } catch (error: any) {
      console.error('[TEST_RESET] Failed to reset real test database:', error);
      return false;
    }
  }

  async cleanupTestDatabase(): Promise<boolean> {
    console.log('[TEST_CLEANUP] Cleaning real test database');

    try {
      await this.tenantManager.deleteTenant(this.TEST_TENANT_ID);
      console.log('[TEST_CLEANUP] Real test database cleaned');
      return true;
    } catch (error: any) {
      console.error('[TEST_CLEANUP] Failed to cleanup real test database:', error);
      return false;
    }
  }

  async seedTestData(): Promise<boolean> {
    console.log('[TEST_SEED] Seeding minimal test data');

    try {
      const testClient = DgraphTenantFactory.createTestTenant();

      // Create minimal test hierarchy (different from production data)
      const testHierarchy: TestHierarchy = {
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

      await testClient.executeGraphQL<AddHierarchyResponse>(mutation, { hierarchy: testHierarchy });

      // Add minimal test nodes
      await this.createTestNodes(testClient);

      console.log('[TEST_SEED] Test data seeded successfully');
      return true;
    } catch (error: any) {
      console.error('[TEST_SEED] Failed to seed test data:', error);
      return false;
    }
  }

  async createTestNodes(testClient: DgraphTenant): Promise<void> {
    const testNodes: TestNode[] = [
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

    await testClient.executeGraphQL<AddNodeResponse>(mutation, { input: testNodes });
  }
}



// Export the class for direct import if needed
export { TestDataSeeder };
