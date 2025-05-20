import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { fetchHierarchies, executeQuery } from '../services/ApiService';
import { GET_LEVELS_FOR_HIERARCHY } from '../graphql/queries';

// Canonical node types for fallback when allowedTypes is empty
const CANONICAL_NODE_TYPES = ['concept', 'example', 'question'];

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

  // Fetch hierarchies on mount
  useEffect(() => {
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
  }, []);

  // Fetch levels and build maps when hierarchy changes
  useEffect(() => {
    if (!_hierarchyId) return;
    executeQuery(GET_LEVELS_FOR_HIERARCHY, { h: _hierarchyId })
      .then((res: any) => {
        const lvl = res.queryHierarchy?.[0]?.levels || [];
        setLevels(lvl);
        // Build allowedTypesMap and compute allNodeTypes
        const map: Record<string, string[]> = {};
        lvl.forEach((level: any) => {
          const key = `${_hierarchyId}l${level.levelNumber}`;
          const types = (level.allowedTypes || []).map((at: any) => at.typeName);
          map[key] = types;
        });
        setAllowedTypesMap(map);
        // Flatten unique types for fallback
        // Use canonical list for fallback instead of flattening allowedTypesMap
        setAllNodeTypes(CANONICAL_NODE_TYPES);
      })
      .catch((err: any) => {
        console.error('[HierarchyContext] Error fetching levels:', err);
      });
  }, [_hierarchyId]);

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
