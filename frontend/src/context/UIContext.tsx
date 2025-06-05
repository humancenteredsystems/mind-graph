import React, { useState, ReactNode, useRef } from 'react';
import { NodeData } from '../types/graph';
import { fetchSystemStatus } from '../services/ApiService';
import { UIContext } from './contexts';

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

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addParentId, setAddParentId] = useState<string | undefined>(undefined);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editNodeData, setEditNodeData] = useState<NodeData | undefined>(undefined);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState<string | null>(null);
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

  // Admin modal and authentication functions
  const openAdminModal = () => {
    setAdminModalOpen(true);
  };
  const closeAdminModal = () => {
    setAdminModalOpen(false);
  };

  const authenticateAdmin = (key: string): boolean => {
    // Store admin key in memory only (not localStorage for security)
    setAdminKey(key);
    setAdminAuthenticated(true);
    return true;
  };

  const logoutAdmin = () => {
    setAdminKey(null);
    setAdminAuthenticated(false);
  };

  // System status functions
  const refreshSystemStatus = async () => {
    try {
      const status = await fetchSystemStatus();
      setSystemStatus(status);
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
        adminModalOpen,
        adminAuthenticated,
        openAdminModal,
        closeAdminModal,
        authenticateAdmin,
        logoutAdmin,
        systemStatus,
        refreshSystemStatus,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};
