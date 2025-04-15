import { useState, useEffect } from 'react';
import './App.css'; // Keep or modify default styles
import GraphView from './components/GraphView';
import { fetchTraversalData } from './services/ApiService';
import { transformTraversalData, NodeData, EdgeData } from './utils/graphUtils'; // Import from utils

// Remove local interface definitions and helper function
/*
interface NodeData {
  id: string;
  label?: string;
  type?: string;
  // Add other properties if needed
}

interface EdgeData {
  id?: string;
  source: string;
  target: string;
  type?: string;
  // Add other properties
}

// Helper function to extract nodes and edges from traversal data
// This needs refinement based on the actual structure returned by /api/traverse
// and the Dgraph schema (especially how edges are represented).
const transformTraversalData = (data: any): { nodes: NodeData[], edges: EdgeData[] } => {
  const nodes: NodeData[] = [];
  const edges: EdgeData[] = [];
  const visited = new Set<string>(); // Keep track of visited nodes to avoid duplicates

  // Recursive function to process nodes and edges
  function processNodes(nodeArray: any[]) {
    if (!Array.isArray(nodeArray)) return;

    nodeArray.forEach(node => {
      if (!node || !node.id || visited.has(node.id)) {
        return; // Skip if node is invalid or already visited
      }
      visited.add(node.id);

      // Add node
      nodes.push({
        id: node.id,
        label: node.label || node.id, // Use label or ID
        type: node.type,
        // Add other relevant properties from node
      });

      // Process outgoing edges and recursively process connected nodes
      if (Array.isArray(node.outgoing)) {
        node.outgoing.forEach((edge: any) => {
          if (edge && edge.to) {
            const targetNode = edge.to;
            // Add edge
            edges.push({
              source: node.id,
              target: targetNode.id,
              type: edge.type,
              // Add other relevant properties from edge
            });
            // Recursively process the target node if it hasn't been visited
            // Note: The traversal endpoint itself limits depth, so this recursion
            // primarily ensures all nodes/edges within the fetched data are processed.
            if (!visited.has(targetNode.id)) {
               processNodes([targetNode]); // Process the target node
            }
          }
        });
      }
    });
  }

  // Start processing from the root nodes returned by the query
  if (data && data.queryNode) {
    processNodes(data.queryNode);
  }

*/

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
