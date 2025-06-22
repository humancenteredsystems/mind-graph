/**
 * useLens Hook - Core hook for filtering and transforming graph data using lenses
 * 
 * New Architecture:
 * - Layout is always applied (managed by LayoutContext)
 * - Hierarchy lens is optionally applied on top (when not 'none')
 * - Filters will be applied in the future
 */

import { useEffect, useMemo, useState } from 'react';
import { Graph, ComputeResponse, LensError } from '@mims/lens-types';
import { useView } from '../context/ViewContext';
import { useHierarchyContext } from '../hooks/useHierarchy';
import { getLens } from '../lenses';
import { log } from '../utils/logger';
import { filterNodesByAssociation, getNodeAssociationClasses } from '../utils/hierarchyUtils';

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
  const viewContext = useView() as any; // Type assertion to work around caching issue
  const { active, hideUnassociated } = viewContext;
  const { hierarchies } = useHierarchyContext();
  const [computed, setComputed] = useState<Graph | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the active hierarchy lens (if not 'none')
  const hierarchyLens = useMemo(() => {
    if (active === 'none') {
      return null; // No hierarchy lens applied
    }
    
    const foundLens = getLens(active, hierarchies);
    if (!foundLens) {
      log('useLens', `Warning: Hierarchy lens '${active}' not found`);
      return null;
    }
    return foundLens;
  }, [active, hierarchies]);

  // Handle backend computation if required (only for hierarchy lenses)
  useEffect(() => {
    if (!hierarchyLens?.compute) {
      setComputed(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const fetchComputedData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        log('useLens', `Fetching computed data from ${hierarchyLens.compute!.endpoint}`);
        
        const response = await fetch(hierarchyLens.compute!.endpoint, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(hierarchyLens.compute!.params),
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
        setError(`Failed to load ${hierarchyLens.label} view: ${errorMessage}`);
        setComputed(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchComputedData();
  }, [hierarchyLens?.compute, active]);

  // Apply hierarchy lens transformations and association filtering
  const transformedData = useMemo(() => {
    // Use computed data if available, otherwise use raw data
    const baseData = computed || rawGraphData;
    
    // If no hierarchy lens is active, return raw data (no association filtering)
    if (!hierarchyLens) {
      log('useLens', `No hierarchy lens active, using raw data: ${baseData.nodes.length} nodes, ${baseData.edges.length} edges`);
      return {
        nodes: baseData.nodes,
        edges: baseData.edges,
        layout: { name: 'fcose' }, // Default layout (will be overridden by LayoutContext)
        styleFn: undefined,
      };
    }

    try {
      log('useLens', `Applying hierarchy lens '${hierarchyLens.id}' to ${baseData.nodes.length} nodes, ${baseData.edges.length} edges`);

      // Apply filtering
      let filteredNodes = baseData.nodes;
      let filteredEdges = baseData.edges;

      if (hierarchyLens.filter) {
        filteredNodes = baseData.nodes.filter(node => hierarchyLens.filter!(node));
        
        // Filter edges to only include those between visible nodes
        const visibleNodeIds = new Set(filteredNodes.map(n => n.id));
        filteredEdges = baseData.edges.filter(edge => 
          hierarchyLens.filter!(null, edge) && 
          visibleNodeIds.has(edge.source) && 
          visibleNodeIds.has(edge.target)
        );
      }

      // Apply mapping transformations
      if (hierarchyLens.map) {
        filteredNodes = filteredNodes.map(node => ({ ...node, ...hierarchyLens.map!(node) }));
        filteredEdges = filteredEdges.map(edge => ({ ...edge, ...hierarchyLens.map!(edge) }));
      }

      // Apply association filtering (after hierarchy lens transformations)
      const associationFilteredNodes = filterNodesByAssociation(filteredNodes, active, hideUnassociated);
      
      // Filter edges to only include those between visible nodes after association filtering
      const visibleNodeIds = new Set(associationFilteredNodes.map(n => n.id));
      const associationFilteredEdges = filteredEdges.filter(edge => 
        visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
      );

      // Create enhanced style function that includes association styling
      const enhancedStyleFn = (el: any) => {
        const baseStyle = hierarchyLens.style ? hierarchyLens.style(el) : {};
        
        // Add association styling for nodes
        if (el.group && el.group() === 'nodes') {
          const node = el.data();
          const associationClasses = getNodeAssociationClasses(node, active, hideUnassociated);
          
          // Apply grayed-out styling for unassociated nodes when they're visible
          if (associationClasses.includes('hierarchy-grayed')) {
            return {
              ...baseStyle,
              opacity: 0.4,
              'background-color': '#9ca3af',
              'border-color': '#6b7280',
            };
          }
        }
        
        return baseStyle;
      };

      log('useLens', `Hierarchy lens and association filtering complete: ${associationFilteredNodes.length} nodes, ${associationFilteredEdges.length} edges`);

      return {
        nodes: associationFilteredNodes,
        edges: associationFilteredEdges,
        layout: hierarchyLens.layout || { name: 'fcose' }, // Layout from hierarchy lens (will be overridden by LayoutContext)
        styleFn: enhancedStyleFn,
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      log('useLens', `Error applying hierarchy lens transformations: ${errorMessage}`);
      
      // Return raw data on error
      return {
        nodes: rawGraphData.nodes,
        edges: rawGraphData.edges,
        layout: { name: 'fcose' },
        styleFn: undefined,
      };
    }
  }, [hierarchyLens, rawGraphData, computed, active, hideUnassociated]);

  return {
    ...transformedData,
    isLoading,
    error,
  };
}
