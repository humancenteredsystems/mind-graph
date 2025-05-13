# refactor02: Server-Side Hierarchy Assignment on Node Creation

## Objective
Ensure every new node created via the frontend is automatically assigned to the active hierarchy and correct level, without requiring client-side assignment logic.

## Root Cause
The current frontend flow issues separate “addNode” and “addHierarchyAssignment” mutations, scattering hierarchy logic in the client and risking inconsistent data. Centralizing assignment in the API layer promotes reuse and separation of concerns.

## Plan

1. **Detect AddNode Requests**  
   - In `api/server.js`, modify the `/api/mutate` handler to inspect the `mutation` string for the `addNode` operation.

2. **Extract Created Node IDs**  
   - After forwarding the `addNode` mutation to Dgraph via `executeGraphQL`, capture the returned node IDs:
     ```js
     const addResult = await executeGraphQL(mutation, variables);
     const createdNodes = addResult.data?.addNode?.node || [];
     ```

3. **Inject Hierarchy Context**  
   - Determine the active `hierarchyId`:
     - Read from a custom HTTP header (`X-Hierarchy-Id`) set by the frontend.
     - Fallback to a default from environment variables (e.g. `process.env.DEFAULT_HIERARCHY_ID`).

4. **Fetch Default Level for New Nodes**  
   - Option A: Preconfigure a default `levelId` in environment (e.g. “Domains” level).  
   - Option B: Query Dgraph for the first level of that hierarchy:
     ```graphql
     query DefaultLevel($h: String!) {
       queryHierarchyLevel(filter: { hierarchy: { id: { eq: $h } }, levelNumber: { eq: 1 } }) {
         id
       }
     }
     ```

5. **Compose and Execute Assignment Mutation**  
   - Build a single `addHierarchyAssignment` mutation for all created nodes:
     ```graphql
     mutation Assign($input: [AddHierarchyAssignmentInput!]!) {
       addHierarchyAssignment(input: $input) { hierarchyAssignment { id node { id } level { id } } }
     }
     ```
   - Variables:
     ```js
     { input: createdNodes.map(n => ({
         node: { id: n.id },
         hierarchy: { id: hierarchyId },
         level: { id: defaultLevelId }
       }))
     }
     ```
   - Execute via `executeGraphQL`.

6. **Merge and Return Combined Result**  
   - Construct a response object merging `addNode` and `addHierarchyAssignment` results.
   - Respond to the client with both node data and assignment metadata.

7. **Remove Client-Side Assignment**  
   - In `frontend/src/hooks/useGraphState.ts`, remove any nested assignment calls after `addNode`.
   - Simplify `addNode` to only call `ADD_NODE_MUTATION`.

8. **Testing**  
   - Write API integration tests in `api/integration.test.js`:
     - Call `/api/mutate` with `addNode` payload and `X-Hierarchy-Id`.
     - Assert the response includes both `addNode.node` and `addHierarchyAssignment.hierarchyAssignment`.
   - Update any frontend tests that previously asserted client-side assignment.

9. **Documentation**  
   - Update `/docs/api_endpoints.md` describing new server behavior.
   - Note required header (`X-Hierarchy-Id`) in API docs.

---
