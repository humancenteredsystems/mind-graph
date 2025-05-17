# Refactoring Plan 05: Hierarchy Implementation Review

This document outlines findings from a review of the hierarchy system's implementation within the codebase, highlighting areas that are potentially brittle or could be improved based on common best practices.

## 1. Backend: Fallback to First Hierarchy in API Endpoints

*   **Affected Files:** `api/server.js` (specifically in `/api/mutate` for `addNode` and `/api/traverse`)
*   **Issue:** When a hierarchy context (e.g., via `X-Hierarchy-Id` header or `hierarchyId` in request body/variables) is not explicitly provided, the API defaults to using the "first" hierarchy found by querying `queryHierarchy { id }`.
*   **Potential Brittleness:**
    *   Assumes at least one hierarchy always exists; will error if none are present.
    *   Relies on the database's potentially non-deterministic ordering of hierarchies unless an explicit sort is used in the fallback query.
    *   The default behavior is implicit and might not be clear to API consumers.
*   **Suggestions:**
    *   Require clients to explicitly specify the hierarchy context (e.g., `hierarchyId`) for operations that depend on it.
    *   **Validate that any explicitly provided `hierarchyId` corresponds to an existing `Hierarchy` entity in the database. If not found, return a client error (e.g., 400 Bad Request or 404 Not Found) with a clear message like "Invalid hierarchyId provided."**
    *   If a default is necessary (to be avoided if possible), implement a well-defined default mechanism (e.g., a specifically flagged "default" hierarchy or a configurable default ID) rather than relying on incidental order.
    *   Consider returning a client error (e.g., 400 Bad Request) if a required hierarchy context is missing (and not defaulted safely) or if the provided `hierarchyId` is invalid.

## 2. Frontend: `localStorage` Synchronization for Active Hierarchy

*   **Affected Files:** `frontend/src/context/HierarchyContext.tsx`, `frontend/src/services/ApiService.ts`
*   **Issue:**
    *   `ApiService.executeMutation` reads `hierarchyId` from `localStorage` to set the `X-Hierarchy-Id` header for backend context.
    *   The `setHierarchyId` function within `HierarchyContext` (used by UI components like the hierarchy selector) updates its React state but does not update `localStorage`.
*   **Potential Brittleness:** This can lead to a desynchronization where the `X-Hierarchy-Id` header sent by `ApiService` does not reflect the hierarchy actually selected and visible in the UI if `localStorage` is not updated concurrently with the context state.
*   **Suggestions:**
    *   Centralize the `localStorage.setItem('hierarchyId', newId)` update within the `setHierarchyId` method of `HierarchyContext.tsx`. This ensures that whenever the context's active hierarchy changes, `localStorage` is updated atomically.

## 3. Frontend: Default Level Selection Complexity in `NodeFormModal.tsx`

*   **Affected Files:** `frontend/src/components/NodeFormModal.tsx`
*   **Issue:** The `useEffect` hook responsible for determining and setting the default `selectedLevelId` has a large dependency array (`[open, initialValues, levels, parentId, nodes, hierarchyId]`).
*   **Potential Brittleness:** While likely correct, complex dependency arrays in `useEffect` can sometimes lead to subtle bugs, performance issues due to frequent re-runs, or stale closures if not managed with extreme care, especially as the codebase evolves.
*   **Suggestions:**
    *   Ensure the effect logic is robust against partial or loading states of its dependencies (current optional chaining helps).
    *   For future maintainability, if this logic becomes significantly more complex, consider breaking it into smaller, more focused custom hooks or memoized selectors.

## 4. API: Error Handling in `getLevelIdForNode`

*   **Affected Files:** `api/server.js`
*   **Issue:** If the `getLevelIdForNode` function calculates a `targetLevelNumber` for which no `HierarchyLevel` exists (e.g., trying to place a node at level 4 in a 3-level hierarchy), it throws a generic `Error`. This typically results in a 500 Internal Server Error from the calling `/api/mutate` endpoint.
*   **Potential Brittleness/Consideration:** While fail-fast is one approach, a generic 500 error might not be the most informative for the client.
*   **Suggestions:**
    *   Depending on desired behavior:
        *   Return a more specific client error (e.g., 400 Bad Request or 422 Unprocessable Entity) with a clear message indicating an invalid level placement (e.g., "Target level X is invalid for hierarchy Y, which has a maximum of Z levels.").
        *   **If operations ever involve directly providing a `levelId` (e.g., for assignment or direct level manipulation), validate that this `levelId` corresponds to an existing `HierarchyLevel` entity. If not found, return an appropriate client error (e.g., 400 Bad Request or 404 Not Found) with a message like "HierarchyLevel with ID 'xyz' not found."**
        *   Implement logic to handle such cases gracefully (e.g., assign to the deepest available level and include a warning in the response). The current approach (for calculated levels) is to error out, which should be made more specific.

## 5. Schema & API: `HierarchyLevelType` Enforcement

*   **Affected Files:** `schemas/default.graphql`, potentially API endpoints like `POST /api/hierarchy/assignment` or `/api/mutate`.
*   **Issue:**
    *   The Dgraph schema defines `HierarchyLevelType`, allowing specification of which node types (e.g., "ConceptNode") are permitted at a given `HierarchyLevel`.
    *   The frontend query `GET_LEVELS_FOR_HIERARCHY` fetches this `allowedTypes` information.
    *   However, `tools/seed_data.py` currently skips creating `HierarchyLevelType` entities.
    *   There is no visible enforcement logic in the backend API (e.g., when creating or updating `HierarchyAssignment`s, or during the automatic assignment in `/api/mutate`) that validates a node's type against its target level's `allowedTypes`.
*   **Potential Brittleness/Incompleteness:** The system allows defining type restrictions at the schema level, and the frontend is aware of them, but they are not currently enforced by the backend. This could lead to data inconsistency if clients assume these restrictions are active.
*   **Suggestions:**
    *   If type restrictions per level are a desired feature:
        *   **When creating or modifying `HierarchyAssignment`s, validate that the provided `hierarchy.id` and `level.id` (if used directly) correspond to existing `Hierarchy` and `HierarchyLevel` entities respectively. If not, return an appropriate client error (e.g., 400 Bad Request or 404 Not Found).**
        *   Implement validation logic in the backend API to check the node's type against its target level's `allowedTypes`. This check should occur before persisting the assignment. If validation fails, return a 400/422 error.
        *   Update `tools/seed_data.py` to populate `HierarchyLevelType` entities and ensure sample data adheres to these restrictions, including valid hierarchy and level IDs.
    *   If this feature is not currently prioritized, consider removing `allowedTypes` from `HierarchyLevel` in the schema and frontend queries to avoid confusion, or clearly document it as a planned feature not yet enforced.

## 6. API: Access Control for Hierarchy Endpoints

*   **Affected Files:** `api/hierarchyRoutes.js`
*   **Issue:** The `GET /api/hierarchy` endpoint (retrieving all hierarchies for UI selection) is publicly accessible. Most other hierarchy-related GET operations (e.g., get by ID) and all CUD (Create, Update, Delete) operations for hierarchies, levels, and assignments are admin-protected. This distinction needs to be clear and intentional.
*   **Potential Brittleness/Consideration:** While listing available hierarchies for user selection is essential public functionality, ensuring that detailed inspection, creation, modification, and deletion of hierarchy structures are appropriately protected is crucial.
*   **Suggestions:**
    *   **Confirm Public Access for Listing:** The `GET /api/hierarchy` endpoint, which lists all available hierarchy names and IDs for frontend UI selection (e.g., in `HierarchyContext.tsx`), **should remain publicly accessible**. This is critical for core application functionality allowing users to switch between different views.
    *   **Maintain Admin Protection for Management:** Ensure that all other CUD operations for `Hierarchy`, `HierarchyLevel`, and `HierarchyAssignment` entities, as well as endpoints for fetching detailed information about specific hierarchies (e.g., `GET /api/hierarchy/:id` if it exposes more than basic listing info), remain robustly admin-protected using the `authenticateAdmin` middleware.
    *   **Review Granularity:** The current placement of `router.use(authenticateAdmin);` in `api/hierarchyRoutes.js` should be reviewed to ensure it correctly protects all intended management endpoints while leaving the general listing endpoint (`GET /api/hierarchy`) public. If `GET /api/hierarchy/:id` is used by the frontend for non-admin purposes and only returns basic info, it might also need to be public; otherwise, it should be admin-protected.

These findings provide a basis for potential refactoring efforts to enhance the robustness, maintainability, and security of the hierarchy system.
