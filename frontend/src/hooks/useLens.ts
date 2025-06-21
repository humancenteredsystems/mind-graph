/**
 * useLens Hook - Core hook for filtering and transforming graph data using lenses
 * 
 * Integrates with ViewContext to apply the active lens to graph data,
 * handling filtering, mapping, styling, and optional backend computation.
 */

import { useEffect, useMemo, useState } from 'react';
import { Graph, ComputeResponse, LensError } from '@mims/lens-types';
import { useView } from '../context/ViewContext';
import { useHierarchyContext } from '../hooks/useHierarchy';
import { getLens } from '../lenses';
import { log } from '../utils/logger';

interface GraphData {
  nodes: any[];
  edges: any[];
}

interface UseLensResult {
  nodes: any[];
  edges: any[];
  layout: { name: string; options?: Record<string, any> };
  styleFn?: (el: any) => Record<string, any>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for applying lens transformations to graph data
 */
export function useLens(rawGraphData: GraphData): UseLensResult {
  const { active } = useView();
  const { hierarchies } = useHierarchyContext();
  const [computed, setComputed] = useState<Graph | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the active lens
  const lens = useMemo(() => {
    const foundLens = getLens(active, hierarchies);
    if (!foundLens) {
      log('useLens', `Warning: Lens '${active}' not found, falling back to default`);
      return getLens('default', hierarchies);
    }
    return foundLens;
  }, [active, hierarchies]);

  // Handle backend computation if required
  useEffect(() => {
    if (!lens?.compute) {
      setComputed(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const fetchComputedData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        log('useLens', `Fetching computed data from ${lens.compute!.endpoint}`);
        
        const response = await fetch(lens.compute!.endpoint, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(lens.compute!.params),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: ComputeResponse = await response.json();
        setComputed(data);
        log('useLens', `Received computed data: ${data.nodes.length} nodes, ${data.edges.length} edges`);
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        log('useLens', `Error fetching computed data: ${errorMessage}`);
        setError(`Failed to load ${lens.label} view: ${errorMessage}`);
        setComputed(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchComputedData();
  }, [lens?.compute, active]);

  // Apply lens transformations
  const transformedData = useMemo(() => {
    if (!lens) {
      return {
        nodes: rawGraphData.nodes,
        edges: rawGraphData.edges,
        layout: { name: 'fcose' },
        styleFn: undefined,
      };
    }

    try {
      // Use computed data if available, otherwise use raw data
      const baseData = computed || rawGraphData;
      
      log('useLens', `Applying lens '${lens.id}' to ${baseData.nodes.length} nodes, ${baseData.edges.length} edges`);

      // Apply filtering
      let filteredNodes = baseData.nodes;
      let filteredEdges = baseData.edges;

      if (lens.filter) {
        filteredNodes = baseData.nodes.filter(node => lens.filter!(node));
        
        // Filter edges to only include those between visible nodes
        const visibleNodeIds = new Set(filteredNodes.map(n => n.id));
        filteredEdges = baseData.edges.filter(edge => 
          lens.filter!(null, edge) && 
          visibleNodeIds.has(edge.source) && 
          visibleNodeIds.has(edge.target)
        );
      }

      // Apply mapping transformations
      if (lens.map) {
        filteredNodes = filteredNodes.map(node => ({ ...node, ...lens.map!(node) }));
        filteredEdges = filteredEdges.map(edge => ({ ...edge, ...lens.map!(edge) }));
      }

      log('useLens', `Lens transformation complete: ${filteredNodes.length} nodes, ${filteredEdges.length} edges`);

      return {
        nodes: filteredNodes,
        edges: filteredEdges,
        layout: lens.layout || { name: 'fcose' },
        styleFn: lens.style,
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      log('useLens', `Error applying lens transformations: ${errorMessage}`);
      
      // Return raw data on error
      return {
        nodes: rawGraphData.nodes,
        edges: rawGraphData.edges,
        layout: { name: 'fcose' },
        styleFn: undefined,
      };
    }
  }, [lens, rawGraphData, computed]);

  return {
    ...transformedData,
    isLoading,
    error,
  };
}
