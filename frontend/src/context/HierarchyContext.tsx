import React, { createContext, useContext, useState, ReactNode } from 'react';

interface HierarchyContextType {
  hierarchyId: number;  // Change from string to number
  setHierarchyId: (id: number) => void;  // Change parameter type
}

const HierarchyContext = createContext<HierarchyContextType>({
  hierarchyId: 1,  // Change from '1' to 1
  setHierarchyId: () => {},
});

export const useHierarchyContext = () => useContext(HierarchyContext);

interface ProviderProps {
  children: ReactNode;
}

export const HierarchyProvider = ({ children }: ProviderProps) => {
  const [hierarchyId, setHierarchyId] = useState<number>(1);  // Change from string to number
  return (
    <HierarchyContext.Provider value={{ hierarchyId, setHierarchyId }}>
      {children}
    </HierarchyContext.Provider>
  );
};
