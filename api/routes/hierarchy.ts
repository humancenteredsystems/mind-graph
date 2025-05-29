import express, { Request, Response } from 'express';
import { adaptiveTenantFactory } from '../services/adaptiveTenantFactory';
import { authenticateAdmin } from '../middleware/auth';
import { Hierarchy, HierarchyLevel, HierarchyAssignment } from '../src/types/domain';

const router = express.Router();

// Helper function to get tenant-aware Dgraph client from request context
async function getTenantClient(req: Request) {
  // Convert TenantContext to UserContext format expected by adaptiveTenantFactory
  const userContext = req.tenantContext ? {
    namespace: req.tenantContext.namespace,
    tenantId: req.tenantContext.tenantId
  } : null;
  
  return await adaptiveTenantFactory.createTenantFromContext(userContext);
}

// --- Hierarchy CRUD ---

// Get all hierarchies
router.get('/hierarchy', async (req: Request, res: Response): Promise<void> => {
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
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

// Admin-protected routes
router.use(authenticateAdmin);

// Create a new hierarchy
router.post('/hierarchy', async (req: Request, res: Response): Promise<void> => {
  const { id, name }: { id: string; name: string } = req.body;
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
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

// Get hierarchy by ID
router.get('/hierarchy/:id', async (req: Request, res: Response): Promise<void> => {
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
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

// Update an existing hierarchy
router.put('/hierarchy/:id', async (req: Request, res: Response): Promise<void> => {
  const idParam = req.params.id;
  const id = idParam; // ID is now a string
  const { name }: { name: string } = req.body;

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
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

// Delete a hierarchy
router.delete('/hierarchy/:id', async (req: Request, res: Response): Promise<void> => {
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
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

// --- Hierarchy Level CRUD ---

// Create a new hierarchy level
router.post('/hierarchy/level', async (req: Request, res: Response): Promise<void> => {
  const { hierarchyId, levelNumber, label }: { hierarchyId: string; levelNumber: number; label: string } = req.body;
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
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

// Update an existing hierarchy level
router.put('/hierarchy/level/:id', async (req: Request, res: Response): Promise<void> => {
  const idParam = req.params.id;
  const id = idParam; // ID is now a string
  const { label }: { label: string } = req.body;

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
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

// Delete a hierarchy level
router.delete('/hierarchy/level/:id', async (req: Request, res: Response): Promise<void> => {
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
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

// --- Hierarchy Assignment CRUD ---

// Create a new hierarchy assignment
router.post('/hierarchy/assignment', async (req: Request, res: Response): Promise<void> => {
  const { nodeId, hierarchyId, levelId }: { nodeId: string; hierarchyId: string; levelId: string } = req.body;
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
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

// Delete a hierarchy assignment
router.delete('/hierarchy/assignment/:id', async (req: Request, res: Response): Promise<void> => {
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
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

export default router;
