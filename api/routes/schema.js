const express = require('express');
const router = express.Router();
const schemaRegistry = require('../services/schemaRegistry');
const { authenticateAdmin } = require('../middleware/auth');
const { pushSchemaViaHttp } = require('../utils/pushSchema');

// Derive Dgraph endpoint URLs from the base URL
const DGRAPH_BASE_URL = process.env.DGRAPH_BASE_URL.replace(/\/+$/, ''); // Remove trailing slash
const DGRAPH_ADMIN_SCHEMA_URL = `${DGRAPH_BASE_URL}/admin/schema`;

// Helper function to push schema to the configured Dgraph instance
async function pushSchemaToConfiguredDgraph(schema) {
  const url = DGRAPH_ADMIN_SCHEMA_URL; // Use the derived URL
  const result = await pushSchemaViaHttp(schema, null, url);

  // Add verification step if needed

  return result;
}

// Schema Management Endpoints
// -------------------------------------------------------------------

// GET /api/schemas - List all available schemas
router.get('/schemas', authenticateAdmin, async (req, res) => {
  try {
    const schemas = await schemaRegistry.getAllSchemas();
    res.json(schemas);
  } catch (error) {
    console.error('[SCHEMAS] Error getting schemas:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/schemas/:id - Get a specific schema by ID
router.get('/schemas/:id', authenticateAdmin, async (req, res) => {
  try {
    const schema = await schemaRegistry.getSchemaById(req.params.id);
    if (!schema) {
      return res.status(404).json({ error: `Schema not found: ${req.params.id}` });
    }
    res.json(schema);
  } catch (error) {
    console.error(`[SCHEMAS] Error getting schema ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/schemas/:id/content - Get the schema content
router.get('/schemas/:id/content', authenticateAdmin, async (req, res) => {
  try {
    const content = await schemaRegistry.getSchemaContent(req.params.id);
    res.type('text/plain').send(content);
  } catch (error) {
    console.error(`[SCHEMAS] Error getting schema content ${req.params.id}:`, error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/schemas - Create a new schema
router.post('/schemas', authenticateAdmin, async (req, res) => {
  try {
    const { schemaInfo, content } = req.body;

    if (!schemaInfo || !content) {
      return res.status(400).json({ error: 'Missing required fields: schemaInfo and content' });
    }

    if (!schemaInfo.id || !schemaInfo.name) {
      return res.status(400).json({ error: 'Schema must have an id and name' });
    }

    const newSchema = await schemaRegistry.addSchema(schemaInfo, content);
    res.status(201).json(newSchema);
  } catch (error) {
    console.error('[SCHEMAS] Error creating schema:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/schemas/:id - Update an existing schema
router.put('/schemas/:id', authenticateAdmin, async (req, res) => {
  try {
    const { updates, content } = req.body;

    if (!updates) {
      return res.status(400).json({ error: 'Missing required field: updates' });
    }

    const updatedSchema = await schemaRegistry.updateSchema(req.params.id, updates, content);
    res.json(updatedSchema);
  } catch (error) {
    console.error(`[SCHEMAS] Error updating schema ${req.params.id}:`, error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/schemas/:id/push - Push a specific schema to Dgraph
router.post('/schemas/:id/push', authenticateAdmin, async (req, res) => {
  try {
    const schemaId = req.params.id;

    // Get schema content
    const schemaContent = await schemaRegistry.getSchemaContent(schemaId);

    console.log(`[SCHEMA PUSH] Pushing schema ${schemaId} to configured Dgraph instance`);
    const result = await pushSchemaToConfiguredDgraph(schemaContent);

    if (result.success) {
      const schema = await schemaRegistry.getSchemaById(schemaId);
      if (schema.is_production) {
        await schemaRegistry.updateSchema(schemaId, { is_production: true });
      }

      res.json({
        success: true,
        message: `Schema ${schemaId} successfully pushed to configured Dgraph instance`,
        results: result
      });
    } else {
      console.error('[SCHEMA PUSH] Push failed:', result.error);
      res.status(500).json({
        success: false,
        message: `Schema ${schemaId} push encountered errors`,
        results: result
      });
    }
  } catch (error) {
    console.error(`[SCHEMA PUSH] Error pushing schema ${req.params.id}:`, error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
