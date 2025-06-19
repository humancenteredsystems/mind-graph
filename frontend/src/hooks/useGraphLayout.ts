import { useEffect } from 'react';
import { Core } from 'cytoscape';
import { NodeData, EdgeData } from '../types/graph';
import { useLayoutContext } from '../context/LayoutContext';
import { useHierarchyContext } from './useHierarchy';
import { log } from '../utils/logger';

/**
 * Hook to manage Cytoscape layout lifecycle, including persistent force-directed simulation.
 *
 * @param cyRef - Ref to the Cytoscape instance
 * @param nodes - Array of NodeData rendered in the graph
 * @param edges - Array of EdgeData rendered in the graph
 */
export function useGraphLayout(
  cyRef: React.RefObject<Core | null>,
  nodes: NodeData[],
  edges: EdgeData[]
) {
  const { layoutEngine, currentAlgorithm, applyLayout } = useLayoutContext();
  const { hierarchyId } = useHierarchyContext();

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) {
      log('useGraphLayout', 'No Cytoscape instance available');
      return;
    }

    // Initialize engine with current graph data
    layoutEngine.initialize(cy, hierarchyId, nodes, edges);

    // Apply layout: live update for force-directed, one-shot for others
    if (currentAlgorithm === 'force-directed') {
      log('useGraphLayout', 'Applying force-directed layout with live update');
      applyLayout(undefined, { liveUpdate: true });
    } else {
      log('useGraphLayout', `Applying one-shot layout: ${currentAlgorithm}`);
      applyLayout(currentAlgorithm);
    }
  }, [cyRef, nodes, edges, hierarchyId, currentAlgorithm, layoutEngine, applyLayout]);
}
