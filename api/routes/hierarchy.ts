import express, { Request, Response } from 'express';
import { adaptiveTenantFactory } from '../services/adaptiveTenantFactory';
import { Hierarchy, HierarchyLevel, HierarchyAssignment } from '../src/types/domain';
import { authenticateAdmin } from '../middleware/auth';
import { sendErrorResponse, ErrorType } from '../utils/errorResponse';
import { validateRequiredFields, validateId, validateEntityExists } from '../utils/validationHelpers';
import { validateLevelIdAndAllowedType, NodeTypeNotAllowedError } from '../services/validation';
import { schemaLoaded } from '../services/systemInitialization';

const router = express.Router();

// Helper function to get tenant-aware Dgraph client from request context
async function getTenantClient(req: Request) {
  console.log('[HIERARCHY] Creating tenant client with context:', {
    hasTenantContext: !!req.tenantContext,
    tenantId: req.tenantContext?.tenantId,
    namespace: req.tenantContext?.namespace
  });

  // Convert TenantContext to UserContext format expected by adaptiveTenantFactory
  const userContext = req.tenantContext ? {
    namespace: req.tenantContext.namespace,
    tenantId: req.tenantContext.tenantId
  } : null;
  
  console.log('[HIERARCHY] Calling adaptiveTenantFactory with userContext:', userContext);
  
  try {
    const client = await adaptiveTenantFactory.createTenantFromContext(userContext);
    console.log('[HIERARCHY] Tenant client created successfully');
    return client;
  } catch (error) {
    console.error('[HIERARCHY] Failed to create tenant client:', error);
    throw error;
  }
}

// --- PUBLIC HIERARCHY ROUTES (No authentication required) ---

// Get all hierarchies - PUBLIC ENDPOINT
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
    
    // Ensure h0 is always included in the response
    const hierarchies = data.queryHierarchy || [];
    const hasH0 = hierarchies.some((h: any) => h.id === 'h0');
    
    if (!hasH0) {
      // Add h0 if it's missing (should not happen if system initialization worked)
      console.warn('[HIERARCHY] h0 hierarchy missing from query results, adding manually');
      hierarchies.unshift({ id: 'h0', name: 'None' });
    }
    
    res.json(hierarchies);
  } catch (error) {
    const err = error as Error;
    console.error('[HIERARCHY] Failed to fetch hierarchies:', error);
    res.status(500).json({ error: 'Failed to fetch hierarchies', details: err.message });
  }
});

// --- PUBLIC HIERARCHY ROUTES ---

// Create a new hierarchy
router.post('/hierarchy', async (req: Request, res: Response): Promise<void> => {
  const { id, name }: { id: string; name: string } = req.body;
  
  console.log('[HIERARCHY] Starting hierarchy creation:', { id, name });
  console.log('[HIERARCHY] Request tenant context:', {
    tenantId: req.tenantContext?.tenantId,
    namespace: req.tenantContext?.namespace
  });

  if (!id || !name) {
    console.log('[HIERARCHY] Missing required fields validation failed');
    res.status(400).json({ error: 'Missing required fields: id and name' });
    return;
  }

  // Check schema readiness
  console.log('[HIERARCHY] Checking schema readiness - schemaLoaded:', schemaLoaded);
  if (!schemaLoaded) {
    console.error('[HIERARCHY] Schema not loaded - hierarchy creation will likely fail');
    res.status(503).json({ 
      error: 'System not ready', 
      details: 'GraphQL schema not fully loaded. Please try again in a moment.',
      context: {
        hierarchyId: id,
        hierarchyName: name,
        schemaLoaded: false
      }
    });
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

  console.log('[HIERARCHY] GraphQL mutation details:', {
    mutation: mutation.trim(),
    variables: JSON.stringify({ input: [{ id, name }] }, null, 2)
  });

  try {
    console.log('[HIERARCHY] Getting tenant client...');
    const tenantClient = await getTenantClient(req);
    console.log('[HIERARCHY] Tenant client created successfully');
    
    console.log('[HIERARCHY] Executing addHierarchy mutation with variables:', { input: [{ id, name }] });
    const data = await tenantClient.executeGraphQL(mutation, { input: [{ id, name }] });
    console.log('[HIERARCHY] GraphQL execution successful');
    
    console.log('[HIERARCHY] GraphQL response details:', {
      responseData: JSON.stringify(data, null, 2),
      hasAddHierarchy: !!data.addHierarchy,
      hasHierarchyArray: !!data.addHierarchy?.hierarchy,
      hierarchyCount: data.addHierarchy?.hierarchy?.length || 0
    });

    const hier = data.addHierarchy.hierarchy[0];
    console.log('[HIERARCHY] Hierarchy created successfully:', hier);
    res.status(201).json(hier);
  } catch (error) {
    const err = error as Error;
    console.error('[HIERARCHY] Hierarchy creation failed at step:', {
      errorMessage: err.message,
      errorStack: err.stack,
      mutation: 'addHierarchy',
      variables: { input: [{ id, name }] },
      tenantContext: req.tenantContext,
      schemaLoaded: schemaLoaded
    });
    res.status(500).json({ 
      error: 'Failed to create hierarchy', 
      details: err.message,
      context: {
        hierarchyId: id,
        hierarchyName: name,
        tenantId: req.tenantContext?.tenantId,
        schemaLoaded: schemaLoaded
      }
    });
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
  } catch (error) {
    const err = error as Error;
    console.error('[HIERARCHY] Failed to fetch hierarchy:', error);
    res.status(500).json({ error: 'Failed to fetch hierarchy', details: err.message });
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
  } catch (error) {
    const err = error as Error;
    console.error('[HIERARCHY] Failed to update hierarchy:', error);
    res.status(500).json({ error: 'Failed to update hierarchy', details: err.message });
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

  // Prevent deletion of h0 hierarchy
  if (id === 'h0') {
    res.status(400).json({ error: 'Cannot delete h0 hierarchy. h0 is a system hierarchy for categorization.' });
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
  } catch (error) {
    const err = error as Error;
    console.error('[HIERARCHY] Failed to delete hierarchy:', error);
    res.status(500).json({ error: 'Failed to delete hierarchy', details: err.message });
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

  // Prevent level operations on h0 hierarchy
  if (hierarchyId === 'h0') {
    res.status(400).json({ error: 'Cannot add levels to h0 hierarchy. h0 is restricted to a single level for categorization.' });
    return;
  }

  // Validate level number uniqueness within the hierarchy
  const checkLevelQuery = `
    query CheckLevelUniqueness($hierarchyId: String!, $levelNumber: Int!) {
      queryHierarchy(filter: { id: { eq: $hierarchyId } }) {
        levels(filter: { levelNumber: { eq: $levelNumber } }) {
          id
          levelNumber
        }
      }
    }
  `;

  try {
    const tenantClient = await getTenantClient(req);
    
    // Check if level number already exists
    const checkResult = await tenantClient.executeGraphQL(checkLevelQuery, { hierarchyId, levelNumber });
    const existingLevels = checkResult.queryHierarchy[0]?.levels || [];
    
    if (existingLevels.length > 0) {
      sendErrorResponse(res, ErrorType.CONFLICT, `Level number ${levelNumber} already exists in hierarchy ${hierarchyId}`);
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
    
    const data = await tenantClient.executeGraphQL(mutation, { input: [{ hierarchy: { id: hierarchyId }, levelNumber, label }] });
    const level = data.addHierarchyLevel.hierarchyLevel[0];
    res.status(201).json(level);
  } catch (error) {
    const err = error as Error;
    console.error('[HIERARCHY] Failed to create hierarchy level:', error);
    res.status(500).json({ error: 'Failed to create hierarchy level', details: err.message });
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
  } catch (error) {
    const err = error as Error;
    console.error('[HIERARCHY] Failed to update hierarchy level:', error);
    res.status(500).json({ error: 'Failed to update hierarchy level', details: err.message });
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
  } catch (error) {
    const err = error as Error;
    console.error('[HIERARCHY] Failed to delete hierarchy level:', error);
    res.status(500).json({ error: 'Failed to delete hierarchy level', details: err.message });
  }
});

// --- Hierarchy Level Type Management for h0 ---

// Add a new hierarchy level type to a hierarchy level (specifically for h0 categorization)
router.post('/hierarchy/:hierarchyId/level/:levelId/hierarchyLevelTypes', async (req: Request, res: Response): Promise<void> => {
  const { hierarchyId, levelId } = req.params;
  const { typeName }: { typeName: string } = req.body;
  
  if (!typeName) {
    res.status(400).json({ error: 'Missing required field: typeName' });
    return;
  }
  
  // Validate hierarchy and level exist
  const validateQuery = `
    query ValidateHierarchyLevel($hierarchyId: String!, $levelId: String!) {
      getHierarchy(id: $hierarchyId) {
        id
        name
        levels(filter: { id: { eq: $levelId } }) {
          id
          levelNumber
          allowedTypes {
            id
            typeName
          }
        }
      }
    }
  `;
  
  try {
    const tenantClient = await getTenantClient(req);
    
    // Validate hierarchy and level
    const validateResult = await tenantClient.executeGraphQL(validateQuery, { hierarchyId, levelId });
    const hierarchy = validateResult.getHierarchy;
    
    if (!hierarchy) {
      res.status(404).json({ error: `Hierarchy '${hierarchyId}' not found` });
      return;
    }
    
    const level = hierarchy.levels?.[0];
    if (!level) {
      res.status(404).json({ error: `Level '${levelId}' not found in hierarchy '${hierarchyId}'` });
      return;
    }
    
    // Check if type name already exists
    const existingType = level.allowedTypes?.find((type: any) => type.typeName === typeName);
    if (existingType) {
      res.status(409).json({ error: `Node type '${typeName}' already exists in this level` });
      return;
    }
    
    // Create new hierarchy level type
    const createMutation = `
      mutation CreateHierarchyLevelType($input: [AddHierarchyLevelTypeInput!]!) {
        addHierarchyLevelType(input: $input) {
          hierarchyLevelType {
            id
            typeName
          }
        }
      }
    `;
    
    const result = await tenantClient.executeGraphQL(createMutation, {
      input: [{
        level: { id: levelId },
        typeName: typeName
      }]
    });
    
    const newHierarchyLevelType = result.addHierarchyLevelType.hierarchyLevelType[0];
    res.status(201).json(newHierarchyLevelType);
    
  } catch (error) {
    const err = error as Error;
    console.error('[HIERARCHY] Failed to create allowed type:', error);
    res.status(500).json({ error: 'Failed to create allowed type', details: err.message });
  }
});

// Delete a hierarchy level type from a hierarchy level
router.delete('/hierarchy/:hierarchyId/level/:levelId/hierarchyLevelTypes/:typeId', async (req: Request, res: Response): Promise<void> => {
  const { hierarchyId, levelId, typeId } = req.params;
  
  // Validate that the hierarchy level type belongs to the specified level
  const validateQuery = `
    query ValidateHierarchyLevelType($typeId: String!, $levelId: String!) {
      getHierarchyLevelType(id: $typeId) {
        id
        typeName
        level {
          id
        }
      }
    }
  `;
  
  try {
    const tenantClient = await getTenantClient(req);
    
    // Validate hierarchy level type exists and belongs to the level
    const validateResult = await tenantClient.executeGraphQL(validateQuery, { typeId, levelId });
    const hierarchyLevelType = validateResult.getHierarchyLevelType;
    
    if (!hierarchyLevelType) {
      res.status(404).json({ error: `Hierarchy level type '${typeId}' not found` });
      return;
    }
    
    if (hierarchyLevelType.level.id !== levelId) {
      res.status(400).json({ error: `Hierarchy level type '${typeId}' does not belong to level '${levelId}'` });
      return;
    }
    
    // Prevent deletion of the default 'None' type in h0
    if (hierarchyId === 'h0' && hierarchyLevelType.typeName === 'None') {
      res.status(400).json({ error: 'Cannot delete the default None type from h0 hierarchy' });
      return;
    }
    
    // Delete the hierarchy level type
    const deleteMutation = `
      mutation DeleteHierarchyLevelType($typeId: ID!) {
        deleteHierarchyLevelType(filter: { id: { eq: $typeId } }) {
          msg
          numUids
        }
      }
    `;
    
    const result = await tenantClient.executeGraphQL(deleteMutation, { typeId });
    res.json(result.deleteHierarchyLevelType);
    
  } catch (error) {
    const err = error as Error;
    console.error('[HIERARCHY] Failed to delete hierarchy level type:', error);
    res.status(500).json({ error: 'Failed to delete hierarchy level type', details: err.message });
  }
});

// Get all hierarchy level types for a hierarchy level
router.get('/hierarchy/:hierarchyId/level/:levelId/hierarchyLevelTypes', async (req: Request, res: Response): Promise<void> => {
  const { hierarchyId, levelId } = req.params;
  
  const query = `
    query GetHierarchyLevelTypes($hierarchyId: String!, $levelId: String!) {
      getHierarchy(id: $hierarchyId) {
        id
        name
        levels(filter: { id: { eq: $levelId } }) {
          id
          levelNumber
          label
          allowedTypes {
            id
            typeName
          }
        }
      }
    }
  `;
  
  try {
    const tenantClient = await getTenantClient(req);
    const result = await tenantClient.executeGraphQL(query, { hierarchyId, levelId });
    
    const hierarchy = result.getHierarchy;
    if (!hierarchy) {
      res.status(404).json({ error: `Hierarchy '${hierarchyId}' not found` });
      return;
    }
    
    const level = hierarchy.levels?.[0];
    if (!level) {
      res.status(404).json({ error: `Level '${levelId}' not found in hierarchy '${hierarchyId}'` });
      return;
    }
    
    res.json({
      hierarchyId: hierarchy.id,
      hierarchyName: hierarchy.name,
      levelId: level.id,
      levelNumber: level.levelNumber,
      levelLabel: level.label,
      allowedTypes: level.allowedTypes || []
    });
    
  } catch (error) {
    const err = error as Error;
    console.error('[HIERARCHY] Failed to get allowed types:', error);
    res.status(500).json({ error: 'Failed to get allowed types', details: err.message });
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

  // Validate node existence and get node type
  const checkNodeQuery = `
    query CheckNodeExists($nodeId: String!) {
      getNode(id: $nodeId) {
        id
        label
        type
      }
    }
  `;

  try {
    const tenantClient = await getTenantClient(req);
    
    // Check if node exists
    const nodeResult = await tenantClient.executeGraphQL(checkNodeQuery, { nodeId });
    if (!nodeResult.getNode) {
      sendErrorResponse(res, ErrorType.NOT_FOUND, `Node with ID '${nodeId}' does not exist`);
      return;
    }

    // Validate type constraints for the level
    const nodeType = nodeResult.getNode.type;
    try {
      await validateLevelIdAndAllowedType(levelId, nodeType, hierarchyId, tenantClient);
    } catch (validationError) {
      if (validationError instanceof NodeTypeNotAllowedError) {
        res.status(400).json({ error: validationError.message });
        return;
      }
      throw validationError; // Re-throw other errors
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
    
    const data = await tenantClient.executeGraphQL(mutation, { input: [{ node: { id: nodeId }, hierarchy: { id: hierarchyId }, level: { id: levelId } }] });
    const assignment = data.addHierarchyAssignment.hierarchyAssignment[0];
    res.status(201).json(assignment);
  } catch (error) {
    const err = error as Error;
    console.error('[HIERARCHY] Failed to create hierarchy assignment:', error);
    res.status(500).json({ error: 'Failed to create hierarchy assignment', details: err.message });
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
  } catch (error) {
    const err = error as Error;
    console.error('[HIERARCHY] Failed to delete hierarchy assignment:', error);
    res.status(500).json({ error: 'Failed to delete hierarchy assignment', details: err.message });
  }
});

// --- COMPUTE ENDPOINTS FOR GRAPH VIEWS ---

// Compute hierarchy view - returns nodes and edges for a specific hierarchy
router.post('/compute/hierarchyView', async (req: Request, res: Response): Promise<void> => {
  const { hierarchyId }: { hierarchyId: string } = req.body;
  
  console.log('[HIERARCHY] Computing hierarchy view for hierarchyId:', hierarchyId);
  
  if (!hierarchyId) {
    res.status(400).json({ error: 'Missing required field: hierarchyId' });
    return;
  }

  // Use inverse relationship approach - query hierarchy to get its assignments
  const query = `
    query GetHierarchyView($hierarchyId: String!) {
      getHierarchy(id: $hierarchyId) {
        id
        name
        hierarchyAssignments {
          node {
            id
            label
            type
          }
          level {
            id
            levelNumber
            label
          }
        }
      }
      
      queryNode {
        id
        label
        type
        outgoing {
          to { id }
          type
        }
      }
    }
  `;

  try {
    const tenantClient = await getTenantClient(req);
    console.log('[HIERARCHY] Executing GraphQL query...');
    
    const data = await tenantClient.executeGraphQL(query, { hierarchyId });
    
    // Check if hierarchy exists
    if (!data.getHierarchy) {
      console.log('[HIERARCHY] Hierarchy not found:', hierarchyId);
      res.status(404).json({
        error: 'Hierarchy not found',
        hierarchyId
      });
      return;
    }
    
    const assignments = data.getHierarchy.hierarchyAssignments || [];
    console.log('[HIERARCHY] Query result:', {
      hierarchyName: data.getHierarchy.name,
      assignments: assignments.length,
      allNodes: data.queryNode?.length || 0
    });
    
    // Extract unique nodes from assignments
    const nodeMap = new Map();
    
    if (assignments.length === 0) {
      console.log('[HIERARCHY] No assignments found for hierarchy:', hierarchyId);
      res.json({
        nodes: [],
        edges: [],
        metadata: {
          hierarchyId,
          hierarchyName: data.getHierarchy.name,
          totalNodes: 0,
          totalEdges: 0,
          truncated: false,
          message: 'No nodes assigned to this hierarchy'
        }
      });
      return;
    }
    
    assignments.forEach((assignment: any) => {
      if (assignment.node) {
        const node = assignment.node;
        if (!nodeMap.has(node.id)) {
          nodeMap.set(node.id, {
            id: node.id,
            label: node.label,
            type: node.type,
            // Add hierarchy-specific metadata
            hierarchyLevel: assignment.level?.levelNumber,
            levelLabel: assignment.level?.label,
          });
        }
      }
    });

    const nodes = Array.from(nodeMap.values());
    const nodeIds = new Set(nodes.map(n => n.id));
    
    console.log('[HIERARCHY] Processed nodes:', nodes.length);
    
    // Get edges between nodes in this hierarchy from the node data
    const edges: any[] = [];
    const edgeSet = new Set(); // To avoid duplicates
    
    (data.queryNode || []).forEach((node: any) => {
      if (nodeIds.has(node.id) && node.outgoing) {
        node.outgoing.forEach((edge: any) => {
          if (edge.to?.id && nodeIds.has(edge.to.id)) {
            const edgeId = `${node.id}-${edge.to.id}`;
            if (!edgeSet.has(edgeId)) {
              edgeSet.add(edgeId);
              edges.push({
                id: edgeId,
                source: node.id,
                target: edge.to.id,
                type: edge.type || 'default',
              });
            }
          }
        });
      }
    });

    console.log('[HIERARCHY] Processed edges:', edges.length);

    // Cap results to prevent performance issues
    const maxNodes = 500;
    const maxEdges = 1000;
    
    const response = {
      nodes: nodes.slice(0, maxNodes),
      edges: edges.slice(0, maxEdges),
      metadata: {
        hierarchyId,
        totalNodes: nodes.length,
        totalEdges: edges.length,
        truncated: nodes.length > maxNodes || edges.length > maxEdges,
      }
    };

    console.log('[HIERARCHY] Returning response with', response.nodes.length, 'nodes and', response.edges.length, 'edges');
    res.json(response);
  } catch (error) {
    const err = error as Error;
    console.error('[HIERARCHY] Failed to compute hierarchy view:', error);
    console.error('[HIERARCHY] Error stack:', err.stack);
    res.status(500).json({ 
      error: 'Failed to compute hierarchy view', 
      details: err.message,
      hierarchyId 
    });
  }
});

export default router;
