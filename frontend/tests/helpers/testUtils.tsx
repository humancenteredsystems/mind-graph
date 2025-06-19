import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import { AllTheProviders, UIWrapper, HierarchyWrapper } from './testProviders';
import { 
  mockUIContextValue, 
  mockHierarchyContextValue, 
  mockContextMenuContextValue 
} from './testUtilities';

// Mock the contexts with proper exports
vi.mock('../../src/hooks/useUI', () => ({
  useUIContext: () => mockUIContextValue,
}));

vi.mock('../../src/hooks/useHierarchy', () => ({
  useHierarchyContext: () => mockHierarchyContextValue,
}));

vi.mock('../../src/context/ContextMenuContext', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    ContextMenuProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="context-menu-provider">{children}</div>,
    useContextMenuContext: () => mockContextMenuContextValue,
  };
});

// Custom render function that includes all necessary providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export specific functions from testing library
export {
  screen,
  waitFor,
  fireEvent,
  act,
  cleanup,
  renderHook,
  within,
  getByRole,
  getByText,
  getByTestId,
  queryByRole,
  queryByText,
  queryByTestId,
  findByRole,
  findByText,
  findByTestId
} from '@testing-library/react';

// Override render method
export { customRender as render };

// Custom render functions for specific providers
export const renderWithUIProvider = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: UIWrapper, ...options });

export const renderWithHierarchyProvider = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: HierarchyWrapper, ...options });
