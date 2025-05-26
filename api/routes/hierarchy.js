const express = require('express');
const { DgraphTenantFactory } = require('../services/dgraphTenant');
const { authenticateAdmin } = require('../middleware/auth');
const router = express.Router();

// Helper function to get tenant-aware Dgraph client from request context
function getTenantClient(req) {
  return DgraphTenantFactory.createTenantFromContext(req.tenantContext);
}

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
    const tenantClient = getTenantClient(req);
    const data = await tenantClient.executeGraphQL(query);
    return res.json(data.queryHierarchy);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin-protected routes
router.use(authenticateAdmin);

// Create a new hierarchy
router.post('/hierarchy', async (req, res) => {
  const { id, name } = req.body;
  if (!id || !name) {
    return res.status(400).json({ error: 'Missing required fields: id and name' });
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
    const tenantClient = getTenantClient(req);
    const data = await tenantClient.executeGraphQL(mutation, { input: [{ id, name }] });
    const hier = data.addHierarchy.hierarchy[0];
    return res.status(201).json(hier);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Get hierarchy by ID
router.get('/hierarchy/:id', async (req, res) => {
  const idParam = req.params.id;
  const id = idParam; // ID is now a string

  // Basic validation for non-empty string ID
  if (typeof id !== 'string' || !id.trim()) {
    return res.status(400).json({ error: 'Invalid hierarchy ID: must be a non-empty string.' });
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
    const tenantClient = getTenantClient(req);
    const data = await tenantClient.executeGraphQL(query, { id });
    const hier = data.queryHierarchy[0];
    if (!hier) {
      return res.status(404).json({ error: 'Hierarchy not found' });
    }
    return res.json(hier);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Update an existing hierarchy
router.put('/hierarchy/:id', async (req, res) => {
  const idParam = req.params.id;
  const id = idParam; // ID is now a string
  const { name } = req.body;

  if (typeof id !== 'string' || !id.trim()) {
    return res.status(400).json({ error: 'Invalid hierarchy ID: must be a non-empty string.' });
  }
  if (!name) {
    return res.status(400).json({ error: 'Missing required field: name' });
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
    const tenantClient = getTenantClient(req);
    const data = await tenantClient.executeGraphQL(mutation, { id, name });
    const hier = data.updateHierarchy.hierarchy[0];
    return res.json(hier);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete a hierarchy
router.delete('/hierarchy/:id', async (req, res) => {
  const idParam = req.params.id;
  const id = idParam; // ID is now a string

  if (typeof id !== 'string' || !id.trim()) {
    return res.status(400).json({ error: 'Invalid hierarchy ID: must be a non-empty string.' });
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
    const tenantClient = getTenantClient(req);
    const data = await tenantClient.executeGraphQL(mutation, { id });
    return res.json(data.deleteHierarchy);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- Hierarchy Level CRUD ---

// Create a new hierarchy level
router.post('/hierarchy/level', async (req, res) => {
  const { hierarchyId, levelNumber, label } = req.body;
  if (!hierarchyId || !levelNumber || !label) {
    return res.status(400).json({ error: 'Missing required fields: hierarchyId, levelNumber, and label' });
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
    const tenantClient = getTenantClient(req);
    const data = await tenantClient.executeGraphQL(mutation, { input: [{ hierarchy: { id: hierarchyId }, levelNumber, label }] });
    const level = data.addHierarchyLevel.hierarchyLevel[0];
    return res.status(201).json(level);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Update an existing hierarchy level
router.put('/hierarchy/level/:id', async (req, res) => {
  const idParam = req.params.id;
  const id = idParam; // ID is now a string
  const { label } = req.body;

  if (typeof id !== 'string' || !id.trim()) {
    return res.status(400).json({ error: 'Invalid level ID: must be a non-empty string.' });
  }
  if (!label) {
    return res.status(400).json({ error: 'Missing required field: label' });
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
    const tenantClient = getTenantClient(req);
    const data = await tenantClient.executeGraphQL(mutation, { id, label });
    const level = data.updateHierarchyLevel.hierarchyLevel[0];
    return res.json(level);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete a hierarchy level
router.delete('/hierarchy/level/:id', async (req, res) => {
  const idParam = req.params.id;
  const id = idParam; // ID is now a string

  if (typeof id !== 'string' || !id.trim()) {
    return res.status(400).json({ error: 'Invalid level ID: must be a non-empty string.' });
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
    const tenantClient = getTenantClient(req);
    const data = await tenantClient.executeGraphQL(mutation, { id });
    return res.json(data.deleteHierarchyLevel);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- Hierarchy Assignment CRUD ---

// Create a new hierarchy assignment
router.post('/hierarchy/assignment', async (req, res) => {
  const { nodeId, hierarchyId, levelId } = req.body;
  if (!nodeId || !hierarchyId || !levelId) {
    return res.status(400).json({ error: 'Missing required fields: nodeId, hierarchyId, and levelId' });
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
    const tenantClient = getTenantClient(req);
    const data = await tenantClient.executeGraphQL(mutation, { input: [{ node: { id: nodeId }, hierarchy: { id: hierarchyId }, level: { id: levelId } }] });
    const assignment = data.addHierarchyAssignment.hierarchyAssignment[0];
    return res.status(201).json(assignment);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete a hierarchy assignment
router.delete('/hierarchy/assignment/:id', async (req, res) => {
  const idParam = req.params.id;
  const id = idParam; // ID is now a string

  if (typeof id !== 'string' || !id.trim()) {
    return res.status(400).json({ error: 'Invalid assignment ID: must be a non-empty string.' });
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
    const tenantClient = getTenantClient(req);
    const data = await tenantClient.executeGraphQL(mutation, { id });
    return res.json(data.deleteHierarchyAssignment);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
