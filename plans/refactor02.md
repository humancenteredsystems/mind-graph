Here's a **phased implementation plan in Markdown format** to address the issues raised in the feedback, along with the two you identified (overuse of layout/fit and untracked expansions):

---

# 📈 MakeItMakeSense GraphView Refactor Plan

This plan addresses technical debt and UI bugs in the React+Cytoscape-based graph viewer. It breaks the work into discrete, LLM-friendly phases, so each step can be implemented and tested incrementally.

---

## ✅ Goals

- Eliminate full redraw behavior when expanding nodes
- Prevent empty graph renders on no-op expansions
- Centralize types to avoid drift
- Improve memory safety around timers
- Encapsulate graph state logic
- Enable structured debug logging
- Prevent redundant re-expansion of already expanded nodes

---

## 🗂️ Phase 1: Centralize Type Definitions

**Goal:** Avoid duplication and drift between `NodeData` and `EdgeData`.

### Tasks:

- Create `src/types/graph.ts` with:
  ```ts
  export interface NodeData {
    id: string;
    label?: string;
    type?: string;
    level?: number;
  }

  export interface EdgeData {
    id?: string;
    source: string;
    target: string;
    type?: string;
  }
  ```

- Update imports in:
  - `App.tsx`
  - `GraphView.tsx`
  - `graphUtils.ts`
  - `ApiService.ts`

---

## 🔁 Phase 2: Fix Layout and Camera Redraw

**Goal:** Stop full-graph repositioning and zooming when adding a few nodes.

### Tasks:

- Modify `GraphView.tsx` to:
  - Run layout only on new elements:
    ```ts
    const added = cyInstance.add([...newNodes, ...newEdges]);
    added.layout({ name: 'klay', animate: true }).run();
    ```
  - Replace `cyInstance.fit()` with:
    ```ts
    cyInstance.fit(added, 50); // focus only on new elements
    ```

- Add a guard: if no new elements are added, skip layout and fit entirely.

---

## 🧹 Phase 3: Prevent Graph Disappearance on No-op Expansion

**Goal:** Block unnecessary updates and camera jumps when clicking an already-expanded node.

### Tasks:

- In `GraphView.tsx`:
  - Add check at top of update effect:
    ```ts
    if (nodes.length === 0 && edges.length === 0) {
      console.warn('Skipping update: graph is empty');
      return;
    }
    ```

- In `App.tsx > handleNodeExpand`:
  - Track `expandedNodeIds` in a `Set` using `useRef` or `useState`
  - Skip fetch if node was already expanded

---

## 🧼 Phase 4: Safe Timer Cleanup

**Goal:** Prevent memory leaks or delayed behavior from leftover timers.

### Tasks:

- Refactor `setTimeout` logic in `GraphView.tsx`:
  ```ts
  const fitTimerRef = useRef<NodeJS.Timeout | null>(null);
  ...
  if (fitTimerRef.current) clearTimeout(fitTimerRef.current);
  fitTimerRef.current = setTimeout(() => { ... }, 500);
  ```

- Clear it on component unmount and each update.

---

## 🧠 Phase 5: Extract Custom Graph Hook

**Goal:** Move all graph state and expansion logic into a reusable hook.

### Tasks:

- Create `src/hooks/useGraphState.ts`:
  - Internal state: `nodes`, `edges`, `expandedNodes`
  - Public API:
    - `nodes`, `edges`
    - `expandNode(nodeId: string)`
    - `resetGraph()`
    - `loadInitialGraph(rootId: string)`

- Move:
  - Initial load (`useEffect`)
  - Deduplication logic
  - Expansion API call + merge
  - Error state

- Update `App.tsx` to consume `useGraphState()`.

---

## 🪵 Phase 6: Add Structured Logging and Debug Toggle

**Goal:** Make debugging easier without spamming the console in production.

### Tasks:

- Create `src/utils/logger.ts`:
  ```ts
  const DEBUG = import.meta.env.DEV || localStorage.getItem("debug") === "true";

  export function log(namespace: string, ...args: any[]) {
    if (DEBUG) console.log(`%c[${namespace}]`, 'color: orange;', ...args);
  }
  ```

- Replace raw `console.log()` calls with `log('GraphView', ...)`, `log('App', ...)`, etc.

- Add a `<DebugToggle />` component to flip `localStorage.debug` at runtime.

---

## 📌 Phase 7 (Optional): Animate Node Expansion More Smoothly

**Goal:** Make new nodes "pop in" or grow visually, instead of jarring layout shifts.

### Tasks:

- Use Cytoscape’s style transitions:
  ```ts
  style: {
    transitionProperty: 'background-color, width, height',
    transitionDuration: '300ms',
  }
  ```

- Optionally pre-position new nodes near parent, then animate layout.