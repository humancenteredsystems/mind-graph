// GraphQL operation types

export interface GraphQLOperation<T = any> {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
}

export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: GraphQLError[];
}

export interface GraphQLError {
  message: string;
  locations?: Array<{
    line: number;
    column: number;
  }>;
  path?: Array<string | number>;
  extensions?: Record<string, any>;
}

export interface GraphQLRequest {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
}

export interface GraphQLMutationResponse<T = any> {
  data?: T;
  errors?: GraphQLError[];
}

// Dgraph-specific GraphQL types
export interface DgraphQueryResponse<T = any> {
  data: T;
  errors?: GraphQLError[];
  extensions?: {
    tracing?: any;
    txn?: {
      start_ts: number;
    };
  };
}

export interface DgraphMutationResponse<T = any> {
  data: T;
  errors?: GraphQLError[];
  extensions?: {
    txn?: {
      start_ts: number;
      commit_ts?: number;
    };
  };
}

// Schema operations
export interface SchemaOperation {
  schema: string;
  namespace?: string;
}

export interface SchemaResponse {
  code: string;
  message: string;
}
