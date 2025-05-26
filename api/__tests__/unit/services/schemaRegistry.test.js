const { SchemaRegistry } = require('../../../services/schemaRegistry');
const fs = require('fs').promises;
const path = require('path');

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn(),
    mkdir: jest.fn()
  }
}));

describe('SchemaRegistry Service', () => {
  let schemaRegistry;
  const mockRegistryPath = '/mock/path/schema_registry.json';
  const mockSchemasDir = '/mock/path/schemas';

  beforeEach(() => {
    jest.clearAllMocks();
    schemaRegistry = new SchemaRegistry(mockRegistryPath, mockSchemasDir);
  });

  describe('loadRegistry', () => {
    it('should load existing registry file', async () => {
      const mockRegistry = {
        schemas: {
          'test-schema': {
            id: 'test-schema',
            name: 'Test Schema',
            version: '1.0.0',
            filename: 'test.graphql'
          }
        }
      };

      fs.readFile.mockResolvedValue(JSON.stringify(mockRegistry));

      const result = await schemaRegistry.loadRegistry();

      expect(fs.readFile).toHaveBeenCalledWith(mockRegistryPath, 'utf8');
      expect(result).toEqual(mockRegistry);
    });

    it('should return empty registry when file does not exist', async () => {
      fs.readFile.mockRejectedValue({ code: 'ENOENT' });

      const result = await schemaRegistry.loadRegistry();

      expect(result).toEqual({ schemas: {} });
    });

    it('should throw error for other file system errors', async () => {
      const error = new Error('Permission denied');
      fs.readFile.mockRejectedValue(error);

      await expect(schemaRegistry.loadRegistry()).rejects.toThrow('Permission denied');
    });
  });

  describe('saveRegistry', () => {
    it('should save registry to file', async () => {
      const mockRegistry = {
        schemas: {
          'test-schema': {
            id: 'test-schema',
            name: 'Test Schema'
          }
        }
      };

      fs.writeFile.mockResolvedValue();

      await schemaRegistry.saveRegistry(mockRegistry);

      expect(fs.writeFile).toHaveBeenCalledWith(
        mockRegistryPath,
        JSON.stringify(mockRegistry, null, 2),
        'utf8'
      );
    });

    it('should handle write errors', async () => {
      const mockRegistry = { schemas: {} };
      const error = new Error('Write failed');
      fs.writeFile.mockRejectedValue(error);

      await expect(schemaRegistry.saveRegistry(mockRegistry)).rejects.toThrow('Write failed');
    });
  });

  describe('getSchema', () => {
    beforeEach(() => {
      const mockRegistry = {
        schemas: {
          'existing-schema': {
            id: 'existing-schema',
            name: 'Existing Schema',
            filename: 'existing.graphql'
          }
        }
      };
      fs.readFile.mockResolvedValue(JSON.stringify(mockRegistry));
    });

    it('should return schema metadata when schema exists', async () => {
      const result = await schemaRegistry.getSchema('existing-schema');

      expect(result).toEqual({
        id: 'existing-schema',
        name: 'Existing Schema',
        filename: 'existing.graphql'
      });
    });

    it('should return null when schema does not exist', async () => {
      const result = await schemaRegistry.getSchema('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getSchemaContent', () => {
    beforeEach(() => {
      const mockRegistry = {
        schemas: {
          'test-schema': {
            id: 'test-schema',
            filename: 'test.graphql'
          }
        }
      };
      fs.readFile.mockImplementation((path) => {
        if (path === mockRegistryPath) {
          return Promise.resolve(JSON.stringify(mockRegistry));
        }
        if (path.endsWith('test.graphql')) {
          return Promise.resolve('type Node { id: String! @id }');
        }
        return Promise.reject(new Error('File not found'));
      });
    });

    it('should return schema content when schema exists', async () => {
      const result = await schemaRegistry.getSchemaContent('test-schema');

      expect(result).toBe('type Node { id: String! @id }');
      expect(fs.readFile).toHaveBeenCalledWith(
        path.join(mockSchemasDir, 'test.graphql'),
        'utf8'
      );
    });

    it('should return null when schema does not exist', async () => {
      const result = await schemaRegistry.getSchemaContent('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('addSchema', () => {
    beforeEach(() => {
      fs.readFile.mockResolvedValue(JSON.stringify({ schemas: {} }));
      fs.writeFile.mockResolvedValue();
      fs.access.mockResolvedValue();
      fs.mkdir.mockResolvedValue();
    });

    it('should add new schema successfully', async () => {
      const schemaInfo = {
        id: 'new-schema',
        name: 'New Schema',
        version: '1.0.0',
        description: 'A new test schema'
      };
      const content = 'type Node { id: String! @id }';

      const result = await schemaRegistry.addSchema(schemaInfo, content);

      expect(result.id).toBe('new-schema');
      expect(result.filename).toBe('new-schema.graphql');
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(mockSchemasDir, 'new-schema.graphql'),
        content,
        'utf8'
      );
    });

    it('should throw error when schema ID already exists', async () => {
      const existingRegistry = {
        schemas: {
          'existing-schema': { id: 'existing-schema' }
        }
      };
      fs.readFile.mockResolvedValue(JSON.stringify(existingRegistry));

      const schemaInfo = { id: 'existing-schema', name: 'Duplicate' };
      const content = 'type Node { id: String! @id }';

      await expect(schemaRegistry.addSchema(schemaInfo, content))
        .rejects.toThrow('Schema with ID existing-schema already exists');
    });

    it('should create schemas directory if it does not exist', async () => {
      fs.access.mockRejectedValue({ code: 'ENOENT' });

      const schemaInfo = { id: 'new-schema', name: 'New Schema' };
      const content = 'type Node { id: String! @id }';

      await schemaRegistry.addSchema(schemaInfo, content);

      expect(fs.mkdir).toHaveBeenCalledWith(mockSchemasDir, { recursive: true });
    });
  });

  describe('updateSchema', () => {
    beforeEach(() => {
      const existingRegistry = {
        schemas: {
          'existing-schema': {
            id: 'existing-schema',
            name: 'Original Name',
            version: '1.0.0',
            filename: 'existing-schema.graphql'
          }
        }
      };
      fs.readFile.mockResolvedValue(JSON.stringify(existingRegistry));
      fs.writeFile.mockResolvedValue();
    });

    it('should update schema metadata successfully', async () => {
      const updates = {
        name: 'Updated Name',
        version: '1.1.0'
      };

      const result = await schemaRegistry.updateSchema('existing-schema', updates);

      expect(result.name).toBe('Updated Name');
      expect(result.version).toBe('1.1.0');
      expect(result.id).toBe('existing-schema'); // Should remain unchanged
    });

    it('should update schema content when provided', async () => {
      const updates = { name: 'Updated Name' };
      const newContent = 'type UpdatedNode { id: String! @id }';

      await schemaRegistry.updateSchema('existing-schema', updates, newContent);

      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(mockSchemasDir, 'existing-schema.graphql'),
        newContent,
        'utf8'
      );
    });

    it('should throw error when schema does not exist', async () => {
      const updates = { name: 'Updated Name' };

      await expect(schemaRegistry.updateSchema('non-existent', updates))
        .rejects.toThrow('Schema with ID non-existent not found');
    });
  });

  describe('listSchemas', () => {
    it('should return array of schema metadata', async () => {
      const mockRegistry = {
        schemas: {
          'schema1': { id: 'schema1', name: 'Schema 1' },
          'schema2': { id: 'schema2', name: 'Schema 2' }
        }
      };
      fs.readFile.mockResolvedValue(JSON.stringify(mockRegistry));

      const result = await schemaRegistry.listSchemas();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 'schema1', name: 'Schema 1' });
      expect(result[1]).toEqual({ id: 'schema2', name: 'Schema 2' });
    });

    it('should return empty array when no schemas exist', async () => {
      fs.readFile.mockResolvedValue(JSON.stringify({ schemas: {} }));

      const result = await schemaRegistry.listSchemas();

      expect(result).toEqual([]);
    });
  });
});
