import { vi } from 'vitest';

// Create mock functions before vi.mock calls to avoid hoisting issues
export const mockUIContextValue = {
  isAddModalOpen: false,
  isEditDrawerOpen: false,
  editingNode: null,
  openAddModal: vi.fn(),
  closeAddModal: vi.fn(),
  openEditDrawer: vi.fn(),
  closeEditDrawer: vi.fn(),
};

export const mockHierarchyContextValue = {
  hierarchies: [
    { id: 'h1', name: 'Test Hierarchy 1' },
    { id: 'h2', name: 'Test Hierarchy 2' }
  ],
  hierarchyId: 'h1',
  setHierarchyId: vi.fn(),
  levels: [
    { id: 'l1', levelNumber: 1, label: 'Domain', allowedTypes: ['concept'] },
    { id: 'l2', levelNumber: 2, label: 'Category', allowedTypes: ['concept', 'example'] }
  ],
  isLoading: false,
  error: null,
};

export const mockContextMenuContextValue = {
  isVisible: false,
  position: { x: 0, y: 0 },
  menuType: 'background',
  selectedNodes: [],
  showMenu: vi.fn(),
  hideMenu: vi.fn(),
};

// Helper to wait for async operations
export const waitForAsyncOperations = () => 
  new Promise(resolve => setTimeout(resolve, 0));
