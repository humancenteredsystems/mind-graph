const express = require('express');
const { executeGraphQL } = require('./dgraphClient');
const router = express.Router();

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
  const apiKey = req.headers['x-admin-api-key'];
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

router.use(authenticateAdmin);

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
    const data = await executeGraphQL(query);
    return res.json(data.queryHierarchy);
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
    query ($id: ID!) { # Changed from Int! to ID!
      queryHierarchy(filter: { id: { eq: $id } }) {
        id
        name
      }
    }
  `;
  try {
    const data = await executeGraphQL(query, { id }); // id is now a string
    const hier = data.queryHierarchy[0];
    if (!hier) {
      return res.status(404).json({ error: 'Hierarchy not found' });
    }
    return res.json(hier);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Create a new hierarchy
router.post('/hierarchy', async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Missing required field: name' });
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
    const data = await executeGraphQL(mutation, { input: [{ name }] });
    const hier = data.addHierarchy.hierarchy[0];
    return res.status(201).json(hier);
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
    mutation ($id: ID!, $name: String!) { # Changed from Int! to ID!
      updateHierarchy(input: { filter: { id: { eq: $id } }, set: { name: $name } }) {
        hierarchy {
          id
          name
        }
      }
    }
  `;
  try {
    const data = await executeGraphQL(mutation, { id, name }); // Pass id as string
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
    mutation ($id: ID!) { # Changed from Int! to ID!
      deleteHierarchy(filter: { id: { eq: $id } }) {
        msg
        numUids
      }
    }
  `;
  try {
    const data = await executeGraphQL(mutation, { id }); // Pass id as string
    return res.json(data.deleteHierarchy);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// TODO: Add CRUD routes for HierarchyLevel, HierarchyLevelType, HierarchyAssignment

module.exports = router;
