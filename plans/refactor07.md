# Refactoring Plan 07: Consistent Hierarchy Context Management

This plan addresses "Top Recommendation #2" from the external review, focusing on enforcing consistent and centralized management of the active hierarchy context on the frontend. It also incorporates suggestions related to standardizing hierarchy assignment fallback logic.

## 1. Centralize Hierarchy Context Logic in `HierarchyContext.tsx`

**Affected Files:**
*   `frontend/src/context/HierarchyContext.tsx`
*   `frontend/src/services/ApiService.ts`
*   Any component that currently reads/writes `hierarchyId` from/to `localStorage` (e.g., potentially `App.tsx` or components with hierarchy selectors).

**Current Issue (as noted in review and `refactor05.md`):**
*   `ApiService.executeMutation` reads `hierarchyId` from `localStorage` to set the `X-Hierarchy-Id` header.
*   The `setHierarchyId` function within `HierarchyContext` only updates React state, not `localStorage`.
*   This creates a dependency on other components to correctly update `localStorage` whenever the context's `hierarchyId` is changed, leading to potential desynchronization and dispersed logic.

**Recommendation:**
*   **Modify `HierarchyContext.tsx` to be the single source of truth and management for the active `hierarchyId`:**
    *   The `setHierarchyId` function provided by the context should be responsible for:
        1.  Updating its internal React state for `hierarchyId`.
        2.  **Atomically updating `localStorage.setItem('hierarchyId', newId)`.**
    *   When the context initializes, it should attempt to load the `hierarchyId` from `localStorage` as its initial state, falling back to the first fetched hierarchy if `localStorage` is empty or invalid.
*   **Modify `ApiService.ts`:**
    *   Instead of `ApiService.executeMutation` reading directly from `localStorage`, it could:
        *   Ideally, be made context-aware if it were a hook (e.g., `useApiService().executeMutation(...)` which could then access `HierarchyContext`).
        *   Alternatively, if `ApiService` remains a static module, the `X-Hierarchy-Id` header could be passed explicitly to `executeMutation` by its callers (e.g., `useGraphState` or other new API hooks like `useNodeApi`). These callers would get the `hierarchyId` from `HierarchyContext`. This promotes explicitness.
        *   A simpler, less invasive change for `ApiService` (if not converting to hooks immediately) is to continue reading from `localStorage`, relying on `HierarchyContext` to now be the sole writer to that `localStorage` key. This is acceptable as an interim step.
*   **Remove direct `localStorage` manipulation** for `hierarchyId` from all other components. They should only interact with `HierarchyContext.setHierarchyId`.

**Benefits:**
*   **Single Source of Truth:** `HierarchyContext` becomes the definitive manager of the active hierarchy.
*   **Reduced Errors:** Eliminates risks of desynchronization between React state and `localStorage`.
*   **Simplified Component Logic:** Components no longer need to worry about `localStorage` for hierarchy.
*   **Clearer API for Context:** `HierarchyContext` provides a clean `selectHierarchy(id)` or `setHierarchyId(id)` method.

## 2. Standardize Hierarchy Assignment Fallback Logic (Backend)

**Affected Files:**
*   `api/server.js` (specifically the `/api/mutate` endpoint and the `getLevelIdForNode` helper)

**Current Issue (as noted in review):**
*   The multi-layered fallback logic for determining hierarchy and level during automatic node assignment (explicit input -> `X-Hierarchy-Id` header -> parent context -> default hierarchy/level) can be complex to trace and maintain directly within the route handler.

**Recommendation:**
*   **Create a dedicated backend utility method/service:**
    *   Example: `getHierarchyAssignmentContext(requestData, requestHeaders, parentNodeInfo)`
    *   This function would encapsulate the entire decision tree for determining the target `hierarchyId` and `levelId` based on available information (explicit `hierarchyId`/`levelId` in request, `parentId`, `X-Hierarchy-Id` header, database defaults).
    *   The `/api/mutate` endpoint in `api/server.js` would call this utility to get the resolved assignment context before proceeding with node creation or enrichment.
*   **Document this utility's logic clearly.**

**Benefits:**
*   **Centralized Logic:** The complex decision-making process is in one place, easier to understand, test, and modify.
*   **Cleaner Route Handlers:** `/api/mutate` becomes simpler.
*   **Improved Testability:** The assignment context logic can be unit-tested independently.

## 3. Client-Side Utilities Mirroring Server Defaults (Optional Enhancement)

**Affected Files:**
*   Potentially new utility functions in `frontend/src/utils/` or within `HierarchyContext.tsx`.

**Recommendation (as noted in review):**
*   To improve UX and reduce discrepancies, provide client-side utility functions that can predict or mirror the server's default assignment logic.
    *   For example, a function `predictNodeAssignment(parentId, activeHierarchy, availableLevels)` could be used by `NodeFormModal.tsx` to pre-select the hierarchy and level more accurately according to the backend's rules.
*   This is especially useful if the backend's fallback logic is complex.

**Benefits:**
*   **Consistent UX:** The UI can more accurately reflect what will happen on the backend.
*   **Reduced Surprises:** Fewer cases where the backend assigns a node differently than what the user might have expected from the UI's initial state.

**Implementation Steps:**

1.  **Refactor `HierarchyContext.tsx`:**
    *   Modify `setHierarchyId` to also write to `localStorage`.
    *   Update initial state loading to read from `localStorage`.
2.  **Review and Refactor `ApiService.ts`:**
    *   Decide on the strategy for `X-Hierarchy-Id` header (continue reading from `localStorage` now managed by context, or require explicit passing).
3.  **Refactor Backend (`api/server.js`):**
    *   Create the `getHierarchyAssignmentContext` utility function/service.
    *   Update `/api/mutate` to use this utility.
4.  **(Optional) Implement Client-Side Mirror Utilities:**
    *   Develop and integrate client-side functions for predicting default assignments if deemed beneficial for UX.
5.  **Update Documentation:** Ensure `docs/hierarchy.md` and relevant sections reflect these centralized management approaches.
