import { NodeData, EdgeData } from '../types/graph';
import { log } from './logger';

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
