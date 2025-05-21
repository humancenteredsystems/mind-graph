# Plan: Refactor 12 - Server Hierarchy Assignment Processing

## Problem

When the frontend (`useGraphState`) sends an `addNode` mutation input that includes a `hierarchyAssignments` array (which is the standard way it's constructed), the backend API (`api/server.js`) in its `/api/mutate` endpoint does not correctly process this nested structure. Instead, its logic for determining whether to create a hierarchy assignment looks for top-level `levelId` and `parentId` properties on the incoming input object. Because these top-level properties are not present when `hierarchyAssignments` is sent, the server incorrectly decides that no hierarchy/level information was provided by the client and skips adding the `hierarchyAssignments` to the final Dgraph mutation input. This results in the node being created in Dgraph without the intended hierarchy assignment.

## Goal

Modify the server's `/api/mutate` endpoint to correctly identify and process the `hierarchyId` and `levelId` when they are provided within the nested `hierarchyAssignments` array in the client's `addNode` mutation input. Ensure the server uses this client-provided structure for validation and includes it in the Dgraph mutation input.

## Proposed Solution

Update the logic within the `for...of` loop in the `/api/mutate` endpoint handler in `api/server.js`. Before checking for top-level `levelId` or `parentId`, check if the incoming `inputObj` contains a `hierarchyAssignments` array with the necessary nested `hierarchy.id` and `level.id`. If it does, extract these IDs, perform validation, and ensure the client's `hierarchyAssignments` array is included in the `nodeInput` sent to Dgraph.

## Steps

1.  Open `api/server.js`.
2.  Locate the `app.post('/api/mutate', ...)` endpoint handler.
3.  Find the `if (Array.isArray(variables.input) && mutation.includes('AddNodeWithHierarchy'))` block.
4.  Inside the `for (const inputObj of variables.input)` loop, before the existing `if (inputObj.levelId)` check, add a new check:
    *   `if (inputObj.hierarchyAssignments && Array.isArray(inputObj.hierarchyAssignments) && inputObj.hierarchyAssignments.length > 0)`
    *   Inside this new `if` block:
        *   Extract `itemHierarchyId = inputObj.hierarchyAssignments[0].hierarchy?.id;`
        *   Extract `finalLevelId = inputObj.hierarchyAssignments[0].level?.id;`
        *   Set `shouldCreateAssignment = true;`
        *   Add validation: `if (itemHierarchyId && finalLevelId) { await validateLevelIdAndAllowedType(finalLevelId, inputObj.type, itemHierarchyId); } else { throw new Error("Invalid hierarchyAssignments structure provided by client."); }` (Refine error message as needed).
        *   Ensure the `nodeInput` object constructed later includes `hierarchyAssignments: inputObj.hierarchyAssignments`. The existing logic `if (shouldCreateAssignment && finalLevelId)` should handle this correctly if `shouldCreateAssignment` is set here.
5.  Adjust the subsequent `else if (inputObj.levelId)` and `else if (inputObj.parentId)` blocks to handle cases where `hierarchyAssignments` was *not* provided by the client (e.g., for compatibility or future use cases where the server *should* auto-assign based on top-level IDs or parent context). The current logic for these paths seems intended for those cases.
6.  Ensure the log `[MUTATE] Node ... will be created without an initial hierarchy assignment...` is only triggered when *no* assignment information (neither nested `hierarchyAssignments` nor top-level `levelId`/`parentId`) is found.

## Verification

1.  Restart the API server.
2.  Add a node from the background context menu, selecting a specific Hierarchy and Level.
3.  Check the API server logs:
    *   Verify that the log `[MUTATE] Node ... will be created without an initial hierarchy assignment...` is *not* present.
    *   Verify that the "Sending to Dgraph" log *includes* the `hierarchyAssignments` array with the correct hierarchy and level IDs.
4.  Open the Node Drawer for the newly created node and verify that the correct Hierarchy and Level are displayed. (Note: This verification also depends on the fix for Issue #1 being implemented).
