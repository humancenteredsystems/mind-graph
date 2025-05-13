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
- `setHierarchyId(id: string): void` to change selection

Implementation details:
1. On mount, calls `fetchHierarchies()` (from `ApiService`) to load all hierarchies.
2. Stores the fetched list in `hierarchies` state.
3. Defaults `hierarchyId` to the first hierarchy’s ID.
4. When `setHierarchyId` is called:
   - Updates `hierarchyId` in context.
   - Persists selection in local state (and optionally localStorage).
   - Triggers graph reload via `useGraphState`.

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
