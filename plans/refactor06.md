# Refactoring Plan 06: Abstract Common Frontend Logic

This plan addresses recommendations for abstracting common logic in the frontend into reusable hooks and services, aiming to improve maintainability, reduce component complexity, and enhance clarity.

## 1. Abstract State Initialization and Default Logic from Components

**Affected Components:**
*   `frontend/src/components/NodeFormModal.tsx` (primarily)
*   Potentially other components with complex `useEffect` hooks for default/initial state.

**Current Issue (as noted in review):**
*   `NodeFormModal.tsx` embeds substantial logic for determining default level selection within its `useEffect` hook. This increases component complexity and the risk of bugs due to intricate dependency management.

**Recommendation:**
*   Encapsulate recurring state initialization logic, such as default level and hierarchy selection for forms, into dedicated custom React hooks.
    *   **Example:** Create a hook like `useDefaultNodeFormValues(initialValues, parentId, currentHierarchyContext)` that could return an object like `{ defaultLabel, defaultType, defaultSelectedLevelId, defaultHierarchyId }`.
    *   The `NodeFormModal` would then call this hook and use the returned values to initialize its local state for the form inputs.
    *   This significantly simplifies the `useEffect` logic within `NodeFormModal` and makes the default value determination reusable and testable in isolation.

**Benefits:**
*   Reduces complexity within UI components.
*   Improves reusability of default/initialization logic.
*   Enhances testability of this specific logic.
*   Makes components easier to read and maintain.

## 2. Further Abstract API Interactions into Dedicated Services/Hooks

**Affected Components/Modules:**
*   `frontend/src/services/ApiService.ts`
*   Components directly using `ApiService.ts` or `executeMutation`/`executeQuery`.

**Current State:**
*   `ApiService.ts` provides generic `executeQuery` and `executeMutation` functions, along with some specific fetchers like `fetchTraversalData`, `fetchHierarchies`.

**Recommendation:**
*   Abstract API interactions further into more granular, domain-specific service methods or custom hooks. This promotes a clearer separation of API interaction logic from UI component logic.
    *   **Example Custom Hooks:**
        *   `useHierarchies()`: Could encapsulate fetching all hierarchies, fetching levels for a specific hierarchy, and potentially creating/updating hierarchies (if admin features were added to the frontend).
        *   `useNodeApi()` or `useGraphMutations()`: Could provide specific functions like `addNode(nodeData)`, `updateNode(nodeId, updates)`, `deleteNode(nodeId)`, `createEdge(fromId, toId, type)`. These hooks would internally use `ApiService.executeMutation` with the appropriate GraphQL mutations and variables.
        *   `useTraversal(rootId, hierarchyId)`: A hook dedicated to fetching and managing traversal data.
    *   **Alternative (Service Modules):** If not using hooks, expand `ApiService.ts` or create new service modules (e.g., `hierarchyService.ts`, `nodeService.ts`) with more specific methods.

**Benefits:**
*   **Clear Separation of Concerns:** UI components become simpler as they delegate API interaction details to these hooks/services.
*   **Reduced TLOC in Components:** Components will have less boilerplate for API calls.
*   **Improved Reusability:** API interaction logic is centralized and easily reused across multiple components.
*   **Enhanced Testability:** Hooks and service modules can be tested independently of UI components.
*   **Type Safety:** Custom hooks/services can provide stronger typing for API request parameters and responses.

## 3. Review `useGraphState.ts` for API Abstraction Opportunities

**Affected Components/Modules:**
*   `frontend/src/hooks/useGraphState.ts`

**Current State:**
*   `useGraphState.ts` currently calls `ApiService.executeMutation` directly for operations like `addNode`, `editNode`, `deleteNodes`, `deleteEdge`, `connectNodes`.

**Recommendation (aligns with point 2):**
*   If dedicated API hooks/services (e.g., `useNodeApi`) are created, `useGraphState.ts` should consume these instead of calling `ApiService.executeMutation` directly.
    *   For example, `useGraphState.addNode` would call a hypothetical `nodeApi.addNode(input)` which then handles the `executeMutation` call.
*   This further decouples `useGraphState` from the raw mutation strings and `ApiService` specifics, making it focused on graph state manipulation based on the outcomes of those more abstracted API calls.

**Implementation Steps:**

1.  **Identify** complex state initialization logic in `NodeFormModal.tsx` and other UI components.
2.  **Create** custom hooks (e.g., `useDefaultNodeFormValues`) to encapsulate this logic.
3.  **Refactor** components to use these new hooks.
4.  **Analyze** API calls made from `useGraphState.ts` and other parts of the frontend.
5.  **Design and implement** more granular API interaction hooks (e.g., `useHierarchies`, `useNodeApi`) or service methods.
6.  **Refactor** `useGraphState.ts` and UI components to use these new API abstraction layers.
7.  Ensure comprehensive testing for the new hooks and services.
