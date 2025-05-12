import { NodeData, EdgeData } from '../types/graph'; // Import from centralized types

// Interface representing the expected structure from the GET_ALL_NODES_AND_EDGES_QUERY
interface AllGraphDataResponse {
  queryNode?: {
    id: string;
    label?: string;
    type?: string;
    status?: string;
    branch?: string;
    hierarchyAssignments?: {
      level: { id: string };
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
export const transformTraversalData = (data: any): { nodes: NodeData[], edges: EdgeData[] } => {
  const nodes: NodeData[] = [];
  const edges: EdgeData[] = [];
  const visited = new Set<string>(); // Keep track of visited nodes to avoid duplicates

  // Recursive function to process nodes and edges
  function processNodes(nodeArray: any[]) {
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
        ? (node.hierarchyAssignments as any[]).map(a => ({
            hierarchyId: a.hierarchy.id,
            hierarchyName: a.hierarchy.name,
            levelId: a.level.id,
            levelNumber: a.level.levelNumber,
            levelLabel: a.level.label,
          }))
        : [],
        // Add other relevant properties from node
      });

      // Process outgoing edges and recursively process connected nodes
      if (Array.isArray(node.outgoing)) {
        node.outgoing.forEach((edge: any) => {
          // Ensure the edge and target node exist and have IDs
          if (edge && edge.to && edge.to.id) {
            const targetNode = edge.to;
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
  const rootNodes = data?.data?.queryNode ?? data?.queryNode;
  if (Array.isArray(rootNodes)) {
    processNodes(rootNodes);
  } else {
    console.warn(
      "transformTraversalData: Expected 'data.data.queryNode' or 'data.queryNode' not found in the input:",
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
        ? (node.hierarchyAssignments as any[]).map(a => ({
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
