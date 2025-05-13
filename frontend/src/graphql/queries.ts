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

/**
 * GraphQL query to fetch levels (including allowedTypes) for a given hierarchy.
 */
export const GET_LEVELS_FOR_HIERARCHY = `
  query LevelsForHierarchy($h: String!) {
    queryHierarchy(filter: { id: { eq: $h } }) {
      levels {
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

// Add other queries here as needed
