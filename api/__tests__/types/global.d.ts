import { TestDataSeeder } from '../helpers/testDataSeeder';

declare global {
  namespace NodeJS {
    interface Global {
      testUtils: {
        wait: (ms?: number) => Promise<void>;
        generateTestId: (prefix?: string) => string;
        createMockRequest: (overrides?: any) => any;
        createMockResponse: () => any;
        createMockReq: (overrides?: any) => any;
        createMockRes: () => any;
        createMockNext: () => jest.Mock;
        getTestTenantClient: () => any;
        setupTestDatabase: () => Promise<boolean>;
        cleanupTestDatabase: () => Promise<boolean>;
        resetTestDatabase: () => Promise<boolean>;
        seedTestData: () => Promise<boolean>;
        testDataSeeder: TestDataSeeder;
        TEST_NAMESPACE: string;
        TEST_TENANT_ID: string;
      };
      TEST_CONSTANTS: {
        VALID_NODE_TYPES: string[];
        VALID_EDGE_TYPES: string[];
        DEFAULT_HIERARCHY_ID: string;
        DEFAULT_LEVEL_ID: string;
        ADMIN_API_KEY: string | undefined;
      };
      createTestNode: (overrides?: any) => any;
      createTestEdge: (overrides?: any) => any;
      createTestHierarchy: (overrides?: any) => any;
      createTestLevel: (overrides?: any) => any;
    }
  }

  var testUtils: NodeJS.Global['testUtils'];
  var TEST_CONSTANTS: NodeJS.Global['TEST_CONSTANTS'];
  var createTestNode: NodeJS.Global['createTestNode'];
  var createTestEdge: NodeJS.Global['createTestEdge'];
  var createTestHierarchy: NodeJS.Global['createTestHierarchy'];
  var createTestLevel: NodeJS.Global['createTestLevel'];
}

export {};
