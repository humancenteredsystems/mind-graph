interface TestUtils {
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
    TEST_NAMESPACE: string;
    TEST_TENANT_ID: string;
}
declare global {
    var testUtils: TestUtils;
    var TEST_CONSTANTS: {
        VALID_NODE_TYPES: string[];
        VALID_EDGE_TYPES: string[];
        DEFAULT_HIERARCHY_ID: string;
        DEFAULT_LEVEL_ID: string;
        ADMIN_API_KEY: string;
    };
    var createTestNode: (overrides?: any) => any;
    var createTestEdge: (overrides?: any) => any;
    var createTestHierarchy: (overrides?: any) => any;
    var createTestLevel: (overrides?: any) => any;
    namespace jest {
        interface Matchers<R> {
            toBeValidNodeId(): R;
            toBeValidHierarchyId(): R;
            toHaveValidGraphQLResponse(): R;
        }
    }
}
export {};
//# sourceMappingURL=jest.setup.d.ts.map