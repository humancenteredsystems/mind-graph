import { useState, useCallback, useRef } from 'react';
import { useHierarchyContext } from '../context/HierarchyContext';
import { fetchAllNodeIds, fetchTraversalData, deleteNodeCascade, executeMutation, executeQuery } from '../services/ApiService';
import { transformTraversalData, transformAllGraphData } from '../utils/graphUtils';
import { GET_ALL_NODES_AND_EDGES_QUERY } from '../graphql/queries';
import { NodeData, EdgeData, RawNodeResponse } from '../types/graph';
import { log } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import {
  ADD_NODE_WITH_HIERARCHY,
  ADD_EDGE_MUTATION,
  UPDATE_NODE_MUTATION,
  DELETE_NODE_MUTATION,
  DELETE_EDGE_MUTATION
} from '../graphql/mutations';

interface ExpansionDetails {
  addedNodes: string[];
  addedEdges: string[];
}

interface HierarchyExpansionState {
  expandedNodeIds: Set<string>;
  expansionDetails: Map<string, ExpansionDetails>;
}

interface UseGraphState {
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
  addNode: (values: { label: string; type: string; hierarchyId: string; levelId: string }, parentId?: string) => Promise<void>;
  editNode: (nodeId: string, values: { label: string; type: string }) => Promise<void>;
  deleteNode: (nodeId: string) => Promise<void>;
  deleteNodes: (nodeIds: string[]) => Promise<void>;
  deleteEdge: (edgeId: string) => Promise<void>;
  deleteEdges: (edgeIds: string[]) => Promise<void>;
  hideNode: (nodeId: string) => void;
  hideNodes: (nodeIds: string[]) => void;
  connectNodes: (fromId: string, toId: string) => Promise<EdgeData | undefined>;
}

export const useGraphState = (): UseGraphState => {
  const { hierarchyId } = useHierarchyContext();
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [edges, setEdges] = useState<EdgeData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExpanding, setIsExpanding] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hiddenNodeIds, setHiddenNodeIds] = useState<Set<string>>(new Set());
  
  // Hierarchy-aware expansion tracking
  const [expansionStates, setExpansionStates] = useState<Map<string, HierarchyExpansionState>>(new Map());

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
    
    // Find immediate children (nodes connected directly from the target node)
    const childNodeIds = new Set<string>();
    
    // Get edges from the target node to find its children
    const outgoingEdges = edges.filter(e => e.source === nodeId);
    outgoingEdges.forEach(edge => {
      // Add the target node as a child
      childNodeIds.add(edge.target);
    });
    
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
    
    // Get the clicked node's hierarchy level
    let matchingAssignments = clickedNode.assignments?.filter(a => a.hierarchyId === hierarchyId) || [];
    
    // Handle ID format mismatches (e.g., "1" vs "h1")
    if (matchingAssignments.length === 0 && clickedNode.assignments) {
      if (hierarchyId.startsWith('h')) {
        const numericId = hierarchyId.substring(1);
        matchingAssignments = clickedNode.assignments.filter(a => a.hierarchyId === numericId);
      } else {
        const prefixedId = `h${hierarchyId}`;
        matchingAssignments = clickedNode.assignments.filter(a => a.hierarchyId === prefixedId);
      }
    }
    
    // Sort by level number and take the highest level
    matchingAssignments.sort((a, b) => b.levelNumber - a.levelNumber);
    const clickedNodeLevel = matchingAssignments[0]?.levelNumber ?? 1;
    
    // Find descendant nodes that are:
    // 1. Connected via edges (recursively from the clicked node)
    // 2. At a lower hierarchy level (higher level number)
    const descendantNodeIds = new Set<string>();
    
    // Helper function to recursively find hierarchy-aware descendants
    const findHierarchyDescendants = (currentNodeId: string, visited: Set<string>) => {
      if (visited.has(currentNodeId)) return;
      visited.add(currentNodeId);
      
      // Find all nodes connected from the current node
      const outgoingEdges = edges.filter(e => e.source === currentNodeId);
      outgoingEdges.forEach(edge => {
        if (edge.target === nodeId) return; // Don't include the original node
        
        // Check if the target node is at a lower hierarchy level
        const targetNode = nodes.find(n => n.id === edge.target);
        if (!targetNode) return;
        
        // Get target node's hierarchy level
        let targetAssignments = targetNode.assignments?.filter(a => a.hierarchyId === hierarchyId) || [];
        
        // Handle ID format mismatches
        if (targetAssignments.length === 0 && targetNode.assignments) {
          if (hierarchyId.startsWith('h')) {
            const numericId = hierarchyId.substring(1);
            targetAssignments = targetNode.assignments.filter(a => a.hierarchyId === numericId);
          } else {
            const prefixedId = `h${hierarchyId}`;
            targetAssignments = targetNode.assignments.filter(a => a.hierarchyId === prefixedId);
          }
        }
        
        targetAssignments.sort((a, b) => b.levelNumber - a.levelNumber);
        const targetNodeLevel = targetAssignments[0]?.levelNumber ?? 1;
        
        // Only include nodes at lower hierarchy levels (higher level numbers)
        if (targetNodeLevel > clickedNodeLevel) {
          descendantNodeIds.add(edge.target);
          findHierarchyDescendants(edge.target, visited); // Recursively find descendants
        }
      });
    };
    
    findHierarchyDescendants(nodeId, new Set());
    
    // Show all hierarchy-aware descendants by removing them from hiddenNodeIds
    if (descendantNodeIds.size > 0) {
      setHiddenNodeIds(prev => {
        const newSet = new Set(prev);
        descendantNodeIds.forEach(id => newSet.delete(id));
        return newSet;
      });
      log('useGraphState', `Expanded descendants for Level ${clickedNodeLevel} node ${nodeId}: ${Array.from(descendantNodeIds).join(', ')}`);
    } else {
      log('useGraphState', `No hierarchy descendants found to expand for Level ${clickedNodeLevel} node ${nodeId}`);
    }
  }, [nodes, edges, hierarchyId]);

  // Hierarchy-aware collapse function - hides descendants at lower hierarchy levels
  const collapseNode = useCallback((nodeId: string) => {
    const clickedNode = nodes.find(n => n.id === nodeId);
    if (!clickedNode) {
      log('useGraphState', `Cannot collapse node ${nodeId}: node not found`);
      return;
    }
    
    // Get the clicked node's hierarchy level
    let matchingAssignments = clickedNode.assignments?.filter(a => a.hierarchyId === hierarchyId) || [];
    
    // Handle ID format mismatches (e.g., "1" vs "h1")
    if (matchingAssignments.length === 0 && clickedNode.assignments) {
      if (hierarchyId.startsWith('h')) {
        const numericId = hierarchyId.substring(1);
        matchingAssignments = clickedNode.assignments.filter(a => a.hierarchyId === numericId);
      } else {
        const prefixedId = `h${hierarchyId}`;
        matchingAssignments = clickedNode.assignments.filter(a => a.hierarchyId === prefixedId);
      }
    }
    
    // Sort by level number and take the highest level
    matchingAssignments.sort((a, b) => b.levelNumber - a.levelNumber);
    const clickedNodeLevel = matchingAssignments[0]?.levelNumber ?? 1;
    
    // Find descendant nodes that are:
    // 1. Connected via edges (recursively from the clicked node)
    // 2. At a lower hierarchy level (higher level number)
    const descendantNodeIds = new Set<string>();
    
    // Helper function to recursively find hierarchy-aware descendants
    const findHierarchyDescendants = (currentNodeId: string, visited: Set<string>) => {
      if (visited.has(currentNodeId)) return;
      visited.add(currentNodeId);
      
      // Find all nodes connected from the current node
      const outgoingEdges = edges.filter(e => e.source === currentNodeId);
      outgoingEdges.forEach(edge => {
        if (edge.target === nodeId) return; // Don't include the original node
        
        // Check if the target node is at a lower hierarchy level
        const targetNode = nodes.find(n => n.id === edge.target);
        if (!targetNode) return;
        
        // Get target node's hierarchy level
        let targetAssignments = targetNode.assignments?.filter(a => a.hierarchyId === hierarchyId) || [];
        
        // Handle ID format mismatches
        if (targetAssignments.length === 0 && targetNode.assignments) {
          if (hierarchyId.startsWith('h')) {
            const numericId = hierarchyId.substring(1);
            targetAssignments = targetNode.assignments.filter(a => a.hierarchyId === numericId);
          } else {
            const prefixedId = `h${hierarchyId}`;
            targetAssignments = targetNode.assignments.filter(a => a.hierarchyId === prefixedId);
          }
        }
        
        targetAssignments.sort((a, b) => b.levelNumber - a.levelNumber);
        const targetNodeLevel = targetAssignments[0]?.levelNumber ?? 1;
        
        // Only include nodes at lower hierarchy levels (higher level numbers)
        if (targetNodeLevel > clickedNodeLevel) {
          descendantNodeIds.add(edge.target);
          findHierarchyDescendants(edge.target, visited); // Recursively find descendants
        }
      });
    };
    
    findHierarchyDescendants(nodeId, new Set());
    
    // Hide all hierarchy-aware descendants by adding them to hiddenNodeIds
    if (descendantNodeIds.size > 0) {
      setHiddenNodeIds(prev => {
        const newSet = new Set(prev);
        descendantNodeIds.forEach(id => newSet.add(id));
        return newSet;
      });
      log('useGraphState', `Collapsed descendants for Level ${clickedNodeLevel} node ${nodeId}: ${Array.from(descendantNodeIds).join(', ')}`);
    } else {
      log('useGraphState', `No hierarchy descendants found to collapse for Level ${clickedNodeLevel} node ${nodeId}`);
    }
  }, [nodes, edges, hierarchyId]);

  // Keep the original expandNode for backward compatibility
  const expandNode = useCallback(async (nodeId: string) => {
    expandChildren(nodeId);
  }, [expandChildren]);

  const addNode = useCallback(async (values: { label: string; type: string; hierarchyId: string; levelId: string }, parentId?: string) => {
    const newId = uuidv4();
    interface NodeInput {
      id: string;
      label: string;
      type: string;
      hierarchyAssignments: {
        hierarchy: { id: string };
        level: { id: string };
      }[];
      parentId?: string;
    }
    
    const inputObj: NodeInput = {
      id: newId,
      label: values.label,
      type: values.type,
      hierarchyAssignments: [
        { 
          hierarchy: { id: values.hierarchyId }, 
          level: { id: values.levelId } 
        }
      ]
    };
    if (parentId) {
      inputObj.parentId = parentId;
    }
    const variables = { input: [inputObj] };
    try {
      const result = await executeMutation(ADD_NODE_WITH_HIERARCHY, variables);
      const added: RawNodeResponse | undefined = result.addNode?.node?.[0];
        if (added) {
          setNodes(prev => [
            ...prev,
            {
              id: added.id,
              label: added.label,
              type: added.type,
              assignments: added.hierarchyAssignments?.map(a => ({
                hierarchyId: a.hierarchy.id,
                hierarchyName: a.hierarchy.name,
                levelId: a.level.id,
                levelNumber: a.level.levelNumber,
                levelLabel: a.level.label
              })) ?? [],
              status: added.status,
              branch: added.branch
            }
          ]);
        if (parentId) {
          const edgeVars = {
            input: [{
              from: { id: parentId },
              fromId: parentId,
              to: { id: added.id },
              toId: added.id,
              type: 'simple'
            }]
          };
          const edgeRes = await executeMutation(ADD_EDGE_MUTATION, edgeVars);
          const newEdge = edgeRes.addEdge?.edge?.[0];
          if (newEdge) {
            setEdges(prev => [...prev, { source: parentId, target: added.id, type: newEdge.type }]);
          }
        }
      }
    } catch (err) {
      log('useGraphState', 'Error adding node', err);
      setError('Failed to add node.');
    }
  }, [hierarchyId]);

  const editNode = useCallback(async (nodeId: string, values: { label: string; type: string }) => {
    const variables = {
      input: {
        filter: { id: { eq: nodeId } },
        set: {
          label: values.label,
          type: values.type
        }
      }
    };
    try {
      const res = await executeMutation(UPDATE_NODE_MUTATION, variables);
      const updated: RawNodeResponse | undefined = res.updateNode?.node?.[0];
      if (updated) {
        setNodes(prev => prev.map(n => n.id === updated.id ? {
          id: updated.id,
          label: updated.label,
          type: updated.type,
          assignments: updated.hierarchyAssignments?.map(a => ({
            hierarchyId: a.hierarchy.id,
            hierarchyName: a.hierarchy.name,
            levelId: a.level.id,
            levelNumber: a.level.levelNumber,
            levelLabel: a.level.label
          })) ?? [],
          status: updated.status,
          branch: updated.branch
        } : n));
      }
    } catch (err) {
      log('useGraphState', `Error editing node ${nodeId}`, err);
      setError(`Failed to edit node ${nodeId}`);
    }
  }, []);

  const deleteNode = useCallback(async (nodeId: string) => {
    try {
      await deleteNodeCascade(nodeId);
      setNodes(prev => prev.filter(n => n.id !== nodeId));
      setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    } catch (err) {
      log('useGraphState', `Error deleting node ${nodeId}`, err);
      setError(`Failed to delete node ${nodeId}`);
    }
  }, []);

  const deleteNodes = useCallback(async (nodeIds: string[]) => {
    try {
      await executeMutation(DELETE_NODE_MUTATION, { input: { filter: { id: { in: nodeIds } } } });
      setNodes(prev => prev.filter(n => !nodeIds.includes(n.id)));
      setEdges(prev => prev.filter(e => !nodeIds.includes(e.source) && !nodeIds.includes(e.target)));
    } catch (err) {
      log('useGraphState', 'Error deleting nodes', err);
      setError(`Failed to delete nodes`);
    }
  }, []);

  const deleteEdge = useCallback(async (edgeId: string) => {
    const [source, target] = edgeId.split('_');
    try {
      await executeMutation(DELETE_EDGE_MUTATION, { filter: { fromId: { eq: source }, toId: { eq: target } } });
      setEdges(prev => prev.filter(e => `${e.source}_${e.target}` !== edgeId));
    } catch (err) {
      log('useGraphState', `Error deleting edge ${edgeId}`, err);
      setError(`Failed to delete edge ${edgeId}`);
    }
  }, []);

  const deleteEdges = useCallback(async (edgeIds: string[]) => {
    for (const id of edgeIds) {
      await deleteEdge(id);
    }
  }, [deleteEdge]);

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

  const connectNodes = useCallback(async (fromId: string, toId: string) => {
    if (edges.some(e => e.source === fromId && e.target === toId)) return;
    try {
      const edgeRes = await executeMutation(ADD_EDGE_MUTATION, {
        input: [{ from: { id: fromId }, fromId, to: { id: toId }, toId, type: 'simple' }]
      });
      const edge = edgeRes.addEdge?.edge?.[0];
      if (edge) {
        const newEdge: EdgeData = {
          source: edge.fromId || fromId,
          target: edge.toId || toId,
          type: edge.type
        };
        setEdges(prev => [...prev, newEdge]);
        return newEdge;
      }
    } catch (err) {
      log('useGraphState', `Error connecting nodes ${fromId} -> ${toId}`, err);
      setError(`Failed to connect nodes`);
    }
  }, [edges]);

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
    addNode,
    editNode,
    deleteNode,
    deleteNodes,
    deleteEdge,
    deleteEdges,
    hideNode,
    hideNodes,
    connectNodes
  };
};
