/**
 * ViewContext - Manages active graph view/lens state
 * 
 * Provides context for switching between different graph views (lenses)
 * with localStorage persistence for user preferences.
 */

import React, { createContext, useState, useContext, ReactNode } from 'react';
import { ViewState } from '@mims/lens-types';

interface ViewProviderProps {
  children: ReactNode;
}

interface ExtendedViewState extends ViewState {
  hierarchyPanelOpen: boolean;
  setHierarchyPanelOpen: (open: boolean) => void;
}

export const ViewContext = createContext<ExtendedViewState>({
  active: 'none',
  setActive: () => {},
  hideUnassociated: false,
  setHideUnassociated: () => {},
  hierarchyPanelOpen: false,
  setHierarchyPanelOpen: () => {},
});

export const ViewProvider: React.FC<ViewProviderProps> = ({ children }) => {
  const [active, setActive] = useState<string>(() => {
    try {
      return localStorage.getItem('mims-active-view') ?? 'none';
    } catch (error) {
      console.error('[ViewContext] Error reading from localStorage:', error);
      return 'none';
    }
  });

  const [hideUnassociated, setHideUnassociated] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('mims-hide-unassociated');
      return stored ? JSON.parse(stored) : false;
    } catch (error) {
      console.error('[ViewContext] Error reading hideUnassociated from localStorage:', error);
      return false;
    }
  });

  const [hierarchyPanelOpen, setHierarchyPanelOpen] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('mims-hierarchy-panel-open');
      return stored ? JSON.parse(stored) : false;
    } catch (error) {
      console.error('[ViewContext] Error reading hierarchyPanelOpen from localStorage:', error);
      return false;
    }
  });

  const wrappedSetActive = (id: string) => {
    setActive(id);
    try {
      localStorage.setItem('mims-active-view', id);
    } catch (error) {
      console.error('[ViewContext] Error writing to localStorage:', error);
    }
  };

  const wrappedSetHideUnassociated = (hide: boolean) => {
    setHideUnassociated(hide);
    try {
      localStorage.setItem('mims-hide-unassociated', JSON.stringify(hide));
    } catch (error) {
      console.error('[ViewContext] Error writing hideUnassociated to localStorage:', error);
    }
  };

  const wrappedSetHierarchyPanelOpen = (open: boolean) => {
    setHierarchyPanelOpen(open);
    try {
      localStorage.setItem('mims-hierarchy-panel-open', JSON.stringify(open));
    } catch (error) {
      console.error('[ViewContext] Error writing hierarchyPanelOpen to localStorage:', error);
    }
  };

  return (
    <ViewContext.Provider value={{ 
      active, 
      setActive: wrappedSetActive,
      hideUnassociated,
      setHideUnassociated: wrappedSetHideUnassociated,
      hierarchyPanelOpen,
      setHierarchyPanelOpen: wrappedSetHierarchyPanelOpen
    }}>
      {children}
    </ViewContext.Provider>
  );
};

export const useView = () => {
  const context = useContext(ViewContext);
  if (!context) {
    throw new Error('useView must be used within a ViewProvider');
  }
  return context;
};
