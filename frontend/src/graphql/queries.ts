/**
 * GraphQL query to fetch all nodes with their essential fields and outgoing edges.
 */
export const GET_ALL_NODES_AND_EDGES_QUERY = `
  query GetAllNodesAndEdges {
    queryNode {
      id
      label
      type
      status # Assuming status might be needed
      branch # Assuming branch might be needed
      hierarchyAssignments {
        hierarchy {
          id
          name
        }
        level {
          id
          levelNumber
          label
        }
      }
      outgoing {
        type
        to {
          id
        }
      }
    }
  }
`;

/**
 * GraphQL query to fetch only the IDs of all nodes.
 */
export const GET_ALL_NODE_IDS_QUERY = `
  query GetAllNodeIds {
    queryNode {
      id
    }
  }
`;

// Add other queries here as needed
