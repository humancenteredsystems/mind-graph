"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const config_1 = __importDefault(require("../config"));
const schemaRegistry = __importStar(require("../services/schemaRegistry"));
const auth_1 = require("../middleware/auth");
const pushSchema_1 = require("../utils/pushSchema");
const router = express_1.default.Router();
// Use admin URL from config
const DGRAPH_ADMIN_SCHEMA_URL = config_1.default.dgraphAdminUrl;
// Helper function to push schema to the configured Dgraph instance
async function pushSchemaToConfiguredDgraph(schema, namespace = null) {
    const url = DGRAPH_ADMIN_SCHEMA_URL; // Use the derived URL
    const result = await (0, pushSchema_1.pushSchemaViaHttp)(schema, namespace || undefined, url);
    // Add verification step if needed
    return result;
}
// Schema Management Endpoints
// -------------------------------------------------------------------
// GET /api/schemas - List all available schemas
router.get('/schemas', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const schemas = await schemaRegistry.getAllSchemas();
        res.json(schemas);
    }
    catch (error) {
        const err = error;
        console.error('[SCHEMAS] Error getting schemas:', err);
        res.status(500).json({ error: err.message });
    }
});
// GET /api/schemas/:id - Get a specific schema by ID
router.get('/schemas/:id', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const schema = await schemaRegistry.getSchemaById(req.params.id);
        if (!schema) {
            res.status(404).json({ error: `Schema not found: ${req.params.id}` });
            return;
        }
        res.json(schema);
    }
    catch (error) {
        const err = error;
        console.error(`[SCHEMAS] Error getting schema ${req.params.id}:`, err);
        res.status(500).json({ error: err.message });
    }
});
// GET /api/schemas/:id/content - Get the schema content
router.get('/schemas/:id/content', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const content = await schemaRegistry.getSchemaContent(req.params.id);
        res.type('text/plain').send(content);
    }
    catch (error) {
        const err = error;
        console.error(`[SCHEMAS] Error getting schema content ${req.params.id}:`, err);
        if (err.message.includes('not found')) {
            res.status(404).json({ error: err.message });
            return;
        }
        res.status(500).json({ error: err.message });
    }
});
// POST /api/schemas - Create a new schema
router.post('/schemas', auth_1.authenticateAdmin, async (req, res) => {
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
    }
    catch (error) {
        const err = error;
        console.error('[SCHEMAS] Error creating schema:', err);
        res.status(500).json({ error: err.message });
    }
});
// PUT /api/schemas/:id - Update an existing schema
router.put('/schemas/:id', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const { updates, content } = req.body;
        if (!updates) {
            res.status(400).json({ error: 'Missing required field: updates' });
            return;
        }
        const updatedSchema = await schemaRegistry.updateSchema(req.params.id, updates, content);
        res.json(updatedSchema);
    }
    catch (error) {
        const err = error;
        console.error(`[SCHEMAS] Error updating schema ${req.params.id}:`, err);
        if (err.message.includes('not found')) {
            res.status(404).json({ error: err.message });
            return;
        }
        res.status(500).json({ error: err.message });
    }
});
// POST /api/schemas/:id/push - Push a specific schema to Dgraph
router.post('/schemas/:id/push', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const schemaId = req.params.id;
        // Extract namespace from tenant context
        const namespace = req.tenantContext?.namespace;
        // Get schema content
        const schemaContent = await schemaRegistry.getSchemaContent(schemaId);
        console.log(`[SCHEMA PUSH] Pushing schema ${schemaId} to configured Dgraph instance${namespace ? ` for namespace ${namespace}` : ''}`);
        const result = await pushSchemaToConfiguredDgraph(schemaContent, namespace || null);
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
        }
        else {
            console.error('[SCHEMA PUSH] Push failed:', result.error);
            res.status(500).json({
                success: false,
                message: `Schema ${schemaId} push encountered errors`,
                results: result
            });
        }
    }
    catch (error) {
        const err = error;
        console.error(`[SCHEMA PUSH] Error pushing schema ${req.params.id}:`, err);
        if (err.message.includes('not found')) {
            res.status(404).json({ error: err.message });
            return;
        }
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
