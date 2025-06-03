import React from 'react';
import { UIProvider } from '../../src/context/UIContext';
import { HierarchyProvider } from '../../src/context/HierarchyContext';
import { ContextMenuProvider } from '../../src/context/ContextMenuContext';

// Custom render function that includes all necessary providers
export const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
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

// Custom render for components that don't need all providers
export const UIWrapper = ({ children }: { children: React.ReactNode }) => (
  <UIProvider>{children}</UIProvider>
);

export const HierarchyWrapper = ({ children }: { children: React.ReactNode }) => (
  <HierarchyProvider>{children}</HierarchyProvider>
);
