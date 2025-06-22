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

export const ViewContext = createContext<ViewState>({
  active: 'none',
  setActive: () => {},
  hideUnassociated: false,
  setHideUnassociated: () => {},
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

  return (
    <ViewContext.Provider value={{ 
      active, 
      setActive: wrappedSetActive,
      hideUnassociated,
      setHideUnassociated: wrappedSetHideUnassociated
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
