import { useState, useCallback } from 'react';
import { useHierarchyContext } from '../context/HierarchyContext';
import { fetchTraversalData, executeQuery } from '../services/ApiService';
import { transformTraversalData, transformAllGraphData } from '../utils/graphUtils';
import { GET_ALL_NODES_AND_EDGES_QUERY } from '../graphql/queries';
import { NodeData, EdgeData } from '../types/graph';
import { log } from '../utils/logger';
import { createGraphOperations, GraphOperations } from '../services/graphService';
import {
  findHierarchyDescendants,
  findImmediateChildren,
  getNodeHierarchyLevel,
  logExpansionOperation
} from '../utils/graphUtils';

interface ExpansionDetails {
  addedNodes: string[];
  addedEdges: string[];
}

interface HierarchyExpansionState {
  expandedNodeIds: Set<string>;
  expansionDetails: Map<string, ExpansionDetails>;
}

interface UseGraphState extends GraphOperations {
  nodes: NodeData[];
  edges: EdgeData[];
  isLoading: boolean;
  isExpanding: boolean;
  error: string | null;
  hiddenNodeIds: Set<string>;
  loadInitialGraph: (rootId: string) => Promise<void>;
  loadCompleteGraph: () => Promise<void>;
  expandNode: (nodeId: string) => Promise<void>;
  expandChildren: (nodeId: string) => void;
  expandAll: (nodeId: string) => void;
  collapseNode: (nodeId: string) => void;
  isNodeExpanded: (nodeId: string) => boolean;
  hideNode: (nodeId: string) => void;
  hideNodes: (nodeIds: string[]) => void;
}

export const useGraphState = (): UseGraphState => {
  const { hierarchyId } = useHierarchyContext();
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [edges, setEdges] = useState<EdgeData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false); // Initialize to false
  const [isExpanding, setIsExpanding] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hiddenNodeIds, setHiddenNodeIds] = useState<Set<string>>(new Set());
  
  // Hierarchy-aware expansion tracking
  const [expansionStates, setExpansionStates] = useState<Map<string, HierarchyExpansionState>>(new Map());

  // Create graph operations
  const operations = createGraphOperations(setNodes, setEdges, setError, edges);

  // Helper function to get current hierarchy expansion state
  const getHierarchyState = useCallback((): HierarchyExpansionState => {
    const existing = expansionStates.get(hierarchyId);
    if (existing) return existing;
    
    const newState: HierarchyExpansionState = {
      expandedNodeIds: new Set(),
      expansionDetails: new Map()
    };
    setExpansionStates(prev => new Map(prev).set(hierarchyId, newState));
    return newState;
  }, [hierarchyId, expansionStates]);

  // Check if a node is expanded in the current hierarchy
  const isNodeExpanded = useCallback((nodeId: string): boolean => {
    const hierarchyState = expansionStates.get(hierarchyId);
    return hierarchyState?.expandedNodeIds.has(nodeId) ?? false;
  }, [hierarchyId, expansionStates]);

  const loadInitialGraph = useCallback(async (rootId: string) => {
    log('useGraphState', `Loading initial graph for ${rootId} in hierarchy ${hierarchyId}`);
    setIsLoading(true);
    setError(null);
    try {
      const rawData = await fetchTraversalData(rootId, hierarchyId);
      const { nodes: initNodes, edges: initEdges } = transformTraversalData(rawData);
      setNodes(initNodes);
      setEdges(initEdges);
      setHiddenNodeIds(new Set());
      // Clear expansion state for this hierarchy
      setExpansionStates(prev => {
        const newStates = new Map(prev);
        newStates.delete(hierarchyId);
        return newStates;
      });
    } catch (err) {
      log('useGraphState', `Error loading initial graph for ${rootId}`, err);
      setError('Failed to load initial graph data.');
    } finally {
      setIsLoading(false);
    }
  }, [hierarchyId]);

  const loadCompleteGraph = useCallback(async () => {
    log('useGraphState', `Loading complete graph for hierarchy ${hierarchyId}`);
    setIsLoading(true);
    setError(null);
    try {
      const rawData = await executeQuery(GET_ALL_NODES_AND_EDGES_QUERY);
      const { nodes: allNodes, edges: allEdges } = transformAllGraphData(rawData);
      setNodes(allNodes);
      setEdges(allEdges);
      
      // Show ALL nodes - this is "Load Complete Graph"
      setHiddenNodeIds(new Set());
      log('useGraphState', `Loaded complete graph with ${allNodes.length} nodes and ${allEdges.length} edges`);
      
      // Clear expansion state for this hierarchy
      setExpansionStates(prev => {
        const newStates = new Map(prev);
        newStates.delete(hierarchyId);
        return newStates;
      });
    } catch (err) {
      log('useGraphState', 'Error loading complete graph', err);
      setError('Failed to load complete graph data.');
    } finally {
      setIsLoading(false);
    }
  }, [hierarchyId]);

  // Stateless expand children function - shows immediate children via visibility
  const expandChildren = useCallback((nodeId: string) => {
    const clickedNode = nodes.find(n => n.id === nodeId);
    if (!clickedNode) {
      log('useGraphState', `Cannot expand node ${nodeId}: node not found`);
      return;
    }
    
    // Find immediate children using extracted utility
    const childNodeIds = findImmediateChildren(nodeId, edges);
    
    // Show the children by removing them from hiddenNodeIds
    if (childNodeIds.size > 0) {
      setHiddenNodeIds(prev => {
        const newSet = new Set(prev);
        childNodeIds.forEach(id => newSet.delete(id));
        return newSet;
      });
      log('useGraphState', `Expanded children for node ${nodeId}: ${Array.from(childNodeIds).join(', ')}`);
    } else {
      log('useGraphState', `No children found to expand for node ${nodeId}`);
    }
  }, [nodes, edges]);

  // Hierarchy-aware expand descendants function - shows descendants at lower hierarchy levels
  const expandAll = useCallback((nodeId: string) => {
    const clickedNode = nodes.find(n => n.id === nodeId);
    if (!clickedNode) {
      log('useGraphState', `Cannot expand node ${nodeId}: node not found`);
      return;
    }
    
    // Get the clicked node's hierarchy level using extracted utility
    const clickedNodeLevel = getNodeHierarchyLevel(clickedNode, hierarchyId);
    
    // Find descendant nodes using extracted utility
    const descendantNodeIds = findHierarchyDescendants(
      nodeId,
      nodes,
      edges,
      hierarchyId,
      clickedNodeLevel
    );
    
    // Show all hierarchy-aware descendants by removing them from hiddenNodeIds
    if (descendantNodeIds.size > 0) {
      setHiddenNodeIds(prev => {
        const newSet = new Set(prev);
        descendantNodeIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    }
    
    logExpansionOperation('Expanded descendants', nodeId, clickedNodeLevel, descendantNodeIds);
  }, [nodes, edges, hierarchyId]);

  // Hierarchy-aware collapse function - hides descendants at lower hierarchy levels
  const collapseNode = useCallback((nodeId: string) => {
    const clickedNode = nodes.find(n => n.id === nodeId);
    if (!clickedNode) {
      log('useGraphState', `Cannot collapse node ${nodeId}: node not found`);
      return;
    }
    
    // Get the clicked node's hierarchy level using extracted utility
    const clickedNodeLevel = getNodeHierarchyLevel(clickedNode, hierarchyId);
    
    // Find descendant nodes using extracted utility
    const descendantNodeIds = findHierarchyDescendants(
      nodeId,
      nodes,
      edges,
      hierarchyId,
      clickedNodeLevel
    );
    
    // Hide all hierarchy-aware descendants by adding them to hiddenNodeIds
    if (descendantNodeIds.size > 0) {
      setHiddenNodeIds(prev => {
        const newSet = new Set(prev);
        descendantNodeIds.forEach(id => newSet.add(id));
        return newSet;
      });
    }
    
    logExpansionOperation('Collapsed descendants', nodeId, clickedNodeLevel, descendantNodeIds);
  }, [nodes, edges, hierarchyId]);

  // Keep the original expandNode for backward compatibility
  const expandNode = useCallback(async (nodeId: string) => {
    expandChildren(nodeId);
  }, [expandChildren]);

  const hideNode = useCallback((nodeId: string) => {
    setHiddenNodeIds(prev => new Set(prev).add(nodeId));
  }, []);

  const hideNodes = useCallback((nodeIds: string[]) => {
    setHiddenNodeIds(prev => {
      const set = new Set(prev);
      nodeIds.forEach(id => set.add(id));
      return set;
    });
  }, []);

  return {
    nodes,
    edges,
    isLoading,
    isExpanding,
    error,
    hiddenNodeIds,
    loadInitialGraph,
    loadCompleteGraph,
    expandNode,
    expandChildren,
    expandAll,
    collapseNode,
    isNodeExpanded,
    hideNode,
    hideNodes,
    ...operations,
  };
};
