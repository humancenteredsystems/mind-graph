import { useEffect, useRef } from 'react';
import { Core } from 'cytoscape';
import { CytoscapeSelectEvent, CytoscapeRemoveEvent } from '../types/cytoscape';

/**
 * Hook to track node and edge selection order within a Cytoscape instance.
 *
 * @param cyRef - Ref to the Cytoscape instance
 * @returns Object containing refs for selected node and edge ID arrays
 */
export function useGraphSelection(cyRef: React.RefObject<Core | null>) {
  const selectedNodesRef = useRef<string[]>([]);
  const selectedEdgesRef = useRef<string[]>([]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    // Handlers for node selection/unselection
    const handleNodeSelect = (e: CytoscapeSelectEvent) => {
      const id = e.target.id();
      selectedNodesRef.current.push(id);
    };
    const handleNodeUnselect = (e: CytoscapeSelectEvent) => {
      const id = e.target.id();
      selectedNodesRef.current = selectedNodesRef.current.filter(x => x !== id);
    };

    // Handlers for edge selection/unselection
    const handleEdgeSelect = (e: CytoscapeSelectEvent) => {
      const id = e.target.id();
      selectedEdgesRef.current.push(id);
    };
    const handleEdgeUnselect = (e: CytoscapeSelectEvent) => {
      const id = e.target.id();
      selectedEdgesRef.current = selectedEdgesRef.current.filter(x => x !== id);
    };

    // Cleanup when nodes or edges are removed
    const handleNodeRemove = (e: CytoscapeRemoveEvent) => {
      const id = e.target.id();
      selectedNodesRef.current = selectedNodesRef.current.filter(x => x !== id);
    };
    const handleEdgeRemove = (e: CytoscapeRemoveEvent) => {
      const id = e.target.id();
      selectedEdgesRef.current = selectedEdgesRef.current.filter(x => x !== id);
    };

    // Register listeners
    cy.on('select', 'node', handleNodeSelect);
    cy.on('unselect', 'node', handleNodeUnselect);
    cy.on('select', 'edge', handleEdgeSelect);
    cy.on('unselect', 'edge', handleEdgeUnselect);
    cy.on('remove', 'node', handleNodeRemove);
    cy.on('remove', 'edge', handleEdgeRemove);

    return () => {
      cy.off('select', 'node', handleNodeSelect);
      cy.off('unselect', 'node', handleNodeUnselect);
      cy.off('select', 'edge', handleEdgeSelect);
      cy.off('unselect', 'edge', handleEdgeUnselect);
      cy.off('remove', 'node', handleNodeRemove);
      cy.off('remove', 'edge', handleEdgeRemove);
    };
  }, [cyRef]);

  return { selectedNodesRef, selectedEdgesRef };
}
