import { NodeData, EdgeData, TraversalQueryResponse, RawNodeResponse } from '../types/graph'; // Import from centralized types
import { log } from './logger';

// Interface representing the expected structure from the GET_ALL_NODES_AND_EDGES_QUERY
interface AllGraphDataResponse {
  queryNode?: {
    id: string;
    label?: string;
    type?: string;
    status?: string;
    branch?: string;
    hierarchyAssignments?: {
      id: string;
      hierarchy: { id: string; name: string };
      level: { id: string; levelNumber: number; label?: string };
    }[];
    outgoing?: {
      type?: string;
      to?: {
        id: string;
      };
    }[];
  }[];
}

/**
 * Helper function to extract nodes and edges from traversal data.
 * Assumes the input data structure from the /api/traverse endpoint
 * contains a `queryNode` array where each node might have an `outgoing` array of edges.
 * @param data - The raw data object returned by the API (e.g., from fetchTraversalData).
 * @returns An object containing arrays of nodes and edges formatted for Cytoscape.
 */
export const transformTraversalData = (data: TraversalQueryResponse): { nodes: NodeData[], edges: EdgeData[] } => {
  const nodes: NodeData[] = [];
  const edges: EdgeData[] = [];
  const visited = new Set<string>(); // Keep track of visited nodes to avoid duplicates

  // Recursive function to process nodes and edges
  function processNodes(nodeArray: RawNodeResponse[]) {
    if (!Array.isArray(nodeArray)) return;

    nodeArray.forEach(node => {
      if (!node || !node.id || visited.has(node.id)) {
        return; // Skip if node is invalid or already visited
      }
      visited.add(node.id);

      // Add node
      nodes.push({
        id: node.id,
        label: node.label || node.id, // Use label or ID
        type: node.type,
        assignments: Array.isArray(node.hierarchyAssignments)
        ? node.hierarchyAssignments.map(a => ({
            hierarchyId: a.hierarchy.id,
            hierarchyName: a.hierarchy.name,
            levelId: a.level.id,
            levelNumber: a.level.levelNumber,
            levelLabel: a.level.label,
          }))
        : [],
        status: node.status,
        branch: node.branch,
      });

      // Process outgoing edges and recursively process connected nodes
      if (Array.isArray(node.outgoing)) {
        node.outgoing.forEach(edge => {
          // Ensure the edge and target node exist and have IDs
          if (edge && edge.target && edge.target.id) {
            const targetNode = edge.target;
            // Add edge
            edges.push({
              source: node.id,
              target: targetNode.id,
              type: edge.type,
              // Add other relevant properties from edge
            });
            // Recursively process the target node if it hasn't been visited
            // Note: The API query itself limits depth, so this recursion
            // primarily ensures all nodes/edges within the fetched data are processed.
            if (!visited.has(targetNode.id)) {
               processNodes([targetNode]); // Process the target node
            }
          }
        });
      }
    });
  }

  // Start processing from the root nodes returned by the query
  // Support both nested and un-nested queryNode structures
  const rootNodes = data?.queryNode;
  if (Array.isArray(rootNodes)) {
    processNodes(rootNodes);
  } else {
    console.warn(
      "transformTraversalData: Expected 'data.queryNode' not found in the input:",
      data
    );
  }

  return { nodes, edges };
};

/**
 * Transforms the raw data from the GET_ALL_NODES_AND_EDGES_QUERY into arrays of nodes and edges.
 * @param data - The raw data object returned by the API (e.g., from executeQuery with GET_ALL_NODES_AND_EDGES_QUERY).
 * @returns An object containing arrays of nodes and edges formatted for Cytoscape.
 */
export const transformAllGraphData = (data: AllGraphDataResponse): { nodes: NodeData[], edges: EdgeData[] } => {
  const nodes: NodeData[] = [];
  const edges: EdgeData[] = [];
  const nodeMap = new Map<string, NodeData>(); // Use map for efficient node lookup

  const rawNodes = data?.queryNode;

  if (!Array.isArray(rawNodes)) {
    console.warn("transformAllGraphData: Expected 'data.queryNode' array not found in the input:", data);
    return { nodes, edges };
  }

  // First pass: create all nodes
  rawNodes.forEach(node => {
    if (!node || !node.id) {
      return; // Skip invalid nodes
    }
    const newNode: NodeData = {
      id: node.id,
      label: node.label || node.id, // Fallback label
      type: node.type,
      assignments: Array.isArray(node.hierarchyAssignments)
        ? node.hierarchyAssignments.map(a => ({
            hierarchyId: a.hierarchy.id,
            hierarchyName: a.hierarchy.name,
            levelId: a.level.id,
            levelNumber: a.level.levelNumber,
            levelLabel: a.level.label,
          }))
        : [],
      status: node.status,
      branch: node.branch,
    };
    nodes.push(newNode);
    nodeMap.set(node.id, newNode); // Store in map for edge creation
  });

  // Second pass: create edges
  rawNodes.forEach(node => {
    if (!node || !node.id || !Array.isArray(node.outgoing)) {
      return; // Skip nodes without valid ID or outgoing edges
    }

    node.outgoing.forEach(edge => {
      // Ensure the edge and target node exist and have IDs
      if (edge && edge.to && edge.to.id) {
        const sourceId = node.id;
        const targetId = edge.to.id;

        // Check if both source and target nodes exist in our map (ensures data integrity)
        if (nodeMap.has(sourceId) && nodeMap.has(targetId)) {
          edges.push({
            source: sourceId,
            target: targetId,
            type: edge.type,
            // Add other relevant properties from edge if available
          });
        } else {
          console.warn(`transformAllGraphData: Skipping edge from ${sourceId} to ${targetId} because one or both nodes were not found in the initial node list.`);
        }
      }
    });
  });

  return { nodes, edges };
};

/**
 * Resolves hierarchy assignment for a node, handling ID format mismatches
 * between different backend sources (e.g., "1" vs "h1")
 */
export const resolveNodeHierarchyAssignment = (
  nodeId: string, 
  nodes: NodeData[], 
  hierarchyId: string
) => {
  const node = nodes.find(n => n.id === nodeId);
  if (!node?.assignments) {
    return { assignment: undefined, levelNumber: 0 };
  }

  // Try exact match first
  let matchingAssignments = node.assignments.filter(a => a.hierarchyId === hierarchyId);
  
  // Handle format mismatch between hierarchy sources
  if (matchingAssignments.length === 0) {
    if (hierarchyId.startsWith('h')) {
      const numericId = hierarchyId.substring(1);
      matchingAssignments = node.assignments.filter(a => a.hierarchyId === numericId);
    } else {
      const prefixedId = `h${hierarchyId}`;
      matchingAssignments = node.assignments.filter(a => a.hierarchyId === prefixedId);
    }
  }
  
  // Sort by level number (descending) and take the highest level
  matchingAssignments.sort((a, b) => b.levelNumber - a.levelNumber);
  const assignment = matchingAssignments[0];
  
  return {
    assignment,
    levelNumber: assignment?.levelNumber ?? 0,
    levelLabel: assignment?.levelLabel
  };
};

/**
 * Normalizes hierarchy ID format to handle inconsistencies between 'h' prefixed and non-prefixed IDs
 */
export const normalizeHierarchyId = (hierarchyId: string, candidateId: string): boolean => {
  if (hierarchyId === candidateId) return true;
  
  // Handle ID format mismatches (e.g., "1" vs "h1")
  if (hierarchyId.startsWith('h')) {
    const numericId = hierarchyId.substring(1);
    return candidateId === numericId;
  } else {
    const prefixedId = `h${hierarchyId}`;
    return candidateId === prefixedId;
  }
};

/**
 * Gets the hierarchy level number for a node in a given hierarchy
 */
export const getNodeHierarchyLevel = (
  node: NodeData,
  hierarchyId: string
): number => {
  // Get the node's hierarchy level
  let matchingAssignments = node.assignments?.filter(a => a.hierarchyId === hierarchyId) || [];
  
  // Handle ID format mismatches
  if (matchingAssignments.length === 0 && node.assignments) {
    matchingAssignments = node.assignments.filter(a => normalizeHierarchyId(hierarchyId, a.hierarchyId));
  }
  
  // Sort by level number and take the highest level
  matchingAssignments.sort((a, b) => b.levelNumber - a.levelNumber);
  return matchingAssignments[0]?.levelNumber ?? 1;
};

/**
 * Recursively finds hierarchy-aware descendants of a node
 */
export const findHierarchyDescendants = (
  nodeId: string,
  nodes: NodeData[],
  edges: EdgeData[],
  hierarchyId: string,
  clickedNodeLevel: number
): Set<string> => {
  const descendantNodeIds = new Set<string>();
  
  // Helper function to recursively find hierarchy-aware descendants
  const findDescendants = (currentNodeId: string, visited: Set<string>) => {
    if (visited.has(currentNodeId)) return;
    visited.add(currentNodeId);
    
    // Find all nodes connected from the current node
    const outgoingEdges = edges.filter(e => e.source === currentNodeId);
    outgoingEdges.forEach(edge => {
      if (edge.target === nodeId) return; // Don't include the original node
      
      // Check if the target node is at a lower hierarchy level
      const targetNode = nodes.find(n => n.id === edge.target);
      if (!targetNode) return;
      
      const targetNodeLevel = getNodeHierarchyLevel(targetNode, hierarchyId);
      
      // Only include nodes at lower hierarchy levels (higher level numbers)
      if (targetNodeLevel > clickedNodeLevel) {
        descendantNodeIds.add(edge.target);
        findDescendants(edge.target, visited); // Recursively find descendants
      }
    });
  };
  
  findDescendants(nodeId, new Set());
  return descendantNodeIds;
};

/**
 * Finds immediate children of a node (nodes connected directly from the target node)
 */
export const findImmediateChildren = (
  nodeId: string,
  edges: EdgeData[]
): Set<string> => {
  const childNodeIds = new Set<string>();
  
  // Get edges from the target node to find its children
  const outgoingEdges = edges.filter(e => e.source === nodeId);
  outgoingEdges.forEach(edge => {
    // Add the target node as a child
    childNodeIds.add(edge.target);
  });
  
  return childNodeIds;
};

/**
 * Logs expansion operations for debugging
 */
export const logExpansionOperation = (
  operation: string,
  nodeId: string,
  level: number,
  affectedNodes: Set<string>
) => {
  if (affectedNodes.size > 0) {
    log('useGraphState', `${operation} for Level ${level} node ${nodeId}: ${Array.from(affectedNodes).join(', ')}`);
  } else {
    log('useGraphState', `No ${operation.toLowerCase()} found for Level ${level} node ${nodeId}`);
  }
};
