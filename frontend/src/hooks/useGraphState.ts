import { useState, useCallback, useRef } from 'react';
import { fetchTraversalData, deleteNodeCascade, executeQuery, executeMutation } from '../services/ApiService';
import { transformTraversalData, transformAllGraphData } from '../utils/graphUtils';
import { NodeData, EdgeData } from '../types/graph';
import { log } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { GET_ALL_NODES_AND_EDGES_QUERY } from '../graphql/queries';
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

export const useGraphState = (hierarchyId: string = 'hierarchy1'): UseGraphState => {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [edges, setEdges] = useState<EdgeData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExpanding, setIsExpanding] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const expandedNodeIds = useRef<Set<string>>(new Set());
  const [hiddenNodeIds, setHiddenNodeIds] = useState<Set<string>>(new Set());

  const loadCompleteGraph = useCallback(async () => {
    log('useGraphState', 'Loading complete graph');
    setIsLoading(true);
    setError(null);
    try {
      const rawData = await executeQuery(GET_ALL_NODES_AND_EDGES_QUERY);
      const { nodes: allNodes, edges: allEdges } = transformAllGraphData(rawData);
      setNodes(allNodes);
      setEdges(allEdges);
      setHiddenNodeIds(new Set());
      expandedNodeIds.current.clear();
    } catch (err) {
      log('useGraphState', 'Error loading complete graph', err);
      setError('Failed to load graph data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const expandNode = useCallback(async (nodeId: string) => {
    if (isExpanding || isLoading || expandedNodeIds.current.has(nodeId)) return;
    const clickedNode = nodes.find(n => n.id === nodeId);
    if (!clickedNode || !clickedNode.assignments || clickedNode.assignments.length === 0) {
      setError(`Cannot expand node ${nodeId}: missing assignment`);
      return;
    }
    setIsExpanding(true);
    setError(null);
    try {
      const rawData = await fetchTraversalData(nodeId, hierarchyId);
      const { nodes: newNodes, edges: newEdges } = transformTraversalData(rawData);
      const existingNodeIds = new Set(nodes.map(n => n.id));
      const existingEdgeIds = new Set(edges.map(e => `${e.source}-${e.target}-${e.type}`));
      const uniqueNodes = newNodes.filter(n => !existingNodeIds.has(n.id));
      const uniqueEdges = newEdges.filter(e => !existingEdgeIds.has(`${e.source}-${e.target}-${e.type}`));
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
  }, [nodes, edges, isLoading, isExpanding]);

  const addNode = useCallback(async (values: { label: string; type: string }, parentId?: string) => {
    const newId = uuidv4();
    const variables = { input: [{ id: newId, label: values.label, type: values.type }] };
    try {
      const result = await executeMutation(ADD_NODE_MUTATION, variables);
      const added: any = result.addNode?.node?.[0];
      if (added) {
        setNodes(prev => [...prev, {
          id: added.id,
          label: added.label,
          type: added.type,
          assignments: (added as any).hierarchyAssignments?.map((a: any) => a.level.id) ?? [],
          status: added.status,
          branch: added.branch
        }]);
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
          const edge = edgeRes.addEdge?.edge?.[0];
          if (edge) {
            setEdges(prev => [...prev, {
              source: edge.from?.id!,
              target: edge.to?.id!,
              type: edge.type
            }]);
          }
        }
      }
    } catch (err) {
      log('useGraphState', 'Error adding node', err);
      setError(`Failed to add node.`);
    }
  }, []);

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
