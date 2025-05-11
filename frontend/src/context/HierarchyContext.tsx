import React, { createContext, useContext, useState, ReactNode } from 'react';

interface HierarchyContextType {
  hierarchyId: string;  // Change from number to string
  setHierarchyId: (id: string) => void;  // Change parameter type
}

const HierarchyContext = createContext<HierarchyContextType>({
  hierarchyId: "h1",  // Change from 1 to a string ID, e.g., "h1" or a meaningful default
  setHierarchyId: () => {},
});

export const useHierarchyContext = () => useContext(HierarchyContext);

interface ProviderProps {
  children: ReactNode;
}

export const HierarchyProvider = ({ children }: ProviderProps) => {
  const [hierarchyId, setHierarchyId] = useState<string>("h1");  // Change from number to string
  return (
    <HierarchyContext.Provider value={{ hierarchyId, setHierarchyId }}>
      {children}
    </HierarchyContext.Provider>
  );
};
