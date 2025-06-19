import { useMemo } from 'react';
import { ElementDefinition } from 'cytoscape';
import { NodeData, EdgeData } from '../types/graph';
import { theme, config } from '../config';
import { normalizeHierarchyId } from '../utils/graphUtils';
import { useHierarchyContext } from './useHierarchy';

/**
 * Hook to generate Cytoscape elements and stylesheet.
 *
 * @param nodes - Raw nodes from data source
 * @param edges - Raw edges from data source
 * @param hiddenNodeIds - Set of node IDs to hide
 * @param isNodeExpanded - Optional callback to check expansion state
 */
export function useGraphElements(
  nodes: NodeData[],
  edges: EdgeData[],
  hiddenNodeIds: Set<string>,
  isNodeExpanded?: (nodeId: string) => boolean
) {
  const { hierarchyId } = useHierarchyContext();

  const elements: ElementDefinition[] = useMemo(() => {
    // Build filtered node and edge elements
    const visible = nodes.filter(n => !hiddenNodeIds.has(n.id));
    const nodeEls = visible.map((node, idx) => {
      const expanded = isNodeExpanded?.(node.id) ?? false;
      const level = node.assignments?.find(a => normalizeHierarchyId(hierarchyId, a.hierarchyId))?.levelNumber ?? 1;
      const position = { x: level * (config.nodeHorizontalSpacing || 200), y: idx * (config.nodeVerticalSpacing || 100) };

      return {
        data: {
          id: node.id,
          label: node.label || node.id,
          ...node,
          levelNumber: level,
          expanded,
        },
        position,
      };
    });

    const validIds = new Set(visible.map(n => n.id));
    const edgeEls = edges
      .filter(e => validIds.has(e.source) && validIds.has(e.target))
      .map(e => ({
        data: { id: e.id || `${e.source}_${e.target}`, source: e.source, target: e.target, type: e.type },
      }));

    return [...nodeEls, ...edgeEls];
  }, [nodes, edges, hiddenNodeIds, hierarchyId, isNodeExpanded]);

  const stylesheet = useMemo(() => {
    return [
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
  }, []);

  return { elements, stylesheet };
}
