# Plan B: Collapse Node (Hierarchy-Aware)

**Goal:** Allow the user to collapse an expanded node via the existing context menu, hiding its descendants within the currently active hierarchy.

**Prerequisites:**
*   Multi-hierarchy system is already implemented with `HierarchyContext`
*   Node expansion system from Plan A is implemented (`useNodeExpansion` hook)
*   Frontend has existing context menu infrastructure (`ContextMenu.tsx`, `ContextMenuContext.tsx`)
*   Graph state management via `useGraphState.ts` hook

**User Interaction:**
1.  User right-clicks on a node that has previously been expanded in the current hierarchy.
2.  The existing context menu appears with current options.
3.  User selects the "Collapse" option from the menu.

**Frontend Implementation:**

### 1. **Extend Context Menu (`ContextMenu.tsx`, `ContextMenuContext.tsx`)**
*   Add "Collapse" option to existing context menu items
*   Show "Collapse" only for nodes that are currently expanded in the active hierarchy
*   Use existing context menu state management patterns

### 2. **Enhance Node Expansion Hook (`useNodeExpansion.ts`)**
```typescript
const useNodeExpansion = () => {
  const [expansionStates, setExpansionStates] = useState<NodeExpansionState[]>([]);
  const { activeHierarchyId } = useHierarchy();
  const { nodes, edges, removeNodes, removeEdges } = useGraphState();
  
  const collapseNode = (nodeId: string) => {
    const expansionState = expansionStates.find(state => 
      state.nodeId === nodeId && 
      state.hierarchyId === activeHierarchyId
    );
    
    if (!expansionState?.isExpanded) return;
    
    // Find all descendant nodes that were expanded from this node
    const descendantsToRemove = findDescendantsInHierarchy(
      nodeId, 
      activeHierarchyId, 
      nodes, 
      edges,
      expansionState.expandedChildren
    );
    
    // Remove descendant nodes and their edges
    removeNodes(descendantsToRemove.map(n => n.id));
    removeEdges(findEdgesToRemove(descendantsToRemove, edges));
    
    // Update expansion state
    setNodeCollapsed(nodeId, activeHierarchyId);
  };
  
  return { isNodeExpanded, expandNode, collapseNode };
};
```

### 3. **Hierarchy-Aware Descendant Discovery**
```typescript
const findDescendantsInHierarchy = (
  rootNodeId: string,
  hierarchyId: string,
  nodes: NodeData[],
  edges: EdgeData[],
  expandedChildren: string[]
): NodeData[] => {
  const descendants: NodeData[] = [];
  const visited = new Set<string>();
  
  const traverse = (nodeId: string) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    // Find direct children of this node
    const childEdges = edges.filter(edge => edge.source === nodeId);
    
    for (const edge of childEdges) {
      const childNode = nodes.find(n => n.id === edge.target);
      if (!childNode) continue;
      
      // Check if this child belongs to the active hierarchy
      const belongsToHierarchy = childNode.hierarchyAssignments?.some(
        assignment => assignment.hierarchy.id === hierarchyId
      );
      
      if (belongsToHierarchy && expandedChildren.includes(childNode.id)) {
        descendants.push(childNode);
        traverse(childNode.id); // Recursively find grandchildren
      }
    }
  };
  
  traverse(rootNodeId);
  return descendants;
};
```

### 4. **Edge Cleanup Logic**
```typescript
const findEdgesToRemove = (nodesToRemove: NodeData[], allEdges: EdgeData[]): string[] => {
  const nodeIdsToRemove = new Set(nodesToRemove.map(n => n.id));
  
  return allEdges
    .filter(edge => 
      nodeIdsToRemove.has(edge.source) || 
      nodeIdsToRemove.has(edge.target)
    )
    .map(edge => edge.id);
};
```

### 5. **Enhanced Graph State Management (`useGraphState.ts`)**
*   Add `removeNodes` and `removeEdges` methods if not already present
*   Ensure proper cleanup of Cytoscape elements
*   Handle state consistency during collapse operations

**API Integration:**
*   No additional API calls required for collapse operation
*   Uses existing graph state and hierarchy context
*   Leverages in-memory tracking of expansion states

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
  },
  {
    label: 'Collapse',
    action: () => collapseNode(selectedNodeId),
    show: isNodeExpanded(selectedNodeId)
  }
];
```

### Hierarchy-Aware Collapse:
```typescript
const collapseNode = (nodeId: string) => {
  const { activeHierarchyId } = useHierarchy();
  
  // Check if node is expanded in current hierarchy
  if (!isNodeExpanded(nodeId)) return;
  
  try {
    // Find all descendants that were added during expansion
    const descendantsToRemove = findDescendantsInHierarchy(
      nodeId,
      activeHierarchyId,
      nodes,
      edges,
      getExpandedChildren(nodeId, activeHierarchyId)
    );
    
    // Remove nodes and edges from graph state
    const { removeNodes, removeEdges } = useGraphState();
    removeNodes(descendantsToRemove.map(n => n.id));
    
    // Find and remove associated edges
    const edgesToRemove = findEdgesToRemove(descendantsToRemove, edges);
    removeEdges(edgesToRemove);
    
    // Update expansion state
    setNodeCollapsed(nodeId, activeHierarchyId);
    
    // Trigger layout recalculation
    triggerLayoutUpdate();
    
  } catch (error) {
    console.error('Failed to collapse node:', error);
  }
};
```

**Integration with Existing Systems:**
*   **HierarchyContext**: Use active hierarchy for collapse context
*   **ContextMenu**: Extend existing menu with collapse options
*   **useGraphState**: Integrate with existing graph state management
*   **useNodeExpansion**: Share expansion state between expand and collapse
*   **GraphView**: Leverage existing Cytoscape integration for element removal

**Visual Feedback:**
*   Update node visual indicators when collapsed
*   Smooth animations for node/edge removal
*   Maintain visual consistency with existing graph styling
*   Show expandable indicator on collapsed nodes

**Key Considerations:**
*   **Hierarchy Isolation**: Collapsing in one hierarchy shouldn't affect expansion state in other hierarchies
*   **State Consistency**: Ensure expansion tracking accurately reflects what was actually added during expansion
*   **Performance**: Efficient traversal algorithms for large hierarchies
*   **User Experience**: Clear visual feedback and smooth animations
*   **Edge Cases**: Handle nodes that exist in multiple hierarchies or have complex relationship patterns

**Advanced Features:**
*   **Partial Collapse**: Option to collapse only certain levels of descendants
*   **Cascade Collapse**: Automatically collapse child expansions when parent is collapsed
*   **Expansion Memory**: Remember expansion states when switching between hierarchies
*   **Bulk Operations**: Collapse multiple nodes simultaneously

**File Changes:**
1. Enhance existing files:
   - `frontend/src/hooks/useNodeExpansion.ts` - Add collapse functionality
   - `frontend/src/components/ContextMenu.tsx` - Add collapse option
   - `frontend/src/context/ContextMenuContext.tsx` - Add collapse actions
   - `frontend/src/hooks/useGraphState.ts` - Add removal methods
   - `frontend/src/utils/hierarchyExpansion.ts` - Add traversal utilities
   - `frontend/src/components/GraphView.tsx` - Handle visual updates

**Testing Considerations:**
*   Unit tests for descendant discovery algorithms
*   Integration tests with hierarchy switching
*   Edge case testing (circular references, multi-hierarchy nodes)
*   Performance testing with deeply nested hierarchies
*   Visual regression testing for collapse animations
*   Accessibility testing for keyboard-driven collapse operations

**Error Handling:**
*   Graceful handling of missing nodes/edges during collapse
*   Recovery from inconsistent expansion states
*   User feedback for failed collapse operations
*   Logging for debugging complex hierarchy structures
