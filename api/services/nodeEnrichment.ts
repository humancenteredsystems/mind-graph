import { 
  validateHierarchyId, 
  validateLevelIdAndAllowedType, 
  getLevelIdForNode 
} from './validation';
import { adaptiveTenantFactory } from './adaptiveTenantFactory';

// Input structure for node creation
interface NodeInput {
  id?: string;
  label: string;
  type: string;
  hierarchyId?: string;
  levelId?: string;
  parentId?: string;
  hierarchyAssignments?: Array<{
    hierarchy: { id: string };
    level: { id: string };
  }>;
}

// Enriched node input for GraphQL mutation
interface EnrichedNodeInput {
  id?: string;
  label: string;
  type: string;
  hierarchyAssignments?: Array<{
    hierarchy: { id: string };
    level: { id: string };
  }>;
}

// Variables structure for mutation
interface MutationVariables {
  input: NodeInput[];
  [key: string]: any;
}

// Return type for enriched variables
interface EnrichedMutationVariables {
  input: EnrichedNodeInput[];
  [key: string]: any;
}

// Interface for tenant client
interface TenantClient {
  executeGraphQL<T = any>(query: string, variables?: Record<string, any>): Promise<T>;
}

/**
 * Enriches addNode inputs with nested hierarchyAssignments
 * Handles validation and transformation of client input for node creation
 */
export async function enrichNodeInputs(
  variables: MutationVariables, 
  hierarchyIdFromHeader: string | null, 
  mutation: string,
  tenantClient: TenantClient
): Promise<EnrichedMutationVariables> {
  // Only enrich addNode mutations; other mutations bypass enrichment
  if (!Array.isArray(variables.input) || !mutation.includes('addNode')) {
    return variables;
  }

  // MANDATORY: X-Hierarchy-Id header is required for node creation
  if (!hierarchyIdFromHeader) {
    throw new Error('X-Hierarchy-Id header is required for node creation mutations');
  }

  // Validate the hierarchy ID from header exists
  const isHeaderHierarchyValid = await validateHierarchyId(hierarchyIdFromHeader, tenantClient);
  if (!isHeaderHierarchyValid) {
    throw new Error(`Invalid hierarchyId in header: ${hierarchyIdFromHeader}. Hierarchy not found.`);
  }

  const enrichedInputs: EnrichedNodeInput[] = [];
  
  for (const inputObj of variables.input) {
    // Client can override hierarchyId per input item, this also needs validation
    let itemHierarchyId = inputObj.hierarchyId || hierarchyIdFromHeader;

    if (inputObj.hierarchyId && inputObj.hierarchyId !== hierarchyIdFromHeader) {
      const isItemHierarchyValid = await validateHierarchyId(inputObj.hierarchyId, tenantClient);
      if (!isItemHierarchyValid) {
        throw new Error(`Invalid hierarchyId in input item: ${inputObj.hierarchyId}. Hierarchy not found.`);
      }
    }
    // itemHierarchyId is now validated (either it's the validated header one, or a validated one from input)

    // Process each input object for node creation
    let finalLevelId: string | null = null; // Will hold the levelId if an assignment is to be made
    let shouldCreateAssignment = false;

    // Case 1: Client provides hierarchyAssignments array (standard frontend structure)
    if (inputObj.hierarchyAssignments && Array.isArray(inputObj.hierarchyAssignments) && inputObj.hierarchyAssignments.length > 0) {
      const hierarchyAssignment = inputObj.hierarchyAssignments[0];
      const itemHierarchyIdFromAssignment = hierarchyAssignment.hierarchy?.id;
      finalLevelId = hierarchyAssignment.level?.id;
      
      if (itemHierarchyIdFromAssignment && finalLevelId) {
        console.log(`[MUTATE] Processing client-provided hierarchyAssignments: hierarchyId=${itemHierarchyIdFromAssignment}, levelId=${finalLevelId} for node type ${inputObj.type}`);
        await validateLevelIdAndAllowedType(finalLevelId, inputObj.type, itemHierarchyIdFromAssignment, tenantClient);
        shouldCreateAssignment = true;
      } else {
        throw new Error("Invalid hierarchyAssignments structure provided by client. Missing hierarchy.id or level.id.");
      }
    } else if (inputObj.levelId) { // Case 2: Client explicitly provides top-level levelId
      console.log(`[MUTATE] Validating client-provided levelId: ${inputObj.levelId} for node type ${inputObj.type}`);
      if (!itemHierarchyId) {
        throw new Error('Hierarchy ID is required when providing levelId');
      }
      await validateLevelIdAndAllowedType(inputObj.levelId, inputObj.type, itemHierarchyId, tenantClient);
      finalLevelId = inputObj.levelId;
      shouldCreateAssignment = true;
    } else if (inputObj.parentId) { // Case 3: Client provides parentId, calculate level
      console.log(`[MUTATE] Looking up levelId for parentId: ${inputObj.parentId} in hierarchy ${itemHierarchyId}`);
      if (!itemHierarchyId) {
        throw new Error('Hierarchy ID is required when providing parentId');
      }
      const calculatedLevelId = await getLevelIdForNode(inputObj.parentId, itemHierarchyId, inputObj.type, tenantClient);
      console.log(`[MUTATE] Validating calculated levelId: ${calculatedLevelId} for node type ${inputObj.type}`);
      await validateLevelIdAndAllowedType(calculatedLevelId, inputObj.type, itemHierarchyId, tenantClient);
      finalLevelId = calculatedLevelId;
      shouldCreateAssignment = true;
    }

    const nodeInput: EnrichedNodeInput = {
      id: inputObj.id,
      label: inputObj.label,
      type: inputObj.type,
    };

    if (shouldCreateAssignment && finalLevelId && itemHierarchyId) {
      // Use the client-provided hierarchyAssignments if available, otherwise construct from server logic
      if (inputObj.hierarchyAssignments && Array.isArray(inputObj.hierarchyAssignments) && inputObj.hierarchyAssignments.length > 0) {
        nodeInput.hierarchyAssignments = inputObj.hierarchyAssignments;
      } else {
        nodeInput.hierarchyAssignments = [
          { hierarchy: { id: itemHierarchyId }, level: { id: finalLevelId } }
        ];
      }
    } else if (itemHierarchyId) {
      // Auto-assign to appropriate level when hierarchy header provided but no specific assignment info
      console.log(`[MUTATE] Auto-assigning node ${inputObj.id} (${inputObj.type}) to hierarchy ${itemHierarchyId}`);
      try {
        // Use null as parentId to assign to level 1 (root level)
        const autoLevelId = await getLevelIdForNode(null, itemHierarchyId, inputObj.type, tenantClient);
        console.log(`[MUTATE] Validating auto-assigned levelId: ${autoLevelId} for node type ${inputObj.type}`);
        await validateLevelIdAndAllowedType(autoLevelId, inputObj.type, itemHierarchyId, tenantClient);
        
        nodeInput.hierarchyAssignments = [
          { hierarchy: { id: itemHierarchyId }, level: { id: autoLevelId } }
        ];
        console.log(`[MUTATE] Auto-assigned node ${inputObj.id} to level ${autoLevelId} in hierarchy ${itemHierarchyId}`);
      } catch (error) {
        console.error(`[MUTATE] Failed to auto-assign node ${inputObj.id} to hierarchy ${itemHierarchyId}:`, error);
        throw error; // Re-throw validation errors
      }
    } else {
      // This case should not happen due to header validation above, but keeping for safety
      throw new Error('Hierarchy context is required for node creation');
    }

    enrichedInputs.push(nodeInput);
  }
  
  return { ...variables, input: enrichedInputs };
}
