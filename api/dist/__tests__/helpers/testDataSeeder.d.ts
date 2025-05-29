export class TestDataSeeder {
    tenantManager: TenantManager;
    TEST_TENANT_ID: string;
    setupTestDatabase(): Promise<boolean>;
    cleanupTestDatabase(): Promise<boolean>;
    seedTestData(): Promise<boolean>;
    createTestNodes(testClient: any): Promise<void>;
}
import { TenantManager } from "../../services/tenantManager";
//# sourceMappingURL=testDataSeeder.d.ts.map