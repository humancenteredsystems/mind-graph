import {
  getAllSchemas,
  getSchemaById,
  getProductionSchema,
  getSchemaContent,
  addSchema,
  updateSchema
} from '../../../services/schemaRegistry';

// Define interfaces for schema registry data structures
interface Schema {
  id: string;
  name: string;
  description?: string;
  path: string;
  is_production?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface SchemaRegistry {
  schemas: Schema[];
}

// Mock fs with explicit types
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn() as jest.Mock<(path: string, encoding: string) => Promise<string>>,
    writeFile: jest.fn() as jest.Mock<(path: string, data: string, encoding: string) => Promise<void>>,
    mkdir: jest.fn() as jest.Mock<(path: string, options?: any) => Promise<void>>
  }
}));

// Import the mocked fs module and assert its type
import * as fsModule from 'fs';
const fs = fsModule as any; // Use any for simplicity with complex mock typing


describe('SchemaRegistry Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllSchemas', () => {
    it('should return all schemas from registry', async () => {
      const mockRegistry: SchemaRegistry = {
        schemas: [
          { id: 'schema1', name: 'Test Schema 1', path: 'schemas/schema1.graphql' },
          { id: 'schema2', name: 'Test Schema 2', path: 'schemas/schema2.graphql' }
        ]
      };
      fs.promises.readFile.mockResolvedValueOnce(JSON.stringify(mockRegistry));

      const result = await getAllSchemas();

      expect(result).toEqual(mockRegistry.schemas);
      expect(fs.promises.readFile).toHaveBeenCalledWith(
        expect.stringContaining('schema_registry.json'),
        'utf8'
      );
    });

    it('should return empty array when no schemas exist', async () => {
      const mockRegistry: SchemaRegistry = { schemas: [] };
      fs.promises.readFile.mockResolvedValueOnce(JSON.stringify(mockRegistry));

      const result = await getAllSchemas();

      expect(result).toEqual([]);
    });

    it('should throw error when registry file cannot be read', async () => {
      fs.promises.readFile.mockRejectedValueOnce(new Error('File not found'));

      await expect(getAllSchemas()).rejects.toThrow('Failed to read schema registry');
    });
  });

  describe('getSchemaById', () => {
    it('should return schema when found', async () => {
      const mockSchemas: Schema[] = [
        { id: 'schema1', name: 'Test Schema 1', path: 'schemas/schema1.graphql' },
        { id: 'schema2', name: 'Test Schema 2', path: 'schemas/schema2.graphql' }
      ];
      const mockRegistry: SchemaRegistry = { schemas: mockSchemas };
      fs.promises.readFile.mockResolvedValueOnce(JSON.stringify(mockRegistry));

      const result = await getSchemaById('schema1');

      expect(result).toEqual(mockSchemas[0]);
    });

    it('should return null when schema not found', async () => {
      const mockRegistry: SchemaRegistry = { schemas: [] };
      fs.promises.readFile.mockResolvedValueOnce(JSON.stringify(mockRegistry));

      const result = await getSchemaById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getProductionSchema', () => {
    it('should return production schema when found', async () => {
      const mockSchemas: Schema[] = [
        { id: 'schema1', name: 'Test Schema 1', is_production: false, path: 'schemas/schema1.graphql' },
        { id: 'schema2', name: 'Test Schema 2', is_production: true, path: 'schemas/schema2.graphql' }
      ];
      const mockRegistry: SchemaRegistry = { schemas: mockSchemas };
      fs.promises.readFile.mockResolvedValueOnce(JSON.stringify(mockRegistry));

      const result = await getProductionSchema();

      expect(result).toEqual(mockSchemas[1]);
    });

    it('should return null when no production schema exists', async () => {
      const mockRegistry: SchemaRegistry = { schemas: [{ id: 'schema1', name: 'Test Schema 1', is_production: false, path: 'schemas/schema1.graphql' }] }; // Added name
      fs.promises.readFile.mockResolvedValueOnce(JSON.stringify(mockRegistry));

      const result = await getProductionSchema();

      expect(result).toBeNull();
    });
  });

  describe('getSchemaContent', () => {
    it('should return schema content when schema exists', async () => {
      const mockSchema: Schema = { id: 'schema1', name: 'Test', path: 'schemas/test.graphql' };
      const mockRegistry: SchemaRegistry = { schemas: [mockSchema] };
      const mockContent = 'type Node { id: String! }';

      fs.promises.readFile
        .mockResolvedValueOnce(JSON.stringify(mockRegistry))
        .mockResolvedValueOnce(mockContent);

      const result = await getSchemaContent('schema1');

      expect(result).toBe(mockContent);
      expect(fs.promises.readFile).toHaveBeenCalledTimes(2);
    });

    it('should throw error when schema not found', async () => {
      const mockRegistry: SchemaRegistry = { schemas: [] };
      fs.promises.readFile.mockResolvedValueOnce(JSON.stringify(mockRegistry));

      await expect(getSchemaContent('nonexistent')).rejects.toThrow('Schema not found');
    });
  });

  describe('addSchema', () => {
    it('should add new schema successfully', async () => {
      const mockRegistry: SchemaRegistry = { schemas: [] };
      const schemaInfo: Partial<Schema> = {
        id: 'new-schema',
        name: 'New Schema',
        description: 'Test schema'
      };
      const schemaContent = 'type Node { id: String! }';

      fs.promises.readFile.mockResolvedValueOnce(JSON.stringify(mockRegistry));
      fs.promises.writeFile.mockResolvedValue(undefined); // Mock with undefined for void return
      fs.promises.mkdir.mockResolvedValue(undefined); // Mock with undefined for void return

      const result = await addSchema(schemaInfo as Schema, schemaContent); // Cast schemaInfo for simplicity in test

      expect(result.id).toBe('new-schema');
      expect(result.name).toBe('New Schema');
      expect(fs.promises.writeFile).toHaveBeenCalledTimes(2); // Registry + schema file
      expect(fs.promises.mkdir).toHaveBeenCalled();
    });

    it('should throw error when schema ID already exists', async () => {
      const mockRegistry: SchemaRegistry = {
        schemas: [{ id: 'existing-schema', name: 'Existing', path: 'schemas/existing.graphql' }]
      };
      const schemaInfo: Partial<Schema> = { id: 'existing-schema', name: 'Duplicate' };

      fs.promises.readFile.mockResolvedValueOnce(JSON.stringify(mockRegistry));

      await expect(addSchema(schemaInfo as Schema, 'content')).rejects.toThrow('Schema ID already exists'); // Cast schemaInfo for simplicity in test
    });

    it('should handle production schema marking', async () => {
      const mockRegistry: SchemaRegistry = {
        schemas: [{ id: 'old-prod', name: 'Old Production', is_production: true, path: 'schemas/old-prod.graphql' }] // Added name
      };
      const schemaInfo: Partial<Schema> = {
        id: 'new-prod',
        name: 'New Production',
        is_production: true
      };

      fs.promises.readFile.mockResolvedValueOnce(JSON.stringify(mockRegistry));
      fs.promises.writeFile.mockResolvedValue(undefined); // Mock with undefined for void return
      fs.promises.mkdir.mockResolvedValue(undefined); // Mock with undefined for void return

      const result = await addSchema(schemaInfo as Schema, 'content'); // Cast schemaInfo for simplicity in test

      expect(result.is_production).toBe(true);
      // Should have written registry with old production unmarked
      const registryCall = fs.promises.writeFile.mock.calls.find((call: any) => // Add type annotation for call
        call[0].includes('schema_registry.json')
      );
      const writtenRegistry = JSON.parse(registryCall[1]);
      const oldProdSchema = writtenRegistry.schemas.find((s: Schema) => s.id === 'old-prod'); // Add type annotation for s
      expect(oldProdSchema.is_production).toBe(false);
    });
  });

  describe('updateSchema', () => {
    it('should update schema metadata successfully', async () => {
      const mockRegistry: SchemaRegistry = {
        schemas: [{ id: 'schema1', name: 'Old Name', path: 'schemas/test.graphql' }]
      };
      const updates: Partial<Schema> = { name: 'New Name', description: 'Updated description' };

      fs.promises.readFile.mockResolvedValueOnce(JSON.stringify(mockRegistry));
      fs.promises.writeFile.mockResolvedValue(undefined); // Mock with undefined for void return

      const result = await updateSchema('schema1', updates);

      expect(result.name).toBe('New Name');
      expect(result.description).toBe('Updated description');
      expect(result.updated_at).toBeDefined();
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('schema_registry.json'),
        expect.any(String),
        'utf8'
      );
    });

    it('should update schema content when provided', async () => {
      const mockRegistry: SchemaRegistry = {
        schemas: [{ id: 'schema1', name: 'Test', path: 'schemas/test.graphql' }]
      };
      const updates: Partial<Schema> = { name: 'Updated' };
      const newContent = 'type UpdatedNode { id: String! }';

      fs.promises.readFile.mockResolvedValueOnce(JSON.stringify(mockRegistry));
      fs.promises.writeFile.mockResolvedValue(undefined); // Mock with undefined for void return

      await updateSchema('schema1', updates, newContent);

      expect(fs.promises.writeFile).toHaveBeenCalledTimes(2); // Registry + content
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('schemas/test.graphql'),
        newContent,
        'utf8'
      );
    });

    it('should throw error when schema does not exist', async () => {
      const mockRegistry: SchemaRegistry = { schemas: [] };
      fs.promises.readFile.mockResolvedValueOnce(JSON.stringify(mockRegistry));

      await expect(updateSchema('nonexistent', {})).rejects.toThrow('Schema not found');
    });
  });
});
