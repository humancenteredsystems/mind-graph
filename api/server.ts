// Load centralized configuration (which loads dotenv once)
import config from './config';
import express, { Request, Response, NextFunction, RequestHandler } from 'express';

// Import route modules
import systemRoutes from './routes/system';
import graphqlRoutes from './routes/graphql';
import schemaRoutes from './routes/schema';
import adminRoutes from './routes/admin';
import adminTestRoutes from './routes/adminTest';
import adminGitHubRoutes from './routes/adminGitHub';
import diagnosticRoutes from './routes/diagnostic';
import hierarchyRoutes from './routes/hierarchy';
import tenantRoutes from './routes/tenants';

// Import middleware
import { setTenantContext, ensureTenant, validateTenantAccess } from './middleware/tenantContext';

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

const app = express();

// Add a simple logging middleware to see incoming requests
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[INCOMING REQUEST] ${req.method} ${req.url}`);
  next();
});

const PORT = config.port;

// The config module already validates DGRAPH_BASE_URL, so no need to check again

// Middleware
app.use(express.json()); // Parse JSON bodies

// CORS Middleware - Allow specified origins or all (*)
const corsMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const allowedOrigin = config.corsOrigin;
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
app.get('/', (req: Request, res: Response) => {
  res.send('MakeItMakeSense.io API is running!');
});

// Mount system routes FIRST (before tenant middleware)
// System routes don't need tenant context and should be accessible without tenant validation
app.use('/api', systemRoutes);

// Tenant Context Middleware - Add tenant context to remaining API requests
// Apply tenant middleware to all other API routes
app.use('/api', setTenantContext);
app.use('/api', validateTenantAccess);
// Note: ensureTenant is applied selectively in routes that need it

// Mount other route modules that require tenant context
// Mount critical public routes first to avoid admin middleware conflicts
app.use('/api', hierarchyRoutes);
app.use('/api', graphqlRoutes);
app.use('/api', schemaRoutes);
app.use('/api', diagnosticRoutes);
app.use('/api', tenantRoutes);
// Mount admin routes last to prevent conflicts with public endpoints
app.use('/api', adminRoutes);
app.use('/api', adminTestRoutes);
app.use('/api/admin/github', adminGitHubRoutes);

export default app;

// Start the server only if this file is run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`API server listening on port ${PORT}`);
    console.log(`Multi-tenant mode: ${config.enableMultiTenant ? 'ENABLED' : 'DISABLED'}`);
  });
}
