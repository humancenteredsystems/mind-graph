import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { fetchHierarchies, executeQuery, fetchNodeTypes } from '../services/ApiService'; // Import fetchNodeTypes
import { GET_LEVELS_FOR_HIERARCHY } from '../graphql/queries';

// Canonical node types for fallback when allowedTypes is empty
// const CANONICAL_NODE_TYPES = ['concept', 'example', 'question']; // Removed hardcoded types

interface HierarchyContextType {
  hierarchies: { id: string; name: string }[];
  hierarchyId: string;
  levels: {
    id: string;
    levelNumber: number;
    label?: string;
    allowedTypes: { id: string; typeName: string }[];
  }[];
  allowedTypesMap: Record<string, string[]>;
  allNodeTypes: string[];
  setHierarchyId: (id: string) => void;
}

const HierarchyContext = createContext<HierarchyContextType>({
  hierarchies: [],
  hierarchyId: '',
  levels: [],
  allowedTypesMap: {},
  allNodeTypes: [],
  setHierarchyId: () => {},
});

export const useHierarchyContext = () => useContext(HierarchyContext);

interface ProviderProps {
  children: ReactNode;
}

export const HierarchyProvider = ({ children }: ProviderProps) => {
  const [hierarchies, setHierarchies] = useState<{ id: string; name: string }[]>([]);
  const [_hierarchyId, _setHierarchyId] = useState<string>('');
  const [levels, setLevels] = useState<
    { id: string; levelNumber: number; label?: string; allowedTypes: { id: string; typeName: string }[] }[]
  >([]);
  const [allowedTypesMap, setAllowedTypesMap] = useState<Record<string, string[]>>({});
  const [allNodeTypes, setAllNodeTypes] = useState<string[]>([]);

  const updateHierarchyId = (newId: string) => {
    _setHierarchyId(newId);
    try {
      localStorage.setItem('hierarchyId', newId);
    } catch (error) {
      console.error('[HierarchyContext] Error setting hierarchyId in localStorage:', error);
    }
  };

  // Fetch hierarchies and all node types on mount
  useEffect(() => {
    // Fetch hierarchies
    fetchHierarchies()
      .then(list => {
        setHierarchies(list);
        if (list.length > 0) {
          const saved = localStorage.getItem('hierarchyId');
          if (saved && list.some(h => h.id === saved)) {
            updateHierarchyId(saved);
          } else {
            updateHierarchyId(list[0].id);
          }
        }
      })
      .catch(err => {
        console.error('[HierarchyContext] Error fetching hierarchies:', err);
      });

    // Fetch all node types dynamically
    fetchNodeTypes()
      .then(types => {
        setAllNodeTypes(types);
      })
      .catch(err => {
        console.error('[HierarchyContext] Error fetching node types:', err);
        // Fallback to a default list if fetching fails (optional, but good practice)
        // setAllNodeTypes(['concept', 'example', 'question']);
      });

  }, []); // Empty dependency array means this runs once on mount

  // Fetch levels and build maps when hierarchy changes
  useEffect(() => {
    if (!_hierarchyId) return;
    executeQuery(GET_LEVELS_FOR_HIERARCHY, { h: _hierarchyId })
      .then((res: any) => {
        const lvl = res.queryHierarchy?.[0]?.levels || [];
        setLevels(lvl);
        // Build allowedTypesMap
        const map: Record<string, string[]> = {};
        lvl.forEach((level: any) => {
          const key = `${_hierarchyId}l${level.levelNumber}`;
          const types = (level.allowedTypes || []).map((at: any) => at.typeName);
          map[key] = types;
        });
        setAllowedTypesMap(map);
        // allNodeTypes is now fetched separately on mount
      })
      .catch((err: any) => {
        console.error('[HierarchyContext] Error fetching levels:', err);
      });
  }, [_hierarchyId]); // Dependency on _hierarchyId

  return (
    <HierarchyContext.Provider
      value={{
        hierarchies,
        hierarchyId: _hierarchyId,
        levels,
        allowedTypesMap,
        allNodeTypes,
        setHierarchyId: updateHierarchyId,
      }}
    >
      {children}
    </HierarchyContext.Provider>
  );
};
