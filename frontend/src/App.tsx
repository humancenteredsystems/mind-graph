import './App.css'; // Keep or modify default styles
import GraphView from './components/GraphView';
import { useGraphState } from './hooks/useGraphState'; // Import the custom hook
import { log } from './utils/logger'; // Import the logger utility

function App() {
  // Consume the custom hook
  const {
    nodes,
    edges,
    isLoading,
    isExpanding,
    error,
    expandNode, // Use expandNode from the hook
  } = useGraphState();

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
          onNodeExpand={expandNode} // Pass the expandNode function from the hook
        />
      )}
      {/* Add UI elements for other API calls later */}
    </div>
  );
}

export default App;
