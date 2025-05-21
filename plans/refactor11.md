# Plan: Refactor 11 - Dynamic Node Type Availability

## Problem

The list of available node types in the NodeFormModal's "Type" dropdown is hardcoded in the frontend (`frontend/src/context/HierarchyContext.tsx`). This makes it difficult to manage and extend the types of nodes that can be created, requiring code changes and redeployment whenever a new node type is introduced or an existing one is modified.

## Goal

Dynamically fetch the list of valid node types from the backend API to populate the "Type" dropdown in the NodeFormModal, providing a more flexible and maintainable solution.

## Proposed Solution

Implement a new backend API endpoint to provide the list of available node types based on the system's configuration (`HierarchyLevelType` entities). Modify the frontend `HierarchyContext` to fetch this list on application load and make it available to components like `NodeFormModal`.

## Steps

1.  **Backend Implementation (`api/server.js`)**:
    *   **Source of Truth:** The primary source for the global list of node types should be the distinct values of `HierarchyLevelType.typeName` found across all hierarchies and levels in Dgraph.
    *   **Endpoint (`/api/node-types`):**
        *   Add a new GET endpoint, e.g., `/api/node-types`.
        *   In this endpoint, execute a GraphQL query against Dgraph to find all unique `typeName` values from all `HierarchyLevelType` entities. For example:
            ```graphql
            query GetAllConfiguredNodeTypes {
              queryHierarchyLevelType {
                typeName
              }
            }
            ```
            The backend would then process this list to get unique type names.
        *   **(Optional Fallback):** If desired, this list from `HierarchyLevelType` could be merged with a predefined list of "globally valid" or "default" types (e.g., from a server-side configuration file or a hardcoded array in the API) to catch types that are generally valid but might not yet be explicitly assigned as an `allowedType` to any specific level.
    *   Return this comprehensive list of unique types as a JSON array.

2.  **Frontend API Service (`frontend/src/services/ApiService.ts`)**:
    *   Add a new asynchronous function, e.g., `fetchNodeTypes`, that makes a GET request to the new `/api/node-types` endpoint.

3.  **Frontend Hierarchy Context (`frontend/src/context/HierarchyContext.tsx`)**:
    *   Remove the `CANONICAL_NODE_TYPES` constant.
    *   In the initial `useEffect` (or a new `useEffect` that runs on mount), call the new `ApiService.fetchNodeTypes` function.
    *   Store the fetched list of types in the `allNodeTypes` state variable.
    *   Remove the line `setAllNodeTypes(CANONICAL_NODE_TYPES);`.

4.  **Frontend Node Form Modal (`frontend/src/components/NodeFormModal.tsx`)**:
    *   Verify that the "Type" dropdown is already using the `allNodeTypes` array provided by `useHierarchyContext`. (Based on previous review, it appears to be). No code changes should be needed here if it's already using `allNodeTypes`. The existing logic for `availableTypes` which uses `allowedTypesMap` for level-specific restrictions and falls back to `allNodeTypes` is correct and will work with the dynamically fetched list.

## Verification

1.  Ensure the backend API server is running with the new endpoint.
2.  Restart the frontend development server.
3.  Open the NodeFormModal (e.g., by right-clicking the background).
4.  Verify that the "Type" dropdown is populated with the distinct node types configured via `HierarchyLevelType` entities in your Dgraph database (plus any optional fallback types).
5.  Add a node with a type from this dynamically populated list and verify it saves and displays correctly (this verification also depends on the fix for Issue #2 being implemented).

## Considerations

*   The method for fetching distinct `HierarchyLevelType.typeName` values in the backend might need refinement depending on Dgraph's capabilities and performance for large datasets.
*   Consider caching the node types list in the frontend or backend if fetching it on every load becomes a performance issue.
*   The optional fallback list in the backend should be carefully managed to avoid inconsistencies with `HierarchyLevelType` definitions.
