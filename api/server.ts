// Load centralized configuration (which loads dotenv once)
import config from './config';
import express from 'express';
import { logger } from './src/utils/logger';
import { globalErrorHandler } from './src/utils/errorHandler';

// --- Global Error Handlers ---
process.on('uncaughtException', (err, origin) => {
  logger.error('[GLOBAL] Uncaught Exception', { error: err.message, stack: err.stack, origin });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('[GLOBAL] Unhandled Rejection', { reason, promise });
  process.exit(1);
});
// --- End Global Error Handlers ---

const app = express();

// Request logging middleware
app.use((req: any, res: any, next: any) => {
  logger.info(`${req.method} ${req.url}`, { 
    userAgent: req.get('User-Agent'),
    ip: req.ip 
  });
  next();
});

const PORT = config.port;

// Middleware
app.use(express.json()); // Parse JSON bodies

// CORS Middleware - Allow specified origins or all (*)
app.use((req: any, res: any, next: any) => {
  const allowedOrigin = config.corsOrigin;
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
app.get('/', (req: any, res: any) => {
  res.send('MakeItMakeSense.io API is running!');
});

// Mount system routes FIRST (before tenant middleware)
// System routes don't need tenant context and should be accessible without tenant validation
import systemRoutes from './routes/system';
app.use('/api', systemRoutes);

// Tenant Context Middleware - Add tenant context to remaining API requests
import { setTenantContext, ensureTenant, validateTenantAccess } from './middleware/tenantContext';

// Apply tenant middleware to all other API routes
app.use('/api', setTenantContext);
app.use('/api', validateTenantAccess);
// Note: ensureTenant is applied selectively in routes that need it

// Mount other route modules that require tenant context
import graphqlRoutes from './routes/graphql';
import schemaRoutes from './routes/schema';
import adminRoutes from './routes/admin';
import diagnosticRoutes from './routes/diagnostic';
import hierarchyRoutes from './routes/hierarchy';
import tenantRoutes from './routes/tenants';

app.use('/api', graphqlRoutes);
app.use('/api', schemaRoutes);
app.use('/api', adminRoutes);
app.use('/api', diagnosticRoutes);
app.use('/api', hierarchyRoutes);
app.use('/api', tenantRoutes);

// Global error handler - must be last middleware
app.use(globalErrorHandler);

// Export for testing and module use - maintain CommonJS compatibility
export = app;

// Start the server only if this file is run directly
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`API server listening on port ${PORT}`);
    logger.info(`Multi-tenant mode: ${config.enableMultiTenant ? 'ENABLED' : 'DISABLED'}`);
  });
}
