const { 
  validateHierarchyId, 
  validateLevelIdAndAllowedType, 
  getLevelIdForNode 
} = require('./validation');

/**
 * Enriches addNode inputs with nested hierarchyAssignments
 * Handles validation and transformation of client input for node creation
 */
async function enrichNodeInputs(variables, hierarchyIdFromHeader, mutation) {
  // Only enrich AddNodeWithHierarchy mutations; simple AddNode mutations bypass enrichment
  if (!Array.isArray(variables.input) || !mutation.includes('AddNodeWithHierarchy')) {
    return variables;
  }

  const enrichedInputs = [];
  
  for (const inputObj of variables.input) {
    // Client can override hierarchyId per input item, this also needs validation
    let itemHierarchyId = inputObj.hierarchyId || hierarchyIdFromHeader;

    if (inputObj.hierarchyId && inputObj.hierarchyId !== hierarchyIdFromHeader) {
      const isItemHierarchyValid = await validateHierarchyId(inputObj.hierarchyId);
      if (!isItemHierarchyValid) {
        throw new Error(`Invalid hierarchyId in input item: ${inputObj.hierarchyId}. Hierarchy not found.`);
      }
    }
    // itemHierarchyId is now validated (either it's the validated header one, or a validated one from input)

    // Process each input object for node creation
    let finalLevelId = null; // Will hold the levelId if an assignment is to be made
    let shouldCreateAssignment = false;

    // Case 1: Client provides hierarchyAssignments array (standard frontend structure)
    if (inputObj.hierarchyAssignments && Array.isArray(inputObj.hierarchyAssignments) && inputObj.hierarchyAssignments.length > 0) {
      const hierarchyAssignment = inputObj.hierarchyAssignments[0];
      const itemHierarchyIdFromAssignment = hierarchyAssignment.hierarchy?.id;
      finalLevelId = hierarchyAssignment.level?.id;
      
      if (itemHierarchyIdFromAssignment && finalLevelId) {
        console.log(`[MUTATE] Processing client-provided hierarchyAssignments: hierarchyId=${itemHierarchyIdFromAssignment}, levelId=${finalLevelId} for node type ${inputObj.type}`);
        await validateLevelIdAndAllowedType(finalLevelId, inputObj.type, itemHierarchyIdFromAssignment);
        shouldCreateAssignment = true;
      } else {
        throw new Error("Invalid hierarchyAssignments structure provided by client. Missing hierarchy.id or level.id.");
      }
    } else if (inputObj.levelId) { // Case 2: Client explicitly provides top-level levelId
      console.log(`[MUTATE] Validating client-provided levelId: ${inputObj.levelId} for node type ${inputObj.type}`);
      await validateLevelIdAndAllowedType(inputObj.levelId, inputObj.type, itemHierarchyId);
      finalLevelId = inputObj.levelId;
      shouldCreateAssignment = true;
    } else if (inputObj.parentId) { // Case 3: Client provides parentId, calculate level
      console.log(`[MUTATE] Looking up levelId for parentId: ${inputObj.parentId} in hierarchy ${itemHierarchyId}`);
      const calculatedLevelId = await getLevelIdForNode(inputObj.parentId, itemHierarchyId);
      console.log(`[MUTATE] Validating calculated levelId: ${calculatedLevelId} for node type ${inputObj.type}`);
      await validateLevelIdAndAllowedType(calculatedLevelId, inputObj.type, itemHierarchyId);
      finalLevelId = calculatedLevelId;
      shouldCreateAssignment = true;
    }

    const nodeInput = {
      id: inputObj.id,
      label: inputObj.label,
      type: inputObj.type,
    };

    if (shouldCreateAssignment && finalLevelId) {
      // Use the client-provided hierarchyAssignments if available, otherwise construct from server logic
      if (inputObj.hierarchyAssignments && Array.isArray(inputObj.hierarchyAssignments) && inputObj.hierarchyAssignments.length > 0) {
        nodeInput.hierarchyAssignments = inputObj.hierarchyAssignments;
      } else {
        nodeInput.hierarchyAssignments = [
          { hierarchy: { id: itemHierarchyId }, level: { id: finalLevelId } }
        ];
      }
    } else if (!inputObj.hierarchyAssignments && !inputObj.levelId && !inputObj.parentId) {
      // If no hierarchy assignment information provided, do not automatically create an assignment here.
      // The node will be created without an assignment.
      // This allows seed_data.py to explicitly assign later.
      console.log(`[MUTATE] Node ${inputObj.id} (${inputObj.type}) will be created without an initial hierarchy assignment by addNode.`);
    }

    enrichedInputs.push(nodeInput);
  }
  
  return { ...variables, input: enrichedInputs };
}

module.exports = {
  enrichNodeInputs
};
