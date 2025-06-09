import { 
  Node, 
  Hierarchy, 
  HierarchyLevel, 
  HierarchyLevelType,
  HierarchyAssignment 
} from '../src/types';

// Interface for tenant client
interface TenantClient {
  executeGraphQL<T = any>(query: string, variables?: Record<string, any>): Promise<T>;
}

// Custom Error for Invalid Level operations
export class InvalidLevelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidLevelError";
  }
}

// Custom Error for Node Type Not Allowed at Level
export class NodeTypeNotAllowedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NodeTypeNotAllowedError";
  }
}

// GraphQL response types for validation queries
interface GetHierarchyResponse {
  getHierarchy: { id: string } | null;
}

interface GetLevelDetailsResponse {
  getHierarchyLevel: {
    id: string;
    levelNumber: number;
    hierarchy: { id: string };
    allowedTypes: { typeName: string }[] | null;
  } | null;
}

interface ParentLevelResponse {
  queryNode: Array<{
    hierarchyAssignments: Array<{
      hierarchy: { id: string };
      level: { levelNumber: number };
    }>;
  }>;
}

interface LevelsForHierarchyResponse {
  queryHierarchy: Array<{
    levels: Array<{
      id: string;
      levelNumber: number;
    }>;
  }>;
}

// Helper function to validate a hierarchy ID
export async function validateHierarchyId(hierarchyId: string, tenantClient: TenantClient): Promise<boolean> {
  if (!hierarchyId || typeof hierarchyId !== 'string') {
    return false; // Basic type check
  }
  const query = `query GetHierarchy($id: String!) { getHierarchy(id: $id) { id } }`;
  try {
    const result = await tenantClient.executeGraphQL<GetHierarchyResponse>(query, { id: hierarchyId });
    return !!(result.getHierarchy && result.getHierarchy.id);
  } catch (error) {
    console.error(`Error validating hierarchy ID ${hierarchyId}:`, error);
    return false; // Treat errors during validation as invalid
  }
}

// Helper function to validate a level ID and check allowed node type
export async function validateLevelIdAndAllowedType(
  levelId: string, 
  nodeType: string, 
  hierarchyId: string | undefined,
  tenantClient: TenantClient
): Promise<{ id: string; levelNumber: number; hierarchy: { id: string }; allowedTypes: { typeName: string }[] | null }> {
  if (!levelId || typeof levelId !== 'string') {
    throw new InvalidLevelError(`A valid levelId string must be provided.`);
  }
  if (!nodeType || typeof nodeType !== 'string') {
    // This should ideally be caught by GraphQL schema validation for node input
    throw new Error(`A valid nodeType string must be provided for validation.`);
  }

  const query = `
    query GetLevelDetails($levelId: ID!) {
      getHierarchyLevel(id: $levelId) {
        id
        levelNumber
        hierarchy { id } # For context, ensure it belongs to the expected hierarchy
        allowedTypes {
          typeName
        }
      }
    }
  `;
  try {
    const result = await tenantClient.executeGraphQL<GetLevelDetailsResponse>(query, { levelId });
    const levelDetails = result.getHierarchyLevel;

    if (!levelDetails || !levelDetails.id) {
      throw new InvalidLevelError(`Level with ID '${levelId}' not found.`);
    }

    // Optional: Check if the found level belongs to the correct hierarchy (if hierarchyId is passed and relevant)
    // For now, we assume levelId is globally unique and its existence is primary.
    // if (hierarchyId && levelDetails.hierarchy.id !== hierarchyId) {
    //   throw new InvalidLevelError(`Level '${levelId}' does not belong to hierarchy '${hierarchyId}'.`);
    // }

    if (levelDetails.allowedTypes && levelDetails.allowedTypes.length > 0) {
      const isTypeAllowed = levelDetails.allowedTypes.some((at: any) => at.typeName === nodeType);
      if (!isTypeAllowed) {
        const allowedTypeNames = levelDetails.allowedTypes.map((at: any) => at.typeName).join(', ');
        throw new NodeTypeNotAllowedError(`Node type '${nodeType}' is not allowed at level ${levelDetails.levelNumber} (ID: ${levelId}). Allowed types: ${allowedTypeNames}.`);
      }
    }
    // If allowedTypes is null or empty, all types are permitted at this level.
    return levelDetails; // Return details if needed, or just true
  } catch (error: any) {
    console.error(`Error validating level ID '${levelId}' for type '${nodeType}':`, error.message);
    if (error instanceof InvalidLevelError || error instanceof NodeTypeNotAllowedError) {
      throw error; // Re-throw custom errors
    }
    // For unexpected GraphQL errors during validation
    throw new Error(`Server error during validation of level ID '${levelId}'.`);
  }
}

// Helper to determine levelId for a new node within a hierarchy
export async function getLevelIdForNode(parentId: string | null, hierarchyId: string, tenantClient: TenantClient): Promise<string> {
  let targetLevelNumber = 1; // Default if no parent or no matching assignment

  if (parentId) {
    const parentQuery = `
      query ParentLevel($nodeId: String!) {
        queryNode(filter: { id: { eq: $nodeId } }) {
          hierarchyAssignments {
            hierarchy { id }
            level { levelNumber }
          }
        }
      }
    `;
    const parentResp = await tenantClient.executeGraphQL<ParentLevelResponse>(parentQuery, { nodeId: parentId });
    const allAssignments = parentResp.queryNode[0]?.hierarchyAssignments;
    let relevantAssignment = null;

    if (allAssignments && allAssignments.length > 0) {
      relevantAssignment = allAssignments.find((asn: any) => asn.hierarchy.id === hierarchyId);
    }

    if (relevantAssignment) {
      targetLevelNumber = relevantAssignment.level.levelNumber + 1;
    } else {
      // Parent node exists but is not in the target hierarchy, or has no assignments.
      // Defaulting the new node to level 1 of the target hierarchy.
      targetLevelNumber = 1; // Explicitly set, though it's the default
      console.warn(`Parent node ${parentId} found, but has no assignment for hierarchy ${hierarchyId}. New node will be at level 1 of this hierarchy.`);
    }
  }
  // Fetch all levels for the hierarchy and pick by levelNumber
  const levelsQuery = `
    query LevelsForHierarchy($h: String!) {
      queryHierarchy(filter: { id: { eq: $h } }) {
        levels {
          id
          levelNumber
        }
      }
    }
  `;
  const levelsResp = await tenantClient.executeGraphQL<LevelsForHierarchyResponse>(levelsQuery, { h: hierarchyId });
  const levelsData = levelsResp.queryHierarchy[0];
  if (!levelsData || !levelsData.levels) {
    // This case implies the hierarchyId itself might be invalid or has no levels defined.
    // validateHierarchyId should have caught an invalid hierarchyId earlier.
    // If hierarchy is valid but has no levels, it's a data setup issue.
    console.error(`[getLevelIdForNode] Hierarchy ${hierarchyId} has no levels defined or queryHierarchy returned unexpected structure.`);
    throw new InvalidLevelError(`Hierarchy ${hierarchyId} does not contain any levels.`);
  }
  const levels = levelsData.levels;
  const level = levels.find((l: any) => l.levelNumber === targetLevelNumber);
  if (!level) {
    // Use the custom error type
    throw new InvalidLevelError(`Calculated target level ${targetLevelNumber} not found for hierarchy ${hierarchyId}. Available levels: ${levels.map((l: any) => l.levelNumber).join(', ')}.`);
  }
  return level.id;
}
