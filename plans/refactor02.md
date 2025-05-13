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
   - In `frontend/src/graphql/mutations.ts`, redefine `ADD_NODE_MUTATION`:
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
   - Remove any separate assignment calls in `useGraphState.addNode`.

3. Enrich Mutation Variables on Server  
   - In `api/server.js` `/api/mutate` handler:
     1. Detect `addNode` mutations by inspecting `req.body.mutation`.
     2. Parse `variables.input` array. For each entry:
        - Read `hierarchyId` from `X-Hierarchy-Id` header or fetch the first hierarchy via:
          ```graphql
          query { queryHierarchy { id } }
          ```
        - Determine `levelId`:
          - If entry includes `parentId` metadata, query the parent’s assignment:
            ```graphql
            query ParentLevel($id: String!, $h: String!) {
              queryNode(filter: { id: { eq: $id } }) {
                hierarchyAssignments(filter: { hierarchy: { id: { eq: $h } } }) {
                  level { levelNumber id }
                }
              }
            }
            ```
            Then find the matching `HierarchyLevel.id` for `levelNumber + 1`.
          - Otherwise, query the level 1 ID:
            ```graphql
            query DefaultLevel($h: String!) {
              queryHierarchyLevel(filter: { hierarchy: { id: { eq: $h } }, levelNumber: { eq: 1 } }) {
                id
              }
            }
            ```
     3. For each `input` object, attach:
        ```js
        inputObj.hierarchyAssignments = [
          { hierarchy: { id: hierarchyId }, level: { id: levelId } }
        ];
        ```
   - Pass the enriched `variables` into `executeGraphQL(mutation, variables)`.

4. Single GraphQL Call  
   - Execute one nested mutation; Dgraph will create the node and its assignment atomically.

5. Frontend Usage  
   - In `useGraphState.addNode`, switch to using `ADD_NODE_WITH_HIERARCHY`.  
   - Send `X-Hierarchy-Id` header with each `/api/mutate` request (sourced from `HierarchyContext.hierarchyId`).  
   - No further client-side assignment mutations.

6. Testing  
   - **API Integration** (`api/integration.test.js`):  
     - POST `/api/mutate` with `addNode` payload and header `X-Hierarchy-Id`.  
     - Assert response contains `hierarchyAssignments` with correct `hierarchy.id` and `level.id`.  
   - **Frontend Tests** (`GraphView` or `useGraphState.test.ts`):  
     - Simulate creating a node. Verify updated `nodes` state includes non-empty `assignments`.

7. Documentation  
   - Update `/docs/api_endpoints.md` specifying `addNode` supports nested `hierarchyAssignments`.  
   - Note required header `X-Hierarchy-Id`.  
   - Confirm `@id String!` usage in `/docs/schema_notes.md` for all `id` fields.

This nested-into-`addNode` approach aligns with the multi-hierarchy schema, reduces client complexity, and ensures atomic, consistent data writes.
