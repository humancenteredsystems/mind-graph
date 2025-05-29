/**
 * Utility functions for GraphQL test operations
 */

export interface GraphQLTestResponse {
  status: number;
  body: any;
}

export interface NodeTestData {
  id: string;
  label: string;
  type: string;
  status?: string;
  branch?: string;
}

export interface EdgeTestData {
  fromId: string;
  toId: string;
  type: string;
}

export interface HierarchyTestData {
  id: string;
  name: string;
}

/**
 * GraphQL query and mutation builders
 */
export class GraphQLTestUtils {
  /**
   * Build a simple node query
   */
  static createNodeQuery(fields: string[] = ['id', 'label', 'type', 'status']): string {
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
  static createNodeQueryWithVariables(nodeId: string, fields: string[] = ['id', 'label', 'type', 'status']): { query: string; variables: any } {
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
  static createNodeMutation(nodeData: NodeTestData): { mutation: string; variables: any } {
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
  static createBatchNodeMutation(nodeDataArray: NodeTestData[]): { mutation: string; variables: any } {
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
  static createEdgeMutation(edgeData: EdgeTestData): { mutation: string; variables: any } {
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
  static createNodeUpdateMutation(nodeId: string, updates: Partial<NodeTestData>): { mutation: string; variables: any } {
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
  static createNodeDeleteMutation(nodeId: string): { mutation: string; variables: any } {
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
  static createSearchQuery(searchTerm: string, nodeType?: string): { query: string; variables: any } {
    const typeFilter = nodeType ? `{ type: { eq: $nodeType } },` : '';
    const variables: any = { searchTerm };
    if (nodeType) variables.nodeType = nodeType;

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
  static createTraversalQuery(nodeId: string): { query: string; variables: any } {
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
  static createAggregationQuery(): string {
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
  static createHierarchyQuery(): string {
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
  static createComplexNestedQuery(): string {
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

/**
 * Type-safe array utilities for tests
 */
export class TestArrayUtils {
  /**
   * Create a filled array with proper typing
   */
  static createFilledArray<T>(size: number, fillValue: T): T[] {
    return Array(size).fill(fillValue);
  }

  /**
   * Create an array and map over it with proper typing
   */
  static createMappedArray<T>(size: number, mapFn: (index: number) => T): T[] {
    return Array(size).fill(null).map((_, index) => mapFn(index));
  }
}

/**
 * Type guards for error handling
 */
export interface TestError extends Error {
  response?: {
    status: number;
    data: any;
  };
  code?: string;
}

export function isAxiosError(error: unknown): error is TestError {
  return error instanceof Error && 'response' in error;
}

export function isTimeoutError(error: unknown): error is TestError {
  return error instanceof Error && 'code' in error && (error as TestError).code === 'ECONNABORTED';
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function getErrorData(error: unknown): any {
  if (isAxiosError(error) && error.response) {
    return error.response.data;
  }
  return null;
}
