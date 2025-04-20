import { NodeData, EdgeData } from '../types/graph'; // Import from centralized types

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
        level: node.level, // Extract level
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
  // Access the nested data.data.queryNode structure
  if (data && data.data && data.data.queryNode) {
    processNodes(data.data.queryNode);
  } else {
    // Log a warning if the expected structure isn't found
    console.warn("transformTraversalData: Expected 'data.data.queryNode' not found in the input:", data);
  }

  return { nodes, edges };
};
