---
title: "refactor02: Nested Hierarchy Assignment in AddNode Mutation"
files:
  - schemas/default.graphql
  - api/server.js
  - frontend/src/graphql/mutations.ts
  - frontend/src/hooks/useGraphState.ts
  - frontend/src/services/ApiService.ts
  - api/integration.test.js
  - frontend/src/hooks/useGraphState.test.ts
  - docs/api_endpoints.md
  - /readme.md
---

# refactor02: Nested Hierarchy Assignment in AddNode Mutation

## Objective
Streamline node creation by embedding hierarchy assignment directly in the `addNode` mutation. New nodes (stand-alone or connected) should automatically receive a `HierarchyAssignment` for the active hierarchy and correct level without a separate mutation.

## Root Cause
Current client and server logic use two distinct mutations (`addNode` + `addHierarchyAssignment`), scattering hierarchy concerns and requiring multiple round-trips. The Dgraph schema supports nested assignment inputs, which we can leverage in one atomic call.

## Plan

1. Confirm Schema Supports Nested Assignments  
   - Verify `AddNodeInput` in `schemas/default.graphql` includes:
     ```graphql
     hierarchyAssignments: [AddHierarchyAssignmentInput!]
     ```

2. Update Frontend Mutation  
   - In `frontend/src/graphql/mutations.ts`, ensure:
     ```ts
     export const ADD_NODE_WITH_HIERARCHY = `
       mutation AddNodeWithHierarchy($input: [AddNodeInput!]!) {
         addNode(input: $input) {
           node {
             id
             label
             type
             status
             branch
             hierarchyAssignments {
               id
               hierarchy { id name }
               level { id levelNumber label }
             }
           }
         }
       }
     `;
     ```
   - Remove or deprecate `ADD_NODE_MUTATION` if no longer needed.

3. Refactor Client Logic  
   - In `frontend/src/hooks/useGraphState.ts`:
     - Switch `addNode` to call `ADD_NODE_WITH_HIERARCHY` with:
       ```ts
       const variables = { input: [ { id, label, type, parentId } ] };
       const result = await executeMutation(ADD_NODE_WITH_HIERARCHY, variables, { 'X-Hierarchy-Id': hierarchyId });
       ```
     - Remove the separate `ADD_EDGE_MUTATION` step.
     - Map returned `hierarchyAssignments` into `nodes` state.

4. Enrich Mutation Variables on Server  
   - In `api/server.js`, `/api/mutate` handler:
     1. Detect `addNode` mutations by inspecting `req.body.mutation`.
     2. Parse `variables.input` array. For each entry:
        - Retrieve `hierarchyId` from `X-Hierarchy-Id` header or via fallback query.
        - Determine `levelId` via helper `getLevelIdForNode(parentId, hierarchyId)`.
        - Attach nested:
          ```js
          inputObj.hierarchyAssignments = [
            { hierarchy: { id: hierarchyId }, level: { id: levelId } }
          ];
          ```
     3. Pass the enriched inputs into `executeGraphQL`.

5. Service Layer Enhancement  
   - In `frontend/src/services/ApiService.ts`, optionally add an Axios interceptor to automatically inject the `X-Hierarchy-Id` header from `HierarchyContext` for all mutation requests.

6. Testing  
   - **API Integration** (`api/integration.test.js`):  
     - POST `/api/mutate` with `AddNodeWithHierarchy` payload and `X-Hierarchy-Id` header.  
     - Assert response contains `hierarchyAssignments` with correct `hierarchy.id` and `level.id`.  
   - **Frontend Unit** (`frontend/src/hooks/useGraphState.test.ts`):  
     - Mock `executeMutation` to return nested assignments and verify `nodes` state updated accordingly.

7. Documentation  
   - Update `/docs/api_endpoints.md` to document:
     - New `AddNodeWithHierarchy` mutation behavior.
     - Required header `X-Hierarchy-Id` for `/api/mutate`.
   - Confirm related notes in `/docs/schema_notes.md`.

This nested-into-`addNode` approach aligns with the multi-hierarchy schema, reduces client complexity, and ensures atomic, consistent data writes.
