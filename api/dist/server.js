"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
// Load centralized configuration (which loads dotenv once)
const config_1 = __importDefault(require("./config"));
const express_1 = __importDefault(require("express"));
const logger_1 = require("./src/utils/logger");
const errorHandler_1 = require("./src/utils/errorHandler");
// --- Global Error Handlers ---
process.on('uncaughtException', (err, origin) => {
    logger_1.logger.error('[GLOBAL] Uncaught Exception', { error: err.message, stack: err.stack, origin });
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    logger_1.logger.error('[GLOBAL] Unhandled Rejection', { reason, promise });
    process.exit(1);
});
// --- End Global Error Handlers ---
const app = (0, express_1.default)();
// Request logging middleware
app.use((req, res, next) => {
    logger_1.logger.info(`${req.method} ${req.url}`, {
        userAgent: req.get('User-Agent'),
        ip: req.ip
    });
    next();
});
const PORT = config_1.default.port;
// Middleware
app.use(express_1.default.json()); // Parse JSON bodies
// CORS Middleware - Allow specified origins or all (*)
app.use((req, res, next) => {
    const allowedOrigin = config_1.default.corsOrigin;
    res.set('Access-Control-Allow-Origin', allowedOrigin);
    // Allow common methods and headers needed for GraphQL/API requests
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Hierarchy-Id, X-Tenant-Id');
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});
// Root endpoint
app.get('/', (req, res) => {
    res.send('MakeItMakeSense.io API is running!');
});
// Mount system routes FIRST (before tenant middleware)
// System routes don't need tenant context and should be accessible without tenant validation
const system_1 = __importDefault(require("./routes/system"));
app.use('/api', system_1.default);
// Tenant Context Middleware - Add tenant context to remaining API requests
const tenantContext_1 = require("./middleware/tenantContext");
// Apply tenant middleware to all other API routes
app.use('/api', tenantContext_1.setTenantContext);
app.use('/api', tenantContext_1.validateTenantAccess);
// Note: ensureTenant is applied selectively in routes that need it
// Mount other route modules that require tenant context
const graphql_1 = __importDefault(require("./routes/graphql"));
const schema_1 = __importDefault(require("./routes/schema"));
const admin_1 = __importDefault(require("./routes/admin"));
const diagnostic_1 = __importDefault(require("./routes/diagnostic"));
const hierarchy_1 = __importDefault(require("./routes/hierarchy"));
const tenants_1 = __importDefault(require("./routes/tenants"));
app.use('/api', graphql_1.default);
app.use('/api', schema_1.default);
app.use('/api', admin_1.default);
app.use('/api', diagnostic_1.default);
app.use('/api', hierarchy_1.default);
app.use('/api', tenants_1.default);
// Global error handler - must be last middleware
app.use(errorHandler_1.globalErrorHandler);
// Start the server only if this file is run directly
if (require.main === module) {
    app.listen(PORT, () => {
        logger_1.logger.info(`API server listening on port ${PORT}`);
        logger_1.logger.info(`Multi-tenant mode: ${config_1.default.enableMultiTenant ? 'ENABLED' : 'DISABLED'}`);
    });
}
module.exports = app;
//# sourceMappingURL=server.js.map