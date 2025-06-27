import { createContext } from 'react';
import { MenuType, MenuItem } from '../types/contextMenu';
import { NodeData } from '../types/graph';

// ContextMenu Context
interface ContextMenuContextValue {
  open: boolean;
  type?: MenuType;
  position: { x: number; y: number };
  items: MenuItem[];
  openMenu: (
    menuType: MenuType,
    position: { x: number; y: number },
    payload?: Record<string, unknown>
  ) => void;
  closeMenu: () => void;
}

export const ContextMenuContext = createContext<ContextMenuContextValue | undefined>(undefined);

// Hierarchy Context
interface HierarchyContextType {
  hierarchies: { id: string; name: string }[];
  levels: {
    id: string;
    levelNumber: number;
    label?: string;
    allowedTypes: { id: string; typeName: string }[];
  }[];
  allowedTypesMap: Record<string, string[]>;
  allNodeTypes: string[];
}

export const HierarchyContext = createContext<HierarchyContextType>({
  hierarchies: [],
  levels: [],
  allowedTypesMap: {},
  allNodeTypes: [],
});

// Tenant Context
interface TenantContextType {
  tenantId: string | null;
  namespace: string | null;
  isTestTenant: boolean;
  isMultiTenantMode: boolean;
  switchTenant: (tenantId: string) => void;
}

export const TenantContext = createContext<TenantContextType | undefined>(undefined);

// UI Context
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
  // Admin modal and authentication
  adminModalOpen: boolean;
  adminAuthenticated: boolean;
  openAdminModal: () => void;
  closeAdminModal: () => void;
  authenticateAdmin: () => boolean;
  logoutAdmin: () => void;
  // Import/Export modal
  importExportModalOpen: boolean;
  openImportExportModal: () => void;
  closeImportExportModal: () => void;
  // System status
  systemStatus: SystemStatus | null;
  refreshSystemStatus: () => Promise<void>;
  
  // Admin modal tab control
  adminModalTab: string;
  setAdminModalTab: (tab: string) => void;
}

export const UIContext = createContext<UIContextValue | undefined>(undefined);

// Re-export Layout Context for convenience
export { useLayout, LayoutProvider } from './LayoutContext';
