# Refactoring Plan 09: Refine Frontend State Management (`useGraphState.ts`)

This plan addresses specific feedback regarding `frontend/src/hooks/useGraphState.ts`, focusing on improving the management of its complex state and actions.

## 1. Leverage Reducer Patterns (`useReducer`) for Complex State Updates

**Affected Files:**
*   `frontend/src/hooks/useGraphState.ts`

**Current Issue (as noted in review):**
*   The `useGraphState` hook manages multiple related pieces of state (`nodes`, `edges`, `isLoading`, `isExpanding`, `error`, `hiddenNodeIds`, `expandedNodeIds`) using several `useState` calls.
*   State update logic is spread across various callback functions (`addNode`, `editNode`, `deleteNode`, `expandNode`, etc.), which can become verbose and harder to trace as the number of actions and state interactions grows.

**Recommendation:**
*   **Adopt `useReducer`:** Consolidate the graph state into a single state object managed by a reducer function.
    *   Define a state shape:
        ```typescript
        interface GraphState {
          nodes: NodeData[];
          edges: EdgeData[];
          isLoading: boolean;
          isExpanding: boolean;
          error: string | null;
          hiddenNodeIds: Set<string>;
          expandedNodeIds: Set<string>; // Currently a useRef, consider moving into state if its updates trigger re-renders
        }
        ```
    *   Define action types:
        ```typescript
        type GraphAction =
          | { type: 'LOAD_START' }
          | { type: 'LOAD_COMPLETE_SUCCESS'; payload: { nodes: NodeData[]; edges: EdgeData[] } }
          | { type: 'LOAD_ERROR'; payload: string }
          | { type: 'EXPAND_START' }
          | { type: 'EXPAND_SUCCESS'; payload: { newNodes: NodeData[]; newEdges: EdgeData[]; expandedNodeId: string } }
          | { type: 'EXPAND_ERROR'; payload: string }
          | { type: 'ADD_NODE_SUCCESS'; payload: NodeData }
          | { type: 'UPDATE_NODE_SUCCESS'; payload: NodeData }
          | { type: 'DELETE_NODE_SUCCESS'; payload: string } // nodeId
          // ... other actions for edges, hiding nodes, etc.
        ```
    *   Implement a `graphReducer(state: GraphState, action: GraphAction): GraphState` function that handles all state transitions based on dispatched actions.
*   **Dispatch Actions from Callbacks:** The functions returned by `useGraphState` (e.g., `loadCompleteGraph`, `addNode`) would perform their asynchronous operations (API calls) and then dispatch actions to the reducer to update the state.
    *   Example (`addNode`):
        ```typescript
        // Inside useGraphState
        const addNode = useCallback(async (values, parentId) => {
          // ... (API call logic using executeMutation or abstracted service)
          try {
            const result = await nodeApi.addNode(values, parentId); // Hypothetical abstracted API call
            if (result.newNode && result.newEdge) {
              dispatch({ type: 'ADD_NODE_AND_EDGE_SUCCESS', payload: result });
            } else if (result.newNode) {
              dispatch({ type: 'ADD_NODE_SUCCESS', payload: result.newNode });
            }
          } catch (err) {
            dispatch({ type: 'SET_ERROR', payload: 'Failed to add node.' });
          }
        }, [dispatch, nodeApi]); // Dependencies would include dispatch and any API service
        ```

**Benefits:**
*   **Centralized State Logic:** All state transitions are handled in one place (the reducer), making logic easier to understand and debug.
*   **Predictable State Updates:** State changes are more predictable as they always go through dispatched actions.
*   **Reduced Prop Drilling (for dispatch):** `dispatch` can be passed down if needed, but often action creators are exposed.
*   **Improved Testability:** The reducer function is pure and can be easily unit-tested.
*   **Scalability:** Easier to manage as more state variables and actions are added.
*   Potentially reduces TLOC by consolidating update logic.

## 2. Abstract Common Mutations/Operations into Discrete Functions or Reducer Actions

**Affected Files:**
*   `frontend/src/hooks/useGraphState.ts`

**Current Issue (as noted in review):**
*   While `useGraphState` centralizes graph operations, the internal logic for each operation (e.g., constructing mutation variables, updating state after API response) can be verbose within each callback.

**Recommendation (aligns with `useReducer` and previous plan `refactor06.md`):**
*   **If using `useReducer`:** The "actions" themselves become these discrete units. The logic for preparing API calls might still reside in the async action creators (the functions that eventually dispatch to the reducer), but the state update logic is cleanly in the reducer cases.
*   **If not fully adopting `useReducer` immediately (or in conjunction):**
    *   Ensure that if `refactor06.md` (Abstract Common Frontend Logic) is implemented, `useGraphState` uses the new abstracted API hooks/services (e.g., `useNodeApi().addNode(...)`). This already separates the API call specifics.
    *   The remaining logic within `useGraphState`'s callbacks would then be purely about updating its local state based on the results from these abstracted API calls.
*   **Focus on clear action definitions:** Whether as reducer actions or distinct internal helper functions within `useGraphState`, ensure each operation has a clear, single responsibility.

**Benefits:**
*   **Enhanced Readability and Maintainability:** Smaller, focused functions/actions are easier to understand.
*   **Improved Testability:** Discrete units of logic are easier to test.

## Implementation Steps:

1.  **Plan State Shape and Actions:** Define the `GraphState` interface and the `GraphAction` discriminated union for `useReducer`.
2.  **Implement `graphReducer`:** Write the reducer function to handle all defined actions and return the new state.
3.  **Refactor `useGraphState`:**
    *   Replace multiple `useState` calls with a single `useReducer` hook.
    *   Update all asynchronous operation callbacks (e.g., `loadCompleteGraph`, `addNode`, `expandNode`) to:
        *   Perform their API calls (ideally via abstracted services/hooks from `refactor06.md`).
        *   Dispatch appropriate actions to the `graphReducer` based on the success or failure of the API calls.
4.  **Update Component Consumers:** Ensure components using `useGraphState` still function correctly with the refactored hook (the returned API of the hook should aim to remain similar if possible, or components updated accordingly).
5.  **Test Thoroughly:** Unit test the `graphReducer`. Integration/E2E test the graph interactions.

This refactoring will make `useGraphState.ts` more robust and easier to manage as the graph's state and interaction complexity grows.
