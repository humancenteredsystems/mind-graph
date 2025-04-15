import { useState, useEffect } from 'react';
import './App.css'; // Keep or modify default styles
import GraphView from './components/GraphView';
import { fetchTraversalData } from './services/ApiService';
import { transformTraversalData, NodeData, EdgeData } from './utils/graphUtils'; // Import from utils

function App() {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [edges, setEdges] = useState<EdgeData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial graph data on component mount
  useEffect(() => {
    const loadGraphData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // --- CONFIGURATION: Set your desired root node ID and depth ---
        const rootNodeId = "node1"; // Use an existing node ID from query results
        const traversalDepth = 3; // Example Depth (Note: API currently ignores this)
        // ---

        const rawData = await fetchTraversalData(rootNodeId, traversalDepth);
        console.log("Raw data from API:", JSON.stringify(rawData, null, 2)); // Log the raw data

        // Transform the raw API data into nodes/edges for GraphView
        const { nodes: transformedNodes, edges: transformedEdges } = transformTraversalData(rawData);
        console.log("Transformed nodes:", transformedNodes); // Log transformed data
        console.log("Transformed edges:", transformedEdges); // Log transformed data

        setNodes(transformedNodes);
        setEdges(transformedEdges);

      } catch (err) {
        console.error("Failed to load graph data:", err);
        setError("Failed to load graph data. Is the API server running?");
      } finally {
        setIsLoading(false);
      }
    };

    loadGraphData();
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <div className="App">
      <h1>MakeItMakeSense.io Graph</h1>
      {isLoading && <p>Loading graph...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {!isLoading && !error && (
        <GraphView nodes={nodes} edges={edges} />
      )}
      {/* Add UI elements for other API calls later */}
    </div>
  );
}

export default App;
