interface DgraphAdminResponse {
    success: boolean;
    data?: any;
    error?: string;
    details?: any;
}
/**
 * sendDgraphAdminRequest
 *
 * A shared helper to send JSON payloads to Dgraph admin endpoints.
 * Returns an object { success: boolean, data?: any, error?: string, details?: any }
 *
 * @param url - The full URL of the Dgraph admin endpoint (e.g., /alter or /admin/schema).
 * @param payload - The JSON payload to POST.
 * @param namespace - Optional namespace for multi-tenant operations (e.g., '0x0', '0x1').
 * @returns Promise resolving to response object
 */
export declare function sendDgraphAdminRequest(url: string, payload: any, namespace?: string | null): Promise<DgraphAdminResponse>;
export {};
//# sourceMappingURL=dgraphAdmin.d.ts.map