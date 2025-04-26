import React, { createContext, useContext, useState, ReactNode } from 'react';
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
}

const UIContext = createContext<UIContextValue | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addParentId, setAddParentId] = useState<string | undefined>(undefined);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editNodeData, setEditNodeData] = useState<NodeData | undefined>(undefined);

  const openAddModal = (parentId?: string) => {
    setAddParentId(parentId);
    setAddModalOpen(true);
  };
  const closeAddModal = () => {
    setAddModalOpen(false);
    setAddParentId(undefined);
  };

  const openEditDrawer = (node: NodeData) => {
    setEditNodeData(node);
    setEditDrawerOpen(true);
  };
  const closeEditDrawer = () => {
    setEditDrawerOpen(false);
    setEditNodeData(undefined);
  };

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
