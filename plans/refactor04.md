# refactor04: Clear Selection After Node Deletion

## Objective
After deleting nodes, reset multi‐selection state so that subsequent context menus reflect only the remaining selections.

## Root Cause
`GraphView` maintains the selected node IDs in `selectedOrderRef.current` and relies on Cytoscape’s selection state for context menu type. Deleting nodes in `useGraphState` updates graph data but does not clear `selectedOrderRef` or Cytoscape’s visual selection, leaving stale IDs that trigger the multi-node menu.

## Plan

1. **Synchronize Selection State**  
   In `frontend/src/components/GraphView.tsx`, add a `useEffect` that runs whenever the `nodes` prop changes:
   ```ts
   useEffect(() => {
     const cy = cyRef.current;
     if (!cy) return;
     // Keep only selections for existing nodes
     const validIds = new Set(nodes.map(n => n.id));
     selectedOrderRef.current = selectedOrderRef.current.filter(id => validIds.has(id));
     // Clear any visual selection in Cytoscape
     cy.elements(':selected').unselect();
     setSelectedCount(selectedOrderRef.current.length);
   }, [nodes]);
   ```
   This ensures that after any deletion, selection refs and visuals are reset.

2. **No Changes in State Hooks**  
   The cleanup in `GraphView` handles stale selections, so no modifications are needed in `useGraphState.deleteNode` or `deleteNodes`.

3. **Add E2E Test**  
   In `frontend/tests/context-menu.spec.ts` (or a new test), script the following:
   - Click Node A and Node B to select both.
   - Delete Node A from the context menu.
   - Right-click Node B.
   - Expect the single-node context menu (label “node”) to appear, not “multi-node.”

4. **Documentation**  
   Update `/docs/ui-elements.md` under **Context Menus → Node Context Menu** to note that after deletion, selection state is automatically cleared and the menu reflects the remaining nodes.

---
