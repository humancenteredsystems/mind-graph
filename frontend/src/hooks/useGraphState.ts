import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchTraversalData } from '../services/ApiService';
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
  expandNode: (nodeId: string) => Promise<void>;
  addNode: (parentId?: string, position?: { x: number; y: number }) => Promise<void>;
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

  // Function to add a new node
  const addNode = useCallback(async (parentId?: string, position?: { x: number; y: number }) => {
    // Generate unique ID
    let newId = uuidv4();
    const existingIds = new Set(nodes.map(n => n.id));
    while (existingIds.has(newId)) {
      newId = uuidv4();
    }
    // Prompt for label
    const label = window.prompt('Enter node label:');
    if (!label) {
      log('useGraphState', 'Add node aborted: No label provided.');
      return;
    }
    // Prompt for type
    const typeInput = window.prompt('Enter node type (concept/example/question):', 'concept');
    const validTypes = ['concept', 'example', 'question'];
    const type = validTypes.includes(typeInput || '') ? typeInput! : 'concept';
    // Compute level
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
    // Construct mutation
    const mutation = `mutation AddNode($input: [AddNodeInput!]!) {
      addNode(input: $input) { node { id label type level status branch } }
    }`;
    const variables = { input: [{ id: newId, label, type, level, status, branch }] };
    try {
      log('useGraphState', `Adding node ${newId} with label ${label}`);
      const result = await executeMutation(mutation, variables);
      const added = result.addNode?.node ?? [];
      if (added.length > 0) {
        setNodes(prev => [...prev, added[0]]);
      }
    } catch (err) {
      log('useGraphState', 'Error adding node:', err);
      setError(`Failed to add node ${label}.`);
    }
  }, [nodes, executeMutation]);
  
  // Add resetGraph function later if needed

  return {
    nodes,
    edges,
    isLoading,
    isExpanding,
    error,
    loadInitialGraph,
    expandNode,
    addNode,
  };
};
