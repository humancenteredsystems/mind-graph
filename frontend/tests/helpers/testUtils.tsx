import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';

// Create mock functions before vi.mock calls to avoid hoisting issues
const mockUIContextValue = {
  isAddModalOpen: false,
  isEditDrawerOpen: false,
  editingNode: null,
  openAddModal: vi.fn(),
  closeAddModal: vi.fn(),
  openEditDrawer: vi.fn(),
  closeEditDrawer: vi.fn(),
};

const mockHierarchyContextValue = {
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

const mockContextMenuContextValue = {
  isVisible: false,
  position: { x: 0, y: 0 },
  menuType: 'background',
  selectedNodes: [],
  showMenu: vi.fn(),
  hideMenu: vi.fn(),
};

// Mock the contexts with proper exports
vi.mock('../../src/context/UIContext', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    UIProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="ui-provider">{children}</div>,
    useUIContext: () => mockUIContextValue,
  };
});

vi.mock('../../src/context/HierarchyContext', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    HierarchyProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="hierarchy-provider">{children}</div>,
    useHierarchyContext: () => mockHierarchyContextValue,
  };
});

vi.mock('../../src/context/ContextMenuContext', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    ContextMenuProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="context-menu-provider">{children}</div>,
    useContextMenuContext: () => mockContextMenuContextValue,
  };
});

// Import the mocked providers
import { UIProvider } from '../../src/context/UIContext';
import { HierarchyProvider } from '../../src/context/HierarchyContext';
import { ContextMenuProvider } from '../../src/context/ContextMenuContext';

// Custom render function that includes all necessary providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <UIProvider>
      <HierarchyProvider>
        <ContextMenuProvider>
          {children}
        </ContextMenuProvider>
      </HierarchyProvider>
    </UIProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { customRender as render };

// Custom render for components that don't need all providers
export const renderWithUIProvider = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const UIWrapper = ({ children }: { children: React.ReactNode }) => (
    <UIProvider>{children}</UIProvider>
  );
  return render(ui, { wrapper: UIWrapper, ...options });
};

export const renderWithHierarchyProvider = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const HierarchyWrapper = ({ children }: { children: React.ReactNode }) => (
    <HierarchyProvider>{children}</HierarchyProvider>
  );
  return render(ui, { wrapper: HierarchyWrapper, ...options });
};

// Helper to wait for async operations
export const waitForAsyncOperations = () => 
  new Promise(resolve => setTimeout(resolve, 0));
