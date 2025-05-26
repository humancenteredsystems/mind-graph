import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
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
