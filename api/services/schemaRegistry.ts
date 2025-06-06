/**
 * Schema Registry Module
 * 
 * Provides functions for managing and accessing GraphQL schemas in the system.
 */
import { promises as fs } from 'fs';
import path from 'path';

// Schema registry types
interface SchemaInfo {
  id: string;
  name: string;
  description?: string;
  path?: string;
  owner?: string;
  is_template?: boolean;
  is_production?: boolean;
}

interface Schema {
  id: string;
  name: string;
  description: string;
  path: string;
  owner: string;
  created_at: string;
  updated_at: string;
  is_template: boolean;
  is_production: boolean;
}

interface SchemaRegistry {
  schemas: Schema[];
}

interface SchemaUpdateFields {
  name?: string;
  description?: string;
  path?: string;
  owner?: string;
  is_template?: boolean;
  is_production?: boolean;
}

// Path to the schema registry file (relative to project root)
const REGISTRY_PATH = path.join(__dirname, '../../schemas/schema_registry.json');

/**
 * Get all schemas from the registry
 * @returns Array of schema objects
 */
export async function getAllSchemas(): Promise<Schema[]> {
  try {
    const registryContent = await fs.readFile(REGISTRY_PATH, 'utf8');
    const registry: SchemaRegistry = JSON.parse(registryContent);
    return registry.schemas || [];
  } catch (error: any) {
    console.error(`Error reading schema registry: ${error.message}`);
    throw new Error(`Failed to read schema registry: ${error.message}`);
  }
}

/**
 * Get a specific schema by ID
 * @param schemaId - The ID of the schema to retrieve
 * @returns Schema object or null if not found
 */
export async function getSchemaById(schemaId: string): Promise<Schema | null> {
  try {
    const schemas = await getAllSchemas();
    return schemas.find(schema => schema.id === schemaId) || null;
  } catch (error: any) {
    console.error(`Error getting schema by ID: ${error.message}`);
    throw new Error(`Failed to get schema by ID: ${error.message}`);
  }
}

/**
 * Get the schema marked as production
 * @returns Production schema object or null if not found
 */
export async function getProductionSchema(): Promise<Schema | null> {
  try {
    const schemas = await getAllSchemas();
    return schemas.find(schema => schema.is_production === true) || null;
  } catch (error: any) {
    console.error(`Error getting production schema: ${error.message}`);
    throw new Error(`Failed to get production schema: ${error.message}`);
  }
}

/**
 * Read the schema file content
 * @param schemaId - The ID of the schema to read
 * @returns The schema file content
 */
export async function getSchemaContent(schemaId: string): Promise<string> {
  try {
    const schema = await getSchemaById(schemaId);
    if (!schema) {
      throw new Error(`Schema not found: ${schemaId}`);
    }
    
    const schemaPath = path.join(__dirname, '../..', schema.path);
    const schemaContent = await fs.readFile(schemaPath, 'utf8');
    return schemaContent;
  } catch (error: any) {
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
export async function addSchema(schemaInfo: SchemaInfo, schemaContent: string): Promise<Schema> {
  try {
    // Create a new schema object with default values
    const now = new Date().toISOString();
    const newSchema: Schema = {
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
    const registryContent = await fs.readFile(REGISTRY_PATH, 'utf8');
    const registry: SchemaRegistry = JSON.parse(registryContent);
    
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
    await fs.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf8');
    
    // Create directories if needed
    const dirPath = path.dirname(path.join(__dirname, '../..', newSchema.path));
    await fs.mkdir(dirPath, { recursive: true });
    
    // Write the schema content
    await fs.writeFile(path.join(__dirname, '../..', newSchema.path), schemaContent, 'utf8');
    
    return newSchema;
  } catch (error: any) {
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
export async function updateSchema(schemaId: string, updates: SchemaUpdateFields, newContent?: string): Promise<Schema> {
  try {
    // Read the current registry
    const registryContent = await fs.readFile(REGISTRY_PATH, 'utf8');
    const registry: SchemaRegistry = JSON.parse(registryContent);
    
    // Find the schema to update
    const schemaIndex = registry.schemas.findIndex(schema => schema.id === schemaId);
    if (schemaIndex === -1) {
      throw new Error(`Schema not found: ${schemaId}`);
    }
    
    const schema = registry.schemas[schemaIndex];
    
    // Update schema metadata
    const updatedSchema: Schema = {
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
    await fs.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf8');
    
    // Update schema content if provided
    if (newContent) {
      await fs.writeFile(path.join(__dirname, '../..', updatedSchema.path), newContent, 'utf8');
    }
    
    return updatedSchema;
  } catch (error: any) {
    console.error(`Error updating schema: ${error.message}`);
    throw new Error(`Failed to update schema: ${error.message}`);
  }
}
