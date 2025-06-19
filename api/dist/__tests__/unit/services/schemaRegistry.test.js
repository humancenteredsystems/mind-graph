"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const schemaRegistry_1 = require("../../../services/schemaRegistry");
// Mock fs
jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn(),
        writeFile: jest.fn(),
        mkdir: jest.fn()
    }
}));
const fs_1 = __importDefault(require("fs"));
describe('SchemaRegistry Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('getAllSchemas', () => {
        it('should return all schemas from registry', async () => {
            const mockRegistry = {
                schemas: [
                    { id: 'schema1', name: 'Test Schema 1' },
                    { id: 'schema2', name: 'Test Schema 2' }
                ]
            };
            fs_1.default.promises.readFile.mockResolvedValueOnce(JSON.stringify(mockRegistry));
            const result = await (0, schemaRegistry_1.getAllSchemas)();
            expect(result).toEqual(mockRegistry.schemas);
            expect(fs_1.default.promises.readFile).toHaveBeenCalledWith(expect.stringContaining('schema_registry.json'), 'utf8');
        });
        it('should return empty array when no schemas exist', async () => {
            const mockRegistry = { schemas: [] };
            fs_1.default.promises.readFile.mockResolvedValueOnce(JSON.stringify(mockRegistry));
            const result = await (0, schemaRegistry_1.getAllSchemas)();
            expect(result).toEqual([]);
        });
        it('should throw error when registry file cannot be read', async () => {
            fs_1.default.promises.readFile.mockRejectedValueOnce(new Error('File not found'));
            await expect((0, schemaRegistry_1.getAllSchemas)()).rejects.toThrow('Failed to read schema registry');
        });
    });
    describe('getSchemaById', () => {
        it('should return schema when found', async () => {
            const mockSchemas = [
                { id: 'schema1', name: 'Test Schema 1' },
                { id: 'schema2', name: 'Test Schema 2' }
            ];
            const mockRegistry = { schemas: mockSchemas };
            fs_1.default.promises.readFile.mockResolvedValueOnce(JSON.stringify(mockRegistry));
            const result = await (0, schemaRegistry_1.getSchemaById)('schema1');
            expect(result).toEqual(mockSchemas[0]);
        });
        it('should return null when schema not found', async () => {
            const mockRegistry = { schemas: [] };
            fs_1.default.promises.readFile.mockResolvedValueOnce(JSON.stringify(mockRegistry));
            const result = await (0, schemaRegistry_1.getSchemaById)('nonexistent');
            expect(result).toBeNull();
        });
    });
    describe('getProductionSchema', () => {
        it('should return production schema when found', async () => {
            const mockSchemas = [
                { id: 'schema1', name: 'Test Schema 1', is_production: false },
                { id: 'schema2', name: 'Test Schema 2', is_production: true }
            ];
            const mockRegistry = { schemas: mockSchemas };
            fs_1.default.promises.readFile.mockResolvedValueOnce(JSON.stringify(mockRegistry));
            const result = await (0, schemaRegistry_1.getProductionSchema)();
            expect(result).toEqual(mockSchemas[1]);
        });
        it('should return null when no production schema exists', async () => {
            const mockRegistry = { schemas: [{ id: 'schema1', is_production: false }] };
            fs_1.default.promises.readFile.mockResolvedValueOnce(JSON.stringify(mockRegistry));
            const result = await (0, schemaRegistry_1.getProductionSchema)();
            expect(result).toBeNull();
        });
    });
    describe('getSchemaContent', () => {
        it('should return schema content when schema exists', async () => {
            const mockSchema = { id: 'schema1', path: 'schemas/test.graphql' };
            const mockRegistry = { schemas: [mockSchema] };
            const mockContent = 'type Node { id: String! }';
            fs_1.default.promises.readFile
                .mockResolvedValueOnce(JSON.stringify(mockRegistry))
                .mockResolvedValueOnce(mockContent);
            const result = await (0, schemaRegistry_1.getSchemaContent)('schema1');
            expect(result).toBe(mockContent);
            expect(fs_1.default.promises.readFile).toHaveBeenCalledTimes(2);
        });
        it('should throw error when schema not found', async () => {
            const mockRegistry = { schemas: [] };
            fs_1.default.promises.readFile.mockResolvedValueOnce(JSON.stringify(mockRegistry));
            await expect((0, schemaRegistry_1.getSchemaContent)('nonexistent')).rejects.toThrow('Schema not found');
        });
    });
    describe('addSchema', () => {
        it('should add new schema successfully', async () => {
            const mockRegistry = { schemas: [] };
            const schemaInfo = {
                id: 'new-schema',
                name: 'New Schema',
                description: 'Test schema'
            };
            const schemaContent = 'type Node { id: String! }';
            fs_1.default.promises.readFile.mockResolvedValueOnce(JSON.stringify(mockRegistry));
            fs_1.default.promises.writeFile.mockResolvedValue();
            fs_1.default.promises.mkdir.mockResolvedValue();
            const result = await addSchema(schemaInfo, schemaContent);
            expect(result.id).toBe('new-schema');
            expect(result.name).toBe('New Schema');
            expect(fs_1.default.promises.writeFile).toHaveBeenCalledTimes(2); // Registry + schema file
            expect(fs_1.default.promises.mkdir).toHaveBeenCalled();
        });
        it('should throw error when schema ID already exists', async () => {
            const mockRegistry = {
                schemas: [{ id: 'existing-schema', name: 'Existing' }]
            };
            const schemaInfo = { id: 'existing-schema', name: 'Duplicate' };
            fs_1.default.promises.readFile.mockResolvedValueOnce(JSON.stringify(mockRegistry));
            await expect(addSchema(schemaInfo, 'content')).rejects.toThrow('Schema ID already exists');
        });
        it('should handle production schema marking', async () => {
            const mockRegistry = {
                schemas: [{ id: 'old-prod', is_production: true }]
            };
            const schemaInfo = {
                id: 'new-prod',
                name: 'New Production',
                is_production: true
            };
            fs_1.default.promises.readFile.mockResolvedValueOnce(JSON.stringify(mockRegistry));
            fs_1.default.promises.writeFile.mockResolvedValue();
            fs_1.default.promises.mkdir.mockResolvedValue();
            const result = await addSchema(schemaInfo, 'content');
            expect(result.is_production).toBe(true);
            // Should have written registry with old production unmarked
            const registryCall = fs_1.default.promises.writeFile.mock.calls.find((call) => call[0].includes('schema_registry.json'));
            const writtenRegistry = JSON.parse(registryCall[1]);
            const oldProdSchema = writtenRegistry.schemas.find((s) => s.id === 'old-prod');
            expect(oldProdSchema.is_production).toBe(false);
        });
    });
    describe('updateSchema', () => {
        it('should update schema metadata successfully', async () => {
            const mockRegistry = {
                schemas: [{ id: 'schema1', name: 'Old Name', path: 'schemas/test.graphql' }]
            };
            const updates = { name: 'New Name', description: 'Updated description' };
            fs_1.default.promises.readFile.mockResolvedValueOnce(JSON.stringify(mockRegistry));
            fs_1.default.promises.writeFile.mockResolvedValue();
            const result = await updateSchema('schema1', updates);
            expect(result.name).toBe('New Name');
            expect(result.description).toBe('Updated description');
            expect(result.updated_at).toBeDefined();
            expect(fs_1.default.promises.writeFile).toHaveBeenCalledWith(expect.stringContaining('schema_registry.json'), expect.any(String), 'utf8');
        });
        it('should update schema content when provided', async () => {
            const mockRegistry = {
                schemas: [{ id: 'schema1', name: 'Test', path: 'schemas/test.graphql' }]
            };
            const updates = { name: 'Updated' };
            const newContent = 'type UpdatedNode { id: String! }';
            fs_1.default.promises.readFile.mockResolvedValueOnce(JSON.stringify(mockRegistry));
            fs_1.default.promises.writeFile.mockResolvedValue();
            await updateSchema('schema1', updates, newContent);
            expect(fs_1.default.promises.writeFile).toHaveBeenCalledTimes(2); // Registry + content
            expect(fs_1.default.promises.writeFile).toHaveBeenCalledWith(expect.stringContaining('schemas/test.graphql'), newContent, 'utf8');
        });
        it('should throw error when schema does not exist', async () => {
            const mockRegistry = { schemas: [] };
            fs_1.default.promises.readFile.mockResolvedValueOnce(JSON.stringify(mockRegistry));
            await expect(updateSchema('nonexistent', {})).rejects.toThrow('Schema not found');
        });
    });
});
