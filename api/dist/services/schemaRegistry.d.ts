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
interface SchemaUpdateFields {
    name?: string;
    description?: string;
    path?: string;
    owner?: string;
    is_template?: boolean;
    is_production?: boolean;
}
/**
 * Get all schemas from the registry
 * @returns Array of schema objects
 */
export declare function getAllSchemas(): Promise<Schema[]>;
/**
 * Get a specific schema by ID
 * @param schemaId - The ID of the schema to retrieve
 * @returns Schema object or null if not found
 */
export declare function getSchemaById(schemaId: string): Promise<Schema | null>;
/**
 * Get the schema marked as production
 * @returns Production schema object or null if not found
 */
export declare function getProductionSchema(): Promise<Schema | null>;
/**
 * Read the schema file content
 * @param schemaId - The ID of the schema to read
 * @returns The schema file content
 */
export declare function getSchemaContent(schemaId: string): Promise<string>;
/**
 * Add a new schema to the registry
 * @param schemaInfo - Schema information object
 * @param schemaContent - The GraphQL schema content
 * @returns The newly added schema object
 */
export declare function addSchema(schemaInfo: SchemaInfo, schemaContent: string): Promise<Schema>;
/**
 * Update an existing schema
 * @param schemaId - The ID of the schema to update
 * @param updates - Fields to update
 * @param newContent - New schema content (if provided)
 * @returns The updated schema object
 */
export declare function updateSchema(schemaId: string, updates: SchemaUpdateFields, newContent?: string): Promise<Schema>;
export {};
//# sourceMappingURL=schemaRegistry.d.ts.map