"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adaptiveTenantFactory_1 = require("../services/adaptiveTenantFactory");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Helper function to get tenant-aware Dgraph client from request context
async function getTenantClient(req) {
    // Convert TenantContext to UserContext format expected by adaptiveTenantFactory
    const userContext = req.tenantContext ? {
        namespace: req.tenantContext.namespace,
        tenantId: req.tenantContext.tenantId
    } : null;
    return await adaptiveTenantFactory_1.adaptiveTenantFactory.createTenantFromContext(userContext);
}
// --- PUBLIC HIERARCHY ROUTES (No authentication required) ---
// Get all hierarchies - PUBLIC ENDPOINT
router.get('/hierarchy', async (req, res) => {
    const query = `
    query {
      queryHierarchy {
        id
        name
      }
    }
  `;
    try {
        const tenantClient = await getTenantClient(req);
        const data = await tenantClient.executeGraphQL(query);
        res.json(data.queryHierarchy);
    }
    catch (error) {
        const err = error;
        console.error('[HIERARCHY] Failed to fetch hierarchies:', error);
        res.status(500).json({ error: 'Failed to fetch hierarchies', details: err.message });
    }
});
// --- ADMIN-PROTECTED HIERARCHY ROUTES ---
// Create a new hierarchy
router.post('/hierarchy', auth_1.authenticateAdmin, async (req, res) => {
    const { id, name } = req.body;
    if (!id || !name) {
        res.status(400).json({ error: 'Missing required fields: id and name' });
        return;
    }
    const mutation = `
    mutation ($input: [AddHierarchyInput!]!) {
      addHierarchy(input: $input) {
        hierarchy {
          id
          name
        }
      }
    }
  `;
    try {
        const tenantClient = await getTenantClient(req);
        const data = await tenantClient.executeGraphQL(mutation, { input: [{ id, name }] });
        const hier = data.addHierarchy.hierarchy[0];
        res.status(201).json(hier);
    }
    catch (error) {
        const err = error;
        console.error('[HIERARCHY] Failed to create hierarchy:', error);
        res.status(500).json({ error: 'Failed to create hierarchy', details: err.message });
    }
});
// Get hierarchy by ID
router.get('/hierarchy/:id', auth_1.authenticateAdmin, async (req, res) => {
    const idParam = req.params.id;
    const id = idParam; // ID is now a string
    // Basic validation for non-empty string ID
    if (typeof id !== 'string' || !id.trim()) {
        res.status(400).json({ error: 'Invalid hierarchy ID: must be a non-empty string.' });
        return;
    }
    const query = `
    query ($id: ID!) {
      queryHierarchy(filter: { id: { eq: $id } }) {
        id
        name
      }
    }
  `;
    try {
        const tenantClient = await getTenantClient(req);
        const data = await tenantClient.executeGraphQL(query, { id });
        const hier = data.queryHierarchy[0];
        if (!hier) {
            res.status(404).json({ error: 'Hierarchy not found' });
            return;
        }
        res.json(hier);
    }
    catch (error) {
        const err = error;
        console.error('[HIERARCHY] Failed to fetch hierarchy:', error);
        res.status(500).json({ error: 'Failed to fetch hierarchy', details: err.message });
    }
});
// Update an existing hierarchy
router.put('/hierarchy/:id', auth_1.authenticateAdmin, async (req, res) => {
    const idParam = req.params.id;
    const id = idParam; // ID is now a string
    const { name } = req.body;
    if (typeof id !== 'string' || !id.trim()) {
        res.status(400).json({ error: 'Invalid hierarchy ID: must be a non-empty string.' });
        return;
    }
    if (!name) {
        res.status(400).json({ error: 'Missing required field: name' });
        return;
    }
    const mutation = `
    mutation ($id: ID!, $name: String!) {
      updateHierarchy(input: { filter: { id: { eq: $id } }, set: { name: $name } }) {
        hierarchy {
          id
          name
        }
      }
    }
  `;
    try {
        const tenantClient = await getTenantClient(req);
        const data = await tenantClient.executeGraphQL(mutation, { id, name });
        const hier = data.updateHierarchy.hierarchy[0];
        res.json(hier);
    }
    catch (error) {
        const err = error;
        console.error('[HIERARCHY] Failed to update hierarchy:', error);
        res.status(500).json({ error: 'Failed to update hierarchy', details: err.message });
    }
});
// Delete a hierarchy
router.delete('/hierarchy/:id', auth_1.authenticateAdmin, async (req, res) => {
    const idParam = req.params.id;
    const id = idParam; // ID is now a string
    if (typeof id !== 'string' || !id.trim()) {
        res.status(400).json({ error: 'Invalid hierarchy ID: must be a non-empty string.' });
        return;
    }
    const mutation = `
    mutation ($id: ID!) {
      deleteHierarchy(filter: { id: { eq: $id } }) {
        msg
        numUids
      }
    }
  `;
    try {
        const tenantClient = await getTenantClient(req);
        const data = await tenantClient.executeGraphQL(mutation, { id });
        res.json(data.deleteHierarchy);
    }
    catch (error) {
        const err = error;
        console.error('[HIERARCHY] Failed to delete hierarchy:', error);
        res.status(500).json({ error: 'Failed to delete hierarchy', details: err.message });
    }
});
// --- Hierarchy Level CRUD ---
// Create a new hierarchy level
router.post('/hierarchy/level', auth_1.authenticateAdmin, async (req, res) => {
    const { hierarchyId, levelNumber, label } = req.body;
    if (!hierarchyId || !levelNumber || !label) {
        res.status(400).json({ error: 'Missing required fields: hierarchyId, levelNumber, and label' });
        return;
    }
    const mutation = `
    mutation ($input: [AddHierarchyLevelInput!]!) {
      addHierarchyLevel(input: $input) {
        hierarchyLevel {
          id
          levelNumber
          label
        }
      }
    }
  `;
    try {
        const tenantClient = await getTenantClient(req);
        const data = await tenantClient.executeGraphQL(mutation, { input: [{ hierarchy: { id: hierarchyId }, levelNumber, label }] });
        const level = data.addHierarchyLevel.hierarchyLevel[0];
        res.status(201).json(level);
    }
    catch (error) {
        const err = error;
        console.error('[HIERARCHY] Failed to create hierarchy level:', error);
        res.status(500).json({ error: 'Failed to create hierarchy level', details: err.message });
    }
});
// Update an existing hierarchy level
router.put('/hierarchy/level/:id', auth_1.authenticateAdmin, async (req, res) => {
    const idParam = req.params.id;
    const id = idParam; // ID is now a string
    const { label } = req.body;
    if (typeof id !== 'string' || !id.trim()) {
        res.status(400).json({ error: 'Invalid level ID: must be a non-empty string.' });
        return;
    }
    if (!label) {
        res.status(400).json({ error: 'Missing required field: label' });
        return;
    }
    const mutation = `
    mutation ($id: ID!, $label: String!) {
      updateHierarchyLevel(input: { filter: { id: { eq: $id } }, set: { label: $label } }) {
        hierarchyLevel {
          id
          label
        }
      }
    }
  `;
    try {
        const tenantClient = await getTenantClient(req);
        const data = await tenantClient.executeGraphQL(mutation, { id, label });
        const level = data.updateHierarchyLevel.hierarchyLevel[0];
        res.json(level);
    }
    catch (error) {
        const err = error;
        console.error('[HIERARCHY] Failed to update hierarchy level:', error);
        res.status(500).json({ error: 'Failed to update hierarchy level', details: err.message });
    }
});
// Delete a hierarchy level
router.delete('/hierarchy/level/:id', auth_1.authenticateAdmin, async (req, res) => {
    const idParam = req.params.id;
    const id = idParam; // ID is now a string
    if (typeof id !== 'string' || !id.trim()) {
        res.status(400).json({ error: 'Invalid level ID: must be a non-empty string.' });
        return;
    }
    const mutation = `
    mutation ($id: ID!) {
      deleteHierarchyLevel(filter: { id: { eq: $id } }) {
        msg
        numUids
      }
    }
  `;
    try {
        const tenantClient = await getTenantClient(req);
        const data = await tenantClient.executeGraphQL(mutation, { id });
        res.json(data.deleteHierarchyLevel);
    }
    catch (error) {
        const err = error;
        console.error('[HIERARCHY] Failed to delete hierarchy level:', error);
        res.status(500).json({ error: 'Failed to delete hierarchy level', details: err.message });
    }
});
// --- Hierarchy Assignment CRUD ---
// Create a new hierarchy assignment
router.post('/hierarchy/assignment', auth_1.authenticateAdmin, async (req, res) => {
    const { nodeId, hierarchyId, levelId } = req.body;
    if (!nodeId || !hierarchyId || !levelId) {
        res.status(400).json({ error: 'Missing required fields: nodeId, hierarchyId, and levelId' });
        return;
    }
    const mutation = `
    mutation ($input: [AddHierarchyAssignmentInput!]!) {
      addHierarchyAssignment(input: $input) {
        hierarchyAssignment {
          id
          node { id label }
          hierarchy { id name }
          level { id label levelNumber }
        }
      }
    }
  `;
    try {
        const tenantClient = await getTenantClient(req);
        const data = await tenantClient.executeGraphQL(mutation, { input: [{ node: { id: nodeId }, hierarchy: { id: hierarchyId }, level: { id: levelId } }] });
        const assignment = data.addHierarchyAssignment.hierarchyAssignment[0];
        res.status(201).json(assignment);
    }
    catch (error) {
        const err = error;
        console.error('[HIERARCHY] Failed to create hierarchy assignment:', error);
        res.status(500).json({ error: 'Failed to create hierarchy assignment', details: err.message });
    }
});
// Delete a hierarchy assignment
router.delete('/hierarchy/assignment/:id', auth_1.authenticateAdmin, async (req, res) => {
    const idParam = req.params.id;
    const id = idParam; // ID is now a string
    if (typeof id !== 'string' || !id.trim()) {
        res.status(400).json({ error: 'Invalid assignment ID: must be a non-empty string.' });
        return;
    }
    const mutation = `
    mutation ($id: ID!) {
      deleteHierarchyAssignment(filter: { id: { eq: $id } }) {
        msg
        numUids
      }
    }
  `;
    try {
        const tenantClient = await getTenantClient(req);
        const data = await tenantClient.executeGraphQL(mutation, { id });
        res.json(data.deleteHierarchyAssignment);
    }
    catch (error) {
        const err = error;
        console.error('[HIERARCHY] Failed to delete hierarchy assignment:', error);
        res.status(500).json({ error: 'Failed to delete hierarchy assignment', details: err.message });
    }
});
exports.default = router;
