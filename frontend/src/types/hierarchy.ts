// GraphQL response types for hierarchy operations

export interface HierarchyLevelType {
  id: string;
  typeName: string;
}

export interface HierarchyLevel {
  id: string;
  levelNumber: number;
  label?: string;
  allowedTypes: HierarchyLevelType[];
}

export interface HierarchyQueryResponse {
  queryHierarchy: {
    levels: HierarchyLevel[];
  }[];
}

// Error type for GraphQL operations
export interface GraphQLError {
  message: string;
  locations?: Array<{
    line: number;
    column: number;
  }>;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
}
