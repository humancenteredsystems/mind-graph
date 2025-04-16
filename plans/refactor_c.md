# Plan C: Add Node Connected to Selected (Level-Aware)

**Goal:** Allow the user to add a new node (at `level + 1`) connected from a selected node via a context menu.

**Prerequisites:**
*   Frontend `NodeData` interface includes `level`.
*   Frontend state accurately reflects the `level` of displayed nodes.
*   `uuid` library installed in frontend (`npm install uuid @types/uuid`).

**User Interaction:**
1.  User right-clicks on an existing node (the "parent").
2.  A context menu appears.
3.  User selects the "Add Child Node" option.
4.  A form/modal appears prompting for the new node's `label` and `type`.
5.  User submits the form.

**Frontend Implementation (`GraphView.tsx`, `App.tsx`, `ApiService.ts`):**
1.  **Event Handling & Context Menu (`GraphView.tsx`):**
    *   Use `cy.on('cxttap', 'node', handler)`.
    *   Inside the handler:
        *   Get the parent node ID.
        *   Display the context menu with an "Add Child Node" option.
        *   The menu item's click handler should trigger the display of the input form/modal, passing the `parentId`.
2.  **UI Elements (`GraphView.tsx` / New Component):**
    *   Implement the form/modal for inputting `label` and `type`.
3.  **API Call (`App.tsx` / `ApiService.ts`):**
    *   Implement `handleAddNewNode(parentId, newNodeInputData)`:
        *   Find the parent node's data in the current state to get its `level` (let's say `parentLevel`). If not found, handle error or assume a default.
        *   Calculate `newNodeLevel = parentLevel + 1`.
        *   Generate `newNodeId` using `uuidv4()`.
        *   Construct the GraphQL mutation, ensuring the `addNode` part includes the calculated `level`:
            ```graphql
            mutation AddNodeAndConnect($parentId: String!, $newNodeId: String!, $label: String!, $type: String!, $level: Int!, $edgeType: String!) {
              # Part 1: Add the new node with its level
              addNode(input: [{id: $newNodeId, label: $label, type: $type, level: $level}]) {
                node { id } # Return minimal confirmation
              }
              # Part 2: Update the parent node to link to the new node via the outgoing edge
              updateNode(input: {
                filter: { id: { eq: $parentId } },
                # Use 'add' if outgoing is a list, 'set' might overwrite existing edges
                # Assuming 'outgoing' is a list based on schema [Edge]
                add: {
                  outgoing: [{ type: $edgeType, to: { id: $newNodeId } }]
                }
              }) {
                 node { id } # Confirm update
              }
            }
            ```
        *   Define variables for the mutation: `{ parentId, newNodeId, label: newNodeInputData.label, type: newNodeInputData.type, level: newNodeLevel, edgeType: "connects_to" }` (using a default `edgeType`).
        *   Call `ApiService.executeMutation(mutationString, variables)`.
        *   Use loading indicators and handle errors (e.g., display message to user).
4.  **State Update (`App.tsx`):**
    *   Upon successful API response:
        *   Create the new node object: `{ id: newNodeId, label: newNodeInputData.label, type: newNodeInputData.type, level: newNodeLevel }`.
        *   Create the new edge object: `{ source: parentId, target: newNodeId, type: "connects_to" }`.
        *   Update the `nodes` and `edges` state by concatenating the new items.
5.  **Rendering (`GraphView.tsx`):**
    *   Component re-renders, `useEffect` updates Cytoscape, layout runs.

**API Interaction:**
*   Uses existing `POST /api/mutate`. Requires frontend to send `level` in variables.

**Key Considerations:**
*   Assumes parent node's level is available in the frontend state. Need error handling if parent node data isn't found locally.
*   The mutation uses `add` for the `outgoing` edge list, assuming it's defined as `[Edge]` in the schema and we want to append, not replace. Verify this against the Dgraph schema update behavior.
*   Decide on a default `edgeType` ("connects_to" used as example) or add it to the user form.
*   Requires `uuid` library in frontend.
