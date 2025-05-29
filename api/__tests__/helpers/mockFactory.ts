import axios from 'axios';

/**
 * Centralized factory for creating standardized test mocks
 */
export class TestMockFactory {
  /**
   * Create a standardized axios mock
   */
  static createAxiosMock(): jest.Mocked<typeof axios> {
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    
    // Reset all mocks
    mockedAxios.post.mockReset();
    mockedAxios.get.mockReset();
    mockedAxios.put.mockReset();
    mockedAxios.delete.mockReset();
    
    return mockedAxios;
  }

  /**
   * Create a standardized tenant factory mock
   */
  static createTenantFactoryMock() {
    const mockExecuteGraphQL = jest.fn();
    
    const mockTenantClient = {
      executeGraphQL: mockExecuteGraphQL,
      getNamespace: jest.fn().mockReturnValue('0x0'),
      isDefaultNamespace: jest.fn().mockReturnValue(true)
    };

    const mockFactory = {
      createTenantFromContext: jest.fn().mockResolvedValue(mockTenantClient),
      createTenant: jest.fn().mockResolvedValue(mockTenantClient),
      createTestTenant: jest.fn().mockResolvedValue(mockTenantClient),
      createDefaultTenant: jest.fn().mockResolvedValue(mockTenantClient)
    };

    return {
      adaptiveTenantFactory: mockFactory,
      mockExecuteGraphQL,
      mockTenantClient
    };
  }

  /**
   * Create a standardized config mock
   */
  static createConfigMock(overrides: any = {}) {
    return {
      __esModule: true,
      default: {
        dgraphAdminUrl: 'http://localhost:8080/admin/schema',
        dgraphBaseUrl: 'http://localhost:8080',
        port: 3001,
        ...overrides
      }
    };
  }

  /**
   * Setup common Jest mocks for unit tests
   */
  static setupUnitTestMocks() {
    // Mock axios
    jest.mock('axios');
    
    // Mock config
    jest.mock('../../../config', () => this.createConfigMock());
    
    // Mock file system operations
    jest.mock('fs', () => ({
      promises: {
        readFile: jest.fn(),
        writeFile: jest.fn(),
        access: jest.fn(),
        mkdir: jest.fn(),
        readdir: jest.fn(),
        stat: jest.fn()
      },
      readFileSync: jest.fn(),
      writeFileSync: jest.fn(),
      existsSync: jest.fn()
    }));
  }

  /**
   * Setup common Jest mocks for integration tests
   */
  static setupIntegrationTestMocks() {
    // Mock the adaptive tenant factory
    const tenantMock = this.createTenantFactoryMock();
    
    jest.mock('../../services/adaptiveTenantFactory', () => tenantMock);
    
    return tenantMock;
  }

  /**
   * Create a mock Express response object
   */
  static createMockResponse() {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis()
    };
    return res;
  }

  /**
   * Create a mock Express request object
   */
  static createMockRequest(overrides: any = {}) {
    return {
      body: {},
      headers: {},
      params: {},
      query: {},
      tenantContext: {
        tenantId: 'test-tenant',
        namespace: '0x1',
        isTestTenant: true,
        isDefaultTenant: false
      },
      ...overrides
    };
  }

  /**
   * Create a mock Express next function
   */
  static createMockNext() {
    return jest.fn();
  }

  /**
   * Setup axios mock with common response patterns
   */
  static setupAxiosMockResponses(mockedAxios: jest.Mocked<typeof axios>) {
    // Success response
    const successResponse = {
      status: 200,
      data: { code: 'Success', message: 'Done' }
    };

    // Error response
    const errorResponse = {
      status: 400,
      data: { error: 'Invalid request' }
    };

    // Network error
    const networkError = new Error('Network Error');

    // Timeout error
    const timeoutError = new Error('timeout of 5000ms exceeded') as any;
    timeoutError.code = 'ECONNABORTED';

    // Dgraph error
    const dgraphError = new Error('Schema validation failed') as any;
    dgraphError.response = {
      status: 400,
      data: { error: 'Invalid schema syntax' }
    };

    return {
      successResponse,
      errorResponse,
      networkError,
      timeoutError,
      dgraphError,
      
      // Helper methods to setup specific responses
      mockSuccess: () => mockedAxios.post.mockResolvedValueOnce(successResponse),
      mockError: () => mockedAxios.post.mockRejectedValueOnce(networkError),
      mockDgraphError: () => mockedAxios.post.mockRejectedValueOnce(dgraphError),
      mockTimeout: () => mockedAxios.post.mockRejectedValueOnce(timeoutError)
    };
  }

  /**
   * Setup GraphQL mock responses for tenant factory
   */
  static setupGraphQLMockResponses(mockExecuteGraphQL: jest.MockedFunction<any>) {
    const mockHierarchies = [
      { id: 'hierarchy1', name: 'Test Hierarchy 1' },
      { id: 'hierarchy2', name: 'Test Hierarchy 2' }
    ];

    const mockNodes = [
      { id: 'node1', label: 'Test Node 1', type: 'concept' },
      { id: 'node2', label: 'Test Node 2', type: 'example' }
    ];

    return {
      mockHierarchies,
      mockNodes,
      
      // Helper methods
      mockQueryHierarchy: () => mockExecuteGraphQL.mockResolvedValueOnce({
        queryHierarchy: mockHierarchies
      }),
      
      mockQueryNode: () => mockExecuteGraphQL.mockResolvedValueOnce({
        queryNode: mockNodes
      }),
      
      mockAddNode: (nodeData: any) => mockExecuteGraphQL.mockResolvedValueOnce({
        addNode: { node: [nodeData] }
      }),
      
      mockAddHierarchy: (hierarchyData: any) => mockExecuteGraphQL.mockResolvedValueOnce({
        addHierarchy: { hierarchy: [hierarchyData] }
      }),
      
      mockError: (errorMessage: string) => mockExecuteGraphQL.mockRejectedValueOnce(
        new Error(errorMessage)
      )
    };
  }
}

/**
 * Common test data builders
 */
export class TestDataBuilder {
  /**
   * Create test node data
   */
  static node(overrides: any = {}) {
    return {
      id: `test-node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      label: 'Test Node',
      type: 'concept',
      status: 'active',
      branch: 'main',
      ...overrides
    };
  }

  /**
   * Create test edge data
   */
  static edge(overrides: any = {}) {
    return {
      fromId: `test-from-${Date.now()}`,
      toId: `test-to-${Date.now()}`,
      type: 'relates_to',
      ...overrides
    };
  }

  /**
   * Create test hierarchy data
   */
  static hierarchy(overrides: any = {}) {
    return {
      id: `test-hierarchy-${Date.now()}`,
      name: 'Test Hierarchy',
      ...overrides
    };
  }

  /**
   * Create test level data
   */
  static level(overrides: any = {}) {
    return {
      id: `test-level-${Date.now()}`,
      hierarchyId: 'test-hierarchy',
      levelNumber: 1,
      label: 'Test Level',
      ...overrides
    };
  }

  /**
   * Create test assignment data
   */
  static assignment(overrides: any = {}) {
    return {
      nodeId: 'test-node',
      hierarchyId: 'test-hierarchy',
      levelId: 'test-level',
      ...overrides
    };
  }
}
