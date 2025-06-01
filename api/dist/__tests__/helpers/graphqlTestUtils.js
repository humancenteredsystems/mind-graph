"use strict";
/**
 * Utility functions for GraphQL test operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestArrayUtils = exports.GraphQLTestUtils = void 0;
exports.isAxiosError = isAxiosError;
exports.isTimeoutError = isTimeoutError;
exports.getErrorMessage = getErrorMessage;
exports.getErrorData = getErrorData;
/**
 * GraphQL query and mutation builders
 */
class GraphQLTestUtils {
    /**
     * Build a simple node query
     */
    static createNodeQuery(fields = ['id', 'label', 'type', 'status']) {
        const fieldString = fields.join('\n        ');
        return `
      query {
        queryNode(first: 5) {
          ${fieldString}
        }
      }
    `;
    }
    /**
     * Build a node query with variables
     */
    static createNodeQueryWithVariables(nodeId, fields = ['id', 'label', 'type', 'status']) {
        const fieldString = fields.join('\n          ');
        return {
            query: `
        query GetNodeById($nodeId: String!) {
          getNode(id: $nodeId) {
            ${fieldString}
          }
        }
      `,
            variables: { nodeId }
        };
    }
    /**
     * Build a node creation mutation
     */
    static createNodeMutation(nodeData) {
        return {
            mutation: `
        mutation CreateNode($input: [AddNodeInput!]!) {
          addNode(input: $input) {
            node {
              id
              label
              type
              status
            }
          }
        }
      `,
            variables: { input: [nodeData] }
        };
    }
    /**
     * Build a batch node creation mutation
     */
    static createBatchNodeMutation(nodeDataArray) {
        return {
            mutation: `
        mutation CreateBatchNodes($input: [AddNodeInput!]!) {
          addNode(input: $input) {
            node {
              id
              label
              type
            }
          }
        }
      `,
            variables: { input: nodeDataArray }
        };
    }
    /**
     * Build an edge creation mutation
     */
    static createEdgeMutation(edgeData) {
        return {
            mutation: `
        mutation CreateEdge($input: [AddEdgeInput!]!) {
          addEdge(input: $input) {
            edge {
              fromId
              toId
              type
            }
          }
        }
      `,
            variables: { input: [edgeData] }
        };
    }
    /**
     * Build a node update mutation
     */
    static createNodeUpdateMutation(nodeId, updates) {
        return {
            mutation: `
        mutation UpdateNode($filter: NodeFilter!, $set: NodePatch!) {
          updateNode(input: { filter: $filter, set: $set }) {
            node {
              id
              label
              type
              status
            }
          }
        }
      `,
            variables: {
                filter: { id: { eq: nodeId } },
                set: updates
            }
        };
    }
    /**
     * Build a node deletion mutation
     */
    static createNodeDeleteMutation(nodeId) {
        return {
            mutation: `
        mutation DeleteNode($filter: NodeFilter!) {
          deleteNode(filter: $filter) {
            numUids
          }
        }
      `,
            variables: {
                filter: { id: { eq: nodeId } }
            }
        };
    }
    /**
     * Build a search query with filters
     */
    static createSearchQuery(searchTerm, nodeType) {
        const typeFilter = nodeType ? `{ type: { eq: $nodeType } },` : '';
        const variables = { searchTerm };
        if (nodeType)
            variables.nodeType = nodeType;
        return {
            query: `
        query SearchNodes($searchTerm: String!${nodeType ? ', $nodeType: String!' : ''}) {
          queryNode(filter: { 
            ${nodeType ? 'and: [' : ''}
            ${typeFilter}
            ${nodeType ? '{ ' : ''}label: { anyofterms: $searchTerm }${nodeType ? ' }' : ''}
            ${nodeType ? ']' : ''}
          }) {
            id
            label
            type
          }
        }
      `,
            variables
        };
    }
    /**
     * Build a traversal query
     */
    static createTraversalQuery(nodeId) {
        return {
            query: `
        query TraverseFromNode($nodeId: String!) {
          getNode(id: $nodeId) {
            id
            label
            type
            outgoing {
              type
              to {
                id
                label
                type
              }
            }
          }
        }
      `,
            variables: { nodeId }
        };
    }
    /**
     * Build an aggregation query
     */
    static createAggregationQuery() {
        return `
      query {
        aggregateNode {
          count
        }
      }
    `;
    }
    /**
     * Build a hierarchy query
     */
    static createHierarchyQuery() {
        return `
      query {
        queryHierarchy {
          id
          name
          levels {
            id
            levelNumber
            label
          }
        }
      }
    `;
    }
    /**
     * Build a complex nested query with hierarchy assignments
     */
    static createComplexNestedQuery() {
        return `
      query {
        queryNode(first: 3) {
          id
          label
          type
          hierarchyAssignments {
            hierarchy {
              id
              name
            }
            level {
              levelNumber
              label
            }
          }
        }
      }
    `;
    }
}
exports.GraphQLTestUtils = GraphQLTestUtils;
/**
 * Type-safe array utilities for tests
 */
class TestArrayUtils {
    /**
     * Create a filled array with proper typing
     */
    static createFilledArray(size, fillValue) {
        return Array(size).fill(fillValue);
    }
    /**
     * Create an array and map over it with proper typing
     */
    static createMappedArray(size, mapFn) {
        return Array(size).fill(null).map((_, index) => mapFn(index));
    }
}
exports.TestArrayUtils = TestArrayUtils;
function isAxiosError(error) {
    return error instanceof Error && 'response' in error;
}
function isTimeoutError(error) {
    return error instanceof Error && 'code' in error && error.code === 'ECONNABORTED';
}
function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
function getErrorData(error) {
    if (isAxiosError(error) && error.response) {
        return error.response.data;
    }
    return null;
}
