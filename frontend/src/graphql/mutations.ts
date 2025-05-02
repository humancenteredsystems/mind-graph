/**
 * GraphQL mutation to add one or more nodes.
 */
export const ADD_NODE_MUTATION = `
  mutation AddNode($input: [AddNodeInput!]!) {
    addNode(input: $input) {
      node {
        id
        label
        type
        level
        status
        branch
      }
    }
  }
`;

/**
 * GraphQL mutation to add one or more edges.
 * Note: Assumes 'simple' edge type for now, might need parameterization later.
 */
export const ADD_EDGE_MUTATION = `
  mutation AddEdge($input: [AddEdgeInput!]!) {
    addEdge(input: $input) {
      edge {
        from { id }
        fromId
        to { id }
        toId
        type
      }
    }
  }
`;

/**
 * GraphQL mutation to update a node based on a filter.
 */
export const UPDATE_NODE_MUTATION = `
  mutation UpdateNode($input: UpdateNodeInput!) {
    updateNode(input: $input) {
      node {
        id
        label
        type
        level
        status
        branch
      }
    }
  }
`;

/**
 * GraphQL mutation to delete nodes based on a filter.
 * Note: The current implementation uses a separate /deleteNodeCascade endpoint for single deletes.
 * This mutation is kept for potential batch deletes or if the cascade endpoint changes.
 */
export const DELETE_NODE_MUTATION = `
  mutation DeleteNode($input: DeleteNodeInput!) {
    deleteNode(input: $input) {
      node {
        id
      }
    }
  }
`;

// Add other mutations here as needed
