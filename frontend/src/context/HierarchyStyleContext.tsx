import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { useHierarchyStyles } from '../hooks/useHierarchyStyles';
import { getCytoscapeStyles as computeStyles } from '../utils/cytoscapeStyleUtils';
import type { NodeTypeStyle } from '../types/nodeStyle';

interface HierarchyStyleContextValue {
  customStyles: Map<string, NodeTypeStyle>;
  getStyleForType: (hierarchyId: string, levelId: string, nodeType: string) => NodeTypeStyle;
  hasCustomStyle: (hierarchyId: string, levelId: string, nodeType: string) => boolean;
  updateStyle: (hierarchyId: string, levelId: string, nodeType: string, style: NodeTypeStyle) => void;
  resetToDefault: (hierarchyId: string, levelId: string, nodeType: string) => void;
  loadStyles: () => void;
  saveStyles: () => void;
  getCytoscapeStyles: (hierarchyId: string) => any[];
}

const HierarchyStyleContext = createContext<HierarchyStyleContextValue | undefined>(undefined);

export const HierarchyStyleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const {
    customStyles,
    getStyleForType,
    hasCustomStyle,
    updateStyle,
    resetToDefault,
    loadStyles,
    saveStyles
  } = useHierarchyStyles();

  const getCytoscapeStyles = useCallback(
    (hierarchyId: string) => computeStyles(customStyles, hierarchyId),
    [customStyles]
  );

  return (
    <HierarchyStyleContext.Provider
      value={{
        customStyles,
        getStyleForType,
        hasCustomStyle,
        updateStyle,
        resetToDefault,
        loadStyles,
        saveStyles,
        getCytoscapeStyles
      }}
    >
      {children}
    </HierarchyStyleContext.Provider>
  );
};

export const useHierarchyStyleContext = (): HierarchyStyleContextValue => {
  const context = useContext(HierarchyStyleContext);
  if (!context) {
    throw new Error('useHierarchyStyleContext must be used within a HierarchyStyleProvider');
  }
  return context;
};
