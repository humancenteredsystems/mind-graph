import React, { useRef, useEffect, useMemo } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape, { Core, ElementDefinition } from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import dagre from 'cytoscape-dagre';
import cola from 'cytoscape-cola';
import euler from 'cytoscape-euler';
import fcose from 'cytoscape-fcose';
import { NodeData, EdgeData } from '../types/graph';
import { useHierarchyContext } from '../hooks/useHierarchy';
import { useView } from '../context/ViewContext';
import { useLayout } from '../context/LayoutContext';
import { useGraphEvents } from '../hooks/useGraphEvents';
import { log } from '../utils/logger';
import { theme, config } from '../config';
import { normalizeHierarchyId, resolveNodeVisualState, getNodeDisplayLabel } from '../utils/graphUtils';
import { useHierarchyStyleContext } from '../context/HierarchyStyleContext';

// Register Cytoscape plugins ONCE at module load
cytoscape.use(coseBilkent);
cytoscape.use(dagre);
cytoscape.use(cola);
cytoscape.use(euler);
cytoscape.use(fcose);

/**
 * Props interface for the GraphView component.
 */
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
  onEditNode?: (node: NodeData) => void;
  onNodeSelect?: (node: NodeData) => void;
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
  onNodeSelect,
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
  const { active } = useView();
  const { applyLayoutToGraph } = useLayout();

  // Determine current hierarchy
  const hierarchyId = active && active.startsWith('hierarchy-')
    ? active.replace('hierarchy-', '')
    : '';

  // Manage custom styles
  const { getCytoscapeStyles } = useHierarchyStyleContext();
  const dynamicStyles = getCytoscapeStyles(hierarchyId);

  // Event handling
  const { isDragging } = useGraphEvents(
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
    onLoadCompleteGraph
  );

  // Prepare elements
  const elements = useMemo<ElementDefinition[]>(() => {
    const visible = nodes.filter(n => !hiddenNodeIds.has(n.id));
    const levelCounters: Record<number, number> = {};

    const nodeEls = visible.map(nodeData => {
      const { id, assignments } = nodeData;
      const { hierarchyId: vsHierarchyId, levelId: vsLevelId, levelNumber, isAssigned } = resolveNodeVisualState(nodeData, hierarchyId);
      const idx = levelCounters[levelNumber] ?? 0;
      levelCounters[visualState.levelNumber] = idx + 1;

      return {
        data: {
          id,
          label: getNodeDisplayLabel(nodeData),
          labelLength: getNodeDisplayLabel(nodeData).length,
          type: nodeData.type,
          assignments: nodeData.assignments,
          status: nodeData.status,
          branch: nodeData.branch,
          hierarchyId: vsHierarchyId,
          levelId: vsLevelId,
          levelNumber,
          levelLabel: isAssigned 
            ? assignments?.find(a => normalizeHierarchyId(hierarchyId, a.hierarchyId))?.levelLabel 
            : 'Unassigned',
          isAssigned: isAssigned.toString(),
          expanded: isNodeExpanded?.(id) ?? false,
        },
        position: {
          x: visualState.levelNumber * (config.nodeHorizontalSpacing || 200),
          y: idx * (config.nodeVerticalSpacing || 100),
        },
      };
    });

    const validIds = new Set(visible.map(n => n.id));
    const edgeEls = edges
      .filter(e => validIds.has(e.source) && validIds.has(e.target))
      .map(e => ({
        data: {
          id: e.id ?? `${e.source}_${e.target}`,
          source: e.source,
          target: e.target,
          type: e.type,
        },
      }));

    return [...nodeEls, ...edgeEls];
  }, [nodes, edges, hiddenNodeIds, hierarchyId, isNodeExpanded]);

  // Static base styles
  const baseStyles = [
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

  const stylesheet = [...baseStyles, ...dynamicStyles];

  // Attach Cytoscape instance
  const attachCy = (cy: Core) => {
    cyRef.current = cy;
    (window as any).cyInstance = cy;
    log('GraphView', 'Cytoscape instance attached');
  };

  // Apply layout
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || elements.length === 0) return;
    applyLayoutToGraph(cy);
  }, [elements, applyLayoutToGraph]);

  return (
    <div
      data-testid="graph-container"
      style={{ width: '100%', height: '100%', ...style }}
      className={isDragging ? 'dragging' : ''}
    >
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
