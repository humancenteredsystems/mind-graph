# UI Context Menus Specification

This document captures all context-menu patterns in MakeItMakeSense.io’s graph interface. It serves as both a human-friendly reference and a precise developer guide. Whenever you right-click in the graph canvas, you’ll see one of two menus:

1. **Background Context Menu** – for actions on the empty canvas  
2. **Node Context Menu** – for actions on an individual node  
3. **Multi-Node Operations** – for actions on multiple selected nodes  

---

## 1. Background Context Menu

**Trigger**  
• Right-click on any blank area of the graph (no node beneath cursor).

**Purpose**  
Provide global graph commands when no node is selected.

**Menu Items**

| Label                 | Icon      | Keyboard Shortcut | Handler Function            | Description                                                                    |
|-----------------------|-----------|-------------------|-----------------------------|--------------------------------------------------------------------------------|
| Add Node              | ➕        | A                 | `onAddNode(parentId, pos)`  | Opens the “Add Node” dialog at cursor position.                                |
| Load Complete Graph   | 📂        | L                 | `loadInitialGraph(rootId)`  | Fetches and renders the entire graph from backend.                             |
| Clear Graph           | 🗑️        | Ctrl + Del        | `resetGraph()` *(to add)*   | Removes all nodes and edges from the canvas (requires confirmation).           |

**Best Practices**  
- Disable “Load Complete Graph” if the graph is already fully loaded.  
- Confirm with user before “Clear Graph” if unsaved changes exist.  
- Always close the context menu when the user clicks elsewhere.  
- Use Ctrl + [Key] for all combo shortcuts; avoid Shift + combos.

---

## 2. Node Context Menu

**Trigger**  
• Right-click on any node element.

**Purpose**  
Offer node-specific operations: creation, removal, expansion, visibility, and editing.

**Menu Items**

| Label                     | Icon      | Shortcut         | Handler Function                | Description                                                                                                      |
|---------------------------|-----------|------------------|---------------------------------|------------------------------------------------------------------------------------------------------------------|
| Add Connected Node        | ➕        | A                | `addNode(nodeId, pos)`          | Create a new node connected to this node at the clicked position.                                               |
| Delete Node               | 🗑️        | Del              | `deleteNode(nodeId)` *(to add)* | Permanently remove this node and its connected edges.                                                           |
| Hide Node                 | 👁️‍🗨️    | H                | `hideNode(nodeId)` *(to add)*   | Temporarily hide this node (and its edges) from view.                                                           |
| Expand Children           | ▶️        | E                | `expandNode(nodeId)`            | Load and display direct children one level down.                                                                 |
| Expand Descendents        | ▶️▶️     | E, then E        | `expandNode(nodeId, depthAll)` *(to add)* | Press E twice: first expands direct children, second expands all nested descendants.             |
| Collapse Descendents      | ◀️◀️     | C                | `collapseDescendents(nodeId)` *(to add)* | Collapse all expanded descendants back into this node.                                     |
| Edit Node                 | ✏️        | Ctrl + E         | `editNode(nodeId)` *(to add)*   | Open an edit dialog for this node’s properties.                                                                |

**Best Practices**  
- Group related actions (Add/Delete/Hide/Edit) at top, navigation (Expand/Collapse) below.  
- Use separators to visually split creation/removal from hierarchy commands.  
- Grey-out “Expand Children” if already expanded; grey-out “Collapse Descendents” if nothing is expanded.

---

## 3. Multi-Node Operations

**Trigger**  
• Right-click when multiple nodes are selected (e.g., via Shift-click), or select then right-click.

**Purpose**  
Bulk operations on selected nodes, mirroring single-node actions.

**Menu Items**

| Label                       | Icon      | Shortcut         | Handler Function                     | Description                                                                                 |
|-----------------------------|-----------|------------------|--------------------------------------|---------------------------------------------------------------------------------------------|
| Add Connected Nodes         | ➕        | A                | `addNodes(nodeIds, pos)`             | Create new nodes connected to each selected node at clicked position.                       |
| Delete Nodes                | 🗑️        | Del              | `deleteNodes(nodeIds)`               | Permanently remove selected nodes and their connected edges.                                |
| Hide Nodes                  | 👁️‍🗨️        | H                | `hideNodes(nodeIds)`                 | Temporarily hide selected nodes and their edges.                                           |
| Expand Children (All)       | ▶️        | E                | `expandNodes(nodeIds)`               | Load and display direct children for each selected node.                                    |
| Expand Descendents (All)    | ▶️▶️      | E, then E        | `expandNodes(nodeIds, depthAll)`     | Recursively load all nested descendants for selected nodes.                                 |
| Collapse Descendents (All)  | ◀️◀️      | C                | `collapseDescendents(nodeIds)`       | Collapse all expanded descendants back into each selected node.                            |

---

## 4. Implementation Notes

- **Component**: `ContextMenu` (to be created under `src/components/ContextMenu.tsx`)  
- **State**: track `menuItems`, `position`, and `selection` in a React context hook for easy reuse.  
- **Accessibility**:  
  - Support keyboard navigation (Up/Down arrows, Enter to select, Esc to close).  
  - Announce menu opening/closing to screen readers.

---

## 5. Testing Reference

- **Unit Tests**:  
  - Verify `ContextMenu` renders correct items given `menuType` and `selection` props.  
  - Simulate right-click in `GraphView.test.tsx` for single and multiple selections and assert menu visibility and props.  
- **End-to-End** (Playwright):  
  - Right-click blank canvas → verify “Add Node”, “Load Complete Graph”, “Clear Graph” appear.  
  - Right-click a node → verify node-specific options and hotkeys work.  
  - Select multiple nodes → right-click → verify multi-node options appear and trigger correct API calls.

---

> This specification lives alongside our code. When adding or modifying menu items, update this file first, then adjust `ContextMenu.tsx` and its tests to stay in sync.
