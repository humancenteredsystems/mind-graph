export interface NodeData {
  id: string;
  label?: string;
  type?: string;
  assignments?: string[]; // This might need to be number[] if it refers to HierarchyLevel IDs that become numbers
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
  id: number; // Corresponds to Hierarchy.id, now an integer
  name: string;
  // Potentially other fields like 'levels' if you fetch them
}

// Represents a level within a hierarchy
export interface HierarchyLevelData {
  id: string; // Corresponds to HierarchyLevel.id (assuming this remains string or ID)
  hierarchyId: number; // ID of the parent Hierarchy, now an integer
  levelNumber: number;
  label?: string;
  // Potentially other fields
}

// Represents an assignment of a node to a hierarchy level
export interface HierarchyAssignmentData {
  id: string; // Corresponds to HierarchyAssignment.id
  nodeId: string;
  hierarchyId: number; // ID of the Hierarchy, now an integer
  levelId: string; // ID of the HierarchyLevel
  // Potentially other fields
}
