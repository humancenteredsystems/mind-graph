# Refactor 10: Unified Hierarchy-Level Type Mapping

Date: 2025-05-18

## Objective
Ensure allowed node types per hierarchy level are defined once in Dgraph (`HierarchyLevelType`) and consumed consistently by the API and UI.

## Background
- Dgraph stores allowed types for each level via the `HierarchyLevelType` nodes.
- Frontend currently has hard-coded `ALL_NODE_TYPES` and fallback logic in `NodeFormModal`, leading to mismatches.
- Context menu in `GraphView` and seed script use separate lists.
- We need one source—`HierarchyLevelType`—to drive both backend validation and frontend restrictions.

### Hierarchy-Control Nodes
- **Hierarchy**: Represents a named hierarchy. Fields: `id`, `name`.
- **HierarchyLevel**: Defines an ordered level in a hierarchy. Fields: `id`, `hierarchy` (edge), `levelNumber`, `label`.
- **HierarchyLevelType**: Associates a node type (`typeName`) with a HierarchyLevel. Controls which types can appear at that level. Fields: `id`, `hierarchy`, `level`, `typeName`.
- **HierarchyAssignment**: Links a Node to a HierarchyLevel, storing `levelNumber` for quick access. Fields: `id`, `nodeId`, `hierarchy`, `levelId`, `levelNumber`.

## Tasks

### 1. Backend GraphQL
- Update `getHierarchyLevels` (and/or add `getHierarchyLevelTypes`) resolver to return `allowedTypes: string[]` for each level.
- In `validateLevelIdAndAllowedType`, remove hard-coded fallback; rely on `allowedTypes` fetched from Dgraph.
- If `allowedTypes` is empty array, treat as “no restriction” (allow all types).

### 2. Seed Script
- In `tools/seed_data.py`, update `HierarchyLevelType` creation to use our domain types (`concept`, `example`, `question`) exactly.
- Remove or correct legacy names like `examplenode`.
- Run seeds to populate Dgraph accordingly.

### 3. Frontend Context
- In `frontend/src/context/HierarchyContext.tsx`:
  - Fetch levels with their `allowedTypes` from the API once on load or on hierarchyId change.
  - Transform into a map:  
    ```ts
    Record<`${hierarchyId}l${levelNumber}`, string[]>
    ```
  - Provide this map via context.

### 4. NodeFormModal
- Replace local `ALL_NODE_TYPES` filtering with lookup in context’s map:
  - If map entry exists, filter `ALL_NODE_TYPES` by that entry.
  - If empty array, show all types.
- Remove remaining fallback logic.

### 5. GraphView Context Menu
- In `frontend/src/components/GraphView.tsx`:
  - Derive `parentLevelNum` from `NodeData.assignments`.
  - Use context map to check `allowedTypes` per level before including `onAddNode`.
  - Prevent “Add Node” on unsupported levels.

### 6. Unit & Integration Tests
- Add unit tests for `HierarchyContext` to verify map is built correctly.
- Update `NodeFormModal` tests to cover type restrictions and fallback behavior.
- Extend `GraphView.test.tsx` to assert menu items based on level rules.
- Add E2E scenario via Playwright: adding nodes at various levels.

### 7. Documentation
- Update `docs/hierarchy.md` to describe `HierarchyLevelType` usage.
- Add a section in `docs/ui-elements.md` for the dynamic type dropdown logic.

## Next Steps
1. Toggle to Act mode.
2. Begin implementation of the above tasks sequentially, verifying at each step with unit tests and manual checks.

## Bug Risks
- Context fetch timing: must re-fetch on hierarchy change to avoid stale type lists.
- Empty allowedTypes vs. missing entry: treat `[]` as “no restriction” to prevent blocking valid types.
- Seed data mismatch: seed script must use domain type names exactly to keep frontend/API in sync.
- GraphQL field availability: ensure `allowedTypes` is always included in queries so the context map is populated.
- Safe optional chaining: handle undefined/missing arrays in assignments and allowedTypes to avoid runtime errors.
- Validation order: backend’s double-validation should use fresh Dgraph data to avoid race conditions.
- Map key formatting: maintain consistent `${hierarchyId}l${levelNumber}` keys to avoid lookup failures.
- Test coverage gaps: add tests for both restricted and unrestricted scenarios in UI and API.
