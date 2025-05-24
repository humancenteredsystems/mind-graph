# Plan A: Expand Node (Hierarchy-Aware)

**Goal:** Allow the user to expand a selected node via the existing context menu to show its immediate children within the currently active hierarchy.

**Prerequisites:**
*   Multi-hierarchy system is already implemented with `HierarchyContext`
*   API endpoints return proper `hierarchyAssignments` data
*   Frontend has existing context menu infrastructure (`ContextMenu.tsx`, `ContextMenuContext.tsx`)
*   Graph state management via `useGraphState.ts` hook

**User Interaction:**
1.  User right-clicks on a node in the `GraphView`.
2.  The existing context menu appears with current options.
3.  User selects the new "Expand" option from the menu.

**Frontend Implementation:**

### 1. **Extend Context Menu (`ContextMenu.tsx`, `ContextMenuContext.tsx`)**
*   Add "Expand" option to existing context menu items
*   Show "Expand" only for nodes that have unexpanded children in the active hierarchy
*   Integrate with existing context menu state management

### 2. **Create Node Expansion Hook (`useNodeExpansion.ts`)**
```typescript
interface NodeExpansionState {
  nodeId: string;
  hierarchyId: string;
  isExpanded: boolean;
  expandedChildren: string[];
}

const useNodeExpansion = () => {
  const [expansionStates, setExpansionStates] = useState<NodeExpansionState[]>([]);
  const { activeHierarchyId } = useHierarchy();
  
  const isNodeExpanded = (nodeId: string) => {
    return expansionStates.some(state => 
      state.nodeId === nodeId && 
      state.hierarchyId === activeHierarchyId && 
      state.isExpanded
    );
  };
  
  const expandNode = async (nodeId: string) => {
    // Implementation details
  };
  
  const collapseNode = (nodeId: string) => {
    // Implementation details
  };
  
  return { isNodeExpanded, expandNode, collapseNode };
};
```

### 3. **Enhance Graph State Management (`useGraphState.ts`)**
*   Add hierarchy-aware node expansion methods
*   Integrate with existing `loadCompleteGraph` and node management functions
*   Handle expansion state persistence and cleanup

### 4. **Hierarchy-Aware Child Discovery**
```typescript
const getChildrenInHierarchy = async (nodeId: string, hierarchyId: string) => {
  // Use existing ApiService.fetchTraversalData with hierarchy context
  const response = await ApiService.fetchTraversalData(nodeId, {
    hierarchyId,
    includeChildren: true
  });
  
  // Filter children that belong to the active hierarchy
  return response.data.queryNode[0]?.outgoing?.map(edge => edge.to) || [];
};
```

### 5. **Visual Indicators (`GraphView.tsx`)**
*   Add visual indicators to nodes that can be expanded/collapsed
*   Use existing Cytoscape styling patterns
*   Integrate with current node styling system

**API Integration:**
*   Uses existing `POST /api/traverse` with hierarchy context
*   Leverages existing `ApiService.fetchTraversalData` method
*   Includes `X-Hierarchy-Id` header for proper hierarchy context

**Key Implementation Details:**

### Context Menu Integration:
```typescript
// In ContextMenu.tsx
const menuItems = [
  // ... existing items
  {
    label: 'Expand',
    action: () => expandNode(selectedNodeId),
    show: !isNodeExpanded(selectedNodeId) && hasExpandableChildren(selectedNodeId)
  }
];
```

### Hierarchy-Aware Expansion:
```typescript
const expandNode = async (nodeId: string) => {
  const { activeHierarchyId } = useHierarchy();
  
  // Check if already expanded in this hierarchy
  if (isNodeExpanded(nodeId)) return;
  
  try {
    // Fetch children using existing API patterns
    const children = await getChildrenInHierarchy(nodeId, activeHierarchyId);
    
    // Update graph state using existing patterns
    const { addNodes, addEdges } = useGraphState();
    
    // Add new nodes and edges to the graph
    addNodes(children);
    addEdges(createEdgesFromTraversal(nodeId, children));
    
    // Update expansion state
    setNodeExpanded(nodeId, activeHierarchyId, true);
    
  } catch (error) {
    // Use existing error handling patterns
    console.error('Failed to expand node:', error);
  }
};
```

**Integration with Existing Systems:**
*   **HierarchyContext**: Use active hierarchy for expansion context
*   **ContextMenu**: Extend existing menu with expansion options
*   **useGraphState**: Integrate with existing graph state management
*   **ApiService**: Use existing API patterns with hierarchy headers
*   **GraphView**: Leverage existing Cytoscape integration and styling

**Key Considerations:**
*   Expansion state should be hierarchy-specific (same node can have different expansion states in different hierarchies)
*   Visual indicators should integrate with existing node styling system
*   Performance optimization for large hierarchies with lazy loading
*   Proper cleanup when switching between hierarchies
*   Integration with existing keyboard shortcuts and accessibility features

**File Changes:**
1. Create new files:
   - `frontend/src/hooks/useNodeExpansion.ts`
   - `frontend/src/utils/hierarchyExpansion.ts`

2. Enhance existing files:
   - `frontend/src/components/ContextMenu.tsx` - Add expand option
   - `frontend/src/context/ContextMenuContext.tsx` - Add expansion actions
   - `frontend/src/hooks/useGraphState.ts` - Add expansion methods
   - `frontend/src/components/GraphView.tsx` - Add visual indicators
   - `frontend/src/services/ApiService.ts` - Enhance traversal methods (if needed)

**Testing Considerations:**
*   Unit tests for expansion state management
*   Integration tests with existing context menu
*   Hierarchy switching scenarios
*   Performance testing with large node sets
*   Accessibility testing for keyboard navigation
