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
| Load Complete Graph | 📂   | L          | `loadCompleteGraph()`    | Fetches & displays entire graph using iterative traversal |
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
| Expand Children       | ▶️      | E        | `onNodeExpand(nodeId)` | Load & show direct children (immediate neighbors)     |
| Expand Descendents    | ▶️▶️   | E, then E| `onExpandDesc(nodeId)` | (Future Feature) Recursively show all descendants     |
| Collapse Descendents  | ◀️◀️   | C        | `onCollapseDesc(nodeId)`| (Future Feature) Collapse this node's descendants    |

### 1.3 Multi-Node Operations

Trigger  
• Right-click with multiple nodes selected  
Items mirror Node Context but operate on `nodeIds` array:

| Label                     | Icon  | Shortcut | Handler                    | Description                                         |
|---------------------------|-------|----------|----------------------------|-----------------------------------------------------|
| Add Connected Nodes       | ➕     | A        | `openAddModal(nodeId)`     | Open modal per selected node                        |
| Edit Nodes                | ✏️     | Ctrl+E   | `openEditDrawer(node)`     | Open drawer per selected node                       |
| Delete Nodes              | 🗑️     | Del      | `onDeleteNodes(nodeIds)`   | Remove all selected nodes & edges                   |
| Hide Nodes                | 👁️‍🗨️ | H        | `onHideNodes(nodeIds)`     | Hide all selected nodes & edges                     |
| Expand Children (All)     | ▶️     | E        | `onNodeExpandBatch(nodeIds)`| Load children for all selected nodes               |
| Expand Descendents (All)  | ▶️▶️   | E, then E| `onExpandDescBatch(nodeIds)`| (Future Feature) Recursively expand for all selected |
| Collapse Descendents (All)| ◀️◀️   | C        | `onCollapseDescBatch(nodeIds)`| (Future Feature) Collapse descendants for all selected |

---

## 2. Add-Node Modal

Component: `<NodeFormModal>` (in `/frontend/src/components/NodeFormModal.tsx`); controlled by `UIContext`.

### Trigger

• `openAddModal(parentId?)` from context menu

### Props

- `open: boolean`  
- `parentId?: string` (optional; when provided, modal will create a connecting edge)  
- `initialValues?` (unused for Add)  
- `onSubmit(values: NodeFormValues)` where `NodeFormValues` is `{ label: string; type: string; hierarchyId: string; levelId: string }`
- `onCancel()`

### Fields

- **Label** (text input, required)  
- **Type** (dropdown: concept, example, question)
- **Hierarchy** (dropdown: list of available hierarchies from `HierarchyContext`)
- **Level** (dropdown: list of levels for the selected hierarchy, from `HierarchyContext`)

### Actions

- **Save** → validate & call `onSubmit` (which then typically calls `useGraphState.addNode`), close modal  
- **Cancel** → call `onCancel`, close modal

### Data Flow

1. User selects a `Hierarchy` from its dropdown (defaults to the active hierarchy in `HierarchyContext`). This updates the active hierarchy context.
2. The `Level` dropdown is populated with levels corresponding to the selected `Hierarchy`.
3. User selects a `Level` (or the system suggests a default based on `parentId` or as the first level).
4. On submit, the `NodeFormModal` passes the chosen `label`, `type`, `hierarchyId`, and `levelId` to its `onSubmit` callback.
5. This data is typically used by `useGraphState.addNode` to construct an `addNode` GraphQL mutation with an explicit `hierarchyAssignments` field containing the selected `hierarchy.id` and `level.id`. The backend API then uses this explicit assignment.

### Styling

- Uses centralized theme system for consistent styling
- Modal overlay and content styled via `theme.components.modal`
- Form fields use `theme.components.form` configurations
- Buttons styled using `theme.components.button` definitions

### Accessibility/UI

- Centered overlay with semi-opaque backdrop  
- Focus trapping, Esc closes

---

## 3. Edit-Node Drawer

Component: `<NodeDrawer>` (in `/frontend/src/components/NodeDrawer.tsx`); controlled by `UIContext`.

### Trigger

• `openEditDrawer(nodeData)` (Typically triggered by double-clicking a node or from context menu)

### Layout

- Fixed panel on right (320px wide)  
- Tabs: **Info**, **Links** (Future), **History** (Future)

### Info Tab

- Displays node properties (label, type). Editing hierarchy assignment via this drawer is not currently specified.
- **Save** → call `onSave` with updated values, close drawer  
- **Cancel** → call `onClose`, close drawer

### Styling

- Uses centralized theme system for consistent drawer styling
- Drawer background and border styled via `theme.components.drawer`
- Tab styles use `theme.components.drawer.tab` configurations
- Form elements follow `theme.components.form` patterns

### Future Tabs

- **Links** and **History** placeholders for future development.

---

## 4. UI Context

File: `/frontend/src/context/UIContext.tsx`

Manages state for modals and drawers:

- `openAddModal(parentId?)` / `closeAddModal()`  
- `openEditDrawer(nodeData)` / `closeEditDrawer()`  

Context consumers: `ContextMenuContext`, `App.tsx`, and components that trigger these UI elements.

---

## 5. Theme System & Styling Architecture

The frontend uses a centralized theme system to ensure consistent styling across all UI components.

### 5.1 Architecture Overview

**File Structure:**
- `frontend/src/config/tokens.ts` - Base design tokens (colors, spacing, typography)
- `frontend/src/config/theme.ts` - Semantic theme configuration built from tokens
- `frontend/src/utils/styleUtils.ts` - Helper functions for component styling

### 5.2 Design Tokens

Base design values that define the visual foundation:

```typescript
// Color palettes
colors: {
  primary: { 50: '#eff6ff', 500: '#3b82f6', 900: '#1e3a8a' },
  gray: { 50: '#f9fafb', 300: '#d1d5db', 600: '#4b5563' },
  // ... additional color scales
}

// Spacing scale (4px base unit)
spacing: {
  scale: (multiplier: number) => multiplier * 4,
  xs: 2, sm: 4, base: 8, lg: 16, xl: 24
}

// Typography
fontSize: { xs: '12px', sm: '14px', base: '16px', lg: '18px' }
```

### 5.3 Theme Configuration

Semantic values built from tokens for specific use cases:

```typescript
// Semantic colors
colors: {
  background: { primary: 'white', overlay: 'rgba(0,0,0,0.3)' },
  text: { primary: '#374151', error: '#dc2626' },
  levels: { 1: 'hsl(40,60%,60%)', 2: 'red', 3: 'hsl(120,60%,60%)' }
}

// Component-specific configurations
components: {
  modal: { background: 'white', shadow: '0 25px 50px rgba(0,0,0,0.25)' },
  form: { field: { padding: '4px', border: '1px solid #d1d5db' } },
  button: { base: { borderRadius: '4px', padding: '4px 8px' } }
}
```

### 5.4 Dynamic Level Colors

Hierarchy level colors are automatically generated using HSL color space:

```typescript
// Generates consistent colors for 8+ levels
export const getLevelColor = (level?: number): string => {
  if (level === undefined || level < 1) return colors.legacy.nodeDefault;
  if (level === 2) return 'red'; // Special case preserved
  
  const baseHue = 40;
  const hueStep = 40;
  const hue = (level * hueStep) % 360;
  return `hsl(${hue}, 60%, 60%)`;
};
```

### 5.5 Style Utilities

Helper functions for consistent component styling:

```typescript
// Modal styling
export const buildModalStyle = (options = {}) => css({
  background: theme.components.modal.background,
  borderRadius: theme.components.modal.borderRadius,
  boxShadow: theme.components.modal.shadow,
  // ...
});

// Button variants
export const buildButtonStyle = (variant = 'primary') => css({
  ...theme.components.button.base,
  background: variant === 'primary' ? theme.colors.border.active : theme.colors.background.secondary,
  // ...
});
```

### 5.6 Usage Guidelines

**For Component Development:**

1. **Import theme values:**
   ```typescript
   import { theme } from '../config';
   ```

2. **Use style utilities:**
   ```typescript
   import { buildModalStyle, buildButtonStyle } from '../utils/styleUtils';
   ```

3. **Apply styles via CSS-in-JS:**
   ```typescript
   <div style={buildModalStyle({ maxWidth: '600px' })}>
     <button style={buildButtonStyle('primary')}>Save</button>
   </div>
   ```

4. **Avoid inline styles and hardcoded values:**
   ```typescript
   // ❌ Don't do this
   <div style={{ color: 'red', padding: '8px' }}>
   
   // ✅ Do this instead
   <div style={{ color: theme.colors.text.error, padding: theme.spacing.base }}>
   ```

### 5.7 Benefits

- **Consistency:** Single source of truth for all styling values
- **Maintainability:** Easy to update colors, spacing, and other design tokens
- **Type Safety:** TypeScript integration prevents styling errors
- **Themeable:** Foundation for future dark mode and custom themes
- **Performance:** No inline style recalculations

---

## 6. Testing Strategy

- **Unit Tests**:  
  - `<ContextMenu>` renders correct items for each menu type.  
  - `<NodeFormModal>` and `<NodeDrawer>` form flows, state changes, and callbacks.
  - Theme utilities return correct style objects.
- **End-to-End**:  
  - Verify context-menu → modal/drawer open/cancel/save for single & multi-node scenarios.
  - Test hierarchy and level selection in `NodeFormModal` and its effect on node creation.
  - Verify consistent styling across all components.

> Keep this doc in sync: update here first, then adjust code and tests as needed.

## 7. Hierarchy Selector

The hierarchy selector is a dropdown, typically in the application header, allowing users to switch the active hierarchy for graph viewing and operations.

**Location Example:** `frontend/src/App.tsx`

**Markup Example:**
```tsx
import { useHierarchyContext } from './context/HierarchyContext';

function AppHeader() {
  const { hierarchies, hierarchyId, setHierarchyId } = useHierarchyContext();

  const handleHierarchyChange = (newHierarchyId: string) => {
    setHierarchyId(newHierarchyId);
    // For ApiService to pick up the change for X-Hierarchy-Id header,
    // localStorage should also be updated here or within setHierarchyId in the context.
    localStorage.setItem('hierarchyId', newHierarchyId);
  };

  return (
    <div className="app-header">
      <label htmlFor="hierarchy-select">Hierarchy:</label>
      <select
        id="hierarchy-select"
        value={hierarchyId}
        onChange={e => handleHierarchyChange(e.target.value)}
        aria-label="Select hierarchy"
      >
        {hierarchies.map(h => (
          <option key={h.id} value={h.id}>
            {h.name}
          </option>
        ))}
      </select>
    </div>
  );
}
```

**Behavior:**
- On mount, the dropdown lists all fetched `hierarchies` from `HierarchyContext`.
- Changing selection calls `setHierarchyId` (from `HierarchyContext`), updating the application's active hierarchy.
- The `GraphView` (via `useGraphState`) listens to changes in `hierarchyId` from the context and reloads/re-filters graph data accordingly.
- **Important:** For the `X-Hierarchy-Id` header (used by `ApiService` for mutations) to reflect this change, `localStorage.getItem('hierarchyId')` must be updated when the selection changes. The example above includes this `localStorage.setItem` call. Ideally, this `localStorage` update is managed centrally alongside the context state update.
