require('dotenv').config(); // Load environment variables from .env file

// --- Global Error Handlers ---
process.on('uncaughtException', (err, origin) => {
  console.error('[GLOBAL] Uncaught Exception:', err);
  console.error('[GLOBAL] Origin:', origin);
  // Optionally exit gracefully, but for debugging, just log for now
  // process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[GLOBAL] Unhandled Rejection at:', promise);
  console.error('[GLOBAL] Reason:', reason);
  // Optionally exit gracefully
  // process.exit(1);
});
// --- End Global Error Handlers ---

const express = require('express');
const app = express();

// Add a simple logging middleware to see incoming requests
app.use((req, res, next) => {
  console.log(`[INCOMING REQUEST] ${req.method} ${req.url}`);
  next();
});

const PORT = process.env.PORT || 3000; // Use PORT from .env or default to 3000

// Ensure DGRAPH_BASE_URL is set
if (!process.env.DGRAPH_BASE_URL) {
  console.error("FATAL ERROR: DGRAPH_BASE_URL environment variable is not set.");
  console.error("Please set DGRAPH_BASE_URL to your Dgraph instance's base URL (e.g., http://localhost:8080 or https://your-remote-dgraph.onrender.com).");
  process.exit(1);
}

// Middleware
app.use(express.json()); // Parse JSON bodies

// CORS Middleware - Allow specified origins or all (*)
app.use((req, res, next) => {
  const allowedOrigin = process.env.CORS_ORIGIN || '*';
  res.set('Access-Control-Allow-Origin', allowedOrigin);
  // Allow common methods and headers needed for GraphQL/API requests
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Hierarchy-Id');
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

// Mount route modules
const graphqlRoutes = require('./routes/graphql');
const schemaRoutes = require('./routes/schema');
const adminRoutes = require('./routes/admin');
const diagnosticRoutes = require('./routes/diagnostic');
const hierarchyRoutes = require('./routes/hierarchy');

app.use('/api', graphqlRoutes);
app.use('/api', schemaRoutes);
app.use('/api', adminRoutes);
app.use('/api', diagnosticRoutes);
app.use('/api', hierarchyRoutes);

module.exports = app;

// Start the server only if this file is run directly
if (!module.parent) {
  app.listen(PORT, () => {
    console.log(`API server listening on port ${PORT}`);
  });
}
