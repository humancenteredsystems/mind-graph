export const ADD_NODE_WITH_HIERARCHY = `
  mutation AddNodeWithHierarchy($input: [AddNodeInput!]!) {
    addNode(input: $input) {
      node {
        id
        label
        type
        status
        branch
        hierarchyAssignments {
          id
          hierarchy { id name }
          level { id levelNumber label }
        }
      }
    }
  }
`;

export const ADD_NODE_MUTATION = `
  mutation AddNode($input: [AddNodeInput!]!) {
    addNode(input: $input) {
      node {
        id
        label
        type
        status
        branch
        hierarchyAssignments {
          level {
            id
          }
        }
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
        status
        branch
        hierarchyAssignments {
          id
          hierarchy { id name }
          level { id levelNumber label }
        }
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

export const DELETE_EDGE_MUTATION = `
  mutation DeleteEdge($filter: EdgeFilter!) {
    deleteEdge(filter: $filter) {
      msg
      numUids
    }
  }
`;

// Add other mutations here as needed
