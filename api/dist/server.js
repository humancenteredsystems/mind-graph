"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Load centralized configuration (which loads dotenv once)
const config_1 = __importDefault(require("./config"));
const express_1 = __importDefault(require("express"));
// Import route modules
const system_1 = __importDefault(require("./routes/system"));
const graphql_1 = __importDefault(require("./routes/graphql"));
const schema_1 = __importDefault(require("./routes/schema"));
const admin_1 = __importDefault(require("./routes/admin"));
const adminTest_1 = __importDefault(require("./routes/adminTest"));
const diagnostic_1 = __importDefault(require("./routes/diagnostic"));
const hierarchy_1 = __importDefault(require("./routes/hierarchy"));
const tenants_1 = __importDefault(require("./routes/tenants"));
// Import middleware
const tenantContext_1 = require("./middleware/tenantContext");
// --- Global Error Handlers ---
process.on('uncaughtException', (err, origin) => {
    console.error('[GLOBAL] Uncaught Exception:', err);
    console.error('[GLOBAL] Origin:', origin);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('[GLOBAL] Unhandled Rejection at:', promise);
    console.error('[GLOBAL] Reason:', reason);
});
// --- End Global Error Handlers ---
const app = (0, express_1.default)();
// Add a simple logging middleware to see incoming requests
app.use((req, res, next) => {
    console.log(`[INCOMING REQUEST] ${req.method} ${req.url}`);
    next();
});
const PORT = config_1.default.port;
// The config module already validates DGRAPH_BASE_URL, so no need to check again
// Middleware
app.use(express_1.default.json()); // Parse JSON bodies
// CORS Middleware - Allow specified origins or all (*)
const corsMiddleware = (req, res, next) => {
    const allowedOrigin = config_1.default.corsOrigin;
    res.set('Access-Control-Allow-Origin', allowedOrigin);
    // Allow common methods and headers needed for GraphQL/API requests
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Hierarchy-Id, X-Tenant-Id');
    // Allow credentials for specific origins (required by browser if frontend sends cookies/auth)
    if (allowedOrigin !== '*') {
        res.set('Access-Control-Allow-Credentials', 'true');
    }
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }
    next();
};
app.use(corsMiddleware);
// Root endpoint
app.get('/', (req, res) => {
    res.send('MakeItMakeSense.io API is running!');
});
// Mount system routes FIRST (before tenant middleware)
// System routes don't need tenant context and should be accessible without tenant validation
app.use('/api', system_1.default);
// Tenant Context Middleware - Add tenant context to remaining API requests
// Apply tenant middleware to all other API routes
app.use('/api', tenantContext_1.setTenantContext);
app.use('/api', tenantContext_1.validateTenantAccess);
// Note: ensureTenant is applied selectively in routes that need it
// Mount other route modules that require tenant context
// Mount critical public routes first to avoid admin middleware conflicts
app.use('/api', hierarchy_1.default);
app.use('/api', graphql_1.default);
app.use('/api', schema_1.default);
app.use('/api', diagnostic_1.default);
app.use('/api', tenants_1.default);
// Mount admin routes last to prevent conflicts with public endpoints
app.use('/api', admin_1.default);
app.use('/api', adminTest_1.default);
exports.default = app;
// Start the server only if this file is run directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`API server listening on port ${PORT}`);
        console.log(`Multi-tenant mode: ${config_1.default.enableMultiTenant ? 'ENABLED' : 'DISABLED'}`);
    });
}
