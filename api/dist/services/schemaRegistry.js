"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllSchemas = getAllSchemas;
exports.getSchemaById = getSchemaById;
exports.getProductionSchema = getProductionSchema;
exports.getSchemaContent = getSchemaContent;
exports.addSchema = addSchema;
exports.updateSchema = updateSchema;
/**
 * Schema Registry Module
 *
 * Provides functions for managing and accessing GraphQL schemas in the system.
 */
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
// Path to the schema registry file (relative to project root)
const REGISTRY_PATH = path_1.default.join(__dirname, '../../schemas/schema_registry.json');
/**
 * Get all schemas from the registry
 * @returns Array of schema objects
 */
async function getAllSchemas() {
    try {
        const registryContent = await fs_1.promises.readFile(REGISTRY_PATH, 'utf8');
        const registry = JSON.parse(registryContent);
        return registry.schemas || [];
    }
    catch (error) {
        console.error(`Error reading schema registry: ${error.message}`);
        throw new Error(`Failed to read schema registry: ${error.message}`);
    }
}
/**
 * Get a specific schema by ID
 * @param schemaId - The ID of the schema to retrieve
 * @returns Schema object or null if not found
 */
async function getSchemaById(schemaId) {
    try {
        const schemas = await getAllSchemas();
        return schemas.find(schema => schema.id === schemaId) || null;
    }
    catch (error) {
        console.error(`Error getting schema by ID: ${error.message}`);
        throw new Error(`Failed to get schema by ID: ${error.message}`);
    }
}
/**
 * Get the schema marked as production
 * @returns Production schema object or null if not found
 */
async function getProductionSchema() {
    try {
        const schemas = await getAllSchemas();
        return schemas.find(schema => schema.is_production === true) || null;
    }
    catch (error) {
        console.error(`Error getting production schema: ${error.message}`);
        throw new Error(`Failed to get production schema: ${error.message}`);
    }
}
/**
 * Read the schema file content
 * @param schemaId - The ID of the schema to read
 * @returns The schema file content
 */
async function getSchemaContent(schemaId) {
    try {
        const schema = await getSchemaById(schemaId);
        if (!schema) {
            throw new Error(`Schema not found: ${schemaId}`);
        }
        const schemaPath = path_1.default.join(__dirname, '../..', schema.path);
        const schemaContent = await fs_1.promises.readFile(schemaPath, 'utf8');
        return schemaContent;
    }
    catch (error) {
        console.error(`Error reading schema file: ${error.message}`);
        throw new Error(`Failed to read schema file: ${error.message}`);
    }
}
/**
 * Add a new schema to the registry
 * @param schemaInfo - Schema information object
 * @param schemaContent - The GraphQL schema content
 * @returns The newly added schema object
 */
async function addSchema(schemaInfo, schemaContent) {
    try {
        // Create a new schema object with default values
        const now = new Date().toISOString();
        const newSchema = {
            id: schemaInfo.id,
            name: schemaInfo.name,
            description: schemaInfo.description || '',
            path: schemaInfo.path || `schemas/user_schemas/${schemaInfo.owner}/${schemaInfo.id}.graphql`,
            owner: schemaInfo.owner || 'system',
            created_at: now,
            updated_at: now,
            is_template: !!schemaInfo.is_template,
            is_production: !!schemaInfo.is_production
        };
        // Read the current registry
        const registryContent = await fs_1.promises.readFile(REGISTRY_PATH, 'utf8');
        const registry = JSON.parse(registryContent);
        // Check if schema ID already exists
        if (registry.schemas.some(schema => schema.id === newSchema.id)) {
            throw new Error(`Schema ID already exists: ${newSchema.id}`);
        }
        // If this schema is marked as production, unmark any existing production schema
        if (newSchema.is_production) {
            registry.schemas = registry.schemas.map(schema => ({
                ...schema,
                is_production: schema.id === newSchema.id ? true : false
            }));
        }
        // Add the new schema to the registry
        registry.schemas.push(newSchema);
        // Write the updated registry
        await fs_1.promises.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf8');
        // Create directories if needed
        const dirPath = path_1.default.dirname(path_1.default.join(__dirname, '../..', newSchema.path));
        await fs_1.promises.mkdir(dirPath, { recursive: true });
        // Write the schema content
        await fs_1.promises.writeFile(path_1.default.join(__dirname, '../..', newSchema.path), schemaContent, 'utf8');
        return newSchema;
    }
    catch (error) {
        console.error(`Error adding schema: ${error.message}`);
        throw new Error(`Failed to add schema: ${error.message}`);
    }
}
/**
 * Update an existing schema
 * @param schemaId - The ID of the schema to update
 * @param updates - Fields to update
 * @param newContent - New schema content (if provided)
 * @returns The updated schema object
 */
async function updateSchema(schemaId, updates, newContent) {
    try {
        // Read the current registry
        const registryContent = await fs_1.promises.readFile(REGISTRY_PATH, 'utf8');
        const registry = JSON.parse(registryContent);
        // Find the schema to update
        const schemaIndex = registry.schemas.findIndex(schema => schema.id === schemaId);
        if (schemaIndex === -1) {
            throw new Error(`Schema not found: ${schemaId}`);
        }
        const schema = registry.schemas[schemaIndex];
        // Update schema metadata
        const updatedSchema = {
            ...schema,
            ...updates,
            updated_at: new Date().toISOString()
        };
        // If this schema is marked as production, unmark any existing production schema
        if (updatedSchema.is_production) {
            registry.schemas = registry.schemas.map(s => ({
                ...s,
                is_production: s.id === schemaId ? true : false
            }));
        }
        // Update the registry
        registry.schemas[schemaIndex] = updatedSchema;
        await fs_1.promises.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf8');
        // Update schema content if provided
        if (newContent) {
            await fs_1.promises.writeFile(path_1.default.join(__dirname, '../..', updatedSchema.path), newContent, 'utf8');
        }
        return updatedSchema;
    }
    catch (error) {
        console.error(`Error updating schema: ${error.message}`);
        throw new Error(`Failed to update schema: ${error.message}`);
    }
}
