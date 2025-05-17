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
  const [_hierarchyId, _setHierarchyId] = useState<string>(""); // Renamed internal state
  const [levels, setLevels] = useState<{ id: string; levelNumber: number; label?: string; allowedTypes: { id: string; typeName: string }[] }[]>([]);

  // Function to update hierarchyId in state and localStorage
  const updateHierarchyId = (newId: string) => {
    _setHierarchyId(newId);
    try {
      localStorage.setItem('hierarchyId', newId);
      console.log(`[HierarchyContext] Hierarchy ID set in localStorage: ${newId}`);
    } catch (error) {
      console.error('[HierarchyContext] Error setting hierarchyId in localStorage:', error);
    }
  };

  useEffect(() => {
    fetchHierarchies()
      .then(list => {
        setHierarchies(list);
        if (list.length > 0) {
          // Use the new update function to also set localStorage
          const initialHierarchyId = localStorage.getItem('hierarchyId');
          if (initialHierarchyId && list.some(h => h.id === initialHierarchyId)) {
            updateHierarchyId(initialHierarchyId);
          } else if (list.length > 0) {
            updateHierarchyId(list[0].id);
          }
        }
      })
      .catch(err => {
        console.error('[HierarchyContext] Error fetching hierarchies:', err);
      });
  }, []);

  // Fetch levels when _hierarchyId changes
    useEffect(() => {
      if (_hierarchyId) {
        executeQuery(GET_LEVELS_FOR_HIERARCHY, { h: _hierarchyId })
          .then((res: any) => {
            const lvl = res.queryHierarchy?.[0]?.levels || [];
            setLevels(lvl);
          })
          .catch((err: any) => {
            console.error('[HierarchyContext] Error fetching levels:', err);
          });
      }
    }, [_hierarchyId]);

  return (
    <HierarchyContext.Provider value={{ hierarchies, hierarchyId: _hierarchyId, levels, setHierarchyId: updateHierarchyId }}>
      {children}
    </HierarchyContext.Provider>
  );
};
