import { Request, Response } from 'express';
export interface GraphQLExecutionOptions {
    context?: string;
    logQuery?: boolean;
    logResult?: boolean;
}
export declare class GraphQLService {
    /**
     * Execute a GraphQL query with automatic tenant context and error handling
     */
    static executeQuery<T = any>(req: Request, query: string, variables?: Record<string, any>, options?: GraphQLExecutionOptions): Promise<T>;
    /**
     * Execute a GraphQL query and send the response, with error handling
     */
    static executeAndRespond<T = any>(req: Request, res: Response, query: string, variables?: Record<string, any>, options?: GraphQLExecutionOptions): Promise<void>;
    /**
     * Execute a GraphQL mutation with input enrichment and error handling
     */
    static executeMutation<T = any>(req: Request, mutation: string, variables?: Record<string, any>, options?: GraphQLExecutionOptions): Promise<T>;
    /**
     * Execute a GraphQL mutation and send the response
     */
    static executeMutationAndRespond<T = any>(req: Request, res: Response, mutation: string, variables?: Record<string, any>, options?: GraphQLExecutionOptions): Promise<void>;
    /**
     * Validate required fields in request body
     */
    static validateRequiredFields(body: any, requiredFields: string[]): {
        isValid: boolean;
        missingFields: string[];
    };
    /**
     * Send validation error response
     */
    static sendValidationError(res: Response, missingFields: string[]): void;
}
//# sourceMappingURL=graphqlService.d.ts.map