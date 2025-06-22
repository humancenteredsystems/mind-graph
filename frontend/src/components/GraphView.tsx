import React, { useRef, useEffect, useMemo } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape, { Core, ElementDefinition } from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import dagre from 'cytoscape-dagre';
import cola from 'cytoscape-cola';
import euler from 'cytoscape-euler';
import fcose from 'cytoscape-fcose';
import { NodeData, EdgeData } from '../types/graph';
import { 
  CytoscapeTapEvent, 
  CytoscapeSelectEvent, 
  CytoscapeRemoveEvent,
  CytoscapeContextEvent,
  CytoscapeSelectHandler,
  CytoscapeUnselectHandler,
  CytoscapeRemoveHandler
} from '../types/cytoscape';
import { useContextMenu } from '../hooks/useContextMenu';
import { useHierarchyContext } from '../hooks/useHierarchy';
import { useLayout } from '../context/LayoutContext';
import { log } from '../utils/logger';
import { theme, config } from '../config';
import { normalizeHierarchyId } from '../utils/graphUtils';

// Register Cytoscape plugins ONCE at module load
cytoscape.use(coseBilkent);
cytoscape.use(dagre);
cytoscape.use(cola);
cytoscape.use(euler);
cytoscape.use(fcose);

/**
 * Props interface for the GraphView component.
 * 
 * GraphView is the primary visualization component handling complex user interactions
 * including manual double-click detection, multi-selection, context menus, and
 * hierarchical graph operations. Many callbacks have specific behavioral contracts.
 * 
 * @interface GraphViewProps
 */
interface GraphViewProps {
  /** Core graph data to render */
  nodes: NodeData[];
  edges: EdgeData[];
  
  /** Visual customization */
  style?: React.CSSProperties;
  
  /** Set of node IDs to hide from visualization (used for expand/collapse) */
  hiddenNodeIds?: Set<string>;
  
  /**
   * Callback fired when user requests to expand a single node.
   * Should reveal immediate children of the specified node.
   */
  onNodeExpand?: (nodeId: string) => void;
  
  /**
   * Callback fired when user requests to expand all children of a node.
   * Should reveal all descendants recursively, not just immediate children.
   */
  onExpandChildren?: (nodeId: string) => void;
  
  /**
   * Callback fired when user requests to expand entire graph.
   * Should reveal all nodes in the complete graph structure.
   */
  onExpandAll?: (nodeId: string) => void;
  
  /**
   * Callback fired when user requests to collapse a node.
   * Should hide all children/descendants of the specified node.
   */
  onCollapseNode?: (nodeId: string) => void;
  
  /**
   * Function to check if a specific node is currently expanded.
   * Used for visual indicators (border styling) and context menu options.
   * 
   * @param nodeId - The node to check
   * @returns true if node is expanded, false otherwise
   */
  isNodeExpanded?: (nodeId: string) => boolean;
  
  /**
   * Callback fired when user requests to add a new node.
   * 
   * **Behavioral Contract:**
   * - When parentId provided: Create child node connected to parent
   * - When position provided: Create node at specific coordinates
   * - When both provided: Create connected child at specified position
   * - When neither provided: Create standalone node at default position
   * 
   * @param parentId - Optional parent node for creating connected children
   * @param position - Optional specific coordinates for node placement
   */
  onAddNode?: (parentId?: string, position?: { x: number; y: number }) => void;
  
  /**
   * Callback fired on double-click/double-tap for node editing.
   * 
   * **Behavioral Contract:**
   * - Triggered by manual double-click detection algorithm (300ms window)
   * - Receives complete NodeData object including all properties
   * - Should open edit modal/form with current node data pre-populated
   * 
   * @param node - Complete node data object for editing
   */
  onEditNode?: (node: NodeData) => void;
  
  /**
   * Callback fired on single-click for node selection.
   * 
   * **Behavioral Contract:**
   * - Triggered after 50ms debounce to confirm not part of double-click
   * - Used for selection highlighting and displaying node details
   * - Does not interfere with multi-selection behavior
   * 
   * @param node - Selected node data object
   */
  onNodeSelect?: (node: NodeData) => void;
  
  /**
   * Callback fired when user requests to load complete graph.
   * Should fetch and display all available nodes/edges without filtering.
   */
  onLoadCompleteGraph?: () => void;
  
  /**
   * Callback fired when user requests to delete a single node.
   * Should remove node and handle edge cleanup appropriately.
   */
  onDeleteNode?: (nodeId: string) => void;
  
  /**
   * Callback fired when user requests to delete multiple selected nodes.
   * Should handle batch deletion with proper edge cleanup.
   * 
   * @param nodeIds - Array of node IDs in selection order
   */
  onDeleteNodes?: (nodeIds: string[]) => void;
  
  /**
   * Callback fired when user requests to delete a single edge.
   * Should remove the specific connection between nodes.
   */
  onDeleteEdge?: (edgeId: string) => void;
  
  /**
   * Callback fired when user requests to delete multiple selected edges.
   * Should handle batch edge deletion.
   * 
   * @param edgeIds - Array of edge IDs in selection order
   */
  onDeleteEdges?: (edgeIds: string[]) => void;
  
  /**
   * Callback fired when user requests to hide a single node.
   * Different from delete - should preserve node data but hide from view.
   */
  onHideNode?: (nodeId: string) => void;
  
  /**
   * Callback fired when user requests to hide multiple selected nodes.
   * Should handle batch hiding while preserving underlying data.
   * 
   * @param nodeIds - Array of node IDs in selection order
   */
  onHideNodes?: (nodeIds: string[]) => void;
  
  /**
   * Callback fired when user requests to create connection between two nodes.
   * 
   * **Behavioral Contract:**
   * - Only available when exactly 2 nodes selected
   * - Should check for existing edge to prevent duplicates
   * - Connection direction: from → to based on selection order
   * 
   * @param from - Source node ID (first selected)
   * @param to - Target node ID (second selected)
   */
  onConnect?: (from: string, to: string) => void;
}

const GraphView: React.FC<GraphViewProps> = ({
  nodes,
  edges,
  style,
  hiddenNodeIds = new Set(),
  onNodeExpand,
  onExpandChildren,
  onExpandAll,
  onCollapseNode,
  isNodeExpanded,
  onAddNode,
  onEditNode,
  onNodeSelect, // Add new prop
  onLoadCompleteGraph,
  onDeleteNode,
  onDeleteNodes,
  onDeleteEdge,
  onDeleteEdges,
  onHideNode,
  onHideNodes,
  onConnect,
}) => {
  console.log(`[GraphView RENDER] Nodes prop length: ${nodes.length}, Edges prop length: ${edges.length}`); // Forceful log

  const cyRef = useRef<Core | null>(null);
  const isMountedRef = useRef<boolean>(true); // Track component mount status
  const { openMenu } = useContextMenu();
  const { hierarchyId, levels } = useHierarchyContext();
  const { applyLayoutToGraph, activeLayout } = useLayout();
  const selectedOrderRef = useRef<string[]>([]);
  const selectedEdgesOrderRef = useRef<string[]>([]);
  /**
   * Refs for refined manual double-click detection algorithm.
   * 
   * Manual double-click detection is required because Cytoscape.js event system
   * can fire duplicate tap events, making the built-in doubleTap unreliable.
   * This implementation uses a three-ref system with timing-based detection.
   * 
   * @see handleTap for the complete algorithm implementation
   */
  const lastConfirmedClickRef = useRef<{ nodeId: string | null; time: number }>({ nodeId: null, time: 0 }); 
  const shortTermTapTimeoutRef = useRef<NodeJS.Timeout | null>(null); 
  const potentialClickRef = useRef<{ nodeId: string | null; time: number }>({ nodeId: null, time: 0 });

  // Component lifecycle management
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Clean up any pending timeouts
      if (shortTermTapTimeoutRef.current) {
        clearTimeout(shortTermTapTimeoutRef.current);
        shortTermTapTimeoutRef.current = null;
      }
    };
  }, []);

  // Generate level styles dynamically using theme colors
  const generateLevelStyles = () => {
    return Object.entries(theme.colors.levels).map(([level, color]) => ({
      selector: `node[levelNumber=${level}]`,
      style: {
        'background-color': color,
        ...(level === '1' && { shape: 'ellipse' }),
      },
    }));
  };

  // Build elements: filter hidden nodes and edges
  const elements = useMemo<ElementDefinition[]>(() => {
    log('GraphView:useMemo[elements]', `Input nodes count: ${nodes.length}, Input edges count: ${edges.length}, Hidden count: ${hiddenNodeIds.size}`);
    const visible = nodes.filter(n => !hiddenNodeIds.has(n.id));
    const levelCounters: Record<number, number> = {};
    
    const nodeEls = visible.map(({ id, label, type, assignments, status, branch }) => {
      // Find all matching assignments for this hierarchy using centralized utility
      let matchingAssignments: Array<{
        hierarchyId: string;
        levelNumber: number;
        levelLabel?: string;
      }> = [];
      
      if (Array.isArray(assignments)) {
        matchingAssignments = assignments.filter(a => normalizeHierarchyId(hierarchyId, a.hierarchyId));
      }
      
      // Sort by level number (descending) and take the highest level
      matchingAssignments.sort((a, b) => b.levelNumber - a.levelNumber);
      const assignmentForCurrent = matchingAssignments.length > 0 ? matchingAssignments[0] : undefined;
      
      const levelNum = assignmentForCurrent?.levelNumber ?? 1;
      const idx = levelCounters[levelNum] ?? 0;
      levelCounters[levelNum] = idx + 1;
      const displayLabel = label ?? id;
      
      // Check if node is expanded for visual indicator
      const expanded = isNodeExpanded?.(id) ?? false;
      
      // Use proper spacing like original - layout engine will handle centering
      const simplePosition = {
        x: levelNum * (config.nodeHorizontalSpacing || 200),
        y: idx * (config.nodeVerticalSpacing || 100)
      };
      
      return {
        data: {
          id,
          label: displayLabel,
          labelLength: displayLabel.length,
          type,
          assignments,
          status,
          branch,
          levelNumber: levelNum,
          levelLabel: assignmentForCurrent?.levelLabel,
          expanded,
        },
        position: simplePosition,
      };
    });
    const validIds = new Set(visible.map(n => n.id));
    const edgeEls = edges
      .filter(e => validIds.has(e.source) && validIds.has(e.target))
      .map(({ id, source, target, type }) => ({
        data: { id: id ?? `${source}_${target}`, source, target, type },
      }));
    const finalElements = [...nodeEls, ...edgeEls];
    log('GraphView:useMemo[elements]', `Generated ${nodeEls.length} node elements, ${edgeEls.length} edge elements. Total: ${finalElements.length}`);
    return finalElements;
  }, [nodes, edges, hiddenNodeIds, hierarchyId, isNodeExpanded]);

  // Stylesheet: disable selection and style nodes/edges
  const stylesheet = [
    {
      selector: 'node',
      style: {
        'background-color': theme.colors.node.default,
        shape: 'round-rectangle',
        label: 'data(label)',
        width: `${config.nodeWidth}px`,
        height: `${config.nodeHeight}px`,
        'font-size': `mapData(labelLength, ${config.labelLengthMin}, ${config.labelLengthMax}, ${config.maxFontSize}, ${config.minFontSize})`,
        color: theme.colors.text.primary,
        'text-valign': 'center',
        'text-halign': 'center',
        'text-wrap': 'wrap',
        'text-max-width': `${config.nodeTextMaxWidth}px`,
        'border-width': config.defaultBorderWidth,
        'border-color': theme.colors.node.border.default,
      },
    },
    // Dynamic level styles generated from theme
    ...generateLevelStyles(),
    {
      selector: 'node[expanded=true]',
      style: {
        'border-width': config.activeBorderWidth,
        'border-color': theme.colors.node.border.expanded,
      },
    },
    {
      selector: 'edge',
      style: {
        width: 1,
        'line-color': theme.colors.edge.default,
        'target-arrow-color': theme.colors.edge.arrow,
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
      },
    },
    {
      selector: 'edge:selected',
      style: {
        'line-color': theme.colors.edge.selected,
        'width': config.activeBorderWidth,
      },
    },
    {
      selector: 'node:selected',
      style: {
        'border-width': config.activeBorderWidth,
        'border-color': theme.colors.node.border.selected,
        'border-style': 'solid',
        'background-color': theme.colors.node.selected,
      },
    },
  ];

  // Attach Cytoscape instance reference
  const attachCy = (cy: Core) => {
    cyRef.current = cy;
    (window as unknown as { cyInstance: Core }).cyInstance = cy; // Expose for E2E testing
    
    log('GraphView', 'Cytoscape instance attached');
  };
  
  // Set up all event handlers - SEPARATED from attachCy for clarity
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) {
      log('GraphView', 'ERROR: No Cytoscape instance available');
      return;
    }
    
    log('GraphView', 'Setting up event handlers');
    
    // Completely disable selection
    cy.autounselectify(false);
    if (typeof (cy as unknown as { boxSelectionEnabled?: (enabled: boolean) => void }).boxSelectionEnabled === 'function') {
      (cy as unknown as { boxSelectionEnabled: (enabled: boolean) => void }).boxSelectionEnabled(true);
    }
    log('GraphView', 'Multi-select enabled: autounselectify(false) and boxSelectionEnabled(true)');
    
    // Refined manual double-click detection logic
    const DOUBLE_CLICK_DELAY = config.doubleClickDelay; // Max time between clicks for double-click (ms)
    const SHORT_TERM_DEBOUNCE = config.shortTermDebounce; // Time to wait to confirm a single tap isn't a duplicate firing (ms)

    /**
     * Manual double-click detection algorithm for Cytoscape.js nodes.
     * 
     * Required because Cytoscape.js can fire duplicate tap events, making built-in
     * doubleTap unreliable. This algorithm uses three-ref timing system:
     * 
     * 1. **potentialClickRef**: Stores immediate tap for short-term duplicate detection
     * 2. **shortTermTapTimeoutRef**: 50ms timeout to confirm single clicks aren't duplicates  
     * 3. **lastConfirmedClickRef**: Stores confirmed clicks for double-click comparison
     * 
     * **Algorithm Flow:**
     * - Clear any pending timeout (handles duplicate firing)
     * - If same nodeId within DOUBLE_CLICK_DELAY: trigger double-click action
     * - Else: store as potential click with 50ms confirmation timeout
     * - After timeout: confirm as single click and store for future double-click detection
     * 
     * **Timing Constants:**
     * - DOUBLE_CLICK_DELAY (300ms): Max time between clicks for double-click
     * - SHORT_TERM_DEBOUNCE (50ms): Duplicate event detection window
     * 
     * @param e - Cytoscape tap event object
     */
    const handleTap = (e: CytoscapeTapEvent) => {
      const targetNode = e.target;
      const nodeId = targetNode.id ? targetNode.id() : null;
      const now = Date.now();

      // Clear any pending short-term timeout - this handles the duplicate firing case
      if (shortTermTapTimeoutRef.current) {
        clearTimeout(shortTermTapTimeoutRef.current);
        shortTermTapTimeoutRef.current = null;
        // We might still need to check if this completes a double-click
      }
      
      if (!nodeId) {
        lastConfirmedClickRef.current = { nodeId: null, time: 0 }; // Reset on background tap
        potentialClickRef.current = { nodeId: null, time: 0 };
        return;
      }

      // Check if this tap completes a double-click sequence with the last *confirmed* click
      const { nodeId: lastConfirmedNodeId, time: lastConfirmedTime } = lastConfirmedClickRef.current;
      const timeDiffFromConfirmed = now - lastConfirmedTime;

      if (nodeId === lastConfirmedNodeId && timeDiffFromConfirmed < DOUBLE_CLICK_DELAY) {
        // --- Double-click detected ---
        
        // Reset state immediately
        lastConfirmedClickRef.current = { nodeId: null, time: 0 }; 
        potentialClickRef.current = { nodeId: null, time: 0 };
        if (shortTermTapTimeoutRef.current) { // Clear just in case
           clearTimeout(shortTermTapTimeoutRef.current);
           shortTermTapTimeoutRef.current = null;
        }

        // Trigger the action
        if (onEditNode) {
          const nodeData = nodes.find(n => n.id === nodeId);
            if (nodeData) {
              onEditNode(nodeData);
          } else {
            log('GraphView', `[handleTap] Warning: Node data not found for ID: ${nodeId}`);
          }
        }
        
        // Prevent default behavior for the second tap
        e.preventDefault(); 
        e.stopPropagation();
        return false; 
      } else {
         // --- Potential Single Click ---
         // Store this tap temporarily
         potentialClickRef.current = { nodeId, time: now };

         // Set a short timeout. If no other tap event clears this timeout within ~50ms, 
         // then confirm this as the first click of a potential double-click sequence.
         shortTermTapTimeoutRef.current = setTimeout(() => {
             const confirmedNodeId = potentialClickRef.current.nodeId;
             lastConfirmedClickRef.current = { ...potentialClickRef.current };
             shortTermTapTimeoutRef.current = null;
              
              // If single click confirmed, call onNodeSelect if provided
              if (onNodeSelect && confirmedNodeId) {
                  const nodeData = nodes.find(n => n.id === confirmedNodeId);
                  if (nodeData) {
                      onNodeSelect(nodeData);
                  } else {
                      log('GraphView', `[handleTap] Warning: Node data not found for ID: ${confirmedNodeId} after confirming single click.`);
                  }
              }
          }, SHORT_TERM_DEBOUNCE);
       }
     };

     // Register tap handler
    log('GraphView', 'Registering tap event handler for manual double-click detection');
    cy.on('tap', 'node', handleTap);
    cy.on('tap', handleTap); // Also listen on background to reset

    // Listen for doubleTap event for direct double-click support
    const handleDoubleTap = (e: CytoscapeTapEvent) => {
      const nodeId = e.target.id();
      if (onEditNode && nodeId) {
        const nodeData = nodes.find(n => n.id === nodeId);
        if (nodeData) {
          onEditNode(nodeData);
        }
      }
    };
    cy.on('doubleTap', 'node', handleDoubleTap);

    // Clean up handlers and timeout on unmount
    return () => {
      log('GraphView', 'Cleaning up tap event handler and timeout');
      cy.off('tap', 'node', handleTap);
      cy.off('tap', handleTap);
      cy.off('doubleTap', 'node', handleDoubleTap);
      if (shortTermTapTimeoutRef.current) {
       clearTimeout(shortTermTapTimeoutRef.current);
       }
     };
   }, [onEditNode, onNodeSelect, nodes]); // Dependencies: onEditNode, onNodeSelect, and nodes (used in handler)

  // Context menu (right-click) handling
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    
    const handler = (e: CytoscapeContextEvent) => {
      const orig = e.originalEvent as MouseEvent;
      if (orig.button !== 2) return;
      
      const pos = { x: orig.clientX, y: orig.clientY };
      const tgt = e.target;
      
      if (tgt === cy) {
        // Background context menu
        openMenu('background', pos, { 
          onAddNode, 
          loadInitialGraph: onLoadCompleteGraph 
        });
      } else if (tgt.isEdge && tgt.isEdge()) {
        const sel = selectedEdgesOrderRef.current;
        const type = sel.length > 1 ? 'multi-edge' : 'edge';
        openMenu(type, pos, {
          edgeIds: sel,
          onDeleteEdge,
          onDeleteEdges,
        });
        } else if (tgt.isNode && tgt.isNode()) {
        // Node context menu
        const sel = selectedOrderRef.current;
        const type = sel.length > 1 ? 'multi-node' : 'node';
        const data = tgt.data() as NodeData;
        // Determine if adding a child is valid via allowedTypesMap context
        const assignments = data.assignments?.filter(a => normalizeHierarchyId(hierarchyId, a.hierarchyId)) || [];
        assignments.sort((a, b) => b.levelNumber - a.levelNumber);
        const parentLevelNum = assignments[0]?.levelNumber ?? 0;
        const nextLevelNum = parentLevelNum + 1;
        // Allow child addition for any defined level (empty allowedTypes ⇒ no restriction)
        const canAddChild = levels.some(l => l.levelNumber === nextLevelNum);
        let canConnect = false;
        let connectFrom: string | undefined;
        let connectTo: string | undefined;
        if (sel.length === 2 && onConnect) {
          const [from, to] = sel;
          const exists = edges.some(edge => edge.source === from && edge.target === to);
          canConnect = !exists;
          connectFrom = from;
          connectTo = to;
        }

        openMenu(type, pos, {
          node: data,
          nodeIds: sel,
          ...(canAddChild ? { onAddNode } : {}),
          onNodeExpand,
          onExpandChildren,
          onExpandAll,
          onCollapseNode,
          isNodeExpanded,
          onEditNode,
          onDeleteNode,
          onDeleteNodes,
          onHideNode,
          onHideNodes,
          onConnect,
          canConnect,
          connectFrom,
          connectTo,
        });
      }
      
      orig.preventDefault();
    };
    
    cy.on('cxttap', handler);
    
    return () => {
      cy.off('cxttap', handler);
    };
  }, [openMenu, onAddNode, onNodeExpand, onExpandChildren, onExpandAll, onCollapseNode, isNodeExpanded, onEditNode, onLoadCompleteGraph, onDeleteNode, onDeleteNodes, onHideNode, onHideNodes, onConnect, onDeleteEdge, onDeleteEdges, edges, hierarchyId, levels]);

  // Pure layout integration - apply layout when elements change
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || elements.length === 0 || !isMountedRef.current) return;
    
    // Apply current layout algorithm with mount check
    const applyLayoutSafely = async () => {
      if (isMountedRef.current) {
        await applyLayoutToGraph(cy);
      }
    };
    
    applyLayoutSafely();
  }, [elements, applyLayoutToGraph]);

  // Live force-directed layout during node dragging
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !isMountedRef.current) return;

    const handleNodeGrab = () => {
      if ((activeLayout === 'fcose' || activeLayout === 'force') && isMountedRef.current) {
        log('GraphView', `Starting live ${activeLayout} layout on node grab`);
        // Live update will be handled by the layout context
      }
    };

    const handleNodeFree = () => {
      if ((activeLayout === 'fcose' || activeLayout === 'force') && isMountedRef.current) {
        log('GraphView', `Stopping live ${activeLayout} layout on node free`);
        // Re-apply layout after dragging
        applyLayoutToGraph(cy);
      }
    };

    cy.on('grab', 'node', handleNodeGrab);
    cy.on('free', 'node', handleNodeFree);

    return () => {
      cy.off('grab', 'node', handleNodeGrab);
      cy.off('free', 'node', handleNodeFree);
    };
  }, [activeLayout, applyLayoutToGraph]);

    // Track selection order for multi-node operations
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const onSelect: CytoscapeSelectHandler = (e: CytoscapeSelectEvent) => {
      const id = e.target.id();
      selectedOrderRef.current.push(id);
    };
    const onUnselect: CytoscapeUnselectHandler = (e: CytoscapeSelectEvent) => {
      const id = e.target.id();
      selectedOrderRef.current = selectedOrderRef.current.filter(x => x !== id);
    };
    cy.on('select', 'node', onSelect);
    cy.on('unselect', 'node', onUnselect);
    return () => {
      cy.off('select', 'node', onSelect);
      cy.off('unselect', 'node', onUnselect);
    };
  }, []);

  // Keep selection arrays in sync when nodes or edges are removed
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const handleNodeRemove: CytoscapeRemoveHandler = (e: CytoscapeRemoveEvent) => {
      const removedId = e.target.id();
      selectedOrderRef.current = selectedOrderRef.current.filter(id => id !== removedId);
    };
    const handleEdgeRemove: CytoscapeRemoveHandler = (e: CytoscapeRemoveEvent) => {
      const removedId = e.target.id();
      selectedEdgesOrderRef.current = selectedEdgesOrderRef.current.filter(id => id !== removedId);
    };
    cy.on('remove', 'node', handleNodeRemove);
    cy.on('remove', 'edge', handleEdgeRemove);
    return () => {
      cy.off('remove', 'node', handleNodeRemove);
      cy.off('remove', 'edge', handleEdgeRemove);
    };
  }, []);

  // Track selection order for multi-edge operations
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const onEdgeSelect: CytoscapeSelectHandler = (e: CytoscapeSelectEvent) => {
      const id = e.target.id();
      selectedEdgesOrderRef.current.push(id);
    };
    const onEdgeUnselect: CytoscapeUnselectHandler = (e: CytoscapeSelectEvent) => {
      const id = e.target.id();
      selectedEdgesOrderRef.current = selectedEdgesOrderRef.current.filter(x => x !== id);
    };
    cy.on('select', 'edge', onEdgeSelect);
    cy.on('unselect', 'edge', onEdgeUnselect);
    return () => {
      cy.off('select', 'edge', onEdgeSelect);
      cy.off('unselect', 'edge', onEdgeUnselect);
    };
  }, []);

  return (
    <div data-testid="graph-container" style={{ width: '100%', height: '100%', ...style }}>
      <CytoscapeComponent
        elements={elements}
        stylesheet={stylesheet}
        style={{ width: '100%', height: '100%' }}
        cy={attachCy}
      />
    </div>
  );
};

export default GraphView;
