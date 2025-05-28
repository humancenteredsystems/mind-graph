import React, { useRef, useEffect, useMemo, useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape, { Core, ElementDefinition, StylesheetCSS } from 'cytoscape';
import klay from 'cytoscape-klay';
import { NodeData, EdgeData } from '../types/graph';
import { useContextMenu } from '../context/ContextMenuContext';
import { useHierarchyContext } from '../context/HierarchyContext';
import { log } from '../utils/logger';
import { theme, getLevelColor, INTERACTIONS, config } from '../config';
import { normalizeHierarchyId } from '../utils/graphUtils';

// Register Cytoscape plugins ONCE at module load
cytoscape.use(klay);

interface GraphViewProps {
  nodes: NodeData[];
  edges: EdgeData[];
  style?: React.CSSProperties;
  hiddenNodeIds?: Set<string>;
  onNodeExpand?: (nodeId: string) => void;
  onExpandChildren?: (nodeId: string) => void;
  onExpandAll?: (nodeId: string) => void;
  onCollapseNode?: (nodeId: string) => void;
  isNodeExpanded?: (nodeId: string) => boolean;
  onAddNode?: (parentId?: string, position?: { x: number; y: number }) => void;
  onEditNode?: (node: NodeData) => void; // Changed to pass full NodeData
  onNodeSelect?: (node: NodeData) => void; // Prop for single-click selection
  onLoadCompleteGraph?: () => void;
  onDeleteNode?: (nodeId: string) => void;
  onDeleteNodes?: (nodeIds: string[]) => void;
  onDeleteEdge?: (edgeId: string) => void;
  onDeleteEdges?: (edgeIds: string[]) => void;
  onHideNode?: (nodeId: string) => void;
  onHideNodes?: (nodeIds: string[]) => void;
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
  const cyRef = useRef<Core | null>(null);
    const { openMenu } = useContextMenu();
    const { hierarchyId, levels, allowedTypesMap } = useHierarchyContext();
  const [selectedCount, setSelectedCount] = useState(0);
  const selectedOrderRef = useRef<string[]>([]);
  const [selectedEdgesCount, setSelectedEdgesCount] = useState(0);
  const selectedEdgesOrderRef = useRef<string[]>([]);
  // Refs for refined manual double-click detection
  const lastConfirmedClickRef = useRef<{ nodeId: string | null; time: number }>({ nodeId: null, time: 0 }); 
  const shortTermTapTimeoutRef = useRef<NodeJS.Timeout | null>(null); 
  const potentialClickRef = useRef<{ nodeId: string | null; time: number }>({ nodeId: null, time: 0 });

  // Build elements: filter hidden nodes and edges
  const elements = useMemo<ElementDefinition[]>(() => {
    const visible = nodes.filter(n => !hiddenNodeIds.has(n.id));
    const levelCounters: Record<number, number> = {};
    
    const nodeEls = visible.map(({ id, label, type, assignments, status, branch }) => {
      // Find all matching assignments for this hierarchy using centralized utility
      let matchingAssignments: any[] = [];
      
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
        position: { 
          x: levelNum * config.nodeHorizontalSpacing, 
          y: idx * config.nodeVerticalSpacing 
        },
        style: {
          'border-color': expanded ? theme.colors.node.border.expanded : theme.colors.node.border.default,
          'border-width': expanded ? config.activeBorderWidth : config.defaultBorderWidth,
        },
      };
    });
    const validIds = new Set(visible.map(n => n.id));
    const edgeEls = edges
      .filter(e => validIds.has(e.source) && validIds.has(e.target))
      .map(({ id, source, target, type }) => ({
        data: { id: id ?? `${source}_${target}`, source, target, type },
      }));
    return [...nodeEls, ...edgeEls];
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
    {
      selector: 'node[levelNumber = 1]',
      style: {
        shape: 'ellipse',
        'background-color': getLevelColor(1),
      },
    },
    {
      selector: 'node[levelNumber = 2]',
      style: {
        'background-color': getLevelColor(2),
      },
    },
    {
      selector: 'node[levelNumber = 3]',
      style: {
        'background-color': getLevelColor(3),
      },
    },
    {
      selector: 'node[levelNumber = 4]',
      style: {
        'background-color': getLevelColor(4),
      },
    },
    {
      selector: 'node[levelNumber = 5]',
      style: {
        'background-color': getLevelColor(5),
      },
    },
    {
      selector: 'node[levelNumber = 6]',
      style: {
        'background-color': getLevelColor(6),
      },
    },
    {
      selector: 'node[levelNumber = 7]',
      style: {
        'background-color': getLevelColor(7),
      },
    },
    {
      selector: 'node[levelNumber = 8]',
      style: {
        'background-color': getLevelColor(8),
      },
    },
    {
      selector: 'node[expanded = true]',
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
    log('GraphView', 'Cytoscape instance attached');
    // Expose cyInstance in development mode (Optional: Keep if needed for other debugging)
    // if (import.meta.env.DEV) {
    //   (window as any).cyInstance = cy;
    //   log('GraphView', 'cyInstance exposed');
    // }
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
    if (typeof (cy as any).boxSelectionEnabled === 'function') {
      (cy as any).boxSelectionEnabled(true);
    }
    log('GraphView', 'Multi-select enabled: autounselectify(false) and boxSelectionEnabled(true)');
    
    // Refined manual double-click detection logic
    const DOUBLE_CLICK_DELAY = config.doubleClickDelay; // Max time between clicks for double-click (ms)
    const SHORT_TERM_DEBOUNCE = config.shortTermDebounce; // Time to wait to confirm a single tap isn't a duplicate firing (ms)

    const handleTap = (e: any) => {
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
    const handleDoubleTap = (e: any) => {
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
    
    const handler = (e: any) => {
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
        const levelKeyNode = `${hierarchyId}l${nextLevelNum}`;
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
  }, [openMenu, onAddNode, onNodeExpand, onExpandChildren, onExpandAll, onCollapseNode, isNodeExpanded, onEditNode, onLoadCompleteGraph, onDeleteNode, onDeleteNodes, onHideNode, onHideNodes, onConnect, edges]);

  // Layout on elements update: use preset positions based on level
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.layout({ name: 'preset', padding: config.graphPadding }).run();
  }, [elements]);

    // Track selection order for multi-node operations
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const onSelect = (e: any) => {
      const id = e.target.id();
      selectedOrderRef.current.push(id);
      setSelectedCount(selectedOrderRef.current.length);
    };
    const onUnselect = (e: any) => {
      const id = e.target.id();
      selectedOrderRef.current = selectedOrderRef.current.filter(x => x !== id);
      setSelectedCount(selectedOrderRef.current.length);
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
    const handleNodeRemove = (e: any) => {
      const removedId = e.target.id();
      selectedOrderRef.current = selectedOrderRef.current.filter(id => id !== removedId);
      setSelectedCount(selectedOrderRef.current.length);
    };
    const handleEdgeRemove = (e: any) => {
      const removedId = e.target.id();
      selectedEdgesOrderRef.current = selectedEdgesOrderRef.current.filter(id => id !== removedId);
      setSelectedEdgesCount(selectedEdgesOrderRef.current.length);
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
    const onEdgeSelect = (e: any) => {
      const id = e.target.id();
      selectedEdgesOrderRef.current.push(id);
      setSelectedEdgesCount(selectedEdgesOrderRef.current.length);
    };
    const onEdgeUnselect = (e: any) => {
      const id = e.target.id();
      selectedEdgesOrderRef.current = selectedEdgesOrderRef.current.filter(x => x !== id);
      setSelectedEdgesCount(selectedEdgesOrderRef.current.length);
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
