import React, { useState, useEffect } from 'react';
import './App.css';
import GraphView from './components/GraphView';
import { useGraphState } from './hooks/useGraphState';
import { fetchAllNodeIds } from './services/ApiService';
import { log } from './utils/logger';
import { useUIContext } from './context/UIContext';
import NodeFormModal from './components/NodeFormModal';
import NodeDrawer from './components/NodeDrawer';

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
    loadCompleteGraph,
    editNode,
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

  const {
  addModalOpen,
  addParentId,
  openAddModal,
  closeAddModal,
  editDrawerOpen,
  editNodeData,
  openEditDrawer,
  closeEditDrawer,
} = useUIContext();

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
            openAddModal(parentId);
          }}
          onLoadCompleteGraph={loadCompleteGraph}
        />
      )}
      <NodeFormModal
        open={addModalOpen}
        parentId={addParentId}
        onSubmit={async (values) => {
          log('App', `Node add requested: ${JSON.stringify(values)}`);
          await addNode(values, addParentId);
          closeAddModal();
        }}
        onCancel={closeAddModal}
      />
      <NodeDrawer
        open={editDrawerOpen}
        node={editNodeData}
        onSave={async (values) => {
          log('App', `Node edited: ${JSON.stringify(values)}`);
          if (editNodeData) {
            await editNode(editNodeData.id, values);
          }
          closeEditDrawer();
        }}
        onClose={closeEditDrawer}
      />
</div>
  );
}

export default App;
