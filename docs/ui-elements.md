# UI Elements Specification

This document describes the primary UI components in the MakeItMakeSense.io graph interface: context menus, the Add-Node modal, and the Edit-Node drawer. It serves as both developer reference and human-friendly guide.

---

## 1. Context Menus

Implemented by `<ContextMenu>` via `ContextMenuContext`. Right-click on the graph triggers one of three menus:

### 1.1 Background Context Menu

Trigger  
• Right-click on empty canvas  
Items

| Label               | Icon | Shortcut   | Handler                  | Description                                              |
|---------------------|------|------------|--------------------------|----------------------------------------------------------|
| Add Node            | ➕   | A          | `openAddModal(parentId)` | Opens the Add-Node modal for creating a new root or child |
| Load Complete Graph | 📂   | L          | `loadInitialGraph(root)` | Fetches & displays entire graph                          |
| Clear Graph         | 🗑️   | Ctrl+Del   | `resetGraph()`           | Clears canvas (prompts for confirmation)                 |

### 1.2 Node Context Menu

Trigger  
• Right-click on a node  
Items

| Label                 | Icon    | Shortcut | Handler                | Description                                           |
|-----------------------|---------|----------|------------------------|-------------------------------------------------------|
| Add Connected Node    | ➕      | A        | `openAddModal(nodeId)` | Opens Add-Node modal with this node as parent         |
| Edit Node             | ✏️      | Ctrl+E   | `openEditDrawer(node)` | Opens right-side drawer to edit properties            |
| Delete Node           | 🗑️      | Del      | `onDeleteNode(nodeId)` | Permanently remove node & its edges                  |
| Hide Node             | 👁️‍🗨️  | H        | `onHideNode(nodeId)`   | Temporarily hide node & edges                         |
| Expand Children       | ▶️      | E        | `onNodeExpand(nodeId)` | Load & show direct children                           |
| Expand Descendents    | ▶️▶️   | E, then E| `onExpandDesc(nodeId)` | Recursively show all descendants                      |
| Collapse Descendents  | ◀️◀️   | C        | `onCollapseDesc(nodeId)` | Collapse this node’s descendants                     |

### 1.3 Multi-Node Operations

Trigger  
• Right-click with multiple nodes selected  
Items mirror Node Context but operate on `nodeIds` array:

| Label                     | Icon  | Shortcut | Handler                    | Description                              |
|---------------------------|-------|----------|----------------------------|------------------------------------------|
| Add Connected Nodes       | ➕     | A        | `openAddModal(nodeId)`     | Open modal per selected node             |
| Edit Nodes                | ✏️     | Ctrl+E   | `openEditDrawer(node)`     | Open drawer per selected node            |
| Delete Nodes              | 🗑️     | Del      | `onDeleteNodes(nodeIds)`   | Remove all selected nodes & edges        |
| Hide Nodes                | 👁️‍🗨️ | H        | `onHideNodes(nodeIds)`     | Hide all selected nodes & edges          |
| Expand Children (All)     | ▶️     | E        | `onNodeExpandBatch(nodeIds)`| Load children for all selected nodes    |
| Expand Descendents (All)  | ▶️▶️   | E, then E| `onExpandDescBatch(nodeIds)`| Recursively expand descendants for all  |
| Collapse Descendents (All)| ◀️◀️   | C        | `onCollapseDescBatch(nodeIds)`| Collapse descendants for all selected |

---

## 2. Add-Node Modal

Component: `<NodeFormModal>` (in `/frontend/src/components/NodeFormModal.tsx`); controlled by `UIContext`.

### Trigger

• `openAddModal(parentId?)` from context menu

### Props

- `open: boolean`  
- `parentId?: string` (optional; when provided, modal will create a connecting edge)  
- `initialValues?` (unused for Add)  
- `onSubmit(values: { label: string; type: string })`  
- `onCancel()`

### Fields

- **Label** (text input, required)  
- **Type** (dropdown: concept, example, question)

### Actions

- **Save** → validate & call `onSubmit` (creates a new node and, if `parentId` is provided, also creates a connecting edge), close modal  
- **Cancel** → call `onCancel`, close modal

### Accessibility/UI

- Centered overlay with semi-opaque backdrop  
- Focus trapping, Esc closes

---

## 3. Edit-Node Drawer

Component: `<NodeDrawer>` (in `/frontend/src/components/NodeDrawer.tsx`); controlled by `UIContext`.

### Trigger

• `openEditDrawer(nodeData)`

### Layout

- Fixed panel on right (320px wide)  
- Tabs: **Info**, **Links**, **History**

### Info Tab

- Same fields as Add-Node modal, pre-populated  
- **Save** → call `onSave`, close drawer  
- **Cancel** → call `onClose`, close drawer

### Future Tabs

- **Links** and **History** placeholders

---

## 4. UI Context

File: `/frontend/src/context/UIContext.tsx`

Manages state for modals and drawers:

- `openAddModal(parentId?)` / `closeAddModal()`  
- `openEditDrawer(nodeData)` / `closeEditDrawer()`  

Context consumers: `ContextMenuContext`, `App`, and root in `main.tsx`

---

## 5. Testing Strategy

- **Unit Tests**:  
  - `<ContextMenu>` renders correct items for each menu type  
  - `<NodeFormModal>` and `<NodeDrawer>` form flows  
- **End-to-End**:  
  - Verify context-menu → modal/drawer open/cancel/save for single & multi node scenarios

> Keep this doc in sync: update here first, then adjust code and tests as needed.
