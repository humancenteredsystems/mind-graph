import { Application } from 'express';
import request from 'supertest';

/**
 * Base class for integration tests with common setup/teardown patterns
 */
export abstract class IntegrationTestBase {
  protected app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  /**
   * Setup method to be called in beforeAll
   */
  async setupTest(): Promise<void> {
    // Override in subclasses for specific setup
  }

  /**
   * Cleanup method to be called in afterAll
   */
  async cleanupTest(): Promise<void> {
    // Override in subclasses for specific cleanup
  }

  /**
   * Reset method to be called in beforeEach
   */
  async resetTest(): Promise<void> {
    // Override in subclasses for specific reset logic
  }

  /**
   * Create a supertest request with common headers
   */
  protected createRequest() {
    return request(this.app);
  }
}

/**
 * Base class for real integration tests with database operations
 */
export abstract class RealIntegrationTestBase extends IntegrationTestBase {
  protected testTenantId = 'test-tenant';

  async setupTest(): Promise<void> {
    await global.testUtils.setupTestDatabase();
  }

  async cleanupTest(): Promise<void> {
    await global.testUtils.cleanupTestDatabase();
  }

  async resetTest(): Promise<void> {
    await global.testUtils.resetTestDatabase();
  }

  /**
   * Create a request with test tenant headers
   */
  protected createTenantRequest() {
    return this.createRequest().set('X-Tenant-Id', this.testTenantId);
  }
}

/**
 * Base class for mocked integration tests
 */
export abstract class MockedIntegrationTestBase extends IntegrationTestBase {
  protected mockExecuteGraphQL: jest.MockedFunction<any>;

  constructor(app: Application, mockExecuteGraphQL: jest.MockedFunction<any>) {
    super(app);
    this.mockExecuteGraphQL = mockExecuteGraphQL;
  }

  async resetTest(): Promise<void> {
    this.mockExecuteGraphQL.mockReset();
    process.env.ADMIN_API_KEY = 'test-admin-key';
  }
}
