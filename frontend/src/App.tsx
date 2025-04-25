import React, { useState, useEffect } from 'react';
import './App.css';
import GraphView from './components/GraphView';
import { useGraphState } from './hooks/useGraphState';
import { fetchAllNodeIds } from './services/ApiService';
import { log } from './utils/logger';

function App() {
  const [rootId, setRootId] = useState<string>();
  const [loadingRoot, setLoadingRoot] = useState<boolean>(true);

  const {
    nodes,
    edges,
    isLoading,
    isExpanding,
    error,
    expandNode,
    addNode,
    loadInitialGraph,
  } = useGraphState();

  useEffect(() => {
    const init = async () => {
      try {
        const ids = await fetchAllNodeIds();
        if (ids.length > 0) {
          const defaultId = import.meta.env.VITE_ROOT_NODE_ID ?? ids[0];
          setRootId(defaultId);
          loadInitialGraph(defaultId);
        } else {
          // No existing nodes; show empty graph and allow user to add first node via UI
        }
 
      } catch (err) {
        console.error('Error fetching node IDs:', err);
      } finally {
        setLoadingRoot(false);
      }
    };
    init();
  }, [loadInitialGraph]);

  return (
    <div className="App">
      <h1>MakeItMakeSense.io Graph</h1>
      {(loadingRoot || isExpanding) && <p>Loading graph data...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {!loadingRoot && (
        <GraphView
          nodes={nodes}
          edges={edges}
          onNodeExpand={(nodeId) => {
            log('App', `Expand node requested for: ${nodeId}`);
            expandNode(nodeId);
          }}
          onAddNode={(parentId, position) => {
            log('App', `Add node requested at position: ${JSON.stringify(position)}`);
            addNode(parentId, position);
          }}
        />
      )}
    </div>
  );
}

export default App;
