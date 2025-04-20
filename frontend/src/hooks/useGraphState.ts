import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchTraversalData } from '../services/ApiService';
import { transformTraversalData } from '../utils/graphUtils';
import { NodeData, EdgeData } from '../types/graph';
import { log } from '../utils/logger'; // Import the logger utility

interface UseGraphState {
  nodes: NodeData[];
  edges: EdgeData[];
  isLoading: boolean;
  isExpanding: boolean;
  error: string | null;
  loadInitialGraph: (rootId: string) => Promise<void>;
  expandNode: (nodeId: string) => Promise<void>;
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

      // Mark initial nodes as expanded
      initialNodes.forEach(node => expandedNodeIds.current.add(node.id));

    } catch (err) {
      log("useGraphState", "ERROR: Failed to load initial graph data:", err); // Use log
      setError("Failed to load initial graph data. Is the API server running?");
    } finally {
      setIsLoading(false);
    }
  }, []); // Dependencies for useCallback

  // Effect to load initial data on mount
  useEffect(() => {
    // --- CONFIGURATION: Set your desired root node ID ---
    const rootNodeId = "node1"; // Use an existing node ID from query results
    // ---
    loadInitialGraph(rootNodeId);
  }, [loadInitialGraph]); // Dependency array includes loadInitialGraph

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

  return {
    nodes,
    edges,
    isLoading,
    isExpanding,
    error,
    loadInitialGraph,
    expandNode,
  };
};
