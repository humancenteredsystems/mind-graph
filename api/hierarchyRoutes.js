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
  const id = parseInt(idParam, 10);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid hierarchy ID: must be an integer.' });
  }

  const query = `
    query ($id: Int!) { # Changed from ID! to Int!
      queryHierarchy(filter: { id: { eq: $id } }) {
        id
        name
      }
    }
  `;
  try {
    const data = await executeGraphQL(query, { id }); // id is now an integer
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
  const id = parseInt(idParam, 10);
  const { name } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid hierarchy ID: must be an integer.' });
  }
  if (!name) {
    return res.status(400).json({ error: 'Missing required field: name' });
  }
  const mutation = `
    mutation ($id: Int!, $name: String!) { # Parameterize query
      updateHierarchy(input: { filter: { id: { eq: $id } }, set: { name: $name } }) {
        hierarchy {
          id
          name
        }
      }
    }
  `;
  try {
    const data = await executeGraphQL(mutation, { id, name }); // Pass id as integer
    const hier = data.updateHierarchy.hierarchy[0];
    return res.json(hier);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete a hierarchy
router.delete('/hierarchy/:id', async (req, res) => {
  const idParam = req.params.id;
  const id = parseInt(idParam, 10);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid hierarchy ID: must be an integer.' });
  }
  const mutation = `
    mutation ($id: Int!) { # Parameterize query
      deleteHierarchy(filter: { id: { eq: $id } }) {
        msg
        numUids
      }
    }
  `;
  try {
    const data = await executeGraphQL(mutation, { id }); // Pass id as integer
    return res.json(data.deleteHierarchy);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// TODO: Add CRUD routes for HierarchyLevel, HierarchyLevelType, HierarchyAssignment

module.exports = router;
