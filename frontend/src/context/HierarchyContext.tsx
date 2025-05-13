import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { fetchHierarchies, executeQuery } from '../services/ApiService';
import { GET_LEVELS_FOR_HIERARCHY } from '../graphql/queries';

interface HierarchyContextType {
  hierarchies: { id: string; name: string }[];
  hierarchyId: string;
  levels: { id: string; levelNumber: number; label?: string; allowedTypes: { id: string; typeName: string }[] }[];
  setHierarchyId: (id: string) => void;
}

const HierarchyContext = createContext<HierarchyContextType>({
  hierarchies: [],
  hierarchyId: "",
  levels: [],
  setHierarchyId: () => {},
});

export const useHierarchyContext = () => useContext(HierarchyContext);

interface ProviderProps {
  children: ReactNode;
}

export const HierarchyProvider = ({ children }: ProviderProps) => {
  const [hierarchies, setHierarchies] = useState<{ id: string; name: string }[]>([]);
  const [hierarchyId, setHierarchyId] = useState<string>("");
  const [levels, setLevels] = useState<{ id: string; levelNumber: number; label?: string; allowedTypes: { id: string; typeName: string }[] }[]>([]);

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

  // Fetch levels when hierarchyId changes
    useEffect(() => {
      if (hierarchyId) {
        executeQuery(GET_LEVELS_FOR_HIERARCHY, { h: hierarchyId })
          .then((res: any) => {
            const lvl = res.queryHierarchy?.[0]?.levels || [];
            setLevels(lvl);
          })
          .catch((err: any) => {
            console.error('[HierarchyContext] Error fetching levels:', err);
          });
      }
    }, [hierarchyId]);

  return (
    <HierarchyContext.Provider value={{ hierarchies, hierarchyId, levels, setHierarchyId }}>
      {children}
    </HierarchyContext.Provider>
  );
};
