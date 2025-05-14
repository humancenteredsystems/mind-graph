# Hierarchy Selection

This document describes how hierarchies are loaded, selected, and used in the MakeItMakeSense.io UI.

## API Endpoint: GET /api/hierarchy

**Path:** `/api/hierarchy`  
**Description:** Returns all available hierarchies.  
**Response (200 OK):**  
```json
[
  { "id": "h1", "name": "Primary Knowledge Graph" },
  { "id": "h2", "name": "Secondary Graph" }
]
```
**Error Response (500):**  
```json
{ "error": "Failed to fetch hierarchies." }
```

## HierarchyContext

File: `frontend/src/context/HierarchyContext.tsx`

Provides React Context with:
- `hierarchies`: array of `{ id: string; name: string }`
- `hierarchyId`: currently selected hierarchy ID (string)
- `levels`: array of levels for the current hierarchy
- `setHierarchyId(id: string): void` to change selection

Implementation details:
1. On mount, calls `fetchHierarchies()` (from `ApiService`) to load all hierarchies.
2. Stores the fetched list in `hierarchies` state.
3. Defaults `hierarchyId` to the first hierarchy's ID.
4. Loads levels for the selected hierarchy.
5. When `setHierarchyId` is called:
   - Updates `hierarchyId` in context.
   - Persists selection in local state (and optionally localStorage).
   - Triggers graph reload via `useGraphState`.
   - Fetches and updates the levels for the newly selected hierarchy.

## Automatic Hierarchy Assignment

When creating new nodes, the system automatically handles hierarchy assignments:

1. **Default Assignment**: New standalone nodes are assigned to the currently active hierarchy.

2. **Parent-Based Assignment**: When creating a node connected to a parent:
   - The node inherits the parent's hierarchy
   - The node is assigned to the level one deeper than its parent
   - Example: If parent is at level 2, the child will be at level 3

3. **Manual Override**: Users can explicitly select a different hierarchy or level in the Add Node modal.

## Server-Side Processing

The server handles hierarchy assignment logic:

1. When a node creation request includes `hierarchyId` and `levelId`, the server uses these values directly.

2. When only `hierarchyId` is provided (without `levelId`):
   - For standalone nodes: assigns to level 1 of the specified hierarchy
   - For child nodes: looks up the parent's level and assigns to level+1

3. When neither is provided:
   - Uses the hierarchy from the `X-Hierarchy-Id` header
   - Determines the appropriate level based on parent (if any)

This logic is implemented in the `/api/mutate` endpoint in `api/server.js`.

## UI: Hierarchy Selector Dropdown

Add this dropdown in your main layout (for example, in `frontend/src/App.tsx`):

```tsx
import { useHierarchyContext } from './context/HierarchyContext';

function App() {
  const { hierarchies, hierarchyId, setHierarchyId } = useHierarchyContext();

  return (
    <div className="app-header">
      <label htmlFor="hierarchy-select">Hierarchy:</label>
      <select
        id="hierarchy-select"
        value={hierarchyId}
        onChange={e => setHierarchyId(e.target.value)}
        aria-label="Select hierarchy"
      >
        {hierarchies.map(h => (
          <option key={h.id} value={h.id}>
            {h.name}
          </option>
        ))}
      </select>
      {/* Rest of App */}
    </div>
  );
}
```

**Behavior:**  
- Changing the selected option calls `setHierarchyId`, which updates context.  
- The graph view (`useGraphState`) listens to `hierarchyId` and reloads nodes/edges accordingly.
