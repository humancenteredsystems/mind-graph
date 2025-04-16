# Plan B: Collapse Node (Level-Aware)

**Goal:** Allow the user to collapse an expanded node via a context menu, hiding its descendants based on level.

**Prerequisites:**
*   Frontend `NodeData` interface includes `level`.
*   Frontend state accurately reflects the `level` of displayed nodes.
*   A mechanism exists (e.g., in node data or separate state) to track which nodes are currently considered "expanded".

**User Interaction:**
1.  User right-clicks on a node that has previously been expanded.
2.  A context menu appears.
3.  User selects the "Collapse" (or "Roll up") option from the menu.

**Frontend Implementation (`GraphView.tsx`, `App.tsx`, `graphUtils.ts`):**
1.  **Event Handling & Context Menu (`GraphView.tsx`):**
    *   Use the same `cy.on('cxttap', 'node', handler)` as Plan A.
    *   Inside the handler:
        *   Get the node ID.
        *   Determine if the node is currently considered "expanded" (using the tracking mechanism).
        *   Display the context menu. Conditionally show the "Collapse" option only if the node is expanded.
        *   The "Collapse" menu item's click handler calls `handleNodeCollapse(nodeId)`.
2.  **State Management & Logic (`App.tsx` / `graphUtils.ts`):**
    *   Implement `handleNodeCollapse(nodeId)`:
        *   Find the selected node's data in the current state to get its `level` (let's say `collapseLevel`).
        *   Implement a graph traversal function (e.g., in `graphUtils.ts`) that operates on the current `nodes` and `edges` state arrays. This function should start from `nodeId` and find all reachable descendant nodes.
        *   Filter the identified descendants: Keep only those nodes where `node.level > collapseLevel`. Let this set be `nodesToRemove`.
        *   Identify all edges connected *only* between nodes in `nodesToRemove`, or between `nodeId` and a node in `nodesToRemove`. Let this set be `edgesToRemove`.
        *   Create new `nodes` and `edges` arrays by filtering out `nodesToRemove` and `edgesToRemove` from the current state.
        *   Update the state with these filtered arrays.
        *   Update the tracking mechanism to mark `nodeId` as collapsed.
3.  **Rendering (`GraphView.tsx`):**
    *   The component re-renders due to the state change.
    *   The `useEffect` hook updates the Cytoscape instance, removing the collapsed elements.
    *   The layout should ideally re-run.

**API Interaction:**
*   None required. This is purely a frontend state manipulation.

**Key Considerations:**
*   The frontend graph traversal logic needs to be implemented carefully to correctly identify descendants *currently shown* in the UI state.
*   Requires robust state tracking to know which nodes are currently "expanded" to enable the "Collapse" option correctly.
*   Need a way to visually indicate that a node is collapsed but *can* be expanded again (perhaps using the same visual indicator as Plan A).
