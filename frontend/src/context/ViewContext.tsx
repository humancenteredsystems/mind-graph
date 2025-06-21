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
  active: 'default',
  setActive: () => {},
});

export const ViewProvider: React.FC<ViewProviderProps> = ({ children }) => {
  const [active, setActive] = useState<string>(() => {
    try {
      return localStorage.getItem('mims-active-view') ?? 'default';
    } catch (error) {
      console.error('[ViewContext] Error reading from localStorage:', error);
      return 'default';
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

  return (
    <ViewContext.Provider value={{ active, setActive: wrappedSetActive }}>
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
