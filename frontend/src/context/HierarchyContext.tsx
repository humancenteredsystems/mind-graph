import React, { useState, ReactNode, useEffect } from 'react';
import { fetchHierarchies, executeQuery } from '../services/ApiService';
import { GET_LEVELS_FOR_HIERARCHY } from '../graphql/queries';
import { HierarchyLevel, AllowedType, GraphQLError } from '../types/hierarchy';
import { HierarchyContext } from './contexts';

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
            // Default to 'h1' (Primary Knowledge Graph) if available, otherwise use first hierarchy
            const defaultHierarchy = list.find(h => h.id === 'h1') || list[0];
            updateHierarchyId(defaultHierarchy.id);
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
      .then((res) => {
        const lvl: HierarchyLevel[] = res.queryHierarchy?.[0]?.levels || [];
        setLevels(lvl);
        // Build allowedTypesMap
        const map: Record<string, string[]> = {};
        lvl.forEach((level: HierarchyLevel) => {
          const key = `${_hierarchyId}l${level.levelNumber}`;
          const types = (level.allowedTypes || []).map((at: AllowedType) => at.typeName);
          map[key] = types;
        });
        setAllowedTypesMap(map);
        
        // Derive allNodeTypes from hierarchy levels data
        const allTypes: string[] = lvl.flatMap((level: HierarchyLevel) => 
          (level.allowedTypes || []).map((at: AllowedType) => at.typeName)
        );
        const uniqueTypes = Array.from(new Set(allTypes));
        setAllNodeTypes(uniqueTypes);
      })
      .catch((err: GraphQLError | Error) => {
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
