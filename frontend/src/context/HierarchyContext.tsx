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
  const [levels, setLevels] = useState<
    { id: string; levelNumber: number; label?: string; allowedTypes: { id: string; typeName: string }[] }[]
  >([]);
  const [allowedTypesMap, setAllowedTypesMap] = useState<Record<string, string[]>>({});
  const [allNodeTypes, setAllNodeTypes] = useState<string[]>([]);

  // Fetch hierarchies on mount
  useEffect(() => {
    fetchHierarchies()
      .then(list => {
        setHierarchies(list);
      })
      .catch(err => {
        console.error('[HierarchyContext] Error fetching hierarchies:', err);
      });
  }, []);

  return (
    <HierarchyContext.Provider
      value={{
        hierarchies,
        levels,
        allowedTypesMap,
        allNodeTypes,
      }}
    >
      {children}
    </HierarchyContext.Provider>
  );
};
