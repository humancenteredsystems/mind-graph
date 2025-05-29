/**
 * Executes a GraphQL query or mutation against the Dgraph endpoint.
 * @param query - The GraphQL query string.
 * @param variables - An object containing variables for the query.
 * @param namespace - Optional namespace for multi-tenant support.
 * @returns A promise that resolves with the 'data' part of the GraphQL response.
 * @throws Error if the request fails or if GraphQL errors are returned.
 */
export declare function executeGraphQL<T = any>(query: string, variables?: Record<string, any>, namespace?: string | null): Promise<T>;
export { executeGraphQL as default };
//# sourceMappingURL=dgraphClient.d.ts.map