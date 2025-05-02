import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import GraphView from './components/GraphView';
import { useGraphState } from './hooks/useGraphState';
// fetchAllNodeIds no longer needed here
import { log } from './utils/logger';
import { useUIContext } from './context/UIContext';
import NodeFormModal from './components/NodeFormModal';
import NodeDrawer from './components/NodeDrawer';
import CytoscapeDebugger from './components/CytoscapeDebugger';

function App() {
  // Debug toggle
  const [showDebugger, setShowDebugger] = useState(false);
  
  // Toggle debugger mode
  const toggleDebugger = useCallback(() => {
    setShowDebugger(prev => !prev);
  }, []);
  // rootId and loadingRoot state removed

  const {
    nodes,
    edges,
    isLoading, // This now covers initial load
    isExpanding,
    error,
    hiddenNodeIds,
    expandNode,
    addNode,
    // loadInitialGraph removed
    loadCompleteGraph, // Will be called on mount
    editNode,
    deleteNode,
    deleteNodes,
    hideNode,
    hideNodes,
  } = useGraphState();

  // useEffect to load the complete graph on initial mount
  useEffect(() => {
    log('App', 'Initial mount: Loading complete graph...');
    loadCompleteGraph();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs only once on mount

  const {
  addModalOpen,
  addParentId,
  openAddModal,
  closeAddModal,
  editDrawerOpen,
  editNodeData,
  openEditDrawer,
  closeEditDrawer,
  setEditNode, // Get the new function from context
} = useUIContext();

return (
    <div className="App">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>MakeItMakeSense.io Graph</h1>
        <button 
          onClick={toggleDebugger}
          style={{
            background: showDebugger ? '#e74c3c' : '#3498db',
            color: 'white',
            padding: '5px 15px',
            borderRadius: '4px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          {showDebugger ? 'Show Real App' : 'Show Debugger'}
        </button>
      </div>
      {/* Show either the debugger or the main application */}
      {showDebugger ? (
        <CytoscapeDebugger />
      ) : (
        <>
          {/* Use isLoading for initial load indicator */}
          {(isLoading || isExpanding) && <p>Loading graph data...</p>}
          {error && <p style={{ color: 'red' }}>Error: {error}</p>}
          {/* Render GraphView once initial loading is complete */}
          {!isLoading && (
        <GraphView
          nodes={nodes}
          edges={edges}
          hiddenNodeIds={hiddenNodeIds}
          onNodeExpand={(nodeId) => {
            log('App', `Expand node requested for: ${nodeId}`);
            expandNode(nodeId);
          }}
          onAddNode={(parentId, position) => {
            log('App', `Add node requested at position: ${JSON.stringify(position)}`);
            openAddModal(parentId);
          }}
          // Updated handler to accept NodeData directly
          onEditNode={(nodeData) => { 
            log('App', `Edit node requested for: ${nodeData.id}`);
            openEditDrawer(nodeData);
          }}
          onNodeSelect={(nodeData) => {
            log('App', `Node selected: ${nodeData.id}`);
            // If drawer is already open, update its content
            if (editDrawerOpen) {
              log('App', `Drawer is open, updating drawer node data.`);
              setEditNode(nodeData);
            }
          }}
          onLoadCompleteGraph={loadCompleteGraph}
          onDeleteNode={(nodeId) => {
            log('App', `Delete node requested for: ${nodeId}`);
            deleteNode(nodeId);
          }}
          onDeleteNodes={(ids) => {
            log('App', `Delete nodes requested for: ${ids}`);
            deleteNodes(ids);
          }}
          onHideNode={(nodeId) => {
            log('App', `Hide node requested for: ${nodeId}`);
            hideNode(nodeId);
          }}
          onHideNodes={(ids) => {
            log('App', `Hide nodes requested for: ${ids}`);
            hideNodes(ids);
          }}
        />
          )}
        </>
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
