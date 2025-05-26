const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');
const schemaRegistry = require('../services/schemaRegistry');
const { pushSchemaViaHttp } = require('../utils/pushSchema');
const { sendDgraphAdminRequest } = require('../utils/dgraphAdmin');

// Derive Dgraph endpoint URLs from the base URL
const DGRAPH_BASE_URL = process.env.DGRAPH_BASE_URL.replace(/\/+$/, ''); // Remove trailing slash
const DGRAPH_ADMIN_SCHEMA_URL = `${DGRAPH_BASE_URL}/admin/schema`;
const DGRAPH_ALTER_URL = `${DGRAPH_BASE_URL}/alter`;

// Helper function to drop all data from the configured Dgraph instance
async function dropAllData(target) { // Keep target parameter for potential future validation/logging
  const payload = { "drop_all": true };
  const url = DGRAPH_ALTER_URL; // Use the derived URL

  console.log(`[DROP ALL] Sending drop_all to configured Dgraph at ${url}`);
  const result = await sendDgraphAdminRequest(url, payload);

  return result; // Return the single result object
}

// Helper function to push schema to the configured Dgraph instance
async function pushSchemaToConfiguredDgraph(schema) {
  const url = DGRAPH_ADMIN_SCHEMA_URL; // Use the derived URL
  const result = await pushSchemaViaHttp(schema, null, url);

  // Add verification step if needed

  return result;
}

// Admin Endpoints
// -------------------------------------------------------------------

// Endpoint to push schema directly or from registry
router.post('/admin/schema', authenticateAdmin, async (req, res) => {
  try {
    const { schema, schemaId } = req.body;

    // Determine which schema to use
    let schemaContent;

    if (schemaId) {
      console.log(`[SCHEMA PUSH] Using schema ${schemaId} from registry`);
      schemaContent = await schemaRegistry.getSchemaContent(schemaId);
    } else if (schema) {
      schemaContent = schema;
    } else {
      return res.status(400).json({ error: 'Missing required field: schema or schemaId' });
    }

    console.log('[SCHEMA PUSH] Pushing schema to configured Dgraph instance');
    const result = await pushSchemaToConfiguredDgraph(schemaContent);

    if (result.success) {
      return res.json({ success: true, results: result });
    } else {
      console.error('[SCHEMA PUSH] Push failed:', result.error);
      return res.status(500).json({ success: false, message: 'Schema push encountered errors', results: result });
    }
  } catch (err) {
    console.error('[SCHEMA PUSH] Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/dropAll - Endpoint to drop all data from Dgraph instance(s)
router.post('/admin/dropAll', authenticateAdmin, async (req, res) => {
  const { target } = req.body;

  if (!target || !['local', 'remote', 'both'].includes(target)) {
    return res.status(400).json({ error: 'Missing or invalid required field: target. Must be "local", "remote", or "both".' });
  }

  try {
    console.log(`[DROP ALL] Received request to drop data for target: ${target}`);
    const result = await dropAllData(target);

    if (result.success) {
      res.json({
        success: true,
        message: `Drop all data operation completed successfully for configured Dgraph instance`,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: `Drop all data operation encountered errors`,
        error: result.error,
        details: result.details
      });
    }
  } catch (error) {
    console.error('[DROP ALL] Error in endpoint handler:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
