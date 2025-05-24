export interface NodeData {
  id: string;
  label?: string;
  type?: string;
  assignments?: {
    hierarchyId: string;
    hierarchyName: string;
    levelId: string;
    levelNumber: number;
    levelLabel?: string;
  }[];
  levelNumber?: number;
  levelLabel?: string;
  status?: string;
  branch?: string;
}

export interface EdgeData {
  id?: string;
  source: string;
  target: string;
  type?: string;
}

// Represents a Hierarchy
export interface HierarchyData {
  id: string; // Corresponds to Hierarchy.id, now ID!
  name: string;
  // Potentially other fields like 'levels' if you fetch them
}

// Represents a level within a hierarchy
export interface HierarchyLevelData {
  id: string; // Corresponds to HierarchyLevel.id (assuming this remains string or ID)
  hierarchyId: string; // ID of the parent Hierarchy, now ID!
  levelNumber: number;
  label?: string;
  // Potentially other fields
}

// Represents an assignment of a node to a hierarchy level
export interface HierarchyAssignmentData {
  id: string; // Corresponds to HierarchyAssignment.id
  nodeId: string;
  hierarchyId: string; // ID of the Hierarchy, now ID!
  levelId: string; // ID of the HierarchyLevel
  // Potentially other fields
}

// API Response Types
export interface RawNodeResponse {
  id: string;
  label?: string;
  type?: string;
  status?: string;
  branch?: string;
  hierarchyAssignments?: {
    hierarchy: {
      id: string;
      name: string;
    };
    level: {
      id: string;
      levelNumber: number;
      label?: string;
    };
  }[];
  outgoing?: {
    id: string;
    type?: string;
    target: RawNodeResponse;
  }[];
}

export interface RawEdgeResponse {
  id: string;
  source?: string;
  target?: string;
  from?: { id: string };
  fromId?: string;
  to?: { id: string };
  toId?: string;
  type?: string;
}

export interface ApiMutationResponse {
  addNode?: { node: RawNodeResponse[] };
  addEdge?: { edge: RawEdgeResponse[] };
  updateNode?: { node: RawNodeResponse[] };
  deleteNode?: { node: RawNodeResponse[] };
}

export interface TraversalQueryResponse {
  queryNode: RawNodeResponse[];
}

export interface AllGraphQueryResponse {
  queryNode: RawNodeResponse[];
}
