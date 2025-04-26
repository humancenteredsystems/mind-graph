# UI Elements Specification

This document describes the primary UI components in the MakeItMakeSense.io graph interface: context menus, the Add-Node modal, and the Edit-Node drawer. It serves as both developer reference and human-friendly guide.

---

## 1. Context Menus

Implemented by `<ContextMenu>` via `ContextMenuContext`. Right-click on the graph triggers one of three menus:

### 1.1 Background Context Menu

**Trigger**  
• Right-click on empty canvas  
**Items**

| Label               | Icon | Shortcut   | Handler                  | Description                                               |
|---------------------|------|------------|--------------------------|-----------------------------------------------------------|
| Add Node            | ➕   | A          | `openAddModal(parentId)` | Opens the Add-Node modal for creating a new node          |
| Load Complete Graph | 📂   | L          | `loadInitialGraph(root)` | Fetches & displays the entire graph                      |
| Clear Graph         | 🗑️   | Ctrl+Del   | `resetGraph()`           | Clears canvas (prompts for confirmation)                  |

### 1.2 Node Context Menu

**Trigger**  
• Right-click on a node  
**Items**

| Label               | Icon    | Shortcut | Handler                    | Description                                           |
|---------------------|---------|----------|----------------------------|-------------------------------------------------------|
| Add Connected Node  | ➕      | A        | `openAddModal(nodeId)`     | Opens Add-Node modal with this node as parent         |
| Edit Node           | ✏️      | Ctrl+E   | `openEditDrawer(node)`     | Opens right-side drawer to edit this node’s details   |
| Delete Node         | 🗑️      | Del      | `onDeleteNode(nodeId)`     | Permanently remove node & its edges                   |
| Hide Node           | 👁️‍🗨️  | H        | `onHideNode(nodeId)`       | Temporarily hide node & its edges                     |
| Expand Children     | ▶️      | E        | `onNodeExpand(nodeId)`     | Load & display direct children                        |
| Expand Descendents  | ▶️▶️   | E, then E| `onExpandDesc(nodeId)`     | Recursively show all descendants                      |
| Collapse Descendents| ◀️◀️   | C        | `onCollapseDesc(nodeId)`   | Collapse this node’s descendants                      |

### 1.3 Multi-Node Operations

**Trigger**  
• Right-click with multiple nodes selected  
**Items mirror Node Context, operating on `nodeIds` array:**

| Label                  | Icon  | Shortcut | Handler                      | Description                                 |
|------------------------|-------|----------|------------------------------|---------------------------------------------|
| Add Connected Nodes    | ➕     | A        | `openAddModal(nodeId)`       | Open modal for each selected node           |
| Edit Nodes             | ✏️     | Ctrl+E   | `openEditDrawer(node)`       | Open drawer for each selected node          |
| Delete Nodes           | 🗑️     | Del      | `onDeleteNodes(nodeIds)`     | Remove selected nodes & edges               |
| Hide Nodes             | 👁️‍🗨️ | H        | `onHideNodes(nodeIds)`       | Hide selected nodes & edges                 |
| Expand Children (All)  | ▶️     | E        | `onNodeExpandBatch(nodeIds)` | Load children for all selected nodes        |
| Expand Descendents     | ▶️▶️   | E, then E| `onExpandDescBatch(nodeIds)` | Recursively expand all descendants          |
| Collapse Descendents   | ◀️◀️   | C        | `onCollapseDescBatch(nodeIds)`| Collapse descendants for all selected nodes|

---

## 2. Add-Node Modal

Component: `<NodeFormModal>` (`/frontend/src/components/NodeFormModal.tsx`); controlled by `UIContext`.

### Trigger

• `openAddModal(parentId?)`

### Props

- `open: boolean`  
- `initialValues?` (unused for Add)  
- `onSubmit({ label, type })`  
- `onCancel()`

### Fields

- **Label** (text input, required)  
- **Type** (dropdown: concept, example, question)

### Actions

- **Save** → validate, call `onSubmit`, close modal  
- **Cancel** → `onCancel`, close modal

### Accessibility

- Centered overlay with backdrop  
- Focus trapping, Esc closes

---

## 3. Edit-Node Drawer

Component: `<NodeDrawer>` (`/frontend/src/components/NodeDrawer.tsx`); controlled by `UIContext`.

### Trigger

• `openEditDrawer(nodeData)`

### Layout

- Fixed right panel (320px)  
- Tabs: **Info**, **Links**, **History**

### Info Tab

- Same fields as Add-Node modal, pre-populated  
- **Save** → call `onSave`, close drawer  
- **Cancel** → call `onClose`, close drawer

### Links/History

- Placeholders

---

## 4. UI Context

File: `/frontend/src/context/UIContext.tsx`

Manages modal/drawer state:

- `openAddModal(parentId?)` / `closeAddModal()`  
- `openEditDrawer(nodeData)` / `closeEditDrawer()`

---

## 5. Testing

- **Unit**: `<ContextMenu>`, `<NodeFormModal>`, `<NodeDrawer>` interactions  
- **E2E**: right-click → open modal/drawer → save/cancel flows

