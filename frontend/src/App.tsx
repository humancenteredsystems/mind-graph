import React, { useEffect } from 'react';
import './App.css';
import GraphView from './components/GraphView';
import { useGraphState } from './hooks/useGraphState';
import { log } from './utils/logger';
import { theme } from './config';
import { useUIContext } from './hooks/useUI';
import { HierarchyProvider } from './context/HierarchyContext';
import { LayoutProvider } from './context/LayoutContext';
import { useHierarchyContext } from './hooks/useHierarchy';
import NodeFormModal from './components/NodeFormModal';
import NodeDrawer from './components/NodeDrawer';
import SettingsIcon from './components/SettingsIcon';
import SettingsModal from './components/SettingsModal';
import AdminButton from './components/AdminButton';
import AdminModal from './components/AdminModal';
import EmptyGraphState from './components/EmptyGraphState';
import GraphToolsPanel from './components/GraphToolsPanel';
import ImportExportWizard from './components/ImportExportWizard';
import ModalOverlay from './components/ModalOverlay';

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
    } else {
      // If no hierarchyId is set after a reasonable time, still try to load the graph
      // This handles cases where hierarchy loading fails but we still want to show empty state
      const fallbackTimer = setTimeout(() => {
        if (!hierarchyId) {
          log('App', 'No hierarchy loaded, attempting to load graph anyway for empty state');
          loadCompleteGraph();
        }
      }, 3000); // Wait 3 seconds for hierarchy to load
      
      return () => clearTimeout(fallbackTimer);
    }
  }, [hierarchyId, loadCompleteGraph]);

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
  importExportModalOpen,
  closeImportExportModal,
} = useUIContext();

  console.log('[AppInner RENDER] nodes prop length:', nodes.length, 'isLoading:', isLoading, 'error:', error);
  
  return (
    <div className="App">
      <SettingsIcon />
      <SettingsModal />
      <AdminButton />
      <AdminModal />
      
      {/* Header Area */}
      <div className="app-header">
        <h1>MakeItMakeSense.io Graph</h1>
        
        {/* Documentation Link */}
        <a 
          href={import.meta.env.DEV ? 'http://localhost:3001' : 'https://docs.makeitmakesense.io'}
          target="_blank"
          rel="noopener noreferrer"
          className="documentation-link"
        >
          📚 Documentation
        </a>
        
        <select
          value={hierarchyId}
          onChange={e => setHierarchyId(e.target.value)}
        >
          {hierarchies.map(h => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
        
        {/* Loading and error states */}
        {(isLoading || isExpanding) && <p>Loading graph data...</p>}
        {error && <p style={{ color: theme.colors.text.error }}>Error: {error}</p>}
      </div>
      
      {/* Graph Area - takes remaining space */}
      {!isLoading && (
        <div className="app-graph-area">
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
          
          {/* Show empty state overlay when no nodes are present */}
          {nodes.length === 0 && (
            <EmptyGraphState
              onAddNode={(parentId, position) => {
                log('App', `Add node requested from empty state at position: ${JSON.stringify(position)}`);
                openAddModal(parentId);
              }}
            />
          )}
        </div>
      )}
      
      {/* Controls Area - fixed width sidebar */}
      {!isLoading && (
        <div className="app-controls-area">
          <GraphToolsPanel />
        </div>
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
      
      {/* Import/Export Modal */}
      {importExportModalOpen && (
        <ModalOverlay isOpen={importExportModalOpen} onClose={closeImportExportModal}>
          <ImportExportWizard onClose={closeImportExportModal} />
        </ModalOverlay>
      )}
</div>
  );
}

const App = () => (
  <HierarchyProvider>
    <LayoutProvider>
      <AppInner />
    </LayoutProvider>
  </HierarchyProvider>
);

export default App;
