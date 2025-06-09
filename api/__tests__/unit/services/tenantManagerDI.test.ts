const { TenantManager } = require('../../../services/tenantManager');

describe('TenantManager Dependency Injection', () => {
  describe('constructor with dependencies', () => {
    it('should use injected dependencies instead of defaults', async () => {
      // Mock dependencies
      const mockPushSchema = jest.fn().mockResolvedValue(true);
      const mockFileSystem = {
        readFile: jest.fn().mockResolvedValue('mock schema content')
      };
      const mockTenantFactory = {
        createTenant: jest.fn().mockReturnValue({
          executeGraphQL: jest.fn().mockResolvedValue({ addHierarchy: { hierarchy: { id: 'test' } } })
        })
      };
      const mockSchemaPath = '/mock/path/to/schema.graphql';

      // Create TenantManager with injected dependencies
      const tenantManager = new TenantManager({
        pushSchema: mockPushSchema,
        fileSystem: mockFileSystem,
        schemaPath: mockSchemaPath,
        tenantFactory: mockTenantFactory
      });

      // Test that injected dependencies are used
      expect(tenantManager.pushSchema).toBe(mockPushSchema);
      expect(tenantManager.fileSystem).toBe(mockFileSystem);
      expect(tenantManager.schemaPath).toBe(mockSchemaPath);
      expect(tenantManager.tenantFactory).toBe(mockTenantFactory);
    });

    it('should use defaults when no dependencies are provided', () => {
      const tenantManager = new TenantManager();

      // Test that defaults are used (should be functions/objects, not mocks)
      expect(typeof tenantManager.pushSchema).toBe('function');
      expect(typeof tenantManager.fileSystem).toBe('object');
      expect(typeof tenantManager.schemaPath).toBe('string');
      expect(typeof tenantManager.tenantFactory).toBe('function'); // DgraphTenantFactory is a class (function)
      
      // Verify default schema path
      expect(tenantManager.schemaPath).toContain('schemas/default.graphql');
    });

    it('should use injected file system for getDefaultSchema', async () => {
      const mockFileSystem = {
        readFile: jest.fn().mockResolvedValue('mocked schema content')
      };
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
      const mockPushSchema = jest.fn().mockResolvedValue({ success: true });
      const mockFileSystem = {
        readFile: jest.fn().mockResolvedValue('test schema')
      };

      const tenantManager = new TenantManager({
        pushSchema: mockPushSchema,
        fileSystem: mockFileSystem
      });

      await tenantManager.initializeTenantSchema('0x1');

      expect(mockFileSystem.readFile).toHaveBeenCalled();
      expect(mockPushSchema).toHaveBeenCalledWith('test schema', '0x1');
    });

    it('should use injected tenant factory for creating tenants', async () => {
      const mockTenant = {
        executeGraphQL: jest.fn().mockResolvedValue({ addHierarchy: { hierarchy: { id: 'test' } } })
      };
      const mockTenantFactory = {
        createTenant: jest.fn().mockReturnValue(mockTenant)
      };
      const mockFileSystem = {
        readFile: jest.fn().mockResolvedValue('schema content')
      };
      const mockPushSchema = jest.fn().mockResolvedValue(true);

      const tenantManager = new TenantManager({
        tenantFactory: mockTenantFactory,
        fileSystem: mockFileSystem,
        pushSchema: mockPushSchema
      });

      await tenantManager.seedDefaultHierarchies('0x1');

      expect(mockTenantFactory.createTenant).toHaveBeenCalledWith('0x1');
      expect(mockTenant.executeGraphQL).toHaveBeenCalled();
    });

    it('should handle errors gracefully with injected dependencies', async () => {
      const mockFileSystem = {
        readFile: jest.fn().mockRejectedValue(new Error('File not found'))
      };

      const tenantManager = new TenantManager({
        fileSystem: mockFileSystem
      });

      await expect(tenantManager.getDefaultSchema()).rejects.toThrow('Could not load default schema');
      expect(mockFileSystem.readFile).toHaveBeenCalled();
    });
  });
});
