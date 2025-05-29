interface PushSchemaResult {
    success: boolean;
    response?: any;
    error?: any;
    namespace: string | null;
}
/**
 * Push schema to Dgraph admin endpoint with optional namespace support
 * @param schema - The GraphQL schema content
 * @param namespace - Optional namespace (e.g., '0x1')
 * @param customAdminUrl - Optional custom admin URL
 * @returns Result object with success status
 */
export declare function pushSchemaViaHttp(schema: string, namespace?: string | null, customAdminUrl?: string | null): Promise<PushSchemaResult>;
/**
 * Legacy function for backwards compatibility
 * @param adminUrl - The admin URL
 * @param schema - The schema content
 * @returns Result object
 */
export declare function pushSchemaViaHttpLegacy(adminUrl: string, schema: string): Promise<PushSchemaResult>;
export {};
//# sourceMappingURL=pushSchema.d.ts.map