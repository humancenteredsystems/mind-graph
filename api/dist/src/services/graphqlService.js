"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphQLService = void 0;
const adaptiveTenantFactory_1 = require("../../services/adaptiveTenantFactory");
const errorHandler_1 = require("../utils/errorHandler");
const logger_1 = require("../utils/logger");
class GraphQLService {
    /**
     * Execute a GraphQL query with automatic tenant context and error handling
     */
    static async executeQuery(req, query, variables = {}, options = {}) {
        const { context = 'GRAPHQL', logQuery = false, logResult = false } = options;
        try {
            const tenantClient = await adaptiveTenantFactory_1.adaptiveTenantFactory.createTenantFromContext(req.tenantContext);
            if (logQuery) {
                const queryPreview = query.substring(0, 100).replace(/\s+/g, ' ');
                logger_1.logger.debug(`[${context}] Executing query: ${queryPreview}...`, { variables });
            }
            const result = await tenantClient.executeGraphQL(query, variables);
            if (logResult) {
                logger_1.logger.debug(`[${context}] Query result received`, { hasData: !!result });
            }
            return result;
        }
        catch (error) {
            logger_1.logger.error(`[${context}] GraphQL execution failed: ${error}`, { query: query.substring(0, 100) });
            throw error;
        }
    }
    /**
     * Execute a GraphQL query and send the response, with error handling
     */
    static async executeAndRespond(req, res, query, variables = {}, options = {}) {
        try {
            const result = await this.executeQuery(req, query, variables, options);
            res.json(result);
        }
        catch (error) {
            errorHandler_1.ErrorHandler.handleError(error, res, options.context);
        }
    }
    /**
     * Execute a GraphQL mutation with input enrichment and error handling
     */
    static async executeMutation(req, mutation, variables = {}, options = {}) {
        return this.executeQuery(req, mutation, variables, {
            ...options,
            context: options.context || 'MUTATION'
        });
    }
    /**
     * Execute a GraphQL mutation and send the response
     */
    static async executeMutationAndRespond(req, res, mutation, variables = {}, options = {}) {
        try {
            const result = await this.executeMutation(req, mutation, variables, options);
            res.status(200).json(result);
        }
        catch (error) {
            errorHandler_1.ErrorHandler.handleError(error, res, options.context || 'MUTATION');
        }
    }
    /**
     * Validate required fields in request body
     */
    static validateRequiredFields(body, requiredFields) {
        const missingFields = requiredFields.filter(field => !body[field]);
        return {
            isValid: missingFields.length === 0,
            missingFields
        };
    }
    /**
     * Send validation error response
     */
    static sendValidationError(res, missingFields) {
        errorHandler_1.ErrorHandler.sendError(res, `Missing required fields: ${missingFields.join(', ')}`, 400);
    }
}
exports.GraphQLService = GraphQLService;
//# sourceMappingURL=graphqlService.js.map