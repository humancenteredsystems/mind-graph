# Plan A: Expand Node (Level-Aware)

**Goal:** Allow the user to expand a selected node via a context menu to show its immediate children (nodes at `level + 1`).

**Prerequisites:**
*   API endpoints (`/api/traverse`, etc.) must return the `level` field for nodes.
*   Frontend `NodeData` interface and `transformTraversalData` must handle the `level` field.
*   Graph data should have consistent `level` information.

**User Interaction:**
1.  User right-clicks on a node in the `GraphView`.
2.  A context menu appears.
3.  User selects the "Expand" option from the menu.

**Frontend Implementation (`GraphView.tsx`, `App.tsx`, `ApiService.ts`, `graphUtils.ts`):**
1.  **Event Handling & Context Menu (`GraphView.tsx`):**
    *   Add a Cytoscape event listener for right-clicks on nodes: `cy.on('cxttap', 'node', handler)`.
    *   Inside the handler:
        *   Prevent the default browser context menu.
        *   Get the ID of the target node (`event.target.id()`).
        *   Display a custom context menu component (positioned near the event coordinates). This menu should contain an "Expand" option.
        *   The "Expand" menu item's click handler should call the function passed down from `App.tsx` (e.g., `handleNodeExpand(nodeId)`).
    *   *(Consider using a Cytoscape context menu extension like `cytoscape-context-menus`)*.
2.  **State Management & API Call (`App.tsx`):**
    *   Implement `handleNodeExpand(nodeId)`:
        *   Find the selected node's data in the current state to get its `level` (let's say `currentLevel`).
        *   Check if children at `currentLevel + 1` are already displayed (requires tracking or checking existing nodes/edges). If already expanded visually, potentially do nothing or re-run layout.
        *   If not expanded, call `ApiService.fetchTraversalData(nodeId, 1, ['id', 'label', 'type', 'level'])`. Ensure `level` is requested.
        *   Use a loading indicator while fetching.
        *   Handle potential errors from the API call.
3.  **Data Processing (`App.tsx` / `graphUtils.ts`):**
    *   Upon successful API response from `fetchTraversalData`:
        *   Process the `rawData` ensuring `level` is included in transformed nodes.
        *   Filter out nodes/edges already present in state (compare by ID).
        *   Update the `nodes` and `edges` state by concatenating the existing state with the *new* unique nodes and edges.
4.  **Rendering (`GraphView.tsx`):**
    *   The component will re-render due to the state change.
    *   The `useEffect` hook that handles `nodes` and `edges` updates will run, adding the new elements to the Cytoscape instance.
    *   Ensure the layout (`klay`) is re-run to position the new elements appropriately.

**API Interaction:**
*   Uses existing `POST /api/traverse`. Requires the prerequisite API change to ensure `level` is returned.

**Key Considerations:**
*   Implementation of the custom context menu component or integration of a library.
*   Need state/logic to potentially disable "Expand" if already expanded.
*   Need an efficient way to check for and prevent duplicate nodes/edges when merging API results into the state.
*   Consider adding a visual indicator to nodes that have been expanded or have hidden children.
