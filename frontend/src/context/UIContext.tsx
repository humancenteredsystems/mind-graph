import React, { createContext, useContext, useState, ReactNode, useRef } from 'react';
import { NodeData } from '../types/graph';

interface SystemStatus {
  dgraphEnterprise: boolean;
  multiTenantVerified: boolean;
  currentTenant: string;
  namespace: string | null;
  mode: 'multi-tenant' | 'single-tenant';
  detectedAt: string;
  version?: string;
  detectionError?: string;
  licenseType?: 'oss-only' | 'oss-trial' | 'enterprise-licensed' | 'unknown';
  licenseExpiry?: string | null;
}

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
  // Settings modal
  settingsModalOpen: boolean;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  // System status
  systemStatus: SystemStatus | null;
  refreshSystemStatus: () => Promise<void>;
}

const UIContext = createContext<UIContextValue | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addParentId, setAddParentId] = useState<string | undefined>(undefined);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editNodeData, setEditNodeData] = useState<NodeData | undefined>(undefined);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const lastOpenTimeRef = useRef<number>(0);

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
    const now = Date.now();
    const timeSinceLastOpen = now - lastOpenTimeRef.current;
    
    // Prevent reopening too quickly (500ms debounce)
    if (timeSinceLastOpen < 500) {
      return;
    }
    
    lastOpenTimeRef.current = now;
    setEditNodeData(node);
    setEditDrawerOpen(true);
  };
  const closeEditDrawer = () => {
    setEditDrawerOpen(false);
    setEditNodeData(undefined);
  };

  // Function to just update the node data without changing open state
  const setEditNode = (node: NodeData) => {
    setEditNodeData(node);
  };

  // Settings modal functions
  const openSettingsModal = () => {
    setSettingsModalOpen(true);
    // Refresh system status when opening settings
    refreshSystemStatus();
  };
  const closeSettingsModal = () => {
    setSettingsModalOpen(false);
  };

  // System status functions
  const refreshSystemStatus = async () => {
    try {
      const tenantId = localStorage.getItem('tenantId') || 'test-tenant';
      const response = await fetch('/api/system/status', {
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': tenantId
        }
      });
      
      if (response.ok) {
        const status = await response.json();
        setSystemStatus(status);
      } else {
        console.error('Failed to fetch system status:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching system status:', error);
    }
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
        setEditNode,
        settingsModalOpen,
        openSettingsModal,
        closeSettingsModal,
        systemStatus,
        refreshSystemStatus,
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
