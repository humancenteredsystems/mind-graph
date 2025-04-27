import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchTraversalData, fetchAllNodeIds, deleteNodeCascade } from '../services/ApiService';
import { transformTraversalData } from '../utils/graphUtils';
import { NodeData, EdgeData } from '../types/graph';
import { log } from '../utils/logger'; // Import the logger utility
import { v4 as uuidv4 } from 'uuid';
import { executeMutation } from '../services/ApiService';

interface UseGraphState {
  nodes: NodeData[];
  edges: EdgeData[];
  isLoading: boolean;
  isExpanding: boolean;
  error: string | null;
  loadInitialGraph: (rootId: string) => Promise<void>;
  loadCompleteGraph: () => Promise<void>;
  expandNode: (nodeId: string) => Promise<void>;
  addNode: (values: { label: string; type: string }, parentId?: string) => Promise<void>;
  editNode: (nodeId: string, values: { label: string; type: string; level: number }) => Promise<void>;
  deleteNode: (nodeId: string) => Promise<void>;
  deleteNodes: (nodeIds: string[]) => Promise<void>;
  // Add resetGraph later if needed
}

export const useGraphState = (): UseGraphState => {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [edges, setEdges] = useState<EdgeData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Tracks initial load
  const [isExpanding, setIsExpanding] = useState<boolean>(false); // Tracks expansion load
  const [error, setError] = useState<string | null>(null);

  // Add a ref to track expanded node IDs
  const expandedNodeIds = useRef<Set<string>>(new Set());

  // Function to load the initial graph
  const loadInitialGraph = useCallback(async (rootId: string) => {
    if (!rootId) {
      log('useGraphState', 'loadInitialGraph skipped: no rootId provided.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const rawData = await fetchTraversalData(rootId, 1);
      log("useGraphState", "Initial raw data from API:", JSON.stringify(rawData, null, 2)); // Use log

      const { nodes: initialNodes, edges: initialEdges } = transformTraversalData(rawData);
      log("useGraphState", "Initial transformed nodes:", initialNodes); // Use log
      log("useGraphState", "Initial transformed edges:", initialEdges); // Use log

      setNodes(initialNodes);
      setEdges(initialEdges);

      // Do not mark initial nodes as expanded automatically.
      // Nodes are marked as expanded only when the user explicitly expands them.

    } catch (err) {
      log("useGraphState", "ERROR: Failed to load initial graph data:", err); // Use log
      setError("Failed to load initial graph data. Is the API server running?");
    } finally {
      setIsLoading(false);
    }
  }, []); // Dependencies for useCallback

  // Function to load the complete graph
  const loadCompleteGraph = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const allIds = await fetchAllNodeIds();
      const nodeMap = new Map<string, NodeData>();
      const edgeMap = new Map<string, EdgeData>();

      for (const id of allIds) {
        const rawData = await fetchTraversalData(id);
        const { nodes: fetchedNodes, edges: fetchedEdges } = transformTraversalData(rawData);
        fetchedNodes.forEach(n => nodeMap.set(n.id, n));
        fetchedEdges.forEach(e => {
          const key = `${e.source}-${e.target}-${e.type ?? ''}`;
          edgeMap.set(key, e);
        });
      }

      setNodes(Array.from(nodeMap.values()));
      setEdges(Array.from(edgeMap.values()));
    } catch (err) {
      log('useGraphState', 'ERROR: Failed to load complete graph data:', err);
      setError('Failed to load complete graph data. Is the API server running?');
    } finally {
      setIsLoading(false);
    }
  }, []); // Dependencies for useCallback

  // Initial graph loading now handled by App component via loadInitialGraph

  // Function to expand a node
  const expandNode = useCallback(async (nodeId: string) => {
    // Prevent expanding while already expanding or during initial load
    // Also prevent if the node is already marked as expanded
    if (isExpanding || isLoading || expandedNodeIds.current.has(nodeId)) {
      log("useGraphState", `Expansion for ${nodeId} skipped: Already loading/expanding or already expanded.`); // Use log
      return;
    }

    // Find the node in the current state to get its level
    const clickedNode = nodes.find(n => n.id === nodeId);
    if (!clickedNode || clickedNode.level === undefined) {
      log("useGraphState", `WARN: Node ${nodeId} not found in current state or missing level information. Cannot expand.`); // Use log
      setError(`Cannot expand node ${nodeId}: Missing level information.`);
      return; // Stop expansion if level is unknown
    }
    const currentLevel = clickedNode.level;
    log("useGraphState", `Attempting to expand node ${nodeId} (Level: ${currentLevel})`); // Use log

    setIsExpanding(true);
    setError(null);

    try {
      const rawData = await fetchTraversalData(nodeId, currentLevel);
      log("useGraphState", `[expandNode ${nodeId}] Raw data from API:`, JSON.stringify(rawData, null, 2)); // Use log

      const { nodes: newNodesRaw, edges: newEdgesRaw } = transformTraversalData(rawData);
      log("useGraphState", `[expandNode ${nodeId}] Transformed data:`, { nodes: newNodesRaw, edges: newEdgesRaw }); // Use log

      const existingNodeIds = new Set(nodes.map(n => n.id));
      const existingEdgeIds = new Set(edges.map(e => `${e.source}-${e.target}-${e.type ?? ''}`));

      const uniqueNewNodes = newNodesRaw.filter(n => !existingNodeIds.has(n.id));
      const uniqueNewEdges = newEdgesRaw.filter(e => !existingEdgeIds.has(`${e.source}-${e.target}-${e.type ?? ''}`));

      log("useGraphState", `[expandNode ${nodeId}] Unique new nodes:`, uniqueNewNodes); // Use log
      log("useGraphState", `[expandNode ${nodeId}] Unique new edges:`, uniqueNewEdges); // Use log
      log("useGraphState", `[expandNode ${nodeId}] State BEFORE update:`, { nodes, edges }); // Use log

      log("useGraphState", `[expandNode ${nodeId}] Checking for new elements: uniqueNewNodes.length = ${uniqueNewNodes.length}, uniqueNewEdges.length = ${uniqueNewEdges.length}`); // Use log

      if (uniqueNewNodes.length > 0 || uniqueNewEdges.length > 0) {
        log("useGraphState", `[expandNode ${nodeId}] Updating state with new items...`); // Use log
        setNodes(prevNodes => [...prevNodes, ...uniqueNewNodes]);
        setEdges(prevEdges => [...prevEdges, ...uniqueNewEdges]);
        expandedNodeIds.current.add(nodeId);
      } else {
        log("useGraphState", `[expandNode ${nodeId}] No new unique nodes or edges found. State not updated.`); // Use log
        expandedNodeIds.current.add(nodeId);
      }

    } catch (err) {
      log("useGraphState", `ERROR: Failed to expand node ${nodeId}:`, err); // Use log
      setError(`Failed to expand node ${nodeId}. Please try again.`);
    } finally {
      setIsExpanding(false);
    }
  }, [nodes, edges, isLoading, isExpanding]); // Dependencies for useCallback

  
  // Add resetGraph function later if needed

  // Function to add a new node via modal form
  const addNode = useCallback(
    async (values: { label: string; type: string }, parentId?: string) => {
      // Generate unique ID
      let newId = uuidv4();
      const existingIds = new Set(nodes.map(n => n.id));
      while (existingIds.has(newId)) {
        newId = uuidv4();
      }
      const { label, type } = values;
      // Compute level based on parent
      let level = 1;
      if (parentId) {
        const parentNode = nodes.find(n => n.id === parentId);
        if (parentNode && typeof parentNode.level === 'number') {
          level = parentNode.level + 1;
        }
      }
      // Default status and branch
      const status = 'pending';
      const branch = 'main';
      // Construct GraphQL mutation for node
      const mutation = `mutation AddNode($input: [AddNodeInput!]!) {
        addNode(input: $input) { node { id label type level status branch } }
      }`;
      const variables = { input: [{ id: newId, label, type, level, status, branch }] };
      try {
        log('useGraphState', `Adding node ${newId} with values:`, values);
        const result = await executeMutation(mutation, variables);
        const addedNode = result.addNode?.node?.[0];
        if (addedNode) {
          setNodes(prev => [...prev, addedNode]);
          // If a parentId was provided, create an edge connecting the new node to its parent
          if (parentId) {
            const edgeMutation = `mutation AddEdge($input: [AddEdgeInput!]!) {
              addEdge(input: $input) { edge { from { id } fromId to { id } toId type } }
            }`;
            const edgeVars = { input: [{ from: { id: parentId }, to: { id: addedNode.id }, type: "simple" }] };
            try {
              const edgeResult = await executeMutation(edgeMutation, edgeVars);
              const addedEdge = edgeResult.addEdge?.edge?.[0];
              if (addedEdge) {
                setEdges(prev => [
                  ...prev,
                  { source: parentId, target: addedNode.id, type: addedEdge.type }
                ]);
              }
            } catch (edgeErr) {
              log('useGraphState', `Error adding edge for node ${newId}:`, edgeErr);
              setError(`Failed to create edge for new node ${label}.`);
            }
          }
        }
      } catch (err) {
        log('useGraphState', 'Error adding node:', err);
        setError(`Failed to add node ${values.label}.`);
      }
    },
    [nodes, executeMutation]
  );

  // Function to edit a node
  const editNode = useCallback(async (nodeId: string, values: { label: string; type: string; level: number }) => {
    const mutation = `mutation UpdateNode($input: UpdateNodeInput!) {
      updateNode(input: $input) { node { id label type level status branch } }
    }`;
    const variables = {
      input: {
        filter: { id: { eq: nodeId } },
        set: { label: values.label, type: values.type, level: values.level }
      }
    };
    try {
      const result = await executeMutation(mutation, variables);
      const updated = result.updateNode?.node?.[0];
      if (updated) {
        setNodes(prev => prev.map(n => n.id === updated.id ? updated : n));
      }
    } catch (err) {
      log('useGraphState', `Error editing node ${nodeId}:`, err);
      setError(`Failed to update node ${nodeId}.`);
    }
  }, [executeMutation]);

  // Function to delete a node
  const deleteNode = useCallback(async (nodeId: string) => {
    if (!nodeId) return;
    setIsLoading(true);
    setError(null);
    try {
      await deleteNodeCascade(nodeId);
      setNodes(prev => prev.filter(n => n.id !== nodeId));
      setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    } catch (err) {
      log('useGraphState', `Error deleting node ${nodeId}:`, err);
      setError(`Failed to delete node ${nodeId}.`);
    } finally {
      setIsLoading(false);
    }
  }, [executeMutation]);

  // Function to delete multiple nodes
  const deleteNodes = useCallback(async (nodeIds: string[]) => {
    if (!nodeIds || nodeIds.length === 0) return;
    setIsLoading(true);
    setError(null);
    try {
      const mutation = `mutation DeleteNode($input: DeleteNodeInput!) {
        deleteNode(input: $input) {
          node { id }
        }
      }`;
      const variables = { input: { filter: { id: { in: nodeIds } } } };
      await executeMutation(mutation, variables);
      setNodes(prev => prev.filter(n => !nodeIds.includes(n.id)));
      setEdges(prev => prev.filter(e => !nodeIds.includes(e.source) && !nodeIds.includes(e.target)));
    } catch (err) {
      log('useGraphState', `Error deleting nodes ${nodeIds.join(',')}:`, err);
      setError(`Failed to delete nodes ${nodeIds.join(',')}.`);
    } finally {
      setIsLoading(false);
    }
  }, [executeMutation]);

  return {
    nodes,
    edges,
    isLoading,
    isExpanding,
    error,
    loadInitialGraph,
    loadCompleteGraph,
    expandNode,
    addNode,
    editNode,
    deleteNode,
    deleteNodes,
  };
};
