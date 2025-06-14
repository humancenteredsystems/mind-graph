import { v4 as uuidv4 } from 'uuid';
import { NodeData, EdgeData, RawNodeResponse } from '../types/graph';
import { executeMutation, deleteNodeCascade } from './ApiService';
import { log } from '../utils/logger';
import {
  ADD_NODE_WITH_HIERARCHY,
  ADD_EDGE_MUTATION,
  UPDATE_NODE_MUTATION,
  DELETE_NODE_MUTATION,
  DELETE_EDGE_MUTATION
} from '../graphql/mutations';

export interface GraphOperations {
  addNode: (values: { label: string; type: string; hierarchyId: string; levelId: string }, parentId?: string) => Promise<void>;
  editNode: (nodeId: string, values: { label: string; type: string }) => Promise<void>;
  deleteNode: (nodeId: string) => Promise<void>;
  deleteNodes: (nodeIds: string[]) => Promise<void>;
  deleteEdge: (edgeId: string) => Promise<void>;
  deleteEdges: (edgeIds: string[]) => Promise<void>;
  connectNodes: (fromId: string, toId: string) => Promise<EdgeData | undefined>;
}

/**
 * Creates graph operation functions that manage CRUD operations
 */
export const createGraphOperations = (
  setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>,
  setEdges: React.Dispatch<React.SetStateAction<EdgeData[]>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
  edges: EdgeData[]
): GraphOperations => {
  const addNode = async (values: { label: string; type: string; hierarchyId: string; levelId: string }, parentId?: string) => {
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
  };

  const editNode = async (nodeId: string, values: { label: string; type: string }) => {
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
  };

  const deleteNode = async (nodeId: string) => {
    try {
      await deleteNodeCascade(nodeId);
      setNodes(prev => prev.filter(n => n.id !== nodeId));
      setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    } catch (err) {
      log('useGraphState', `Error deleting node ${nodeId}`, err);
      setError(`Failed to delete node ${nodeId}`);
    }
  };

  const deleteNodes = async (nodeIds: string[]) => {
    try {
      // Use the same cascade deletion logic as single delete for consistency
      // This ensures proper edge cleanup and cascade behavior
      for (const nodeId of nodeIds) {
        await deleteNodeCascade(nodeId);
      }
      
      // Update state after all deletions are complete
      setNodes(prev => prev.filter(n => !nodeIds.includes(n.id)));
      setEdges(prev => prev.filter(e => !nodeIds.includes(e.source) && !nodeIds.includes(e.target)));
    } catch (err) {
      log('useGraphState', 'Error deleting nodes', err);
      setError(`Failed to delete nodes`);
    }
  };

  const deleteEdge = async (edgeId: string) => {
    const [source, target] = edgeId.split('_');
    try {
      await executeMutation(DELETE_EDGE_MUTATION, { filter: { fromId: { eq: source }, toId: { eq: target } } });
      setEdges(prev => prev.filter(e => `${e.source}_${e.target}` !== edgeId));
    } catch (err) {
      log('useGraphState', `Error deleting edge ${edgeId}`, err);
      setError(`Failed to delete edge ${edgeId}`);
    }
  };

  const deleteEdges = async (edgeIds: string[]) => {
    for (const id of edgeIds) {
      await deleteEdge(id);
    }
  };

  const connectNodes = async (fromId: string, toId: string) => {
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
  };

  return {
    addNode,
    editNode,
    deleteNode,
    deleteNodes,
    deleteEdge,
    deleteEdges,
    connectNodes
  };
};
