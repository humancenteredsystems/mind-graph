// Load environment variables ONCE when this module is first imported
require('dotenv').config();

const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Dgraph URLs
  dgraphBaseUrl: process.env.DGRAPH_BASE_URL || 'http://localhost:8080',
  dgraphAdminUrl: process.env.DGRAPH_ADMIN_URL || null, // computed if null
  dgraphZeroUrl: process.env.DGRAPH_ZERO_URL || 'http://localhost:6080',
  
  // Multi-tenant
  enableMultiTenant: process.env.ENABLE_MULTI_TENANT === 'true',
  defaultNamespace: process.env.DGRAPH_NAMESPACE_DEFAULT || '0x0',
  testNamespace: process.env.DGRAPH_NAMESPACE_TEST || '0x1',
  namespacePrefix: process.env.DGRAPH_NAMESPACE_PREFIX || '0x',
  
  // Security
  adminApiKey: process.env.ADMIN_API_KEY || null,
  
  // Storage
  tenantBackupDir: process.env.TENANT_BACKUP_DIR || './backups',
};

// Only compute admin URL if not explicitly set
if (!config.dgraphAdminUrl) {
  config.dgraphAdminUrl = `${config.dgraphBaseUrl.replace(/\/+$/, '')}/admin/schema`;
}

// Simple validation - only what's critical
if (!config.dgraphBaseUrl) {
  throw new Error('DGRAPH_BASE_URL environment variable is required');
}

module.exports = config;
