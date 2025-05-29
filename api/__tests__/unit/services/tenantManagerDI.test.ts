import { TenantManager } from '../../../services/tenantManager';
import { DgraphTenantFactory, DgraphTenant } from '../../../services/dgraphTenant'; // Assuming DgraphTenant is exported
import * as fsPromises from 'node:fs/promises'; // Import the actual fs/promises for typing

// Define interface for the fileSystem dependency
type MockFileSystem = jest.Mocked<typeof fsPromises>; // Mock of the full fs/promises module

// Define interface for the tenantFactory dependency
type MockTenantFactory = jest.Mocked<typeof DgraphTenantFactory>; // Mock of the DgraphTenantFactory class

// Define the expected function signature for the pushSchema dependency
type PushSchemaDependency = (schema: string, namespace: string | null, adminUrl?: string | undefined) => Promise<any>;


describe('TenantManager Dependency Injection', () => {
  describe('constructor with dependencies', () => {
    it('should use injected dependencies instead of defaults', async () => {
      // Mock dependencies
      const mockPushSchema: any = jest.fn().mockResolvedValue(true); // Type as any initially

      const mockFileSystem: MockFileSystem = {
        readFile: jest.fn().mockResolvedValue('mock schema content')
      } as any; // Use any for simplicity with complex mock typing

      const mockTenant: Partial<DgraphTenant> = {
        executeGraphQL: jest.fn().mockResolvedValue({ addHierarchy: { hierarchy: { id: 'test' } } })
      };
      const mockTenantFactory: MockTenantFactory = {
        createTenant: jest.fn().mockReturnValue(mockTenant),
        createTenantFromContext: jest.fn(), // Add other factory methods if they exist on the class
        createDefaultTenant: jest.fn(),
        createTestTenant: jest.fn()
      } as any; // Use any for simplicity with complex mock typing

      const mockSchemaPath = '/mock/path/to/schema.graphql';

      // Create TenantManager with injected dependencies, casting pushSchema
      const tenantManager = new TenantManager({
        pushSchema: mockPushSchema as PushSchemaDependency, // Cast to the expected function type
        fileSystem: mockFileSystem,
        schemaPath: mockSchemaPath,
        tenantFactory: mockTenantFactory
      });

      // Test that injected dependencies are used (using as any to bypass private property check)
      expect((tenantManager as any).pushSchema).toBe(mockPushSchema);
      expect((tenantManager as any).fileSystem).toBe(mockFileSystem);
      expect((tenantManager as any).schemaPath).toBe(mockSchemaPath);
      expect((tenantManager as any).tenantFactory).toBe(mockTenantFactory);
    });

    it('should use defaults when no dependencies are provided', () => {
      const tenantManager = new TenantManager();

      // Test that defaults are used (should be functions/objects, not mocks) (using as any to bypass private property check)
      expect(typeof (tenantManager as any).pushSchema).toBe('function');
      expect(typeof (tenantManager as any).fileSystem).toBe('object');
      expect(typeof (tenantManager as any).schemaPath).toBe('string');
      expect(typeof (tenantManager as any).tenantFactory).toBe('function'); // DgraphTenantFactory is a class (function)

      // Verify default schema path (using as any to bypass private property check)
      expect((tenantManager as any).schemaPath).toContain('schemas/default.graphql');
    });

    it('should use injected file system for getDefaultSchema', async () => {
      const mockFileSystem: MockFileSystem = {
        readFile: jest.fn().mockResolvedValue('mocked schema content')
      } as any; // Use any for simplicity with complex mock typing

      const mockSchemaPath = '/test/schema.graphql';

      const tenantManager = new TenantManager({
        fileSystem: mockFileSystem,
        schemaPath: mockSchemaPath
      });

      const result = await tenantManager.getDefaultSchema();

      expect(mockFileSystem.readFile).toHaveBeenCalledWith(mockSchemaPath, 'utf8');
      expect(result).toBe('mocked schema content');
    });

    it('should use injected pushSchema for initializeTenantSchema', async () => {
      const mockPushSchema: any = jest.fn().mockResolvedValue(true); // Type as any initially

      const mockFileSystem: MockFileSystem = {
        readFile: jest.fn().mockResolvedValue('schema content')
      } as any; // Use any for simplicity with complex mock typing

      const tenantManager = new TenantManager({
        pushSchema: mockPushSchema as PushSchemaDependency, // Cast to the expected function type
        fileSystem: mockFileSystem
      });

      await tenantManager.initializeTenantSchema('0x1');

      expect(mockFileSystem.readFile).toHaveBeenCalled();
      expect(mockPushSchema).toHaveBeenCalledWith('schema content', '0x1');
    });

    it('should use injected tenant factory for creating tenants', async () => {
      const mockTenant: Partial<DgraphTenant> = {
        executeGraphQL: jest.fn().mockResolvedValue({ addHierarchy: { hierarchy: { id: 'test' } } })
      };
      const mockTenantFactory: MockTenantFactory = {
        createTenant: jest.fn().mockReturnValue(mockTenant),
        createTenantFromContext: jest.fn(), // Add other factory methods if they exist on the class
        createDefaultTenant: jest.fn(),
        createTestTenant: jest.fn()
      } as any; // Use any for simplicity with complex mock typing

      const mockFileSystem: MockFileSystem = {
        readFile: jest.fn().mockResolvedValue('schema content')
      } as any; // Use any for simplicity with complex mock typing

      const mockPushSchema: any = jest.fn().mockResolvedValue(true); // Type as any initially


      const tenantManager = new TenantManager({
        tenantFactory: mockTenantFactory,
        fileSystem: mockFileSystem,
        pushSchema: mockPushSchema as PushSchemaDependency // Cast to the expected function type
      });

      await tenantManager.seedDefaultHierarchies('0x1');

      expect(mockTenantFactory.createTenant).toHaveBeenCalledWith('0x1');
      expect(mockTenant.executeGraphQL).toHaveBeenCalled();
    });

    it('should handle errors gracefully with injected dependencies', async () => {
      const mockFileSystem: MockFileSystem = {
        readFile: jest.fn().mockRejectedValue(new Error('File not found'))
      } as any; // Use any for simplicity with complex mock typing

      const tenantManager = new TenantManager({
        fileSystem: mockFileSystem
      });

      await expect(tenantManager.getDefaultSchema()).rejects.toThrow('Could not load default schema');
      expect(mockFileSystem.readFile).toHaveBeenCalled();
    });
  });
});
