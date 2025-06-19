import { vi } from 'vitest';

// Create mock functions before vi.mock calls to avoid hoisting issues
export const mockUIContextValue = {
  addModalOpen: false,
  addParentId: undefined,
  openAddModal: vi.fn(),
  closeAddModal: vi.fn(),
  editDrawerOpen: false,
  editNodeData: undefined,
  openEditDrawer: vi.fn(),
  closeEditDrawer: vi.fn(),
  setEditNode: vi.fn(),
  settingsModalOpen: false,
  openSettingsModal: vi.fn(),
  closeSettingsModal: vi.fn(),
  systemStatus: null,
  refreshSystemStatus: vi.fn(),
};

export const mockHierarchyContextValue = {
  hierarchies: [
    { id: 'h1', name: 'Test Hierarchy 1' },
    { id: 'h2', name: 'Test Hierarchy 2' }
  ],
  hierarchyId: 'h1',
  setHierarchyId: vi.fn(),
  levels: [
    { id: 'l1', levelNumber: 1, label: 'Domain', allowedTypes: [{ id: 't1', typeName: 'concept' }] },
    { id: 'l2', levelNumber: 2, label: 'Category', allowedTypes: [{ id: 't1', typeName: 'concept' }, { id: 't2', typeName: 'example' }] }
  ],
  allowedTypesMap: {},
  allNodeTypes: ['concept', 'example'],
};

export const mockContextMenuContextValue = {
  open: false,
  type: undefined,
  position: { x: 0, y: 0 },
  items: [],
  openMenu: vi.fn(),
  closeMenu: vi.fn(),
};

// Helper to wait for async operations
export const waitForAsyncOperations = () => 
  new Promise(resolve => setTimeout(resolve, 0));
