import express, { Request, Response } from 'express';
import config from '../config';
import * as schemaRegistry from '../services/schemaRegistry';
import { authenticateAdmin } from '../middleware/auth';
import { pushSchemaViaHttp } from '../utils/pushSchema';
import { TenantRequest } from '../src/types';

const router = express.Router();

// Use admin URL from config
const DGRAPH_ADMIN_SCHEMA_URL = config.dgraphAdminUrl;

// Types for schema operations
interface SchemaInfo {
  id: string;
  name: string;
  description?: string;
  path?: string;
  owner?: string;
  is_template?: boolean;
  is_production?: boolean;
}

interface CreateSchemaRequest extends Request {
  body: {
    schemaInfo: SchemaInfo;
    content: string;
  };
}

interface UpdateSchemaRequest extends Request {
  body: {
    updates: Partial<SchemaInfo>;
    content?: string;
  };
  params: {
    id: string;
  };
}

interface SchemaParamsRequest extends Request {
  params: {
    id: string;
  };
}

// Helper function to push schema to the configured Dgraph instance
async function pushSchemaToConfiguredDgraph(schema: string, namespace: string | null = null) {
  const url = DGRAPH_ADMIN_SCHEMA_URL; // Use the derived URL
  const result = await pushSchemaViaHttp(schema, namespace, url);

  // Add verification step if needed

  return result;
}

// Schema Management Endpoints
// -------------------------------------------------------------------

// GET /api/schemas - List all available schemas
router.get('/schemas', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const schemas = await schemaRegistry.getAllSchemas();
    res.json(schemas);
  } catch (error: any) {
    console.error('[SCHEMAS] Error getting schemas:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/schemas/:id - Get a specific schema by ID
router.get('/schemas/:id', authenticateAdmin, async (req: SchemaParamsRequest, res: Response): Promise<void> => {
  try {
    const schema = await schemaRegistry.getSchemaById(req.params.id);
    if (!schema) {
      res.status(404).json({ error: `Schema not found: ${req.params.id}` });
      return;
    }
    res.json(schema);
  } catch (error: any) {
    console.error(`[SCHEMAS] Error getting schema ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/schemas/:id/content - Get the schema content
router.get('/schemas/:id/content', authenticateAdmin, async (req: SchemaParamsRequest, res: Response): Promise<void> => {
  try {
    const content = await schemaRegistry.getSchemaContent(req.params.id);
    res.type('text/plain').send(content);
  } catch (error: any) {
    console.error(`[SCHEMAS] Error getting schema content ${req.params.id}:`, error);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/schemas - Create a new schema
router.post('/schemas', authenticateAdmin, async (req: CreateSchemaRequest, res: Response): Promise<void> => {
  try {
    const { schemaInfo, content } = req.body;

    if (!schemaInfo || !content) {
      res.status(400).json({ error: 'Missing required fields: schemaInfo and content' });
      return;
    }

    if (!schemaInfo.id || !schemaInfo.name) {
      res.status(400).json({ error: 'Schema must have an id and name' });
      return;
    }

    const newSchema = await schemaRegistry.addSchema(schemaInfo, content);
    res.status(201).json(newSchema);
  } catch (error: any) {
    console.error('[SCHEMAS] Error creating schema:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/schemas/:id - Update an existing schema
router.put('/schemas/:id', authenticateAdmin, async (req: UpdateSchemaRequest, res: Response): Promise<void> => {
  try {
    const { updates, content } = req.body;

    if (!updates) {
      res.status(400).json({ error: 'Missing required field: updates' });
      return;
    }

    const updatedSchema = await schemaRegistry.updateSchema(req.params.id, updates, content);
    res.json(updatedSchema);
  } catch (error: any) {
    console.error(`[SCHEMAS] Error updating schema ${req.params.id}:`, error);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/schemas/:id/push - Push a specific schema to Dgraph
router.post('/schemas/:id/push', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const schemaId = req.params.id;

    // Extract namespace from tenant context
    const namespace = (req as TenantRequest).tenantContext?.namespace;

    // Get schema content
    const schemaContent = await schemaRegistry.getSchemaContent(schemaId);

    console.log(`[SCHEMA PUSH] Pushing schema ${schemaId} to configured Dgraph instance${namespace ? ` for namespace ${namespace}` : ''}`);
    const result = await pushSchemaToConfiguredDgraph(schemaContent, namespace);

    if (result.success) {
      const schema = await schemaRegistry.getSchemaById(schemaId);
      if (schema && schema.is_production) {
        await schemaRegistry.updateSchema(schemaId, { is_production: true });
      }

      res.json({
        success: true,
        message: `Schema ${schemaId} successfully pushed to configured Dgraph instance${namespace ? ` in namespace ${namespace}` : ''}`,
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
  } catch (error: any) {
    console.error(`[SCHEMA PUSH] Error pushing schema ${req.params.id}:`, error);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;
