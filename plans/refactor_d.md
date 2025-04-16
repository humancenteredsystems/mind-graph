# Plan D: Add Edge Between Two Selected (Level-Aware)

**Goal:** Allow the user to select two existing nodes and add a directed edge between them via a context menu.

**Prerequisites:**
*   Frontend state includes node data (including IDs).

**User Interaction:**
1.  User selects the first node (source) (e.g., click).
2.  User selects the second node (target) (e.g., shift+click or ctrl+click).
3.  User right-clicks on *either* of the two selected nodes.
4.  A context menu appears.
5.  User selects the "Add Edge: [Source Label] -> [Target Label]" option (or similar).
6.  Optional: A prompt appears for the edge `type`.

**Frontend Implementation (`GraphView.tsx`, `App.tsx`, `ApiService.ts`):**
1.  **Selection Handling (`GraphView.tsx` / `App.tsx`):**
    *   Ensure Cytoscape allows multiple node selection.
    *   Track the currently selected nodes (e.g., using Cytoscape's `cy.selected('node')`).
2.  **Event Handling & Context Menu (`GraphView.tsx`):**
    *   Use `cy.on('cxttap', 'node', handler)`.
    *   Inside the handler:
        *   Get the collection of selected nodes: `const selectedNodes = cy.selected('node');`.
        *   If `selectedNodes.length === 2`:
            *   Get the data for both nodes (e.g., `const nodeA = selectedNodes[0].data(); const nodeB = selectedNodes[1].data();`).
            *   Display the context menu with dynamically generated options confirming direction:
                *   `Add Edge: ${nodeA.label || nodeA.id} -> ${nodeB.label || nodeB.id}`
                *   `Add Edge: ${nodeB.label || nodeB.id} -> ${nodeA.label || nodeA.id}`
            *   The click handler for the first option calls `handleAddNewEdge(nodeA.id, nodeB.id, edgeType)`.
            *   The click handler for the second option calls `handleAddNewEdge(nodeB.id, nodeA.id, edgeType)`.
        *   If selection count is not 2, show a different or no context menu.
3.  **UI Elements (`GraphView.tsx`):**
    *   Optional prompt for edge `type` (could be triggered after selecting direction). Use a default like "related_to" if no prompt.
4.  **API Call (`App.tsx` / `ApiService.ts`):**
    *   Implement `handleAddNewEdge(sourceNodeId, targetNodeId, edgeType)`:
        *   Construct a GraphQL mutation string to update the source node, adding an edge to its `outgoing` list:
            ```graphql
            mutation AddEdge($sourceId: String!, $targetId: String!, $edgeType: String!) {
              updateNode(input: {
                filter: { id: { eq: $sourceId } },
                # Use 'add' assuming 'outgoing' is a list in the schema
                add: {
                  outgoing: [{ type: $edgeType, to: { id: $targetId } }]
                }
              }) {
                 node { id } # Confirm update
              }
            }
            ```
        *   Define variables for the mutation: `{ sourceId: sourceNodeId, targetId: targetNodeId, edgeType: edgeType }`.
        *   Call `ApiService.executeMutation(mutationString, variables)`.
        *   Use loading indicators and handle errors.
5.  **State Update (`App.tsx`):**
    *   Upon successful API response:
        *   Create the new edge object: `{ source: sourceNodeId, target: targetNodeId, type: edgeType }`.
        *   **Check for duplicates:** Before adding, verify that an edge with the same source, target, and type doesn't already exist in the `edges` state array.
        *   If not a duplicate, update the `edges` state by concatenating the new edge.
6.  **Rendering (`GraphView.tsx`):**
    *   Component re-renders, `useEffect` updates Cytoscape, layout runs.

**API Interaction:**
*   Uses existing `POST /api/mutate`.

**Key Considerations:**
*   The UI logic for selecting two distinct nodes and the dynamic context menu generation needs careful implementation.
*   Decide on default edge type or implement the prompt.
*   Implement duplicate edge checking in the frontend state update logic.
*   Verify the use of `add` vs `set` in the `updateNode` mutation based on Dgraph schema behavior for list fields.
