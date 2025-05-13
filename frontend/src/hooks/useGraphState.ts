import { useState, useCallback, useRef } from 'react';
import { useHierarchyContext } from '../context/HierarchyContext';
import { fetchAllNodeIds, fetchTraversalData, deleteNodeCascade, executeMutation } from '../services/ApiService';
import { transformTraversalData } from '../utils/graphUtils';
import { NodeData, EdgeData } from '../types/graph';
import { log } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import {
  ADD_NODE_MUTATION,
  ADD_EDGE_MUTATION,
  UPDATE_NODE_MUTATION,
  DELETE_NODE_MUTATION,
  DELETE_EDGE_MUTATION
} from '../graphql/mutations';

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
  addNode: (values: { label: string; type: string }, parentId?: string) => Promise<void>;
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
  const { hierarchyId } = useHierarchyContext(); // hierarchyId is now a string
  // const hierarchyNum = parseInt(hierarchyId, 10); // No longer needed
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [edges, setEdges] = useState<EdgeData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExpanding, setIsExpanding] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const expandedNodeIds = useRef<Set<string>>(new Set());
  const [hiddenNodeIds, setHiddenNodeIds] = useState<Set<string>>(new Set());

  const loadInitialGraph = useCallback(async (rootId: string) => {
    log('useGraphState', `Loading initial graph for ${rootId} in hierarchy ${hierarchyId}`);
    setIsLoading(true);
    setError(null);
    try {
      const rawData = await fetchTraversalData(rootId, hierarchyId); // hierarchyId is a string
      const { nodes: initNodes, edges: initEdges } = transformTraversalData(rawData);
      setNodes(initNodes);
      setEdges(initEdges);
      setHiddenNodeIds(new Set());
      expandedNodeIds.current.clear();
    } catch (err) {
      log('useGraphState', `Error loading initial graph for ${rootId}`, err);
      setError('Failed to load initial graph data.');
    } finally {
      setIsLoading(false);
    }
  }, [hierarchyId]); // Removed loadInitialGraph from dependencies

  const loadCompleteGraph = useCallback(async () => {
    log('useGraphState', `Loading complete graph for hierarchy ${hierarchyId}`);
    setIsLoading(true);
    setError(null);
    try {
      const ids = await fetchAllNodeIds();
      const allNodes: NodeData[] = [];
      const allEdges: EdgeData[] = [];
      for (const id of ids) {
        const rawData = await fetchTraversalData(id, hierarchyId); // hierarchyId is a string
        const { nodes: nNodes, edges: nEdges } = transformTraversalData(rawData);
        nNodes.forEach(n => {
          if (!allNodes.some(existing => existing.id === n.id)) {
            allNodes.push(n);
          }
        });
        nEdges.forEach(e => {
          if (!allEdges.some(existing => existing.source === e.source && existing.target === e.target && existing.type === e.type)) {
            allEdges.push(e);
          }
        });
      }
      setNodes(allNodes);
      setEdges(allEdges);
      setHiddenNodeIds(new Set());
      expandedNodeIds.current.clear();
    } catch (err) {
      log('useGraphState', 'Error loading complete graph', err);
      setError('Failed to load initial graph data.');
    } finally {
      setIsLoading(false);
    }
  }, [hierarchyId]);

  const expandNode = useCallback(async (nodeId: string) => {
    if (isExpanding || isLoading || expandedNodeIds.current.has(nodeId)) return;
    const clickedNode = nodes.find(n => n.id === nodeId);
    if (!clickedNode) {
      setError(`Cannot expand node ${nodeId}: node not found`);
      return;
    }
    setIsExpanding(true);
    setError(null);
    try {
      const rawData = await fetchTraversalData(nodeId, hierarchyId); // hierarchyId is a string
      const { nodes: newNodes, edges: newEdges } = transformTraversalData(rawData);
      const existingNodeIds = new Set(nodes.map(n => n.id));
      const existingEdgeKeys = new Set(edges.map(e => `${e.source}-${e.target}-${e.type}`));
      const uniqueNodes = newNodes.filter(n => !existingNodeIds.has(n.id));
      const uniqueEdges = newEdges.filter(e => !existingEdgeKeys.has(`${e.source}-${e.target}-${e.type}`));
      if (uniqueNodes.length || uniqueEdges.length) {
        setNodes(prev => [...prev, ...uniqueNodes]);
        setEdges(prev => [...prev, ...uniqueEdges]);
      }
      expandedNodeIds.current.add(nodeId);
    } catch (err) {
      log('useGraphState', `Error expanding node ${nodeId}`, err);
      setError(`Failed to expand node ${nodeId}.`);
    } finally {
      setIsExpanding(false);
    }
  }, [nodes, edges, isLoading, isExpanding, hierarchyId]);

  const addNode = useCallback(async (values: { label: string; type: string }, parentId?: string) => {
    const newId = uuidv4();
    const inputObj = { id: newId, label: values.label, type: values.type, parentId };
    const variables = { input: [inputObj] };
    try {
      const result = await executeMutation(ADD_NODE_MUTATION, variables, { 'X-Hierarchy-Id': hierarchyId });
      const added: any = result.addNode?.node?.[0];
      if (added) {
        setNodes(prev => [
          ...prev,
          {
            id: added.id,
            label: added.label,
            type: added.type,
            assignments: added.hierarchyAssignments.map((a: any) => ({
              hierarchyId: a.hierarchy.id,
              hierarchyName: a.hierarchy.name,
              levelId: a.level.id,
              levelNumber: a.level.levelNumber,
              levelLabel: a.level.label
            })),
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
      const updated: any = res.updateNode?.node?.[0];
      if (updated) {
        setNodes(prev => prev.map(n => n.id === updated.id ? {
          id: updated.id,
          label: updated.label,
          type: updated.type,
          assignments: (updated as any).hierarchyAssignments?.map((a: any) => a.level.id) ?? [],
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
          source: edge.from?.id!,
          target: edge.to?.id!,
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
