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
    return await adaptiveTenantFactory_1.adaptiveTenantFactory.createTenantFromContext(req.tenantContext);
}
// Simple error helper
const errorResponse = (res, message, status = 500) => {
    res.status(status).json({ error: message });
};
// --- Hierarchy CRUD ---
// Get all hierarchies
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
    catch (err) {
        errorResponse(res, err.message);
    }
});
// Admin-protected routes
router.use(auth_1.authenticateAdmin);
// Create a new hierarchy
router.post('/hierarchy', async (req, res) => {
    const { id, name } = req.body;
    if (!id || !name) {
        errorResponse(res, 'Missing required fields: id and name', 400);
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
    catch (err) {
        errorResponse(res, err.message);
    }
});
// Get hierarchy by ID
router.get('/hierarchy/:id', async (req, res) => {
    const { id } = req.params;
    // Basic validation for non-empty string ID
    if (!id || !id.trim()) {
        errorResponse(res, 'Invalid hierarchy ID: must be a non-empty string.', 400);
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
            errorResponse(res, 'Hierarchy not found', 404);
            return;
        }
        res.json(hier);
    }
    catch (err) {
        errorResponse(res, err.message);
    }
});
// Update an existing hierarchy
router.put('/hierarchy/:id', async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!id || !id.trim()) {
        errorResponse(res, 'Invalid hierarchy ID: must be a non-empty string.', 400);
        return;
    }
    if (!name) {
        errorResponse(res, 'Missing required field: name', 400);
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
    catch (err) {
        errorResponse(res, err.message);
    }
});
// Delete a hierarchy
router.delete('/hierarchy/:id', async (req, res) => {
    const { id } = req.params;
    if (!id || !id.trim()) {
        errorResponse(res, 'Invalid hierarchy ID: must be a non-empty string.', 400);
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
    catch (err) {
        errorResponse(res, err.message);
    }
});
// --- Hierarchy Level CRUD ---
// Create a new hierarchy level
router.post('/hierarchy/level', async (req, res) => {
    const { hierarchyId, levelNumber, label } = req.body;
    if (!hierarchyId || !levelNumber || !label) {
        errorResponse(res, 'Missing required fields: hierarchyId, levelNumber, and label', 400);
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
    catch (err) {
        errorResponse(res, err.message);
    }
});
// Update an existing hierarchy level
router.put('/hierarchy/level/:id', async (req, res) => {
    const { id } = req.params;
    const { label } = req.body;
    if (!id || !id.trim()) {
        errorResponse(res, 'Invalid level ID: must be a non-empty string.', 400);
        return;
    }
    if (!label) {
        errorResponse(res, 'Missing required field: label', 400);
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
    catch (err) {
        errorResponse(res, err.message);
    }
});
// Delete a hierarchy level
router.delete('/hierarchy/level/:id', async (req, res) => {
    const { id } = req.params;
    if (!id || !id.trim()) {
        errorResponse(res, 'Invalid level ID: must be a non-empty string.', 400);
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
    catch (err) {
        errorResponse(res, err.message);
    }
});
// --- Hierarchy Assignment CRUD ---
// Create a new hierarchy assignment
router.post('/hierarchy/assignment', async (req, res) => {
    const { nodeId, hierarchyId, levelId } = req.body;
    if (!nodeId || !hierarchyId || !levelId) {
        errorResponse(res, 'Missing required fields: nodeId, hierarchyId, and levelId', 400);
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
    catch (err) {
        errorResponse(res, err.message);
    }
});
// Delete a hierarchy assignment
router.delete('/hierarchy/assignment/:id', async (req, res) => {
    const { id } = req.params;
    if (!id || !id.trim()) {
        errorResponse(res, 'Invalid assignment ID: must be a non-empty string.', 400);
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
    catch (err) {
        errorResponse(res, err.message);
    }
});
exports.default = router;
//# sourceMappingURL=hierarchy.js.map