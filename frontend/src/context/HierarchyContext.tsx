import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { fetchHierarchies } from '../services/ApiService';

interface HierarchyContextType {
  hierarchies: { id: string; name: string }[];
  hierarchyId: string;
  setHierarchyId: (id: string) => void;
}

const HierarchyContext = createContext<HierarchyContextType>({
  hierarchies: [],
  hierarchyId: "",
  setHierarchyId: () => {},
});

export const useHierarchyContext = () => useContext(HierarchyContext);

interface ProviderProps {
  children: ReactNode;
}

export const HierarchyProvider = ({ children }: ProviderProps) => {
  const [hierarchies, setHierarchies] = useState<{ id: string; name: string }[]>([]);
  const [hierarchyId, setHierarchyId] = useState<string>("");

  useEffect(() => {
    fetchHierarchies()
      .then(list => {
        setHierarchies(list);
        if (list.length > 0) {
          setHierarchyId(list[0].id);
        }
      })
      .catch(err => {
        console.error('[HierarchyContext] Error fetching hierarchies:', err);
      });
  }, []);

  return (
    <HierarchyContext.Provider value={{ hierarchies, hierarchyId, setHierarchyId }}>
      {children}
    </HierarchyContext.Provider>
  );
};
