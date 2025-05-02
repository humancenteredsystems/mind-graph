import { useState, useCallback, useRef } from 'react';
import { fetchTraversalData, deleteNodeCascade, executeQuery, executeMutation } from '../services/ApiService'; // Added executeQuery
import { transformTraversalData, transformAllGraphData } from '../utils/graphUtils'; // Added transformAllGraphData
import { NodeData, EdgeData } from '../types/graph';
import { log } from '../utils/logger'; // Import the logger utility
import { v4 as uuidv4 } from 'uuid';
// Import centralized queries and mutations
import { GET_ALL_NODES_AND_EDGES_QUERY } from '../graphql/queries';
import {
  ADD_NODE_MUTATION,
  ADD_EDGE_MUTATION,
  UPDATE_NODE_MUTATION,
  DELETE_NODE_MUTATION
} from '../graphql/mutations';

interface UseGraphState {
  nodes: NodeData[];
  edges: EdgeData[];
  isLoading: boolean; // Tracks initial load or full graph load
  isExpanding: boolean; // Tracks node expansion load
  error: string | null;
  hiddenNodeIds: Set<string>;
  // loadInitialGraph removed
  loadCompleteGraph: () => Promise<void>; // Now used for initial load
  expandNode: (nodeId: string) => Promise<void>;
  addNode: (values: { label: string; type: string }, parentId?: string) => Promise<void>;
  editNode: (nodeId: string, values: { label: string; type: string; level: number }) => Promise<void>;
  deleteNode: (nodeId: string) => Promise<void>;
  deleteNodes: (nodeIds: string[]) => Promise<void>;
  hideNode: (nodeId: string) => void;
  hideNodes: (nodeIds: string[]) => void;
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
  
  // Add state for hidden nodes
  const [hiddenNodeIds, setHiddenNodeIds] = useState<Set<string>>(new Set());

  // loadInitialGraph function removed as it's no longer used

  // Function to load the complete graph using a single efficient query
  const loadCompleteGraph = useCallback(async () => {
    log('useGraphState', 'Attempting to load complete graph...');
    setIsLoading(true); // Use isLoading for the full graph load
    setError(null);
    try {
      // Execute the single query to get all nodes and edges
      const rawData = await executeQuery(GET_ALL_NODES_AND_EDGES_QUERY);
      log("useGraphState", "Complete graph raw data from API:", JSON.stringify(rawData, null, 2));

      // Transform the data using the new utility function
      const { nodes: allNodes, edges: allEdges } = transformAllGraphData(rawData);
      log("useGraphState", "Complete graph transformed nodes:", allNodes);
      log("useGraphState", "Complete graph transformed edges:", allEdges);

      setNodes(allNodes);
      setEdges(allEdges);

      // Reset hidden nodes when loading the complete graph
      setHiddenNodeIds(new Set());
      log('useGraphState', 'Hidden nodes reset during complete graph load');
      expandedNodeIds.current.clear(); // Also clear expanded nodes as we have the full graph
      log('useGraphState', 'Expanded nodes reset during complete graph load');

    } catch (err) {
      log("useGraphState", "ERROR: Failed to load complete graph data:", err);
      setError("Failed to load complete graph data. Is the API server running?");
    } finally {
      setIsLoading(false);
    }
  }, [executeQuery]); // Dependency on executeQuery

  // Initial graph loading is now handled by App component calling loadCompleteGraph

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
      let level = 1; // Default level for root nodes
      if (parentId) {
        const parentNode = nodes.find(n => n.id === parentId);
        if (parentNode && typeof parentNode.level === 'number') {
          level = parentNode.level + 1;
        } else {
          log('useGraphState', `Warning: Parent node ${parentId} not found or has no level. Defaulting new node level to 1.`);
        }
      }
      // Default status and branch (consider making these configurable later)
      const status = 'pending';
      const branch = 'main';

      // Use imported ADD_NODE_MUTATION
      const variables = { input: [{ id: newId, label, type, level, status, branch }] };
      try {
        log('useGraphState', `Adding node ${newId} with values:`, values);
        const result = await executeMutation(ADD_NODE_MUTATION, variables);
        const addedNode = result.addNode?.node?.[0];
        if (addedNode) {
          // Ensure the added node has the correct structure before adding to state
          const newNodeData: NodeData = {
            id: addedNode.id,
            label: addedNode.label,
            type: addedNode.type,
            level: addedNode.level,
            // status: addedNode.status, // Include if needed by UI
            // branch: addedNode.branch, // Include if needed by UI
          };
          setNodes(prev => [...prev, newNodeData]);

          // If a parentId was provided, create an edge connecting the new node to its parent
          if (parentId) {
            // Use imported ADD_EDGE_MUTATION
            const edgeVars = { input: [{ from: { id: parentId }, fromId: parentId, to: { id: addedNode.id }, toId: addedNode.id, type: "simple" }] }; // Assuming 'simple' type for now
            try {
              const edgeResult = await executeMutation(ADD_EDGE_MUTATION, edgeVars);
              const addedEdge = edgeResult.addEdge?.edge?.[0];
              // The mutation result structure is { edge: [{ from: {id}, fromId, to: {id}, toId, type }] }
              if (addedEdge && addedEdge.from?.id && addedEdge.to?.id) {
                // Ensure the added edge has the correct structure for EdgeData
                const newEdgeData: EdgeData = {
                  source: addedEdge.from.id, // Correctly map from nested object
                  target: addedEdge.to.id,   // Correctly map from nested object
                  type: addedEdge.type,
                };
                setEdges(prev => [...prev, newEdgeData]);
              } else {
                 log('useGraphState', `Failed to add edge: Invalid edge data received from mutation.`, edgeResult);
                 setError(`Failed to create edge for new node ${label}. Invalid data received.`);
              }
            } catch (edgeErr) {
              log('useGraphState', `Error adding edge for node ${newId}:`, edgeErr);
              setError(`Failed to create edge for new node ${label}.`);
            }
          }
        } else {
           log('useGraphState', `Failed to add node: Invalid node data received from mutation.`, result);
           setError(`Failed to add node ${values.label}. Invalid data received.`);
        }
      } catch (err) {
        log('useGraphState', 'Error adding node:', err);
        setError(`Failed to add node ${values.label}.`);
      }
    },
    [nodes, executeMutation] // Keep executeMutation dependency
  );

  // Function to edit a node
  const editNode = useCallback(async (nodeId: string, values: { label: string; type: string; level?: number }) => { // Level is optional in UI, but required by mutation? Check schema. Assuming level might not always be edited.
    // Use imported UPDATE_NODE_MUTATION
    const variables = {
      input: {
        filter: { id: { eq: nodeId } },
        // Only set fields that are provided in values
        set: {
          label: values.label,
          type: values.type,
          ...(values.level !== undefined && { level: values.level }) // Conditionally include level
        }
      }
    };
    try {
      log('useGraphState', `Editing node ${nodeId} with values:`, values);
      const result = await executeMutation(UPDATE_NODE_MUTATION, variables);
      const updated = result.updateNode?.node?.[0];
      if (updated) {
         // Ensure the updated node has the correct structure
         const updatedNodeData: NodeData = {
            id: updated.id,
            label: updated.label,
            type: updated.type,
            level: updated.level,
            // status: updated.status, // Include if needed by UI
            // branch: updated.branch, // Include if needed by UI
          };
        setNodes(prev => prev.map(n => n.id === updated.id ? updatedNodeData : n));
      } else {
        log('useGraphState', `Failed to update node: Invalid data received from mutation.`, result);
        setError(`Failed to update node ${nodeId}. Invalid data received.`);
      }
    } catch (err) {
      log('useGraphState', `Error editing node ${nodeId}:`, err);
      setError(`Failed to update node ${nodeId}.`);
    }
  }, [executeMutation]); // Keep executeMutation dependency

  // Function to delete a node (using cascade endpoint)
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

  // Function to delete multiple nodes (using standard mutation, NOT cascade)
  // Consider if a batch cascade endpoint is needed or if this is sufficient.
  const deleteNodes = useCallback(async (nodeIds: string[]) => {
    if (!nodeIds || nodeIds.length === 0) return;
    setIsLoading(true); // Use isLoading as it affects the whole graph potentially
    setError(null);
    try {
      // Use imported DELETE_NODE_MUTATION
      const variables = { input: { filter: { id: { in: nodeIds } } } };
      // Note: This standard delete might leave dangling edges if not handled by Dgraph schema (@cascade directive)
      // The deleteNodeCascade endpoint is safer for single deletes.
      // If batch cascade is needed, the backend API would need an update.
      log('useGraphState', `Attempting to delete nodes: ${nodeIds.join(',')}`);
      await executeMutation(DELETE_NODE_MUTATION, variables);
      // Assuming successful deletion, remove from local state
      setNodes(prev => prev.filter(n => !nodeIds.includes(n.id)));
      setEdges(prev => prev.filter(e => !nodeIds.includes(e.source) && !nodeIds.includes(e.target)));
      log('useGraphState', `Nodes ${nodeIds.join(',')} removed from local state.`);
    } catch (err) {
      log('useGraphState', `Error deleting nodes ${nodeIds.join(',')}:`, err);
      setError(`Failed to delete nodes ${nodeIds.join(',')}.`);
    } finally {
      setIsLoading(false);
    }
  }, [executeMutation]); // Keep executeMutation dependency

  // Function to hide a node
  const hideNode = useCallback((nodeId: string) => {
    log('useGraphState', `Hiding node ${nodeId}`);
    setHiddenNodeIds(prev => new Set([...prev, nodeId]));
  }, []);

  // Function to hide multiple nodes
  const hideNodes = useCallback((nodeIds: string[]) => {
    log('useGraphState', `Hiding nodes ${nodeIds.join(',')}`);
    setHiddenNodeIds(prev => new Set([...prev, ...nodeIds]));
  }, []);

  return {
    nodes,
    edges,
    isLoading,
    isExpanding,
    error,
    hiddenNodeIds,
    // loadInitialGraph removed
    loadCompleteGraph,
    expandNode,
    addNode,
    editNode,
    deleteNode,
    deleteNodes,
    hideNode,
    hideNodes,
  };
};
