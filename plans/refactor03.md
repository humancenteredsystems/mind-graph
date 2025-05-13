# refactor03: Populate Full Node Data on Double-Click

## Objective
Ensure that double-clicking a node opens the NodeDrawer with all node fields (label, type, hierarchy assignments, status, branch) populated.

## Root Cause
In `frontend/src/components/GraphView.tsx`, the double-click handlers (`handleTap` and `handleDoubleTap`) invoke `onEditNode(nodeId)`—passing only the node’s ID. The `NodeDrawer` therefore receives only an ID, leaving other fields undefined.

## Plan

1. Update `GraphView.tsx` double-click callbacks:
   - In the manual double-click logic inside `handleTap`, change:
     ```js
     onEditNode(nodeId);
     ```
     to:
     ```js
     const nodeData = nodes.find(n => n.id === nodeId);
     if (nodeData) {
       onEditNode(nodeData);
     }
     ```
   - In the `handleDoubleTap` event handler, similarly replace `onEditNode(nodeId)` with `onEditNode(nodeData)` using the full `NodeData` object.

2. Verify `onEditNode` prop type:
   - In `GraphViewProps`, ensure `onEditNode` is declared as `(node: NodeData) => void`.

3. Adjust any ContextMenu or other callers:
   - Confirm that `ContextMenuContext` and `NodeDrawer` consumers expect `NodeData` rather than a string ID.

4. Add tests:
   - In `frontend/src/components/GraphView.test.tsx` or an E2E test, simulate a double-click on a rendered node.
   - Assert that the `NodeDrawer` opens and its form fields (`label`, `type`, etc.) are populated from the node’s data.

5. Documentation:
   - Update `/docs/ui-elements.md` under **Edit-Node Drawer** to note that `openEditDrawer` receives the full `NodeData` object.

---
