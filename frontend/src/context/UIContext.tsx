import React, { createContext, useContext, useState, ReactNode, useRef, useEffect } from 'react';
import { log } from '../utils/logger';
import { NodeData } from '../types/graph';

interface UIContextValue {
  // Add node modal
  addModalOpen: boolean;
  addParentId?: string;
  openAddModal: (parentId?: string) => void;
  closeAddModal: () => void;
  // Edit node drawer
  editDrawerOpen: boolean;
  editNodeData?: NodeData;
  openEditDrawer: (node: NodeData) => void;
  closeEditDrawer: () => void;
  setEditNode: (node: NodeData) => void; // Function to update node data while drawer is open
}

const UIContext = createContext<UIContextValue | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addParentId, setAddParentId] = useState<string | undefined>(undefined);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editNodeData, setEditNodeData] = useState<NodeData | undefined>(undefined);
  const lastOpenTimeRef = useRef<number>(0);
  const drawerOpenRequestCount = useRef<number>(0);

  const openAddModal = (parentId?: string) => {
    setAddParentId(parentId);
    setAddModalOpen(true);
  };
  const closeAddModal = () => {
    setAddModalOpen(false);
    setAddParentId(undefined);
  };

  // Add debounce to drawer opening to prevent rapid successive openings
  const openEditDrawer = (node: NodeData) => {
    const requestId = ++drawerOpenRequestCount.current;
    log('UIContext', `Drawer open request #${requestId} for node ${node.id}`);
    
    const now = Date.now();
    const timeSinceLastOpen = now - lastOpenTimeRef.current;
    
    // Prevent reopening too quickly (500ms debounce)
    if (timeSinceLastOpen < 500) {
      log('UIContext', `Prevented rapid drawer re-open (${timeSinceLastOpen}ms since last open)`);
      return;
    }
    
    log('UIContext', `Opening drawer for node ${node.id}`);
    lastOpenTimeRef.current = now;
    setEditNodeData(node);
    setEditDrawerOpen(true);
  };
  const closeEditDrawer = () => {
    log('UIContext', `Closing drawer`);
    setEditDrawerOpen(false);
    setEditNodeData(undefined);
  };

  // Function to just update the node data without changing open state
  const setEditNode = (node: NodeData) => {
    log('UIContext', `Updating drawer node data to: ${node.id}`);
    setEditNodeData(node);
  };
  
  // Add logging for drawer state changes
  useEffect(() => {
    log('UIContext', `Drawer state changed to: ${editDrawerOpen ? 'open' : 'closed'}`);
    if (editDrawerOpen && editNodeData) {
      log('UIContext', `Drawer opened for node: ${editNodeData.id}`);
    }
  }, [editDrawerOpen, editNodeData]);

  return (
    <UIContext.Provider
      value={{
        addModalOpen,
        addParentId,
        openAddModal,
        closeAddModal,
        editDrawerOpen,
        editNodeData,
        openEditDrawer,
        closeEditDrawer,
        setEditNode, // Expose the new function
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

export function useUIContext(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUIContext must be used within UIProvider');
  return ctx;
}
