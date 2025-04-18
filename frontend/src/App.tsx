import { useState, useEffect, useCallback } from 'react'; // Import useCallback
import './App.css'; // Keep or modify default styles
import GraphView from './components/GraphView';
import { fetchTraversalData } from './services/ApiService';
import { transformTraversalData, NodeData, EdgeData } from './utils/graphUtils'; // Import from utils

function App() {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [edges, setEdges] = useState<EdgeData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Tracks initial load
  const [isExpanding, setIsExpanding] = useState<boolean>(false); // Tracks expansion load
  const [error, setError] = useState<string | null>(null);

  // --- Initial Data Load ---
  useEffect(() => {
    const loadGraphData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // --- CONFIGURATION: Set your desired root node ID ---
        const rootNodeId = "node1"; // Use an existing node ID from query results
        // ---

        // Fetch only level 1 initially (API ignores depth anyway for now)
        const rawData = await fetchTraversalData(rootNodeId, 1);
        console.log("Initial raw data from API:", JSON.stringify(rawData, null, 2));

        // Transform the raw API data
        const { nodes: initialNodes, edges: initialEdges } = transformTraversalData(rawData);
        console.log("Initial transformed nodes:", initialNodes);
        console.log("Initial transformed edges:", initialEdges);

        setNodes(initialNodes);
        setEdges(initialEdges);

      } catch (err) {
        console.error("Failed to load initial graph data:", err);
        setError("Failed to load initial graph data. Is the API server running?");
      } finally {
        setIsLoading(false);
      }
    };

    loadGraphData();
  }, []); // Empty dependency array ensures this runs only once on mount

  // --- Node Expansion Logic ---
  const handleNodeExpand = useCallback(async (nodeId: string) => {
    // Prevent expanding while already expanding or during initial load
    if (isExpanding || isLoading) {
      console.log(`Expansion for ${nodeId} skipped: Already loading/expanding.`);
      return;
    }

    // Find the node in the current state to get its level
    const clickedNode = nodes.find(n => n.id === nodeId);
    if (!clickedNode || clickedNode.level === undefined) {
      console.warn(`Node ${nodeId} not found in current state or missing level information. Cannot expand.`);
      // Optionally show an error to the user
      setError(`Cannot expand node ${nodeId}: Missing level information.`);
      return; // Stop expansion if level is unknown
    }
    const currentLevel = clickedNode.level; // Get the level
    console.log(`Attempting to expand node ${nodeId} (Level: ${currentLevel})`);

    setIsExpanding(true); // Set loading state for expansion
    setError(null); // Clear previous errors

    try {
      // Fetch data starting from the clicked node, passing its level
      // API will use this to fetch only nodes at currentLevel + 1
      const rawData = await fetchTraversalData(nodeId, currentLevel); // Pass currentLevel
      console.log(`[handleNodeExpand ${nodeId}] Raw data from API:`, JSON.stringify(rawData, null, 2)); // DIAGNOSTIC LOG

      // Transform the new data
      const { nodes: newNodesRaw, edges: newEdgesRaw } = transformTraversalData(rawData);
      console.log(`[handleNodeExpand ${nodeId}] Transformed data:`, { nodes: newNodesRaw, edges: newEdgesRaw }); // DIAGNOSTIC LOG

      // Filter out nodes and edges already present in the state
      const existingNodeIds = new Set(nodes.map(n => n.id));
      // Use a more robust edge ID generation if edges can have IDs or more complex structure
      const existingEdgeIds = new Set(edges.map(e => `${e.source}-${e.target}-${e.type ?? ''}`)); // Simple edge ID, handle potentially undefined type

      const uniqueNewNodes = newNodesRaw.filter(n => !existingNodeIds.has(n.id));
      const uniqueNewEdges = newEdgesRaw.filter(e => !existingEdgeIds.has(`${e.source}-${e.target}-${e.type ?? ''}`));

      console.log(`[handleNodeExpand ${nodeId}] Unique new nodes:`, uniqueNewNodes); // DIAGNOSTIC LOG
      console.log(`[handleNodeExpand ${nodeId}] Unique new edges:`, uniqueNewEdges); // DIAGNOSTIC LOG
      console.log(`[handleNodeExpand ${nodeId}] State BEFORE update:`, { nodes, edges }); // DIAGNOSTIC LOG

      // Update state by concatenating unique new nodes and edges
      if (uniqueNewNodes.length > 0 || uniqueNewEdges.length > 0) {
        console.log(`[handleNodeExpand ${nodeId}] Updating state with new items...`); // DIAGNOSTIC LOG
        setNodes(prevNodes => [...prevNodes, ...uniqueNewNodes]);
        setEdges(prevEdges => [...prevEdges, ...uniqueNewEdges]);
      } else {
        console.log(`[handleNodeExpand ${nodeId}] No new unique nodes or edges found. State not updated.`); // DIAGNOSTIC LOG
        // Optionally provide feedback to the user that the node is fully expanded
      }

    } catch (err) {
      console.error(`Failed to expand node ${nodeId}:`, err);
      setError(`Failed to expand node ${nodeId}. Please try again.`);
    } finally {
      setIsExpanding(false); // Clear expansion loading state
    }
  }, [nodes, edges, isLoading, isExpanding]); // Dependencies for useCallback

  // --- Render Logic ---
  return (
    <div className="App">
      <h1>MakeItMakeSense.io Graph</h1>
      {(isLoading || isExpanding) && <p>Loading graph data...</p>} {/* Show loading for initial and expansion */}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {!isLoading && ( // Render graph view once initial load is done, even if error occurred initially
        <GraphView
          nodes={nodes}
          edges={edges}
          onNodeExpand={handleNodeExpand} // Pass the handler function
        />
      )}
      {/* Add UI elements for other API calls later */}
    </div>
  );
}

export default App;
