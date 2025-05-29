import { Request, Response } from 'express';
import { adaptiveTenantFactory } from '../../services/adaptiveTenantFactory';
import { TenantRequest } from '../types';
import { ErrorHandler } from '../utils/errorHandler';
import { logger } from '../utils/logger';

export interface GraphQLExecutionOptions {
  context?: string;
  logQuery?: boolean;
  logResult?: boolean;
}

export class GraphQLService {
  /**
   * Execute a GraphQL query with automatic tenant context and error handling
   */
  static async executeQuery<T = any>(
    req: Request,
    query: string,
    variables: Record<string, any> = {},
    options: GraphQLExecutionOptions = {}
  ): Promise<T> {
    const { context = 'GRAPHQL', logQuery = false, logResult = false } = options;
    
    try {
      const tenantClient = await adaptiveTenantFactory.createTenantFromContext(
        (req as TenantRequest).tenantContext
      );
      
      if (logQuery) {
        const queryPreview = query.substring(0, 100).replace(/\s+/g, ' ');
        logger.debug(`[${context}] Executing query: ${queryPreview}...`, { variables });
      }
      
      const result = await tenantClient.executeGraphQL<T>(query, variables);
      
      if (logResult) {
        logger.debug(`[${context}] Query result received`, { hasData: !!result });
      }
      
      return result;
    } catch (error) {
      logger.error(`[${context}] GraphQL execution failed: ${error}`, { query: query.substring(0, 100) });
      throw error;
    }
  }

  /**
   * Execute a GraphQL query and send the response, with error handling
   */
  static async executeAndRespond<T = any>(
    req: Request,
    res: Response,
    query: string,
    variables: Record<string, any> = {},
    options: GraphQLExecutionOptions = {}
  ): Promise<void> {
    try {
      const result = await this.executeQuery<T>(req, query, variables, options);
      res.json(result);
    } catch (error) {
      ErrorHandler.handleError(error, res, options.context);
    }
  }

  /**
   * Execute a GraphQL mutation with input enrichment and error handling
   */
  static async executeMutation<T = any>(
    req: Request,
    mutation: string,
    variables: Record<string, any> = {},
    options: GraphQLExecutionOptions = {}
  ): Promise<T> {
    return this.executeQuery<T>(req, mutation, variables, {
      ...options,
      context: options.context || 'MUTATION'
    });
  }

  /**
   * Execute a GraphQL mutation and send the response
   */
  static async executeMutationAndRespond<T = any>(
    req: Request,
    res: Response,
    mutation: string,
    variables: Record<string, any> = {},
    options: GraphQLExecutionOptions = {}
  ): Promise<void> {
    try {
      const result = await this.executeMutation<T>(req, mutation, variables, options);
      res.status(200).json(result);
    } catch (error) {
      ErrorHandler.handleError(error, res, options.context || 'MUTATION');
    }
  }

  /**
   * Validate required fields in request body
   */
  static validateRequiredFields(
    body: any,
    requiredFields: string[]
  ): { isValid: boolean; missingFields: string[] } {
    const missingFields = requiredFields.filter(field => !body[field]);
    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  }

  /**
   * Send validation error response
   */
  static sendValidationError(res: Response, missingFields: string[]): void {
    const fieldWord = missingFields.length === 1 ? 'field' : 'fields';
    ErrorHandler.sendError(
      res,
      `Missing required ${fieldWord}: ${missingFields.join(', ')}`,
      400
    );
  }
}
