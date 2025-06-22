/**
 * Hierarchy utility functions for node association detection and management
 */

/**
 * Determines if a node is associated with a specific hierarchy
 * @param node - The node object with potential hierarchyAssignments
 * @param hierarchyId - The hierarchy ID to check (e.g., 'hierarchy-primary-knowledge-graph')
 * @returns boolean indicating if the node is associated with the hierarchy
 */
export const isNodeAssociatedWithHierarchy = (node: any, hierarchyId: string): boolean => {
  // If hierarchy is 'none', all nodes are considered associated
  if (hierarchyId === 'none') {
    return true;
  }

  // Extract the actual hierarchy ID from the view ID format
  const actualHierarchyId = hierarchyId.startsWith('hierarchy-') 
    ? hierarchyId.replace('hierarchy-', '') 
    : hierarchyId;

  // Check if node has hierarchyAssignments
  if (!node.hierarchyAssignments || !Array.isArray(node.hierarchyAssignments)) {
    return false;
  }

  // Check if any assignment matches the target hierarchy
  return node.hierarchyAssignments.some((assignment: any) => {
    return assignment.hierarchy?.id === actualHierarchyId;
  });
};

/**
 * Gets the association status for a node with the current hierarchy
 * @param node - The node object
 * @param hierarchyId - The current hierarchy ID
 * @returns object with association status and metadata
 */
export const getNodeAssociationStatus = (node: any, hierarchyId: string) => {
  const isAssociated = isNodeAssociatedWithHierarchy(node, hierarchyId);
  
  return {
    isAssociated,
    hierarchyId,
    assignmentCount: node.hierarchyAssignments?.length || 0,
    assignments: node.hierarchyAssignments || []
  };
};

/**
 * Filters nodes based on association status and visibility settings
 * @param nodes - Array of nodes to filter
 * @param hierarchyId - Current hierarchy ID
 * @param hideUnassociated - Whether to hide unassociated nodes
 * @returns filtered array of nodes
 */
export const filterNodesByAssociation = (
  nodes: any[], 
  hierarchyId: string, 
  hideUnassociated: boolean
): any[] => {
  // If hierarchy is 'none', return all nodes regardless of hideUnassociated setting
  if (hierarchyId === 'none') {
    return nodes;
  }

  // If hideUnassociated is false, return all nodes (styling will handle graying)
  if (!hideUnassociated) {
    return nodes;
  }

  // Filter to only show associated nodes
  return nodes.filter(node => isNodeAssociatedWithHierarchy(node, hierarchyId));
};

/**
 * Applies styling classes based on association status
 * @param node - The node object
 * @param hierarchyId - Current hierarchy ID
 * @param hideUnassociated - Whether unassociated nodes are hidden
 * @returns CSS classes to apply to the node
 */
export const getNodeAssociationClasses = (
  node: any, 
  hierarchyId: string, 
  hideUnassociated: boolean
): string[] => {
  const classes: string[] = [];
  
  if (hierarchyId === 'none') {
    return classes; // No special styling for 'none' hierarchy
  }

  const isAssociated = isNodeAssociatedWithHierarchy(node, hierarchyId);
  
  if (isAssociated) {
    classes.push('hierarchy-associated');
  } else {
    classes.push('hierarchy-unassociated');
    if (!hideUnassociated) {
      classes.push('hierarchy-grayed');
    }
  }

  return classes;
};
