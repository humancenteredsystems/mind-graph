import { useEffect, useRef, useState } from 'react';
import { Core } from 'cytoscape';
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
import { useContextMenu } from './useContextMenu';
import { useHierarchyContext } from './useHierarchy';
import { useView } from '../context/ViewContext';
import { useLayout } from '../context/LayoutContext';
import { useHierarchyAssignment } from './useHierarchyAssignment';
import { log } from '../utils/logger';
import { config } from '../config';
import { normalizeHierarchyId } from '../utils/graphUtils';
import {
  createDragPreview,
  updateDragPreview,
  removeDragPreview,
  getDropZoneUnderMouse,
  highlightDropZone,
  unhighlightDropZone,
  addDragFeedback,
  removeDragFeedback
} from '../utils/graphUtils';

export function useGraphEvents(
  cyRef: React.RefObject<Core | null>,
  nodes: NodeData[],
  edges: EdgeData[],
  onEditNode?: (node: NodeData) => void,
  onNodeSelect?: (node: NodeData) => void,
  onAddNode?: (parentId?: string, position?: { x: number; y: number }) => void,
  onNodeExpand?: (nodeId: string) => void,
  onExpandChildren?: (nodeId: string) => void,
  onExpandAll?: (nodeId: string) => void,
  onCollapseNode?: (nodeId: string) => void,
  isNodeExpanded?: (nodeId: string) => boolean,
  onDeleteNode?: (nodeId: string) => void,
  onDeleteNodes?: (nodeIds: string[]) => void,
  onDeleteEdge?: (edgeId: string) => void,
  onDeleteEdges?: (edgeIds: string[]) => void,
  onHideNode?: (nodeId: string) => void,
  onHideNodes?: (nodeIds: string[]) => void,
  onConnect?: (from: string, to: string) => void,
  onLoadCompleteGraph?: () => void
) {
  const { openMenu } = useContextMenu();
  const { levels } = useHierarchyContext();
  const { applyLayoutToGraph, activeLayout } = useLayout();
  const { assignNodeToLevel } = useHierarchyAssignment();
  
  // Selection tracking refs
  const selectedOrderRef = useRef<string[]>([]);
  const selectedEdgesOrderRef = useRef<string[]>([]);
  
  // Manual double-click detection refs
  const lastConfirmedClickRef = useRef<{ nodeId: string | null; time: number }>({ nodeId: null, time: 0 });
  const shortTermTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const potentialClickRef = useRef<{ nodeId: string | null; time: number }>({ nodeId: null, time: 0 });
  
  // Simple drag system state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNodeData, setDraggedNodeData] = useState<NodeData | null>(null);
  const dragPreviewRef = useRef<HTMLDivElement | null>(null);
  const currentDropZoneRef = useRef<Element | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Extract hierarchy ID from active view
  const { active } = useView();
  const hierarchyId = active && active.startsWith('hierarchy-') 
    ? active.replace('hierarchy-', '') 
    : '';

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
      // Clean up drag preview
      if (dragPreviewRef.current) {
        removeDragPreview(dragPreviewRef.current);
        dragPreviewRef.current = null;
      }
    };
  }, []);

  // Mouse move handler for drag preview
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragPreviewRef.current) return;
      
      // Update drag preview position
      updateDragPreview(dragPreviewRef.current, e.clientX, e.clientY);
      
      // Check for drop zones under mouse
      const dropZone = getDropZoneUnderMouse(e.clientX, e.clientY);
      
      // Update drop zone highlighting
      if (dropZone !== currentDropZoneRef.current) {
        // Remove highlight from previous drop zone
        if (currentDropZoneRef.current) {
          unhighlightDropZone(currentDropZoneRef.current);
        }
        
        // Add highlight to new drop zone
        if (dropZone) {
          highlightDropZone(dropZone);
        }
        
        currentDropZoneRef.current = dropZone;
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      return () => document.removeEventListener('mousemove', handleMouseMove);
    }
  }, [isDragging]);

  // Main event handlers setup
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) {
      log('useGraphEvents', 'ERROR: No Cytoscape instance available');
      return;
    }
    
    log('useGraphEvents', 'Setting up simple drag event handlers');
    
    // Enable multi-selection
    cy.autounselectify(false);
    if (typeof (cy as unknown as { boxSelectionEnabled?: (enabled: boolean) => void }).boxSelectionEnabled === 'function') {
      (cy as unknown as { boxSelectionEnabled: (enabled: boolean) => void }).boxSelectionEnabled(true);
    }
    log('useGraphEvents', 'Multi-select enabled: autounselectify(false) and boxSelectionEnabled(true)');

    // Manual double-click detection constants
    const DOUBLE_CLICK_DELAY = config.doubleClickDelay || 300;
    const SHORT_TERM_DEBOUNCE = config.shortTermDebounce || 50;

    /**
     * Manual double-click detection algorithm for Cytoscape.js nodes.
     * Required because Cytoscape.js can fire duplicate tap events.
     */
    const handleTap = (e: CytoscapeTapEvent) => {
      const targetNode = e.target;
      const nodeId = targetNode.id ? targetNode.id() : null;
      const now = Date.now();

      // Clear any pending short-term timeout
      if (shortTermTapTimeoutRef.current) {
        clearTimeout(shortTermTapTimeoutRef.current);
        shortTermTapTimeoutRef.current = null;
      }
      
      if (!nodeId) {
        lastConfirmedClickRef.current = { nodeId: null, time: 0 };
        potentialClickRef.current = { nodeId: null, time: 0 };
        return;
      }

      // Check if this tap completes a double-click sequence
      const { nodeId: lastConfirmedNodeId, time: lastConfirmedTime } = lastConfirmedClickRef.current;
      const timeDiffFromConfirmed = now - lastConfirmedTime;

      if (nodeId === lastConfirmedNodeId && timeDiffFromConfirmed < DOUBLE_CLICK_DELAY) {
        // Double-click detected
        lastConfirmedClickRef.current = { nodeId: null, time: 0 };
        potentialClickRef.current = { nodeId: null, time: 0 };
        
        if (onEditNode) {
          const nodeData = nodes.find(n => n.id === nodeId);
          if (nodeData) {
            onEditNode(nodeData);
          } else {
            log('useGraphEvents', `Warning: Node data not found for ID: ${nodeId}`);
          }
        }
        
        e.preventDefault();
        e.stopPropagation();
        return false;
      } else {
        // Potential single click
        potentialClickRef.current = { nodeId, time: now };
        
        shortTermTapTimeoutRef.current = setTimeout(() => {
          const confirmedNodeId = potentialClickRef.current.nodeId;
          lastConfirmedClickRef.current = { ...potentialClickRef.current };
          shortTermTapTimeoutRef.current = null;
          
          // Single click confirmed
          if (onNodeSelect && confirmedNodeId) {
            const nodeData = nodes.find(n => n.id === confirmedNodeId);
            if (nodeData) {
              onNodeSelect(nodeData);
            } else {
              log('useGraphEvents', `Warning: Node data not found for ID: ${confirmedNodeId}`);
            }
          }
        }, SHORT_TERM_DEBOUNCE);
      }
    };

    /**
     * Context menu (right-click) handler
     */
    const handleContextMenu = (e: CytoscapeContextEvent) => {
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
        // Edge context menu
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
        
        // Determine if adding a child is valid
        const assignments = data.assignments?.filter(a => normalizeHierarchyId(hierarchyId, a.hierarchyId)) || [];
        assignments.sort((a, b) => b.levelNumber - a.levelNumber);
        const parentLevelNum = assignments[0]?.levelNumber ?? 0;
        const nextLevelNum = parentLevelNum + 1;
        const canAddChild = levels.some(l => l.levelNumber === nextLevelNum);
        
        // Check if connection is possible
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

    /**
     * Simple drag system - start drag on node grab
     */
    const handleNodeGrab = (e: any) => {
      const nodeId = e.target.id();
      const nodeData = nodes.find(n => n.id === nodeId);
      
      if (nodeData) {
        setIsDragging(true);
        setDraggedNodeData(nodeData);
        addDragFeedback();
        
        // Create visible drag preview
        dragPreviewRef.current = createDragPreview(nodeData);
        
        log('useGraphEvents', `Started dragging node: ${nodeId}`);
      }

      // Handle live layout for force-directed algorithms
      if ((activeLayout === 'fcose' || activeLayout === 'force') && isMountedRef.current) {
        log('useGraphEvents', `Starting live ${activeLayout} layout on node grab`);
      }
    };

    /**
     * Complete drag operation on node free
     */
    const handleNodeFree = async (e: any) => {
      const nodeId = e.target.id();
      
      // Check if we're dropping on a valid drop zone
      if (isDragging && draggedNodeData && currentDropZoneRef.current) {
        const dropZone = currentDropZoneRef.current;
        const levelId = dropZone.getAttribute('data-level-id');
        
        if (levelId) {
          try {
            log('useGraphEvents', `Assigning node ${draggedNodeData.id} to level ${levelId}`);
            await assignNodeToLevel(draggedNodeData.id, levelId, draggedNodeData);
          } catch (error) {
            log('useGraphEvents', `Error assigning node to level:`, error);
          }
        }
      }
      
      // Clean up drag state
      setIsDragging(false);
      setDraggedNodeData(null);
      removeDragFeedback();
      
      // Remove drop zone highlighting
      if (currentDropZoneRef.current) {
        unhighlightDropZone(currentDropZoneRef.current);
        currentDropZoneRef.current = null;
      }
      
      // Remove drag preview
      if (dragPreviewRef.current) {
        removeDragPreview(dragPreviewRef.current);
        dragPreviewRef.current = null;
      }
      
      log('useGraphEvents', `Finished dragging node: ${nodeId}`);

      // Re-apply layout after dragging for force-directed algorithms
      if ((activeLayout === 'fcose' || activeLayout === 'force') && isMountedRef.current) {
        log('useGraphEvents', `Stopping live ${activeLayout} layout on node free`);
        applyLayoutToGraph(cy);
      }
    };

    /**
     * Selection tracking handlers
     */
    const handleNodeSelect: CytoscapeSelectHandler = (e: CytoscapeSelectEvent) => {
      const id = e.target.id();
      selectedOrderRef.current.push(id);
    };

    const handleNodeUnselect: CytoscapeUnselectHandler = (e: CytoscapeSelectEvent) => {
      const id = e.target.id();
      selectedOrderRef.current = selectedOrderRef.current.filter(x => x !== id);
    };

    const handleEdgeSelect: CytoscapeSelectHandler = (e: CytoscapeSelectEvent) => {
      const id = e.target.id();
      selectedEdgesOrderRef.current.push(id);
    };

    const handleEdgeUnselect: CytoscapeUnselectHandler = (e: CytoscapeSelectEvent) => {
      const id = e.target.id();
      selectedEdgesOrderRef.current = selectedEdgesOrderRef.current.filter(x => x !== id);
    };

    /**
     * Cleanup handlers for removed elements
     */
    const handleNodeRemove: CytoscapeRemoveHandler = (e: CytoscapeRemoveEvent) => {
      const removedId = e.target.id();
      selectedOrderRef.current = selectedOrderRef.current.filter(id => id !== removedId);
    };

    const handleEdgeRemove: CytoscapeRemoveHandler = (e: CytoscapeRemoveEvent) => {
      const removedId = e.target.id();
      selectedEdgesOrderRef.current = selectedEdgesOrderRef.current.filter(id => id !== removedId);
    };

    // Register all event handlers
    cy.on('tap', 'node', handleTap);
    cy.on('tap', handleTap); // Background tap
    cy.on('cxttap', handleContextMenu);
    cy.on('grab', 'node', handleNodeGrab);
    cy.on('free', 'node', handleNodeFree);
    cy.on('select', 'node', handleNodeSelect);
    cy.on('unselect', 'node', handleNodeUnselect);
    cy.on('select', 'edge', handleEdgeSelect);
    cy.on('unselect', 'edge', handleEdgeUnselect);
    cy.on('remove', 'node', handleNodeRemove);
    cy.on('remove', 'edge', handleEdgeRemove);

    // Cleanup function
    return () => {
      log('useGraphEvents', 'Cleaning up all event handlers');
      cy.off('tap', 'node', handleTap);
      cy.off('tap', handleTap);
      cy.off('cxttap', handleContextMenu);
      cy.off('grab', 'node', handleNodeGrab);
      cy.off('free', 'node', handleNodeFree);
      cy.off('select', 'node', handleNodeSelect);
      cy.off('unselect', 'node', handleNodeUnselect);
      cy.off('select', 'edge', handleEdgeSelect);
      cy.off('unselect', 'edge', handleEdgeUnselect);
      cy.off('remove', 'node', handleNodeRemove);
      cy.off('remove', 'edge', handleEdgeRemove);
      
      if (shortTermTapTimeoutRef.current) {
        clearTimeout(shortTermTapTimeoutRef.current);
      }
    };
  }, [
    cyRef,
    nodes,
    edges,
    onEditNode,
    onNodeSelect,
    onAddNode,
    onNodeExpand,
    onExpandChildren,
    onExpandAll,
    onCollapseNode,
    isNodeExpanded,
    onDeleteNode,
    onDeleteNodes,
    onDeleteEdge,
    onDeleteEdges,
    onHideNode,
    onHideNodes,
    onConnect,
    onLoadCompleteGraph,
    openMenu,
    hierarchyId,
    levels,
    activeLayout,
    applyLayoutToGraph,
    assignNodeToLevel,
    isDragging,
    draggedNodeData
  ]);

  // Return drag state for components that need it
  return {
    isDragging,
    draggedNodeData
  };
}
