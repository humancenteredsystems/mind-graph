import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import GraphView from './components/GraphView';
import { useGraphState } from './hooks/useGraphState';
import { log } from './utils/logger';
import { useUIContext } from './context/UIContext';
import { HierarchyProvider, useHierarchyContext } from './context/HierarchyContext';
import NodeFormModal from './components/NodeFormModal';
import NodeDrawer from './components/NodeDrawer';

function AppInner() {
  const {
    nodes,
    edges,
    isLoading, // This now covers initial load
    isExpanding,
    error,
    hiddenNodeIds,
    expandNode,
    expandChildren,
    expandAll,
    collapseNode,
    isNodeExpanded,
    addNode,
    loadCompleteGraph, // Will be called on mount
    editNode,
    deleteNode,
    deleteNodes,
    deleteEdge,
    deleteEdges,
    hideNode,
    hideNodes,
    connectNodes,
  } = useGraphState();

  // useEffect to load the complete graph on initial mount
  const { hierarchies, hierarchyId, setHierarchyId } = useHierarchyContext();

  useEffect(() => {
    if (hierarchyId) {
      log('App', `Hierarchy set to ${hierarchyId}: loading full graph`);
      loadCompleteGraph();
    }
  }, [hierarchyId]);

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
      <h1>MakeItMakeSense.io Graph</h1>
      <select
        value={hierarchyId}
        onChange={e => setHierarchyId(e.target.value)}
        style={{ margin: '1rem 0' }}
      >
        {hierarchies.map(h => (
          <option key={h.id} value={h.id}>{h.name}</option>
        ))}
      </select>
      
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
        onExpandChildren={(nodeId) => {
          log('App', `Expand children requested for: ${nodeId}`);
          expandChildren(nodeId);
        }}
        onExpandAll={(nodeId) => {
          log('App', `Expand all requested for: ${nodeId}`);
          expandAll(nodeId);
        }}
        onCollapseNode={(nodeId) => {
          log('App', `Collapse node requested for: ${nodeId}`);
          collapseNode(nodeId);
        }}
        isNodeExpanded={isNodeExpanded}
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
        onDeleteEdge={(edgeId) => {
          log('App', `Delete edge requested for: ${edgeId}`);
          deleteEdge(edgeId);
        }}
        onDeleteEdges={(ids) => {
          log('App', `Delete edges requested for: ${ids}`);
          deleteEdges(ids);
        }}
        onHideNode={(nodeId) => {
          log('App', `Hide node requested for: ${nodeId}`);
          hideNode(nodeId);
        }}
        onHideNodes={(ids) => {
          log('App', `Hide nodes requested for: ${ids}`);
          hideNodes(ids);
        }}
        onConnect={(from, to) => {
          log('App', `Connect nodes requested: ${from} -> ${to}`);
          connectNodes(from, to);
        }}
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

const App = () => (
  <HierarchyProvider>
    <AppInner />
  </HierarchyProvider>
);

export default App;
